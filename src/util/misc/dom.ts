import { getFabricDocument } from '../../env';
import type { ImageFormat, TSize } from '../../typedefs';
import { FabricError } from '../internals/console';
/**
 * 创建 canvas 元素
 * @returns 初始化后的 canvas 元素
 *
 * Creates canvas element
 * @return {CanvasElement} initialized canvas element
 */
export const createCanvasElement = (): HTMLCanvasElement => {
  const element = getFabricDocument().createElement('canvas');
  if (!element || typeof element.getContext === 'undefined') {
    throw new FabricError('Failed to create `canvas` element');
  }
  return element;
};

/**
 * 创建 image 元素（适用于客户端和 node 环境）
 * @returns HTML image 元素
 *
 * Creates image element (works on client and node)
 * @return {HTMLImageElement} HTML image element
 */
export const createImage = (): HTMLImageElement =>
  getFabricDocument().createElement('img');

/**
 * 创建一个 canvas 元素，它是另一个 canvas 的副本，并且也绘制了内容
 * @param canvas 要复制尺寸和内容的 canvas
 * @returns 初始化后的 canvas 元素
 *
 * Creates a canvas element that is a copy of another and is also painted
 * @param {CanvasElement} canvas to copy size and content of
 * @return {CanvasElement} initialized canvas element
 */
export const copyCanvasElement = (
  canvas: HTMLCanvasElement,
): HTMLCanvasElement => {
  const newCanvas = createCanvasElementFor(canvas);
  newCanvas.getContext('2d')?.drawImage(canvas, 0, 0);
  return newCanvas;
};

/**
 * 创建一个与另一个 canvas 大小相同的 canvas 元素
 * @param canvas 要复制尺寸和内容的 canvas
 * @returns 初始化后的 canvas 元素
 *
 * Creates a canvas element as big as another
 * @param {CanvasElement} canvas to copy size and content of
 * @return {CanvasElement} initialized canvas element
 */
export const createCanvasElementFor = (
  canvas: HTMLCanvasElement | ImageData | HTMLImageElement | TSize,
): HTMLCanvasElement => {
  const newCanvas = createCanvasElement();
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  return newCanvas;
};

/**
 * 自 2.6.0 起从 canvas 实例移动到实用程序。
 * 可能无用
 * @param canvasEl 要复制尺寸和内容的 canvas 元素
 * @param format 'jpeg' 或 'png'，在某些浏览器中 'webp' 也可以
 * @param quality <= 1 且 > 0
 * @returns 数据 URL
 *
 * since 2.6.0 moved from canvas instance to utility.
 * possibly useless
 * @param {CanvasElement} canvasEl to copy size and content of
 * @param {String} format 'jpeg' or 'png', in some browsers 'webp' is ok too
 * @param {number} quality <= 1 and > 0
 * @return {String} data url
 */
export const toDataURL = (
  canvasEl: HTMLCanvasElement,
  format: ImageFormat,
  quality: number,
) => canvasEl.toDataURL(`image/${format}`, quality);

/**
 * 检查是否为 HTMLCanvasElement
 * @param canvas 要检查的对象
 * @returns 如果是 HTMLCanvasElement 则返回 true
 */
export const isHTMLCanvas = (
  canvas?: HTMLCanvasElement | string,
): canvas is HTMLCanvasElement => {
  return !!canvas && (canvas as HTMLCanvasElement).getContext !== undefined;
};

/**
 * 将 canvas 转换为 Blob
 * @param canvasEl canvas 元素
 * @param format 图片格式
 * @param quality 图片质量
 * @returns Blob 对象
 */
export const toBlob = (
  canvasEl: HTMLCanvasElement,
  format?: ImageFormat,
  quality?: number,
): Promise<Blob | null> =>
  new Promise((resolve, _) => {
    canvasEl.toBlob(resolve, `image/${format}`, quality);
  });
