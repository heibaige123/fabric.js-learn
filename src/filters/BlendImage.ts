import { FabricImage } from '../shapes/Image';
import { createCanvasElement } from '../util/misc/dom';
import { BaseFilter } from './BaseFilter';
import type {
  T2DPipelineState,
  TWebGLPipelineState,
  TWebGLUniformLocationMap,
} from './typedefs';
import type { WebGLFilterBackend } from './WebGLFilterBackend';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource, vertexSource } from './shaders/blendImage';

/**
 * 图像混合模式类型
 */
export type TBlendImageMode = 'multiply' | 'mask';

/**
 * BlendImage 滤镜的自有属性
 */
type BlendImageOwnProps = {
  mode: TBlendImageMode;
  alpha: number;
};

/**
 * BlendImage 滤镜的默认值
 */
export const blendImageDefaultValues: BlendImageOwnProps = {
  mode: 'multiply',
  alpha: 1,
};

/**
 * 图像混合滤镜类
 *
 * Image Blend filter class
 * @example
 * const filter = new filters.BlendColor({
 *  color: '#000',
 *  mode: 'multiply'
 * });
 *
 * const filter = new BlendImage({
 *  image: fabricImageObject,
 *  mode: 'multiply'
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 */
export class BlendImage extends BaseFilter<'BlendImage', BlendImageOwnProps> {
  /**
   * 用于混合操作的图像。
   *
   * Image to make the blend operation with.
   **/
  declare image: FabricImage;

  /**
   * 滤镜的混合模式：'multiply' 或 'mask'。
   * 'multiply' 将滤镜图像的每个通道（R、G、B 和 A）的值乘以基础图像中的对应值。
   * 'mask' 将仅查看滤镜图像的 alpha 通道，并将这些值应用于基础图像的 alpha 通道。
   *
   * Blend mode for the filter: either 'multiply' or 'mask'. 'multiply' will
   * multiply the values of each channel (R, G, B, and A) of the filter image by
   * their corresponding values in the base image. 'mask' will only look at the
   * alpha channel of the filter image, and apply those values to the base
   * image's alpha channel.
   * @type String
   **/
  declare mode: BlendImageOwnProps['mode'];

  /**
   * alpha 值。表示混合图像操作的强度。
   * 未实现。
   *
   * alpha value. represent the strength of the blend image operation.
   * not implemented.
   **/
  declare alpha: BlendImageOwnProps['alpha'];

  static type = 'BlendImage';

  static defaults = blendImageDefaultValues;

  static uniformLocations = ['uTransformMatrix', 'uImage'];

  /**
   * 获取缓存键
   * @returns 缓存键字符串
   */
  getCacheKey() {
    return `${this.type}_${this.mode}`;
  }

  /**
   * 获取片段着色器源码
   * @returns 片段着色器源码字符串
   */
  getFragmentSource(): string {
    return fragmentSource[this.mode];
  }

  /**
   * 获取顶点着色器源码
   * @returns 顶点着色器源码字符串
   */
  getVertexSource(): string {
    return vertexSource;
  }

  /**
   * 应用于 WebGL 上下文
   * @param options WebGL 管道状态
   */
  applyToWebGL(options: TWebGLPipelineState) {
    const gl = options.context,
      texture = this.createTexture(options.filterBackend, this.image);
    this.bindAdditionalTexture(gl, texture!, gl.TEXTURE1);
    super.applyToWebGL(options);
    this.unbindAdditionalTexture(gl, gl.TEXTURE1);
  }

  /**
   * 创建纹理
   * @param backend WebGL 滤镜后端
   * @param image Fabric 图像对象
   * @returns WebGL 纹理
   */
  createTexture(backend: WebGLFilterBackend, image: FabricImage) {
    return backend.getCachedTexture(image.cacheKey, image.getElement());
  }

  /**
   * 计算变换矩阵以适应要混合的图像
   *
   * Calculate a transformMatrix to adapt the image to blend over
   * @param {Object} options 选项
   * @param {WebGLRenderingContext} options.context The GL context used for rendering. 用于渲染的 GL 上下文。
   * @param {Object} options.programCache A map of compiled shader programs, keyed by filter type. 已编译着色器程序的映射，以滤镜类型为键。
   */
  calculateMatrix() {
    const image = this.image,
      { width, height } = image.getElement();
    return [
      1 / image.scaleX,
      0,
      0,
      0,
      1 / image.scaleY,
      0,
      -image.left / width,
      -image.top / height,
      1,
    ];
  }

  /**
   * 将混合操作应用于表示图像像素的 Uint8ClampedArray。
   *
   * Apply the Blend operation to a Uint8ClampedArray representing the pixels of an image.
   *
   * @param {Object} options 选项
   * @param {ImageData} options.imageData The Uint8ClampedArray to be filtered. 要过滤的 Uint8ClampedArray。
   */
  applyTo2d({
    imageData: { data, width, height },
    filterBackend: { resources },
  }: T2DPipelineState) {
    const image = this.image;
    if (!resources.blendImage) {
      resources.blendImage = createCanvasElement();
    }
    const canvas1 = resources.blendImage;
    const context = canvas1.getContext('2d')!;
    if (canvas1.width !== width || canvas1.height !== height) {
      canvas1.width = width;
      canvas1.height = height;
    } else {
      context.clearRect(0, 0, width, height);
    }
    context.setTransform(
      image.scaleX,
      0,
      0,
      image.scaleY,
      image.left,
      image.top,
    );
    context.drawImage(image.getElement(), 0, 0, width, height);
    const blendData = context.getImageData(0, 0, width, height).data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      const tr = blendData[i];
      const tg = blendData[i + 1];
      const tb = blendData[i + 2];
      const ta = blendData[i + 3];

      switch (this.mode) {
        case 'multiply':
          data[i] = (r * tr) / 255;
          data[i + 1] = (g * tg) / 255;
          data[i + 2] = (b * tb) / 255;
          data[i + 3] = (a * ta) / 255;
          break;
        case 'mask':
          data[i + 3] = ta;
          break;
      }
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
    const matrix = this.calculateMatrix();
    gl.uniform1i(uniformLocations.uImage, 1); // texture unit 1.
    gl.uniformMatrix3fv(uniformLocations.uTransformMatrix, false, matrix);
  }

  /**
   * 返回实例的对象表示
   * TODO: 更好地处理缺少图像的可能性。
   * 目前，没有图像的 BlendImage 滤镜不能与 fromObject 一起使用
   *
   * Returns object representation of an instance
   * TODO: Handle the possibility of missing image better.
   * As of now a BlendImage filter without image can't be used with fromObject
   * @return {Object} Object representation of an instance 实例的对象表示
   */
  toObject(): {
    type: 'BlendImage';
    image: ReturnType<FabricImage['toObject']>;
  } & BlendImageOwnProps {
    return {
      ...super.toObject(),
      image: this.image && this.image.toObject(),
    };
  }

  /**
   * 从对象表示创建滤镜实例
   *
   * Create filter instance from an object representation
   * @param {object} object Object to create an instance from 用于创建实例的对象
   * @param {object} [options] 选项
   * @param {AbortSignal} [options.signal] handle aborting image loading, see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal 处理中止图像加载
   * @returns {Promise<BlendImage>}
   */
  static async fromObject(
    { type, image, ...filterOptions }: Record<string, any>,
    options: { signal: AbortSignal },
  ): Promise<BaseFilter<'BlendImage', BlendImageOwnProps>> {
    return FabricImage.fromObject(image, options).then(
      (enlivedImage) => new this({ ...filterOptions, image: enlivedImage }),
    );
  }
}

classRegistry.setClass(BlendImage);
