import { log } from '../../util/internals/console';
import { GLProbe } from './GLProbe';
import type { GLPrecision } from './GLProbe';

/**
 * 延迟初始化 WebGL 常量
 *
 * Lazy initialize WebGL constants
 */
export class WebGLProbe extends GLProbe {
  /**
   * 最大纹理尺寸
   */
  declare maxTextureSize?: number;

  /**
   * 测试 WebGL 是否支持特定精度
   * @param gl 用于测试的 WebGL 上下文
   * @param precision 要测试的精度，可以是以下任意一种
   * @returns 用户的浏览器 WebGL 是否支持给定精度
   *
   * Tests if webgl supports certain precision
   * @param {WebGL} Canvas WebGL context to test on
   * @param {GLPrecision} Precision to test can be any of following
   * @returns {Boolean} Whether the user's browser WebGL supports given precision.
   */
  private testPrecision(
    gl: WebGLRenderingContext,
    precision: GLPrecision,
  ): boolean {
    const fragmentSource = `precision ${precision} float;\nvoid main(){}`;
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
      return false;
    }
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    return !!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
  }

  /**
   * 查询浏览器的 WebGL 支持情况
   * @param canvas 用于获取上下文的 Canvas 元素
   *
   * query browser for WebGL
   */
  queryWebGL(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (gl) {
      this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      this.GLPrecision = (['highp', 'mediump', 'lowp'] as const).find(
        (precision) => this.testPrecision(gl, precision),
      );
      gl.getExtension('WEBGL_lose_context')!.loseContext();
      log('log', `WebGL: max texture size ${this.maxTextureSize}`);
    }
  }

  /**
   * 检查是否支持指定的纹理尺寸
   * @param textureSize 纹理尺寸
   * @returns 如果支持则返回 true
   */
  isSupported(textureSize: number) {
    return !!this.maxTextureSize && this.maxTextureSize >= textureSize;
  }
}
