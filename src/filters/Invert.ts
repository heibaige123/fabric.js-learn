import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/invert';

/**
 * Invert 滤镜的自有属性
 */
export type InvertOwnProps = {
  /**
   * 是否反转 alpha 通道
   */
  alpha: boolean;
  /**
   * 是否启用反转
   */
  invert: boolean;
};

/**
 * Invert 滤镜的默认值
 */
export const invertDefaultValues: InvertOwnProps = {
  /**
   * 默认不反转 alpha 通道
   */
  alpha: false,
  /**
   * 默认启用反转
   */
  invert: true,
};

/**
 * 反转滤镜类
 *
 * @example
 * const filter = new Invert();
 * object.filters.push(filter);
 * object.applyFilters(canvas.renderAll.bind(canvas));
 */
export class Invert extends BaseFilter<'Invert', InvertOwnProps> {
  /**
   * 是否也反转 alpha 通道。
   *
   * Invert also alpha.
   * @param {Boolean} alpha
   **/
  declare alpha: InvertOwnProps['alpha'];

  /**
   * 滤镜反转。如果为 false，则不执行任何操作
   *
   * Filter invert. if false, does nothing
   * @param {Boolean} invert
   */
  declare invert: InvertOwnProps['invert'];

  static type = 'Invert';

  static defaults = invertDefaultValues;

  static uniformLocations = ['uInvert', 'uAlpha'];

  /**
   * 将反转操作应用于表示图像像素的 Uint8Array。
   *
   * Apply the Invert operation to a Uint8Array representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8Array to be filtered. 要过滤的 Uint8Array。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];

      if (this.alpha) {
        data[i + 3] = 255 - data[i + 3];
      }
    }
  }

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  protected getFragmentSource(): string {
    return fragmentSource;
  }

  /**
   * 反转滤镜 isNeutralState 实现
   * 仅在图像 applyFilters 中使用，以丢弃对图像没有影响的滤镜
   *
   * Invert filter isNeutralState implementation
   * Used only in image applyFilters to discard filters that will not have an effect
   * on the image
   * @param {Object} options 选项
   * @returns {boolean} 是否为中性状态
   **/
  isNeutralState() {
    return !this.invert;
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
    gl.uniform1i(uniformLocations.uInvert, Number(this.invert));
    gl.uniform1i(uniformLocations.uAlpha, Number(this.alpha));
  }
}

classRegistry.setClass(Invert);
