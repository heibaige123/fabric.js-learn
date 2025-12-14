import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/noise';

/**
 * Noise 滤镜的自有属性
 */
export type NoiseOwnProps = {
  /**
   * 噪声值
   */
  noise: number;
};

/**
 * Noise 滤镜的默认值
 */
export const noiseDefaultValues: NoiseOwnProps = {
  /**
   * 默认噪声值
   */
  noise: 0,
};

/**
 * 噪声滤镜类
 *
 * Noise filter class
 * @example
 * const filter = new Noise({
 *   noise: 700
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 */
export class Noise extends BaseFilter<'Noise', NoiseOwnProps> {
  /**
   * 噪声值
   *
   * Noise value, from
   * @param {Number} noise
   */
  declare noise: NoiseOwnProps['noise'];

  static type = 'Noise';

  static defaults = noiseDefaultValues;

  static uniformLocations = ['uNoise', 'uSeed'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource;
  }

  /**
   * 将噪声操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the Brightness operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const noise = this.noise;
    for (let i = 0; i < data.length; i += 4) {
      const rand = (0.5 - Math.random()) * noise;
      data[i] += rand;
      data[i + 1] += rand;
      data[i + 2] += rand;
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
    gl.uniform1f(uniformLocations.uNoise, this.noise / 255);
    gl.uniform1f(uniformLocations.uSeed, Math.random());
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return this.noise === 0;
  }
}

classRegistry.setClass(Noise);
