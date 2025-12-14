import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/convolute';

/**
 * Convolute 滤镜的自有属性
 */
export type ConvoluteOwnProps = {
  /**
   * 不透明度
   */
  opaque: boolean;
  /**
   * 卷积矩阵
   */
  matrix: number[];
};

/**
 * Convolute 滤镜的默认值
 */
export const convoluteDefaultValues: ConvoluteOwnProps = {
  opaque: false,
  matrix: [0, 0, 0, 0, 1, 0, 0, 0, 0],
};

/**
 * 改编自 <a href="http://www.html5rocks.com/en/tutorials/canvas/imagefilters/">html5rocks 文章</a>
 *
 * Adapted from <a href="http://www.html5rocks.com/en/tutorials/canvas/imagefilters/">html5rocks article</a>
 * @example <caption>Sharpen filter</caption>
 * const filter = new Convolute({
 *   matrix: [ 0, -1,  0,
 *            -1,  5, -1,
 *             0, -1,  0 ]
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 * @example <caption>Blur filter</caption>
 * const filter = new Convolute({
 *   matrix: [ 1/9, 1/9, 1/9,
 *             1/9, 1/9, 1/9,
 *             1/9, 1/9, 1/9 ]
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 * @example <caption>Emboss filter</caption>
 * const filter = new Convolute({
 *   matrix: [ 1,   1,  1,
 *             1, 0.7, -1,
 *            -1,  -1, -1 ]
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 * @example <caption>Emboss filter with opaqueness</caption>
 * const filter = new Convolute({
 *   opaque: true,
 *   matrix: [ 1,   1,  1,
 *             1, 0.7, -1,
 *            -1,  -1, -1 ]
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 */
export class Convolute extends BaseFilter<'Convolute', ConvoluteOwnProps> {
  /*
   * 不透明值 (true/false)
   *
   * Opaque value (true/false)
   */
  declare opaque: ConvoluteOwnProps['opaque'];

  /*
   * 滤镜的矩阵，最大 9x9
   *
   * matrix for the filter, max 9x9
   */
  declare matrix: ConvoluteOwnProps['matrix'];

  static type = 'Convolute';

  static defaults = convoluteDefaultValues;

  static uniformLocations = ['uMatrix', 'uOpaque', 'uHalfSize', 'uSize'];

  /**
   * 获取缓存键
   * @returns {string} 缓存键
   */
  getCacheKey() {
    return `${this.type}_${Math.sqrt(this.matrix.length)}_${
      this.opaque ? 1 : 0
    }` as keyof typeof fragmentSource;
  }

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource[this.getCacheKey()];
  }

  /**
   * 将卷积操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the Brightness operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d(options: T2DPipelineState) {
    const imageData = options.imageData,
      data = imageData.data,
      weights = this.matrix,
      side = Math.round(Math.sqrt(weights.length)),
      halfSide = Math.floor(side / 2),
      sw = imageData.width,
      sh = imageData.height,
      output = options.ctx.createImageData(sw, sh),
      dst = output.data,
      // go through the destination image pixels
      alphaFac = this.opaque ? 1 : 0;
    let r, g, b, a, dstOff, scx, scy, srcOff, wt, x, y, cx, cy;

    for (y = 0; y < sh; y++) {
      for (x = 0; x < sw; x++) {
        dstOff = (y * sw + x) * 4;
        // calculate the weighed sum of the source image pixels that
        // fall under the convolution matrix
        r = 0;
        g = 0;
        b = 0;
        a = 0;

        for (cy = 0; cy < side; cy++) {
          for (cx = 0; cx < side; cx++) {
            scy = y + cy - halfSide;
            scx = x + cx - halfSide;

            // eslint-disable-next-line max-depth
            if (scy < 0 || scy >= sh || scx < 0 || scx >= sw) {
              continue;
            }

            srcOff = (scy * sw + scx) * 4;
            wt = weights[cy * side + cx];

            r += data[srcOff] * wt;
            g += data[srcOff + 1] * wt;
            b += data[srcOff + 2] * wt;
            // eslint-disable-next-line max-depth
            if (!alphaFac) {
              a += data[srcOff + 3] * wt;
            }
          }
        }
        dst[dstOff] = r;
        dst[dstOff + 1] = g;
        dst[dstOff + 2] = b;
        if (!alphaFac) {
          dst[dstOff + 3] = a;
        } else {
          dst[dstOff + 3] = data[dstOff + 3];
        }
      }
    }
    options.imageData = output;
  }

  /**
   * 将数据从此滤镜发送到其着色器程序的 uniform。
   *
   * Send data from this filter to its shader program's uniforms.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader. 用于编译此滤镜着色器的 GL 画布上下文。
   * @param {Object} uniformLocations A map of string uniform names to WebGLUniformLocation objects 字符串 uniform 名称到 WebGLUniformLocation 对象的映射
   */
  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: TWebGLUniformLocationMap,
  ) {
    gl.uniform1fv(uniformLocations.uMatrix, this.matrix);
  }

  /**
   * 返回实例的对象表示
   *
   * Returns object representation of an instance
   * @return {Object} Object representation of an instance 实例的对象表示
   */
  toObject() {
    return {
      ...super.toObject(),
      opaque: this.opaque,
      matrix: [...this.matrix],
    };
  }
}

classRegistry.setClass(Convolute);
