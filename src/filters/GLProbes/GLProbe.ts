/**
 * WebGL 精度类型
 */
export type GLPrecision = 'lowp' | 'mediump' | 'highp';

/**
 * GL 探测器抽象类
 */
export abstract class GLProbe {
  /**
   * WebGL 精度
   */
  declare GLPrecision: GLPrecision | undefined;

  /**
   * 查询 WebGL 信息
   * @param canvas 用于查询的 Canvas 元素
   */
  abstract queryWebGL(canvas: HTMLCanvasElement): void;

  /**
   * 检查是否支持指定的纹理尺寸
   * @param textureSize 纹理尺寸
   * @returns 如果支持则返回 true，否则返回 false
   */
  abstract isSupported(textureSize: number): boolean;
}
