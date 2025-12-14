import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/constrast';

/**
 * Contrast 滤镜的自有属性
 */
type ContrastOwnProps = {
  /**
   * 对比度值
   */
  contrast: number;
};

/**
 * Contrast 滤镜的默认值
 */
export const contrastDefaultValues: ContrastOwnProps = {
  /**
   * 默认对比度值
   */
  contrast: 0,
};

/**
 * 对比度滤镜类
 *
 * Contrast filter class
 * @example
 * const filter = new Contrast({
 *   contrast: 0.25
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class Contrast extends BaseFilter<'Contrast', ContrastOwnProps> {
  /**
   * 对比度值，范围从 -1 到 1。
   *
   * contrast value, range from -1 to 1.
   * @param {Number} contrast
   * @default 0
   */
  declare contrast: ContrastOwnProps['contrast'];

  static type = 'Contrast';

  static defaults = contrastDefaultValues;

  static uniformLocations = ['uContrast'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource;
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return this.contrast === 0;
  }

  /**
   * 将对比度操作应用于表示图像像素的 Uint8Array。
   *
   * Apply the Contrast operation to a Uint8Array representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8Array to be filtered. 要过滤的 Uint8Array。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const contrast = Math.floor(this.contrast * 255),
      contrastF = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = contrastF * (data[i] - 128) + 128;
      data[i + 1] = contrastF * (data[i + 1] - 128) + 128;
      data[i + 2] = contrastF * (data[i + 2] - 128) + 128;
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
    gl.uniform1f(uniformLocations.uContrast, this.contrast);
  }
}

classRegistry.setClass(Contrast);
