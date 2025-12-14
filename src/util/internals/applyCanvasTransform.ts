import type { StaticCanvas } from '../../canvas/StaticCanvas';

/**
 * 将传入上下文的变换设置为与特定 Canvas 或 StaticCanvas 相同。
 * 使用 setTransform 是因为此实用程序会将 ctx 变换重置为视网膜缩放和视口变换的基本值。
 * 它不打算添加到其他变换中，它在内部用于准备画布进行绘制。
 *
 * Set the transform of the passed context to the same of a specific Canvas or StaticCanvas.
 * setTransform is used since this utility will RESET the ctx transform to the basic value
 * of retina scaling and viewport transform
 * It is not meant to be added to other transforms, it is used internally to preapre canvases to draw
 * @param ctx 渲染上下文
 * @param canvas 画布实例
 * @param ctx
 * @param canvas
 */
export const applyCanvasTransform = (
  ctx: CanvasRenderingContext2D,
  canvas: StaticCanvas,
) => {
  const scale = canvas.getRetinaScaling();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const v = canvas.viewportTransform;
  ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
};
