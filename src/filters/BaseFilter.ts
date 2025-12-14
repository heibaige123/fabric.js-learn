import { getEnv } from '../env';
import type {
  T2DPipelineState,
  TWebGLAttributeLocationMap,
  TWebGLPipelineState,
  TWebGLProgramCacheItem,
  TWebGLUniformLocationMap,
} from './typedefs';
import { isWebGLPipelineState } from './utils';
import {
  highPsourceCode,
  identityFragmentShader,
  vertexSource,
} from './shaders/baseFilter';
import type { Abortable } from '../typedefs';
import { FabricError } from '../util/internals/console';
import { createCanvasElementFor } from '../util/misc/dom';

const regex = new RegExp(highPsourceCode, 'g');

/**
 * 滤镜基类
 */
export class BaseFilter<
  Name extends string,
  OwnProps extends Record<string, any> = object,
  SerializedProps extends Record<string, any> = OwnProps,
> {
  /**
   * 滤镜类型
   *
   * Filter type
   */
  get type(): Name {
    return (this.constructor as typeof BaseFilter).type as Name;
  }

  /**
   * 类类型。用于标识这是哪个类。
   * 用于序列化目的，在内部可用于标识类。
   * 作为开发人员，你可以使用 `instance of Class`，但为了避免导入所有代码并阻止 tree shaking，我们尽量避免这样做。
   *
   * The class type. Used to identify which class this is.
   * This is used for serialization purposes and internally it can be used
   * to identify classes. As a developer you could use `instance of Class`
   * but to avoid importing all the code and blocking tree shaking we try
   * to avoid doing that.
   */
  static type = 'BaseFilter';

  /**
   * 包含片段着色器的 uniform 位置。
   * uStepW 和 uStepH 由 BaseFilter 处理，每个滤镜类需要指定所有需要的 uniform。
   *
   * Contains the uniform locations for the fragment shader.
   * uStepW and uStepH are handled by the BaseFilter, each filter class
   * needs to specify all the one that are needed
   */
  static uniformLocations: string[] = [];

  declare static defaults: Record<string, unknown>;

  /**
   * 构造函数
   *
   * Constructor
   * @param {Object} [options] Options object 选项对象
   */
  constructor({
    type,
    ...options
  }: { type?: never } & Partial<OwnProps> & Record<string, any> = {}) {
    Object.assign(
      this,
      (this.constructor as typeof BaseFilter).defaults,
      options,
    );
  }

  /**
   * 获取片段着色器源码
   * @returns string 片段着色器源码
   */
  protected getFragmentSource(): string {
    return identityFragmentShader;
  }

  /**
   * 获取顶点着色器源码
   * @returns string 顶点着色器源码
   */
  getVertexSource(): string {
    return vertexSource;
  }

  /**
   * 编译此滤镜的着色器程序。
   *
   * Compile this filter's shader program.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context to use for shader compilation. 用于着色器编译的 GL 画布上下文
   * @param {String} fragmentSource fragmentShader source for compilation 用于编译的片段着色器源码
   * @param {String} vertexSource vertexShader source for compilation 用于编译的顶点着色器源码
   */
  createProgram(
    gl: WebGLRenderingContext,
    fragmentSource: string = this.getFragmentSource(),
    vertexSource: string = this.getVertexSource(),
  ) {
    const {
      WebGLProbe: { GLPrecision = 'highp' },
    } = getEnv();
    if (GLPrecision !== 'highp') {
      fragmentSource = fragmentSource.replace(
        regex,
        highPsourceCode.replace('highp', GLPrecision),
      );
    }
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    const program = gl.createProgram();

    if (!vertexShader || !fragmentShader || !program) {
      throw new FabricError(
        'Vertex, fragment shader or program creation error',
      );
    }
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      throw new FabricError(
        `Vertex shader compile error for ${this.type}: ${gl.getShaderInfoLog(
          vertexShader,
        )}`,
      );
    }

    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      throw new FabricError(
        `Fragment shader compile error for ${this.type}: ${gl.getShaderInfoLog(
          fragmentShader,
        )}`,
      );
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new FabricError(
        `Shader link error for "${this.type}" ${gl.getProgramInfoLog(program)}`,
      );
    }

    const uniformLocations = this.getUniformLocations(gl, program) || {};
    uniformLocations.uStepW = gl.getUniformLocation(program, 'uStepW');
    uniformLocations.uStepH = gl.getUniformLocation(program, 'uStepH');

    return {
      program,
      attributeLocations: this.getAttributeLocations(gl, program),
      uniformLocations,
    };
  }

  /**
   * 返回属性名称到 WebGLAttributeLocation 对象的映射。
   *
   * Return a map of attribute names to WebGLAttributeLocation objects.
   *
   * @param {WebGLRenderingContext} gl The canvas context used to compile the shader program. 用于编译着色器程序的画布上下文
   * @param {WebGLShaderProgram} program The shader program from which to take attribute locations. 从中获取属性位置的着色器程序
   * @returns {Object} A map of attribute names to attribute locations. 属性名称到属性位置的映射
   */
  getAttributeLocations(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
  ): TWebGLAttributeLocationMap {
    return {
      aPosition: gl.getAttribLocation(program, 'aPosition'),
    };
  }

  /**
   * 返回 uniform 名称到 WebGLUniformLocation 对象的映射。
   *
   * Return a map of uniform names to WebGLUniformLocation objects.
   *
   * @param {WebGLRenderingContext} gl The canvas context used to compile the shader program. 用于编译着色器程序的画布上下文
   * @param {WebGLShaderProgram} program The shader program from which to take uniform locations. 从中获取 uniform 位置的着色器程序
   * @returns {Object} A map of uniform names to uniform locations. uniform 名称到 uniform 位置的映射
   */
  getUniformLocations(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
  ): TWebGLUniformLocationMap {
    const locations = (this.constructor as unknown as typeof BaseFilter<string>)
      .uniformLocations;

    const uniformLocations: Record<string, WebGLUniformLocation | null> = {};
    for (let i = 0; i < locations.length; i++) {
      uniformLocations[locations[i]] = gl.getUniformLocation(
        program,
        locations[i],
      );
    }
    return uniformLocations;
  }

  /**
   * 将属性数据从此滤镜发送到 GPU 上的着色器程序。
   *
   * Send attribute data from this filter to its shader program on the GPU.
   *
   * @param {WebGLRenderingContext} gl The canvas context used to compile the shader program. 用于编译着色器程序的画布上下文
   * @param {Object} attributeLocations A map of shader attribute names to their locations. 着色器属性名称到其位置的映射
   * @param {Float32Array} aPositionData 属性位置数据
   */
  sendAttributeData(
    gl: WebGLRenderingContext,
    attributeLocations: Record<string, number>,
    aPositionData: Float32Array,
  ) {
    const attributeLocation = attributeLocations.aPosition;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(attributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, aPositionData, gl.STATIC_DRAW);
  }

  /**
   * 设置帧缓冲区
   * @param options WebGL 管道状态
   */
  _setupFrameBuffer(options: TWebGLPipelineState) {
    const gl = options.context;
    if (options.passes > 1) {
      const width = options.destinationWidth;
      const height = options.destinationHeight;
      if (options.sourceWidth !== width || options.sourceHeight !== height) {
        gl.deleteTexture(options.targetTexture);
        options.targetTexture = options.filterBackend.createTexture(
          gl,
          width,
          height,
        );
      }
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        options.targetTexture,
        0,
      );
    } else {
      // draw last filter on canvas and not to framebuffer.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.finish();
    }
  }

  /**
   * 交换纹理
   * @param options WebGL 管道状态
   */
  _swapTextures(options: TWebGLPipelineState) {
    options.passes--;
    options.pass++;
    const temp = options.targetTexture;
    options.targetTexture = options.sourceTexture;
    options.sourceTexture = temp;
  }

  /**
   * 基于单参数滤镜的通用 isNeutral 实现。
   * 仅在图像 applyFilters 中使用，以丢弃对图像没有影响的滤镜。
   * 其他滤镜可能需要自己的版本（ColorMatrix、HueRotation、gamma、ComposedFilter）
   *
   * Generic isNeutral implementation for one parameter based filters.
   * Used only in image applyFilters to discard filters that will not have an effect
   * on the image
   * Other filters may need their own version ( ColorMatrix, HueRotation, gamma, ComposedFilter )
   * @param {Object} options 选项
   * @returns {boolean} 是否为中性状态
   **/
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isNeutralState(options?: any): boolean {
    return false;
  }

  /**
   * 将此滤镜应用于提供的输入图像数据。
   *
   * 根据 options.webgl 标志确定是使用 WebGL 还是 Canvas2D。
   *
   * Apply this filter to the input image data provided.
   *
   * Determines whether to use WebGL or Canvas2D based on the options.webgl flag.
   *
   * @param {Object} options 选项
   * @param {Number} options.passes The number of filters remaining to be executed 剩余要执行的滤镜数量
   * @param {Boolean} options.webgl Whether to use webgl to render the filter. 是否使用 webgl 渲染滤镜
   * @param {WebGLTexture} options.sourceTexture The texture setup as the source to be filtered. 设置为要过滤的源的纹理
   * @param {WebGLTexture} options.targetTexture The texture where filtered output should be drawn. 过滤后的输出应绘制到的纹理
   * @param {WebGLRenderingContext} options.context The GL context used for rendering. 用于渲染的 GL 上下文
   * @param {Object} options.programCache A map of compiled shader programs, keyed by filter type. 已编译着色器程序的映射，以滤镜类型为键
   */
  applyTo(options: TWebGLPipelineState | T2DPipelineState) {
    if (isWebGLPipelineState(options)) {
      this._setupFrameBuffer(options);
      this.applyToWebGL(options);
      this._swapTextures(options);
    } else {
      this.applyTo2d(options);
    }
  }

  /**
   * 应用于 2D 上下文
   * @param _options 2D 管道状态
   */
  applyTo2d(_options: T2DPipelineState): void {
    // override by subclass
  }

  /**
   * 返回表示当前选定的滤镜着色器代码的字符串。
   * 用于在参数更改时强制重新编译或从缓存中检索着色器
   *
   * Returns a string that represent the current selected shader code for the filter.
   * Used to force recompilation when parameters change or to retrieve the shader from cache
   * @type string
   * @returns {string} 缓存键
   **/
  getCacheKey(): string {
    return this.type;
  }

  /**
   * 检索缓存的着色器。
   *
   * Retrieves the cached shader.
   * @param {Object} options 选项
   * @param {WebGLRenderingContext} options.context The GL context used for rendering. 用于渲染的 GL 上下文
   * @param {Object} options.programCache A map of compiled shader programs, keyed by filter type. 已编译着色器程序的映射，以滤镜类型为键
   * @return {WebGLProgram} the compiled program shader 编译后的程序着色器
   */
  retrieveShader(options: TWebGLPipelineState): TWebGLProgramCacheItem {
    const key = this.getCacheKey();
    if (!options.programCache[key]) {
      options.programCache[key] = this.createProgram(options.context);
    }
    return options.programCache[key];
  }

  /**
   * 使用 webgl 应用此滤镜。
   *
   * Apply this filter using webgl.
   *
   * @param {Object} options 选项
   * @param {Number} options.passes The number of filters remaining to be executed 剩余要执行的滤镜数量
   * @param {Boolean} options.webgl Whether to use webgl to render the filter. 是否使用 webgl 渲染滤镜
   * @param {WebGLTexture} options.originalTexture The texture of the original input image. 原始输入图像的纹理
   * @param {WebGLTexture} options.sourceTexture The texture setup as the source to be filtered. 设置为要过滤的源的纹理
   * @param {WebGLTexture} options.targetTexture The texture where filtered output should be drawn. 过滤后的输出应绘制到的纹理
   * @param {WebGLRenderingContext} options.context The GL context used for rendering. 用于渲染的 GL 上下文
   * @param {Object} options.programCache A map of compiled shader programs, keyed by filter type. 已编译着色器程序的映射，以滤镜类型为键
   */
  applyToWebGL(options: TWebGLPipelineState) {
    const gl = options.context;
    const shader = this.retrieveShader(options);
    if (options.pass === 0 && options.originalTexture) {
      gl.bindTexture(gl.TEXTURE_2D, options.originalTexture);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, options.sourceTexture);
    }
    gl.useProgram(shader.program);
    this.sendAttributeData(gl, shader.attributeLocations, options.aPosition);

    gl.uniform1f(shader.uniformLocations.uStepW, 1 / options.sourceWidth);
    gl.uniform1f(shader.uniformLocations.uStepH, 1 / options.sourceHeight);

    this.sendUniformData(gl, shader.uniformLocations);
    gl.viewport(0, 0, options.destinationWidth, options.destinationHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * 绑定额外的纹理
   * @param gl WebGL 上下文
   * @param texture 纹理对象
   * @param textureUnit 纹理单元
   */
  bindAdditionalTexture(
    gl: WebGLRenderingContext,
    texture: WebGLTexture,
    textureUnit: number,
  ) {
    gl.activeTexture(textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // reset active texture to 0 as usual
    gl.activeTexture(gl.TEXTURE0);
  }

  /**
   * 解绑额外的纹理
   * @param gl WebGL 上下文
   * @param textureUnit 纹理单元
   */
  unbindAdditionalTexture(gl: WebGLRenderingContext, textureUnit: number) {
    gl.activeTexture(textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
  }

  /**
   * 将 uniform 数据从此滤镜发送到 GPU 上的着色器程序。
   *
   * 旨在由子类覆盖。
   *
   * Send uniform data from this filter to its shader program on the GPU.
   *
   * Intended to be overridden by subclasses.
   *
   * @param {WebGLRenderingContext} _gl The canvas context used to compile the shader program. 用于编译着色器程序的画布上下文
   * @param {Object} _uniformLocations A map of shader uniform names to their locations. 着色器 uniform 名称到其位置的映射
   */
  sendUniformData(
    _gl: WebGLRenderingContext,
    _uniformLocations: TWebGLUniformLocationMap,
  ): void {
    // override by subclass
  }

  /**
   * 如果 2d 滤镜需要，此函数可以创建一个辅助画布以供使用
   * 请记住，options.targetCanvas 可供使用直到链结束。
   *
   * If needed by a 2d filter, this functions can create an helper canvas to be used
   * remember that options.targetCanvas is available for use till end of chain.
   * @param options 2D 管道状态
   */
  createHelpLayer(options: T2DPipelineState) {
    if (!options.helpLayer) {
      const { sourceWidth, sourceHeight } = options;
      const helpLayer = createCanvasElementFor({
        width: sourceWidth,
        height: sourceHeight,
      });
      options.helpLayer = helpLayer;
    }
  }

  /**
   * 返回实例的对象表示
   * 它将自动导出存储在静态 defaults 属性中的滤镜默认值。
   *
   * Returns object representation of an instance
   * It will automatically export the default values of a filter,
   * stored in the static defaults property.
   * @return {Object} Object representation of an instance 实例的对象表示
   */
  toObject(): { type: Name } & SerializedProps {
    const defaultKeys = Object.keys(
      (this.constructor as typeof BaseFilter).defaults || {},
    ) as (keyof SerializedProps)[];

    return {
      type: this.type,
      ...defaultKeys.reduce<SerializedProps>((acc, key) => {
        acc[key] = this[
          key as keyof this
        ] as unknown as (typeof acc)[typeof key];
        return acc;
      }, {} as SerializedProps),
    };
  }

  /**
   * 返回实例的 JSON 表示
   *
   * Returns a JSON representation of an instance
   * @return {Object} JSON
   */
  toJSON() {
    // delegate, not alias
    return this.toObject();
  }

  /**
   * 从对象创建实例
   * @param object 对象
   * @param _options 选项
   * @returns Promise<BaseFilter>
   */
  static async fromObject(
    { type, ...filterOptions }: Record<string, any>,
    _options?: Abortable,
  ): Promise<BaseFilter<string>> {
    return new this(filterOptions);
  }
}
