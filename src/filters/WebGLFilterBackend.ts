import { config } from '../config';
import { createCanvasElementFor } from '../util/misc/dom';
import type {
  TWebGLPipelineState,
  TProgramCache,
  TTextureCache,
  TPipelineResources,
} from './typedefs';
import type { BaseFilter } from './BaseFilter';

/**
 * WebGL 滤镜后端类
 */
export class WebGLFilterBackend {
  /**
   * 瓦片大小
   */
  declare tileSize: number;

  /**
   * 定义顶点位置数据
   *
   * Define ...
   **/
  aPosition: Float32Array = new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]);

  /**
   * 如果 GLPut 数据是最快的操作，或者如果强制执行，此缓冲区将用于
   * 将数据传回 2d 逻辑
   *
   * If GLPut data is the fastest operation, or if forced, this buffer will be used
   * to transfer the data back in the 2d logic
   **/
  declare imageBuffer?: ArrayBuffer;

  /**
   * 画布元素
   */
  declare canvas: HTMLCanvasElement;

  /**
   * 将执行过滤操作的 Webgl 上下文
   *
   * The Webgl context that will execute the operations for filtering
   **/
  declare gl: WebGLRenderingContext;

  /**
   * 着色器缓存的键控映射
   *
   * Keyed map for shader cache
   **/
  declare programCache: TProgramCache;

  /**
   * 纹理缓存的键控映射
   *
   * Keyed map for texture cache
   **/
  declare textureCache: TTextureCache;

  /**
   * 包含用于调试的 GPU 信息
   *
   * Contains GPU info for debug
   **/
  declare gpuInfo: any;

  /**
   * 实验性功能。此对象是一种辅助图层的存储库，用于避免在频繁过滤期间重新创建它们。
   * 如果您正在使用滑块预览滤镜，您可能不希望每一步都创建辅助图层。
   * 在此对象中将附加一些画布，创建一次，有时调整大小，从不清除。清除留给开发人员。
   *
   * Experimental. This object is a sort of repository of help layers used to avoid
   * of recreating them during frequent filtering. If you are previewing a filter with
   * a slider you probably do not want to create help layers every filter step.
   * in this object there will be appended some canvases, created once, resized sometimes
   * cleared never. Clearing is left to the developer.
   **/
  resources: TPipelineResources = {};

  /**
   * 构造函数
   * @param options 选项对象
   */
  constructor({ tileSize = config.textureSize } = {}) {
    this.tileSize = tileSize;
    this.setupGLContext(tileSize, tileSize);
    this.captureGPUInfo();
  }

  /**
   * 设置适合过滤的 WebGL 上下文，并绑定任何需要的事件处理程序。
   *
   * Setup a WebGL context suitable for filtering, and bind any needed event handlers.
   * @param width 宽度
   * @param height 高度
   */
  setupGLContext(width: number, height: number): void {
    this.dispose();
    this.createWebGLCanvas(width, height);
  }

  /**
   * 创建一个 canvas 元素和关联的 WebGL 上下文，并将它们作为类属性附加到 GLFilterBackend 类。
   *
   * Create a canvas element and associated WebGL context and attaches them as
   * class properties to the GLFilterBackend class.
   * @param width 宽度
   * @param height 高度
   */
  createWebGLCanvas(width: number, height: number): void {
    const canvas = createCanvasElementFor({ width, height });
    const glOptions = {
        alpha: true,
        premultipliedAlpha: false,
        depth: false,
        stencil: false,
        antialias: false,
      },
      gl = canvas.getContext('webgl', glOptions) as WebGLRenderingContext;

    if (!gl) {
      return;
    }
    gl.clearColor(0, 0, 0, 0);
    // this canvas can fire webglcontextlost and webglcontextrestored
    this.canvas = canvas;
    this.gl = gl;
  }

  /**
   * 尝试将请求的滤镜应用于提供的源，将过滤后的输出绘制到提供的目标画布。
   *
   * Attempts to apply the requested filters to the source provided, drawing the filtered output
   * to the provided target canvas.
   *
   * @param {Array} filters The filters to apply. 要应用的滤镜。
   * @param {TexImageSource} source The source to be filtered. 要过滤的源。
   * @param {Number} width The width of the source input. 源输入的宽度。
   * @param {Number} height The height of the source input. 源输入的高度。
   * @param {HTMLCanvasElement} targetCanvas The destination for filtered output to be drawn. 绘制过滤输出的目标画布。
   * @param {String|undefined} cacheKey A key used to cache resources related to the source. If omitted, caching will be skipped. 用于缓存与源相关资源的键。如果省略，将跳过缓存。
   * @returns {TWebGLPipelineState | undefined} WebGL 管道状态或 undefined
   */
  applyFilters(
    filters: BaseFilter<string, Record<string, any>>[],
    source: TexImageSource,
    width: number,
    height: number,
    targetCanvas: HTMLCanvasElement,
    cacheKey?: string,
  ): TWebGLPipelineState | undefined {
    const gl = this.gl;
    const ctx = targetCanvas.getContext('2d');
    if (!gl || !ctx) {
      return;
    }
    let cachedTexture;
    if (cacheKey) {
      cachedTexture = this.getCachedTexture(cacheKey, source);
    }
    const pipelineState: TWebGLPipelineState = {
      originalWidth:
        (source as HTMLImageElement).width ||
        (source as HTMLImageElement).naturalWidth ||
        0,
      originalHeight:
        (source as HTMLImageElement).height ||
        (source as HTMLImageElement).naturalHeight ||
        0,
      sourceWidth: width,
      sourceHeight: height,
      destinationWidth: width,
      destinationHeight: height,
      context: gl,
      sourceTexture: this.createTexture(
        gl,
        width,
        height,
        !cachedTexture ? source : undefined,
      ),
      targetTexture: this.createTexture(gl, width, height),
      originalTexture:
        cachedTexture ||
        this.createTexture(
          gl,
          width,
          height,
          !cachedTexture ? source : undefined,
        ),
      passes: filters.length,
      webgl: true,
      aPosition: this.aPosition,
      programCache: this.programCache,
      pass: 0,
      filterBackend: this,
      targetCanvas: targetCanvas,
    };
    const tempFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tempFbo);
    filters.forEach((filter: any) => {
      filter && filter.applyTo(pipelineState);
    });
    resizeCanvasIfNeeded(pipelineState);
    this.copyGLTo2D(gl, pipelineState);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(pipelineState.sourceTexture);
    gl.deleteTexture(pipelineState.targetTexture);
    gl.deleteFramebuffer(tempFbo);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return pipelineState;
  }

  /**
   * 分离事件监听器，移除引用，并清理缓存。
   *
   * Detach event listeners, remove references, and clean up caches.
   */
  dispose() {
    if (this.canvas) {
      // we are disposing, we don't care about the fact
      // that the canvas shouldn't be null.
      // @ts-expect-error disposing
      this.canvas = null;
      // @ts-expect-error disposing
      this.gl = null;
    }
    this.clearWebGLCaches();
  }

  /**
   * 清除 WebGL 相关缓存。
   *
   * Wipe out WebGL-related caches.
   */
  clearWebGLCaches() {
    this.programCache = {};
    this.textureCache = {};
  }

  /**
   * 创建一个 WebGL 纹理对象。
   *
   * 接受特定尺寸以初始化纹理或源图像。
   *
   * Create a WebGL texture object.
   *
   * Accepts specific dimensions to initialize the texture to or a source image.
   *
   * @param {WebGLRenderingContext} gl The GL context to use for creating the texture. 用于创建纹理的 GL 上下文。
   * @param {number} width The width to initialize the texture at. 初始化纹理的宽度。
   * @param {number} height The height to initialize the texture. 初始化纹理的高度。
   * @param {TexImageSource} textureImageSource A source for the texture data. 纹理数据的源。
   * @param {number} filter gl.NEAREST default or gl.LINEAR filters for the texture. 纹理的 gl.NEAREST（默认）或 gl.LINEAR 滤镜。
   * This filter is very useful for LUTs filters. If you need interpolation use gl.LINEAR 此滤镜对 LUT 滤镜非常有用。如果需要插值，请使用 gl.LINEAR
   * @returns {WebGLTexture} WebGL 纹理
   */
  createTexture(
    gl: WebGLRenderingContext,
    width: number,
    height: number,
    textureImageSource?: TexImageSource,
    filter?:
      | WebGLRenderingContextBase['NEAREST']
      | WebGLRenderingContextBase['LINEAR'],
  ): WebGLTexture {
    const {
      NEAREST,
      TEXTURE_2D,
      RGBA,
      UNSIGNED_BYTE,
      CLAMP_TO_EDGE,
      TEXTURE_MAG_FILTER,
      TEXTURE_MIN_FILTER,
      TEXTURE_WRAP_S,
      TEXTURE_WRAP_T,
    } = gl;
    const texture = gl.createTexture();
    gl.bindTexture(TEXTURE_2D, texture);
    gl.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, filter || NEAREST);
    gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, filter || NEAREST);
    gl.texParameteri(TEXTURE_2D, TEXTURE_WRAP_S, CLAMP_TO_EDGE);
    gl.texParameteri(TEXTURE_2D, TEXTURE_WRAP_T, CLAMP_TO_EDGE);
    if (textureImageSource) {
      gl.texImage2D(
        TEXTURE_2D,
        0,
        RGBA,
        RGBA,
        UNSIGNED_BYTE,
        textureImageSource,
      );
    } else {
      gl.texImage2D(
        TEXTURE_2D,
        0,
        RGBA,
        width,
        height,
        0,
        RGBA,
        UNSIGNED_BYTE,
        null,
      );
    }
    // disabled because website and issues with different typescript version
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return texture!;
  }

  /**
   * 可选地用于从缓存数组中获取纹理
   *
   * 如果未找到现有纹理，则创建并缓存新纹理。
   *
   * Can be optionally used to get a texture from the cache array
   *
   * If an existing texture is not found, a new texture is created and cached.
   *
   * @param {String} uniqueId A cache key to use to find an existing texture. 用于查找现有纹理的缓存键。
   * @param {HTMLImageElement|HTMLCanvasElement} textureImageSource A source to use to create the texture cache entry if one does not already exist. 如果不存在，用于创建纹理缓存条目的源。
   * @param {number} filter 纹理滤镜
   * @returns {WebGLTexture | null} WebGL 纹理或 null
   */
  getCachedTexture(
    uniqueId: string,
    textureImageSource: TexImageSource,
    filter?:
      | WebGLRenderingContextBase['NEAREST']
      | WebGLRenderingContextBase['LINEAR'],
  ): WebGLTexture | null {
    const { textureCache } = this;
    if (textureCache[uniqueId]) {
      return textureCache[uniqueId];
    } else {
      const texture = this.createTexture(
        this.gl,
        (textureImageSource as HTMLImageElement).width,
        (textureImageSource as HTMLImageElement).height,
        textureImageSource,
        filter,
      );
      if (texture) {
        textureCache[uniqueId] = texture;
      }
      return texture;
    }
  }

  /**
   * 清除与先前已过滤的源图像相关的缓存资源。
   *
   * Clear out cached resources related to a source image that has been
   * filtered previously.
   *
   * @param {String} cacheKey The cache key provided when the source image was filtered. 过滤源图像时提供的缓存键。
   */
  evictCachesForKey(cacheKey: string) {
    if (this.textureCache[cacheKey]) {
      this.gl.deleteTexture(this.textureCache[cacheKey]);
      delete this.textureCache[cacheKey];
    }
  }

  /**
   * 将输入 WebGL 画布复制到输出 2D 画布上。
   *
   * 假设 WebGL 画布是倒置的，所需输出图像的左上角像素出现在 WebGL 画布的左下角。
   *
   * Copy an input WebGL canvas on to an output 2D canvas.
   *
   * The WebGL canvas is assumed to be upside down, with the top-left pixel of the
   * desired output image appearing in the bottom-left corner of the WebGL canvas.
   *
   * @param {WebGLRenderingContext} gl The WebGL context to copy from. 要从中复制的 WebGL 上下文。
   * @param {Object} pipelineState The 2D target canvas to copy on to. 要复制到的 2D 目标画布。
   */
  copyGLTo2D(gl: WebGLRenderingContext, pipelineState: TWebGLPipelineState) {
    const glCanvas = gl.canvas,
      targetCanvas = pipelineState.targetCanvas,
      ctx = targetCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.translate(0, targetCanvas.height); // move it down again
    ctx.scale(1, -1); // vertical flip
    // where is my image on the big glcanvas?
    const sourceY = glCanvas.height - targetCanvas.height;
    ctx.drawImage(
      glCanvas,
      0,
      sourceY,
      targetCanvas.width,
      targetCanvas.height,
      0,
      0,
      targetCanvas.width,
      targetCanvas.height,
    );
  }

  /**
   * 使用 2d canvas 的 putImageData API 将输入 WebGL 画布复制到输出 2D 画布上。
   * 在 Firefox（OSX Sierra 上的版本 54）中，这比使用 ctx.drawImage 明显更快。
   *
   * Copy an input WebGL canvas on to an output 2D canvas using 2d canvas' putImageData
   * API. Measurably faster than using ctx.drawImage in Firefox (version 54 on OSX Sierra).
   *
   * @param {WebGLRenderingContext} gl The WebGL context to copy from. 要从中复制的 WebGL 上下文。
   * @param {Object} pipelineState The 2D target canvas to copy on to. 要复制到的 2D 目标画布。
   */
  copyGLTo2DPutImageData(
    this: Required<WebGLFilterBackend>,
    gl: WebGLRenderingContext,
    pipelineState: TWebGLPipelineState,
  ) {
    const targetCanvas = pipelineState.targetCanvas,
      ctx = targetCanvas.getContext('2d'),
      dWidth = pipelineState.destinationWidth,
      dHeight = pipelineState.destinationHeight,
      numBytes = dWidth * dHeight * 4;
    if (!ctx) {
      return;
    }
    const u8 = new Uint8Array(this.imageBuffer, 0, numBytes);
    const u8Clamped = new Uint8ClampedArray(this.imageBuffer, 0, numBytes);

    gl.readPixels(0, 0, dWidth, dHeight, gl.RGBA, gl.UNSIGNED_BYTE, u8);
    const imgData = new ImageData(u8Clamped, dWidth, dHeight);
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * 尝试从 WebGL 上下文中提取 GPU 信息字符串。
   *
   * 在调试或将特定 GPU 列入黑名单时很有用的信息。
   *
   * Attempt to extract GPU information strings from a WebGL context.
   *
   * Useful information when debugging or blacklisting specific GPUs.
   *
   * @returns {Object} A GPU info object with renderer and vendor strings. 包含渲染器和供应商字符串的 GPU 信息对象。
   */
  captureGPUInfo() {
    if (this.gpuInfo) {
      return this.gpuInfo;
    }
    const gl = this.gl,
      gpuInfo = { renderer: '', vendor: '' };
    if (!gl) {
      return gpuInfo;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      if (renderer) {
        gpuInfo.renderer = renderer.toLowerCase();
      }
      if (vendor) {
        gpuInfo.vendor = vendor.toLowerCase();
      }
    }
    this.gpuInfo = gpuInfo;
    return gpuInfo;
  }
}

/**
 * 如果需要，调整画布大小
 * @param pipelineState WebGL 管道状态
 */
function resizeCanvasIfNeeded(pipelineState: TWebGLPipelineState): void {
  const targetCanvas = pipelineState.targetCanvas,
    width = targetCanvas.width,
    height = targetCanvas.height,
    dWidth = pipelineState.destinationWidth,
    dHeight = pipelineState.destinationHeight;

  if (width !== dWidth || height !== dHeight) {
    targetCanvas.width = dWidth;
    targetCanvas.height = dHeight;
  }
}
