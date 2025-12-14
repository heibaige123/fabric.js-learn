import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/saturation';

/**
 * Saturation 滤镜的自有属性
 */
export type SaturationOwnProps = {
  /**
   * 饱和度值
   */
  saturation: number;
};

/**
 * Saturation 滤镜的默认值
 */
export const saturationDefaultValues: SaturationOwnProps = {
  /**
   * 默认饱和度值
   */
  saturation: 0,
};

/**
 * 饱和度滤镜类
 *
 * Saturate filter class
 * @example
 * const filter = new Saturation({
 *   saturation: 1
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class Saturation extends BaseFilter<'Saturation', SaturationOwnProps> {
  /**
   * 饱和度值，从 -1 到 1。
   * 增加/减少颜色饱和度。
   * 值为 0 没有效果。
   *
   * Saturation value, from -1 to 1.
   * Increases/decreases the color saturation.
   * A value of 0 has no effect.
   *
   * @param {Number} saturation
   */
  declare saturation: SaturationOwnProps['saturation'];

  static type = 'Saturation';

  static defaults = saturationDefaultValues;

  static uniformLocations = ['uSaturation'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource;
  }

  /**
   * 将饱和度操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the Saturation operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const adjust = -this.saturation;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      data[i] += max !== r ? (max - r) * adjust : 0;
      data[i + 1] += max !== g ? (max - g) * adjust : 0;
      data[i + 2] += max !== b ? (max - b) * adjust : 0;
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
    gl.uniform1f(uniformLocations.uSaturation, -this.saturation);
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return this.saturation === 0;
  }
}

classRegistry.setClass(Saturation);
