import { GLProbe } from './GLProbe';

/**
 * Node 环境下的 GL 探测器
 *
 * @todo GL rendering in node is possible:
 * - https://github.com/stackgl/headless-gl
 * - https://github.com/akira-cn/node-canvas-webgl
 */
export class NodeGLProbe extends GLProbe {
  /**
   * 查询 WebGL 信息
   */
  queryWebGL() {
    // noop
  }

  /**
   * 检查是否支持 WebGL
   * @returns 总是返回 false
   */
  isSupported() {
    return false;
  }
}
