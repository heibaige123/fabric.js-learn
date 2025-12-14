import { getFabricWindow } from '../../env';

/**
 * 请求动画帧
 * @param callback 回调函数
 * @returns 请求 ID
 */
export function requestAnimFrame(callback: FrameRequestCallback): number {
  return getFabricWindow().requestAnimationFrame(callback);
}

/**
 * 取消动画帧
 * @param handle 请求 ID
 */
export function cancelAnimFrame(handle: number): void {
  return getFabricWindow().cancelAnimationFrame(handle);
}
