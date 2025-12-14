import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';

/**
 * MyFilter 滤镜的自有属性
 */
type MyFilterOwnProps = {
  /**
   * 自定义参数
   */
  myParameter: number;
};

/**
 * MyFilter 滤镜的默认值
 */
export const myFilterDefaultValues: MyFilterOwnProps = {
  /**
   * 自定义参数默认值
   */
  myParameter: 0,
};

/**
 * MyFilter 滤镜类
 *
 * MyFilter filter class
 * @example
 * const filter = new MyFilter({
 *   add here an example of how to use your filter
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class MyFilter extends BaseFilter<'MyFilter', MyFilterOwnProps> {
  /**
   * MyFilter 值，从 -1 到 1。
   * 对于 2d 转换为 -255 到 255
   * 0.0039215686 是 1 的一部分，在 2d 中转换为 1
   *
   * MyFilter value, from -1 to 1.
   * translated to -255 to 255 for 2d
   * 0.0039215686 is the part of 1 that get translated to 1 in 2d
   * @param {Number} myParameter
   */
  declare myParameter: MyFilterOwnProps['myParameter'];

  static type = 'MyFilter';

  static defaults = myFilterDefaultValues;

  static uniformLocations = ['uMyParameter'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return `
      precision highp float;
        uniform sampler2D uTexture;
        uniform float uMyParameter;
        varying vec2 vTexCoord;
        void main() {
          vec4 color = texture2D(uTexture, vTexCoord);
          // add your gl code here
          gl_FragColor = color;
        }
      `;
  }
  /**
   * 将 MyFilter 操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the MyFilter operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d(options: T2DPipelineState) {
    if (this.myParameter === 0) {
      // early return if the parameter value has a neutral value
      return;
    }

    for (let i = 0; i < options.imageData.data.length; i += 4) {
      // insert here your code to modify data[i]
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
    gl.uniform1f(uniformLocations.uMyParameter, this.myParameter);
  }

  /**
   * 从对象创建实例
   * @param {any} object 对象
   * @returns {Promise<MyFilter>} Promise 对象
   */
  static async fromObject(object: any): Promise<MyFilter> {
    // or overide with custom logic if your filter needs to
    // deserialize something that is not a plain value
    return new this(object);
  }
}
