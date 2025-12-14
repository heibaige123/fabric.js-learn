import { BaseFilter } from './BaseFilter';
import type {
  T2DPipelineState,
  TWebGLPipelineState,
  TWebGLUniformLocationMap,
} from './typedefs';
import { isWebGLPipelineState } from './utils';
import { classRegistry } from '../ClassRegistry';
import { createCanvasElement } from '../util/misc/dom';
import type { XY } from '../Point';

/**
 * 调整大小类型
 */
export type TResizeType = 'bilinear' | 'hermite' | 'sliceHack' | 'lanczos';

/**
 * Resize 滤镜的自有属性
 */
export type ResizeOwnProps = {
  /**
   * 调整大小类型
   */
  resizeType: TResizeType;
  /**
   * X 轴缩放因子
   */
  scaleX: number;
  /**
   * Y 轴缩放因子
   */
  scaleY: number;
  /**
   * Lanczos 滤镜的 lobes 参数
   */
  lanczosLobes: number;
};

/**
 * Resize 滤镜的序列化属性
 */
export type ResizeSerializedProps = ResizeOwnProps;

/**
 * Resize 滤镜的默认值
 */
export const resizeDefaultValues: ResizeOwnProps = {
  /**
   * 默认调整大小类型
   */
  resizeType: 'hermite',
  /**
   * 默认 X 轴缩放因子
   */
  scaleX: 1,
  /**
   * 默认 Y 轴缩放因子
   */
  scaleY: 1,
  /**
   * 默认 Lanczos lobes 参数
   */
  lanczosLobes: 3,
};

/**
 * 2D 调整大小期间的 Resize 类型
 */
type ResizeDuring2DResize = Resize & {
  rcpScaleX: number;
  rcpScaleY: number;
};

/**
 * WebGL 调整大小期间的 Resize 类型
 */
type ResizeDuringWEBGLResize = Resize & {
  rcpScaleX: number;
  rcpScaleY: number;
  horizontal: boolean;
  width: number;
  height: number;
  taps: number[];
  tempScale: number;
  dH: number;
  dW: number;
};

/**
 * 调整图像大小滤镜类
 *
 * Resize image filter class
 * @example
 * const filter = new Resize();
 * object.filters.push(filter);
 * object.applyFilters(canvas.renderAll.bind(canvas));
 */
export class Resize extends BaseFilter<'Resize', ResizeOwnProps> {
  /**
   * 调整大小类型
   * 对于 webgl，resizeType 只是 lanczos，对于 canvas2d 可以是：
   * bilinear, hermite, sliceHack, lanczos。
   *
   * Resize type
   * for webgl resizeType is just lanczos, for canvas2d can be:
   * bilinear, hermite, sliceHack, lanczos.
   */
  declare resizeType: ResizeOwnProps['resizeType'];

  /**
   * 调整大小的缩放因子，x 轴
   *
   * Scale factor for resizing, x axis
   * @param {Number} scaleX
   */
  declare scaleX: ResizeOwnProps['scaleX'];

  /**
   * 调整大小的缩放因子，y 轴
   *
   * Scale factor for resizing, y axis
   * @param {Number} scaleY
   */
  declare scaleY: ResizeOwnProps['scaleY'];

  /**
   * lanczos 滤镜的 LanczosLobes 参数，对 resizeType lanczos 有效
   *
   * LanczosLobes parameter for lanczos filter, valid for resizeType lanczos
   * @param {Number} lanczosLobes
   */
  declare lanczosLobes: ResizeOwnProps['lanczosLobes'];

  static type = 'Resize';

  static defaults = resizeDefaultValues;

  static uniformLocations = ['uDelta', 'uTaps'];

  /**
   * 将数据从此滤镜发送到其着色器程序的 uniform。
   *
   * Send data from this filter to its shader program's uniforms.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader. 用于编译此滤镜着色器的 GL 画布上下文。
   * @param {Object} uniformLocations A map of string uniform names to WebGLUniformLocation objects 字符串 uniform 名称到 WebGLUniformLocation 对象的映射
   */
  sendUniformData(
    this: ResizeDuringWEBGLResize,
    gl: WebGLRenderingContext,
    uniformLocations: TWebGLUniformLocationMap,
  ) {
    gl.uniform2fv(
      uniformLocations.uDelta,
      this.horizontal ? [1 / this.width, 0] : [0, 1 / this.height],
    );
    gl.uniform1fv(uniformLocations.uTaps, this.taps);
  }

