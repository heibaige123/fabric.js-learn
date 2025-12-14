import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/pixelate';

/**
 * Pixelate 滤镜的自有属性
 */
export type PixelateOwnProps = {
  /**
   * 块大小
   */
  blocksize: number;
};

/**
 * Pixelate 滤镜的默认值
 */
export const pixelateDefaultValues: PixelateOwnProps = {
  /**
   * 默认块大小
   */
  blocksize: 4,
};

/**
 * 像素化滤镜类
 *
 * Pixelate filter class
 * @example
 * const filter = new Pixelate({
 *   blocksize: 8
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class Pixelate extends BaseFilter<'Pixelate', PixelateOwnProps> {
  /**
   * 块大小
   */
  declare blocksize: PixelateOwnProps['blocksize'];

  static type = 'Pixelate';

  static defaults = pixelateDefaultValues;

  static uniformLocations = ['uBlocksize'];

  /**
   * 将像素化操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the Pixelate operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d({ imageData: { data, width, height } }: T2DPipelineState) {
    for (let i = 0; i < height; i += this.blocksize) {
      for (let j = 0; j < width; j += this.blocksize) {
        const index = i * 4 * width + j * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        for (let _i = i; _i < Math.min(i + this.blocksize, height); _i++) {
          for (let _j = j; _j < Math.min(j + this.blocksize, width); _j++) {
            const index = _i * 4 * width + _j * 4;
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = a;
          }
        }
      }
    }
  }

  /**
   * 指示滤镜何时不对图像应用更改
   *
   * Indicate when the filter is not gonna apply changes to the image
   * @returns {boolean} 是否为中性状态
   **/
  isNeutralState() {
    return this.blocksize === 1;
  }

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  protected getFragmentSource(): string {
    return fragmentSource;
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
    gl.uniform1f(uniformLocations.uBlocksize, this.blocksize);
  }
}

classRegistry.setClass(Pixelate);
