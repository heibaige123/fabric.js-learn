import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/vibrance';

/**
 * Vibrance 滤镜的自有属性
 */
export type VibranceOwnProps = {
  /**
   * 自然饱和度值
   */
  vibrance: number;
};

/**
 * Vibrance 滤镜的默认值
 */
export const vibranceDefaultValues: VibranceOwnProps = {
  /**
   * 默认自然饱和度值
   */
  vibrance: 0,
};

/**
 * 自然饱和度滤镜类
 *
 * Vibrance filter class
 * @example
 * const filter = new Vibrance({
 *   vibrance: 1
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class Vibrance extends BaseFilter<'Vibrance', VibranceOwnProps> {
  /**
   * 自然饱和度值，从 -1 到 1。
   * 增加/减少较柔和颜色的饱和度，对饱和颜色的影响较小。
   * 值为 0 没有效果。
   *
   * Vibrance value, from -1 to 1.
   * Increases/decreases the saturation of more muted colors with less effect on saturated colors.
   * A value of 0 has no effect.
   *
   * @param {Number} vibrance
   */
  declare vibrance: VibranceOwnProps['vibrance'];

  static type = 'Vibrance';

  static defaults = vibranceDefaultValues;

  static uniformLocations = ['uVibrance'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource;
  }

  /**
   * 将自然饱和度操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the Vibrance operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const adjust = -this.vibrance;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const avg = (r + g + b) / 3;
      const amt = ((Math.abs(max - avg) * 2) / 255) * adjust;
      data[i] += max !== r ? (max - r) * amt : 0;
      data[i + 1] += max !== g ? (max - g) * amt : 0;
      data[i + 2] += max !== b ? (max - b) * amt : 0;
    }
  }

  /**
   * 将数据从此滤镜发送到其着色器程序的 uniform。
   *
   * Send data from this filter to its shader program's uniforms.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader. 用于编译此滤镜着色器的 GL 画布上下文。
   * @param {TWebGLUniformLocationMap} uniformLocations A map of string uniform names to WebGLUniformLocation objects 字符串 uniform 名称到 WebGLUniformLocation 对象的映射
   */
  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: TWebGLUniformLocationMap,
  ) {
    gl.uniform1f(uniformLocations.uVibrance, -this.vibrance);
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return this.vibrance === 0;
  }
}

classRegistry.setClass(Vibrance);
