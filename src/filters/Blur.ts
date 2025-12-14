import { BaseFilter } from './BaseFilter';
import type {
  TWebGLPipelineState,
  T2DPipelineState,
  TWebGLUniformLocationMap,
} from './typedefs';
import { isWebGLPipelineState } from './utils';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/blur';

/**
 * Blur 滤镜的自有属性
 */
type BlurOwnProps = {
  blur: number;
};

/**
 * Blur 滤镜的默认值
 */
export const blurDefaultValues: BlurOwnProps = {
  blur: 0,
};

/**
 * 模糊滤镜类
 *
 * Blur filter class
 * @example
 * const filter = new Blur({
 *   blur: 0.5
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 */
export class Blur extends BaseFilter<'Blur', BlurOwnProps> {
  /**
   * 模糊值，以图像尺寸的百分比表示。
   * 专门用于在不同分辨率下保持图像模糊恒定。
   * 范围在 0 到 1 之间。
   *
   * blur value, in percentage of image dimensions.
   * specific to keep the image blur constant at different resolutions
   * range between 0 and 1.
   * @type Number
   */
  declare blur: BlurOwnProps['blur'];

  /**
   * 是否水平模糊
   */
  declare horizontal: boolean;
  /**
   * 纵横比
   */
  declare aspectRatio: number;

  static type = 'Blur';

  static defaults = blurDefaultValues;

  static uniformLocations = ['uDelta'];

  /**
   * 获取片段着色器源码
   * @returns 片段着色器源码字符串
   */
  getFragmentSource(): string {
    return fragmentSource;
  }

  /**
   * 应用滤镜
   * @param options 管道状态
   */
  applyTo(options: TWebGLPipelineState | T2DPipelineState) {
    if (isWebGLPipelineState(options)) {
      // this aspectRatio is used to give the same blur to vertical and horizontal
      this.aspectRatio = options.sourceWidth / options.sourceHeight;
      options.passes++;
      this._setupFrameBuffer(options);
      this.horizontal = true;
      this.applyToWebGL(options);
      this._swapTextures(options);
      this._setupFrameBuffer(options);
      this.horizontal = false;
      this.applyToWebGL(options);
      this._swapTextures(options);
    } else {
      this.applyTo2d(options);
    }
  }

  /**
   * 应用于 2D 上下文
   * @param options 2D 管道状态
   */
  applyTo2d({ imageData: { data, width, height } }: T2DPipelineState) {
    // this code mimic the shader for output consistency
    // it samples 31 pixels across the image over a distance that depends from the blur value.
    this.aspectRatio = width / height;
    this.horizontal = true;
    let blurValue = this.getBlurValue() * width;
    const imageData = new Uint8ClampedArray(data);
    const samples = 15;
    const bytesInRow = 4 * width;
    for (let i = 0; i < data.length; i += 4) {
      let r = 0.0,
        g = 0.0,
        b = 0.0,
        a = 0.0,
        totalA = 0;
      const minIRow = i - (i % bytesInRow);
      const maxIRow = minIRow + bytesInRow;
      // for now let's keep noise out of the way
      // let pixelOffset = 0;
      // const offset = Math.random() * 3;
      // if (offset > 2) {
      //   pixelOffset = 4;
      // } else if (offset < 1) {
      //   pixelOffset = -4;
      // }
      for (let j = -samples + 1; j < samples; j++) {
        const percent = j / samples;
        const distance = Math.floor(blurValue * percent) * 4;
        const weight = 1 - Math.abs(percent);
        let sampledPixel = i + distance; // + pixelOffset;
        // try to implement edge mirroring
        if (sampledPixel < minIRow) {
          sampledPixel = minIRow;
        } else if (sampledPixel > maxIRow) {
          sampledPixel = maxIRow;
        }
        const localAlpha = data[sampledPixel + 3] * weight;
        r += data[sampledPixel] * localAlpha;
        g += data[sampledPixel + 1] * localAlpha;
        b += data[sampledPixel + 2] * localAlpha;
        a += localAlpha;
        totalA += weight;
      }
      imageData[i] = r / a;
      imageData[i + 1] = g / a;
      imageData[i + 2] = b / a;
      imageData[i + 3] = a / totalA;
    }
    this.horizontal = false;
    blurValue = this.getBlurValue() * height;
    for (let i = 0; i < imageData.length; i += 4) {
      let r = 0.0,
        g = 0.0,
        b = 0.0,
        a = 0.0,
        totalA = 0;
      const minIRow = i % bytesInRow;
      const maxIRow = imageData.length - bytesInRow + minIRow;
      // for now let's keep noise out of the way
      // let pixelOffset = 0;
      // const offset = Math.random() * 3;
      // if (offset > 2) {
      //   pixelOffset = bytesInRow;
      // } else if (offset < 1) {
      //   pixelOffset = -bytesInRow;
      // }
      for (let j = -samples + 1; j < samples; j++) {
        const percent = j / samples;
        const distance = Math.floor(blurValue * percent) * bytesInRow;
        const weight = 1 - Math.abs(percent);
        let sampledPixel = i + distance; // + pixelOffset;
        // try to implement edge mirroring
        if (sampledPixel < minIRow) {
          sampledPixel = minIRow;
        } else if (sampledPixel > maxIRow) {
          sampledPixel = maxIRow;
        }
        const localAlpha = imageData[sampledPixel + 3] * weight;
        r += imageData[sampledPixel] * localAlpha;
        g += imageData[sampledPixel + 1] * localAlpha;
        b += imageData[sampledPixel + 2] * localAlpha;
        a += localAlpha;
        totalA += weight;
      }
      data[i] = r / a;
      data[i + 1] = g / a;
      data[i + 2] = b / a;
      data[i + 3] = a / totalA;
    }
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
    const delta = this.chooseRightDelta();
    gl.uniform2fv(uniformLocations.uDelta, delta);
  }

  /**
   * 是否为中性状态
   * @returns boolean
   */
  isNeutralState() {
    return this.blur === 0;
  }

  /**
   * 获取模糊值
   * @returns number
   */
  getBlurValue(): number {
    let blurScale = 1;
    const { horizontal, aspectRatio } = this;
    if (horizontal) {
      if (aspectRatio > 1) {
        // image is wide, i want to shrink radius horizontal
        blurScale = 1 / aspectRatio;
      }
    } else {
      if (aspectRatio < 1) {
        // image is tall, i want to shrink radius vertical
        blurScale = aspectRatio;
      }
    }
    return blurScale * this.blur * 0.12;
  }

  /**
   * 选择正确的图像百分比值进行模糊
   *
   * choose right value of image percentage to blur with
   * @returns {Array} a numeric array with delta values 包含 delta 值的数字数组
   */
  chooseRightDelta() {
    const blur = this.getBlurValue();
    return this.horizontal ? [blur, 0] : [0, blur];
  }
}

classRegistry.setClass(Blur);
