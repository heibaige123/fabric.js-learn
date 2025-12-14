import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/brightness';

/**
 * Brightness 滤镜的自有属性
 */
type BrightnessOwnProps = {
  /**
   * 亮度值
   */
  brightness: number;
};

/**
 * Brightness 滤镜的默认值
 */
export const brightnessDefaultValues: BrightnessOwnProps = {
  /**
   * 默认亮度值
   */
  brightness: 0,
};

/**
 * 亮度滤镜类
 *
 * Brightness filter class
 * @example
 * const filter = new Brightness({
 *   brightness: 0.05
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class Brightness extends BaseFilter<'Brightness', BrightnessOwnProps> {
  /**
   * 亮度值，从 -1 到 1。
   * 对于 2d 转换为 -255 到 255
   * 0.0039215686 是 1 的一部分，在 2d 中转换为 1
   *
   * Brightness value, from -1 to 1.
   * translated to -255 to 255 for 2d
   * 0.0039215686 is the part of 1 that get translated to 1 in 2d
   * @param {Number} brightness
   */
  declare brightness: BrightnessOwnProps['brightness'];

  static type = 'Brightness';

  static defaults = brightnessDefaultValues;

  static uniformLocations = ['uBrightness'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource;
  }

  /**
   * 将亮度操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the Brightness operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const brightness = Math.round(this.brightness * 255);
    for (let i = 0; i < data.length; i += 4) {
      data[i] += brightness;
      data[i + 1] += brightness;
      data[i + 2] += brightness;
    }
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return this.brightness === 0;
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
    gl.uniform1f(uniformLocations.uBrightness, this.brightness);
  }
}

classRegistry.setClass(Brightness);
