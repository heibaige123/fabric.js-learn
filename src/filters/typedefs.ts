import type { WebGLFilterBackend } from './WebGLFilterBackend';
import type { Canvas2dFilterBackend } from './Canvas2dFilterBackend';

/**
 * 程序缓存类型
 */
export type TProgramCache = any;

/**
 * 纹理缓存类型
 */
export type TTextureCache = Record<string, WebGLTexture>;

/**
 * 管道资源类型
 */
export type TPipelineResources = {
  /**
   * 混合图像画布
   */
  blendImage?: HTMLCanvasElement;
  /**
   * 模糊层 1 画布
   */
  blurLayer1?: HTMLCanvasElement;
  /**
   * 模糊层 2 画布
   */
  blurLayer2?: HTMLCanvasElement;
  /**
   * sliceByTwo 画布
   */
  sliceByTwo?: HTMLCanvasElement;
} & Record<string, unknown>;

/**
 * WebGL 管道状态类型
 */
export type TWebGLPipelineState = {
  /**
   * WebGL 滤镜后端
   */
  filterBackend: WebGLFilterBackend;
  /**
   * 原始宽度
   */
  originalWidth: number;
  /**
   * 原始高度
   */
  originalHeight: number;
  /**
   * 源宽度
   */
  sourceWidth: number;
  /**
   * 源高度
   */
  sourceHeight: number;
  /**
   * 目标宽度
   */
  destinationWidth: number;
  /**
   * 目标高度
   */
  destinationHeight: number;
  /**
   * WebGL 上下文
   */
  context: WebGLRenderingContext;
  /**
   * 源纹理
   */
  sourceTexture: WebGLTexture | null;
  /**
   * 目标纹理
   */
  targetTexture: WebGLTexture | null;
  /**
   * 原始纹理
   */
  originalTexture: WebGLTexture;
  /**
   * 剩余滤镜数量
   */
  passes: number;
  /**
   * 是否使用 WebGL
   */
  webgl: boolean;
  /**
   * 顶点位置数据
   */
  aPosition: Float32Array;
  /**
   * 程序缓存
   */
  programCache: TProgramCache;
  /**
   * 当前 pass 索引
   */
  pass: number;
  /**
   * 目标画布
   */
  targetCanvas: HTMLCanvasElement;
};

/**
 * 2D 管道状态类型
 */
export type T2DPipelineState = {
  /**
   * 源宽度
   */
  sourceWidth: number;
  /**
   * 源高度
   */
  sourceHeight: number;
  /**
   * Canvas 2D 滤镜后端
   */
  filterBackend: Canvas2dFilterBackend;
  /**
   * 画布元素
   */
  canvasEl: HTMLCanvasElement;
  /**
   * 图像数据
   */
  imageData: ImageData;
  /**
   * 原始元素
   */
  originalEl: CanvasImageSource;
  /**
   * 原始图像数据
   */
  originalImageData?: ImageData;
  /**
   * Canvas 2D 上下文
   */
  ctx: CanvasRenderingContext2D;
  /**
   * 辅助层画布
   */
  helpLayer?: HTMLCanvasElement;
};

/**
 * WebGL Uniform 位置映射类型
 */
export type TWebGLUniformLocationMap = Record<
  string,
  WebGLUniformLocation | null
>;

/**
 * WebGL 属性位置映射类型
 */
export type TWebGLAttributeLocationMap = Record<string, number>;

/**
 * WebGL 程序缓存项类型
 */
export type TWebGLProgramCacheItem = {
  /**
   * WebGL 程序
   */
  program: WebGLProgram;
  /**
   * 属性位置映射
   */
  attributeLocations: TWebGLAttributeLocationMap;
  /**
   * Uniform 位置映射
   */
  uniformLocations: TWebGLUniformLocationMap;
};

/**
 * 颜色矩阵类型（20 个数字的数组）
 */
export type TMatColorMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
