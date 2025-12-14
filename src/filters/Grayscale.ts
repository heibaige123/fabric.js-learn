import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/grayscale';

/**
 * 灰度模式类型
 */
export type TGrayscaleMode = 'average' | 'lightness' | 'luminosity';

/**
 * Grayscale 滤镜的自有属性
 */
type GrayscaleOwnProps = {
  /**
   * 灰度模式
   */
  mode: TGrayscaleMode;
};

/**
 * Grayscale 滤镜的默认值
 */
export const grayscaleDefaultValues: GrayscaleOwnProps = {
  /**
   * 默认灰度模式
   */
  mode: 'average',
};

/**
 * 灰度图像滤镜类
 *
 * Grayscale image filter class
 * @example
 * const filter = new Grayscale();
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class Grayscale extends BaseFilter<'Grayscale', GrayscaleOwnProps> {
  /**
   * 灰度模式
   */
  declare mode: TGrayscaleMode;

  static type = 'Grayscale';

  static defaults = grayscaleDefaultValues;

  static uniformLocations = ['uMode'];

  /**
   * 将灰度操作应用于表示图像像素的 Uint8Array。
   *
   * Apply the Grayscale operation to a Uint8Array representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8Array to be filtered. 要过滤的 Uint8Array。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    for (let i = 0, value: number; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      switch (this.mode) {
        case 'average':
          value = (r + g + b) / 3;
          break;
        case 'lightness':
          value = (Math.min(r, g, b) + Math.max(r, g, b)) / 2;
          break;
        case 'luminosity':
          value = 0.21 * r + 0.72 * g + 0.07 * b;
          break;
      }

      data[i + 2] = data[i + 1] = data[i] = value;
    }
  }

  /**
   * 获取缓存键
   * @returns {string} 缓存键
   */
  getCacheKey() {
    return `${this.type}_${this.mode}`;
  }

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource[this.mode];
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
    const mode = 1;
    gl.uniform1i(uniformLocations.uMode, mode);
  }

  /**
   * 灰度滤镜 isNeutralState 实现
   * 该滤镜在图像上永远不是中性的
   *
   * Grayscale filter isNeutralState implementation
   * The filter is never neutral
   * on the image
   * @returns {boolean} 是否为中性状态
   **/
  isNeutralState() {
    return false;
  }
}

classRegistry.setClass(Grayscale);