  /**
   * 获取滤镜窗口大小
   * @returns {number} 滤镜窗口大小
   */
  getFilterWindow(this: ResizeDuringWEBGLResize) {
    const scale = this.tempScale;
    return Math.ceil(this.lanczosLobes / scale);
  }

  /**
   * 获取缓存键
   * @returns {string} 缓存键
   */
  getCacheKey(this: ResizeDuringWEBGLResize): string {
    const filterWindow = this.getFilterWindow();
    return `${this.type}_${filterWindow}`;
  }

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource(this: ResizeDuringWEBGLResize): string {
    const filterWindow = this.getFilterWindow();
    return this.generateShader(filterWindow);
  }

  /**
   * 获取 taps
   * @returns {number[]} taps 数组
   */
  getTaps(this: ResizeDuringWEBGLResize) {
    const lobeFunction = this.lanczosCreate(this.lanczosLobes),
      scale = this.tempScale,
      filterWindow = this.getFilterWindow(),
      taps = new Array(filterWindow);
    for (let i = 1; i <= filterWindow; i++) {
      taps[i - 1] = lobeFunction(i * scale);
    }
    return taps;
  }

  /**
   * 从必要的步骤数生成顶点和着色器源
   *
   * Generate vertex and shader sources from the necessary steps numbers
   * @param {Number} filterWindow 滤镜窗口大小
   */
  generateShader(filterWindow: number) {
    const offsets = new Array(filterWindow);
    for (let i = 1; i <= filterWindow; i++) {
      offsets[i - 1] = `${i}.0 * uDelta`;
    }
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uDelta;
      varying vec2 vTexCoord;
      uniform float uTaps[${filterWindow}];
      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        float sum = 1.0;
        ${offsets
          .map(
            (offset, i) => `
              color += texture2D(uTexture, vTexCoord + ${offset}) * uTaps[${i}] + texture2D(uTexture, vTexCoord - ${offset}) * uTaps[${i}];
              sum += 2.0 * uTaps[${i}];
            `,
          )
          .join('\n')}
        gl_FragColor = color / sum;
      }
    `;
  }

  /**
   * 为 WebGL 应用滤镜
   * @param options WebGL 管道状态
   */
  applyToForWebgl(this: ResizeDuringWEBGLResize, options: TWebGLPipelineState) {
    options.passes++;
    this.width = options.sourceWidth;
    this.horizontal = true;
    this.dW = Math.round(this.width * this.scaleX);
    this.dH = options.sourceHeight;
    this.tempScale = this.dW / this.width;
    this.taps = this.getTaps();
    options.destinationWidth = this.dW;
    super.applyTo(options);
    options.sourceWidth = options.destinationWidth;

    this.height = options.sourceHeight;
    this.horizontal = false;
    this.dH = Math.round(this.height * this.scaleY);
    this.tempScale = this.dH / this.height;
    this.taps = this.getTaps();
    options.destinationHeight = this.dH;
    super.applyTo(options);
    options.sourceHeight = options.destinationHeight;
  }

  /**
   * 将调整大小滤镜应用于图像
   * 根据 options.webgl 标志确定是使用 WebGL 还是 Canvas2D。
   *
   * Apply the resize filter to the image
   * Determines whether to use WebGL or Canvas2D based on the options.webgl flag.
   *
   * @param {Object} options 选项对象
   * @param {Number} options.passes The number of filters remaining to be executed 剩余要执行的滤镜数量
   * @param {Boolean} options.webgl Whether to use webgl to render the filter. 是否使用 webgl 渲染滤镜
   * @param {WebGLTexture} options.sourceTexture The texture setup as the source to be filtered. 设置为要过滤的源的纹理
   * @param {WebGLTexture} options.targetTexture The texture where filtered output should be drawn. 过滤后的输出应绘制到的纹理
   * @param {WebGLRenderingContext} options.context The GL context used for rendering. 用于渲染的 GL 上下文
   * @param {Object} options.programCache A map of compiled shader programs, keyed by filter type. 已编译着色器程序的映射，以滤镜类型为键
   */
  applyTo(options: TWebGLPipelineState | T2DPipelineState) {
    if (isWebGLPipelineState(options)) {
      (this as unknown as ResizeDuringWEBGLResize).applyToForWebgl(options);
    } else {
      (this as unknown as ResizeDuring2DResize).applyTo2d(options);
    }
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return this.scaleX === 1 && this.scaleY === 1;
  }

  /**
   * 创建 Lanczos 函数
   * @param lobes lobes 参数
   * @returns Lanczos 函数
   */
  lanczosCreate(lobes: number) {
    return (x: number) => {
      if (x >= lobes || x <= -lobes) {
        return 0.0;
      }
      if (x < 1.1920929e-7 && x > -1.1920929e-7) {
        return 1.0;
      }
      x *= Math.PI;
      const xx = x / lobes;
      return ((Math.sin(x) / x) * Math.sin(xx)) / xx;
    };
  }

  /**
   * 应用于 2D 上下文
   * @param options 2D 管道状态
   */
  applyTo2d(this: ResizeDuring2DResize, options: T2DPipelineState) {
    const imageData = options.imageData,
      scaleX = this.scaleX,
      scaleY = this.scaleY;

    this.rcpScaleX = 1 / scaleX;
    this.rcpScaleY = 1 / scaleY;

    const oW = imageData.width;
    const oH = imageData.height;
    const dW = Math.round(oW * scaleX);
    const dH = Math.round(oH * scaleY);
    let newData: ImageData;

    if (this.resizeType === 'sliceHack') {
      newData = this.sliceByTwo(options, oW, oH, dW, dH);
    } else if (this.resizeType === 'hermite') {
      newData = this.hermiteFastResize(options, oW, oH, dW, dH);
    } else if (this.resizeType === 'bilinear') {
      newData = this.bilinearFiltering(options, oW, oH, dW, dH);
    } else if (this.resizeType === 'lanczos') {
      newData = this.lanczosResize(options, oW, oH, dW, dH);
    } else {
      // this should never trigger, is here just for safety net.
      newData = new ImageData(dW, dH);
    }
    options.imageData = newData;
  }

  /**
   * sliceByTwo 滤镜
   *
   * Filter sliceByTwo
   * @param {Object} canvasEl Canvas element to apply filter to 画布元素
   * @param {Number} oW Original Width 原始宽度
   * @param {Number} oH Original Height 原始高度
   * @param {Number} dW Destination Width 目标宽度
   * @param {Number} dH Destination Height 目标高度
   * @returns {ImageData} 图像数据
   */
  sliceByTwo(
    options: T2DPipelineState,
    oW: number,
    oH: number,
    dW: number,
    dH: number,
  ) {
    const imageData = options.imageData;
    const mult = 0.5;
    let doneW = false;
    let doneH = false;
    let stepW = oW * mult;
    let stepH = oH * mult;
    const resources = options.filterBackend.resources;
    let sX = 0;
    let sY = 0;
    const dX = oW;
    let dY = 0;
    if (!resources.sliceByTwo) {
      resources.sliceByTwo = createCanvasElement();
    }
    const tmpCanvas = resources.sliceByTwo;
    if (tmpCanvas.width < oW * 1.5 || tmpCanvas.height < oH) {
      tmpCanvas.width = oW * 1.5;
      tmpCanvas.height = oH;
    }
    const ctx = tmpCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, oW * 1.5, oH);
    ctx.putImageData(imageData, 0, 0);

    dW = Math.floor(dW);
    dH = Math.floor(dH);

    while (!doneW || !doneH) {
      oW = stepW;
      oH = stepH;
      if (dW < Math.floor(stepW * mult)) {
        stepW = Math.floor(stepW * mult);
      } else {
        stepW = dW;
        doneW = true;
      }
      if (dH < Math.floor(stepH * mult)) {
        stepH = Math.floor(stepH * mult);
      } else {
        stepH = dH;
        doneH = true;
      }
      ctx.drawImage(tmpCanvas, sX, sY, oW, oH, dX, dY, stepW, stepH);
      sX = dX;
      sY = dY;
      dY += stepH;
    }
    return ctx.getImageData(sX, sY, dW, dH);
  }

  /**
   * lanczosResize 滤镜
   *
   * Filter lanczosResize
   * @param {Object} canvasEl Canvas element to apply filter to 画布元素
   * @param {Number} oW Original Width 原始宽度
   * @param {Number} oH Original Height 原始高度
   * @param {Number} dW Destination Width 目标宽度
   * @param {Number} dH Destination Height 目标高度
   * @returns {ImageData} 图像数据
   */
  lanczosResize(
    this: ResizeDuring2DResize,
    options: T2DPipelineState,
    oW: number,
    oH: number,
    dW: number,
    dH: number,
  ): ImageData {
    function process(u: number): ImageData {
      let v, i, weight, idx, a, red, green, blue, alpha, fX, fY;
      center.x = (u + 0.5) * ratioX;
      icenter.x = Math.floor(center.x);
      for (v = 0; v < dH; v++) {
        center.y = (v + 0.5) * ratioY;
        icenter.y = Math.floor(center.y);
        a = 0;
        red = 0;
        green = 0;
        blue = 0;
        alpha = 0;
        for (i = icenter.x - range2X; i <= icenter.x + range2X; i++) {
          if (i < 0 || i >= oW) {
            continue;
          }
          fX = Math.floor(1000 * Math.abs(i - center.x));
          if (!cacheLanc[fX]) {
            cacheLanc[fX] = {};
          }
          for (let j = icenter.y - range2Y; j <= icenter.y + range2Y; j++) {
            if (j < 0 || j >= oH) {
              continue;
            }
            fY = Math.floor(1000 * Math.abs(j - center.y));
            if (!cacheLanc[fX][fY]) {
              cacheLanc[fX][fY] = lanczos(
                Math.sqrt(
                  Math.pow(fX * rcpRatioX, 2) + Math.pow(fY * rcpRatioY, 2),
                ) / 1000,
              );
            }
            weight = cacheLanc[fX][fY];
            if (weight > 0) {
              idx = (j * oW + i) * 4;
              a += weight;
              red += weight * srcData[idx];
              green += weight * srcData[idx + 1];
              blue += weight * srcData[idx + 2];
              alpha += weight * srcData[idx + 3];
            }
          }
        }
        idx = (v * dW + u) * 4;
        destData[idx] = red / a;
        destData[idx + 1] = green / a;
        destData[idx + 2] = blue / a;
        destData[idx + 3] = alpha / a;
      }

      if (++u < dW) {
        return process(u);
      } else {
        return destImg;
      }
    }

    const srcData = options.imageData.data,
      destImg = options.ctx.createImageData(dW, dH),
      destData = destImg.data,
      lanczos = this.lanczosCreate(this.lanczosLobes),
      ratioX = this.rcpScaleX,
      ratioY = this.rcpScaleY,
      rcpRatioX = 2 / this.rcpScaleX,
      rcpRatioY = 2 / this.rcpScaleY,
      range2X = Math.ceil((ratioX * this.lanczosLobes) / 2),
      range2Y = Math.ceil((ratioY * this.lanczosLobes) / 2),
      cacheLanc: Record<number, Record<number, number>> = {},
      center: XY = { x: 0, y: 0 },
      icenter: XY = { x: 0, y: 0 };

    return process(0);
  }

  /**
   * 双线性过滤
   *
   * bilinearFiltering
   * @param {Object} canvasEl Canvas element to apply filter to 画布元素
   * @param {Number} oW Original Width 原始宽度
   * @param {Number} oH Original Height 原始高度
   * @param {Number} dW Destination Width 目标宽度
   * @param {Number} dH Destination Height 目标高度
   * @returns {ImageData} 图像数据
   */
  bilinearFiltering(
    this: ResizeDuring2DResize,
    options: T2DPipelineState,
    oW: number,
    oH: number,
    dW: number,
    dH: number,
  ) {
    let a;
    let b;
    let c;
    let d;
    let x;
    let y;
    let i;
    let j;
    let xDiff;
    let yDiff;
    let chnl;
    let color;
    let offset = 0;
    let origPix;
    const ratioX = this.rcpScaleX;
    const ratioY = this.rcpScaleY;
    const w4 = 4 * (oW - 1);
    const img = options.imageData;
    const pixels = img.data;
    const destImage = options.ctx.createImageData(dW, dH);
    const destPixels = destImage.data;
    for (i = 0; i < dH; i++) {
      for (j = 0; j < dW; j++) {
        x = Math.floor(ratioX * j);
        y = Math.floor(ratioY * i);
        xDiff = ratioX * j - x;
        yDiff = ratioY * i - y;
        origPix = 4 * (y * oW + x);

        for (chnl = 0; chnl < 4; chnl++) {
          a = pixels[origPix + chnl];
          b = pixels[origPix + 4 + chnl];
          c = pixels[origPix + w4 + chnl];
          d = pixels[origPix + w4 + 4 + chnl];
          color =
            a * (1 - xDiff) * (1 - yDiff) +
            b * xDiff * (1 - yDiff) +
            c * yDiff * (1 - xDiff) +
            d * xDiff * yDiff;
          destPixels[offset++] = color;
        }
      }
    }
    return destImage;
  }

  /**
   * Hermite 快速调整大小
   *
   * hermiteFastResize
   * @param {Object} canvasEl Canvas element to apply filter to 画布元素
   * @param {Number} oW Original Width 原始宽度
   * @param {Number} oH Original Height 原始高度
   * @param {Number} dW Destination Width 目标宽度
   * @param {Number} dH Destination Height 目标高度
   * @returns {ImageData} 图像数据
   */
  hermiteFastResize(
    this: ResizeDuring2DResize,
    options: T2DPipelineState,
    oW: number,
    oH: number,
    dW: number,
    dH: number,
  ) {
    const ratioW = this.rcpScaleX,
      ratioH = this.rcpScaleY,
      ratioWHalf = Math.ceil(ratioW / 2),
      ratioHHalf = Math.ceil(ratioH / 2),
      img = options.imageData,
      data = img.data,
      img2 = options.ctx.createImageData(dW, dH),
      data2 = img2.data;
    for (let j = 0; j < dH; j++) {
      for (let i = 0; i < dW; i++) {
        const x2 = (i + j * dW) * 4;
        let weight = 0;
        let weights = 0;
        let weightsAlpha = 0;
        let gxR = 0;
        let gxG = 0;
        let gxB = 0;
        let gxA = 0;
        const centerY = (j + 0.5) * ratioH;
        for (let yy = Math.floor(j * ratioH); yy < (j + 1) * ratioH; yy++) {
          const dy = Math.abs(centerY - (yy + 0.5)) / ratioHHalf,
            centerX = (i + 0.5) * ratioW,
            w0 = dy * dy;
          for (let xx = Math.floor(i * ratioW); xx < (i + 1) * ratioW; xx++) {
            let dx = Math.abs(centerX - (xx + 0.5)) / ratioWHalf;
            const w = Math.sqrt(w0 + dx * dx);
            /* eslint-disable max-depth */
            if (w > 1 && w < -1) {
              continue;
            }
            //hermite filter
            weight = 2 * w * w * w - 3 * w * w + 1;
            if (weight > 0) {
              dx = 4 * (xx + yy * oW);
              //alpha
              gxA += weight * data[dx + 3];
              weightsAlpha += weight;
              //colors
              if (data[dx + 3] < 255) {
                weight = (weight * data[dx + 3]) / 250;
              }
              gxR += weight * data[dx];
              gxG += weight * data[dx + 1];
              gxB += weight * data[dx + 2];
              weights += weight;
            }
            /* eslint-enable max-depth */
          }
        }
        data2[x2] = gxR / weights;
        data2[x2 + 1] = gxG / weights;
        data2[x2 + 2] = gxB / weights;
        data2[x2 + 3] = gxA / weightsAlpha;
      }
    }
    return img2;
  }
}

classRegistry.setClass(Resize);
