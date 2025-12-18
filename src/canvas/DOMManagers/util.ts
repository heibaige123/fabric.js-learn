import { NONE } from '../../constants';
import type { TSize } from '../../typedefs';
import {
  getDocumentFromElement,
  getWindowFromElement,
  getScrollLeftTop,
} from '../../util/dom_misc';

/**
 * 设置 Canvas 元素的尺寸
 * @param el Canvas 元素
 * @param ctx Canvas 2D 上下文
 * @param size 尺寸对象
 * @param size.width 宽度
 * @param size.height 高度
 * @param retinaScaling 视网膜缩放比例，默认为 1
 */
export const setCanvasDimensions = (
  el: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  { width, height }: TSize,
  retinaScaling = 1,
) => {
  el.width = width;
  el.height = height;
  if (retinaScaling > 1) {
    el.setAttribute('width', (width * retinaScaling).toString());
    el.setAttribute('height', (height * retinaScaling).toString());
    ctx.scale(retinaScaling, retinaScaling);
  }
};

/**
 * CSS 尺寸类型定义
 */
export type CSSDimensions = {
  /**
   * 宽度
   */
  width: number | string;
  /**
   * 高度
   */
  height: number | string;
};

/**
 * 设置元素的 CSS 尺寸
 * @param el HTML 元素
 * @param dimensions 尺寸对象
 * @param dimensions.width 宽度
 * @param dimensions.height 高度
 */
export const setCSSDimensions = (
  el: HTMLElement,
  { width, height }: Partial<CSSDimensions>,
) => {
  width && (el.style.width = typeof width === 'number' ? `${width}px` : width);
  height &&
    (el.style.height = typeof height === 'number' ? `${height}px` : height);
};

/**
 * 返回给定元素的偏移量
 *
 * @param element 要获取偏移量的元素
 * @returns 包含 "left" 和 "top" 属性的对象
 */
export function getElementOffset(element: HTMLElement) {
  const doc = element && getDocumentFromElement(element),
    offset = { left: 0, top: 0 };

  if (!doc) {
    return offset;
  }
  const elemStyle: CSSStyleDeclaration =
    getWindowFromElement(element)?.getComputedStyle(element, null) ||
    ({} as CSSStyleDeclaration);
  offset.left += parseInt(elemStyle.borderLeftWidth, 10) || 0;
  offset.top += parseInt(elemStyle.borderTopWidth, 10) || 0;
  offset.left += parseInt(elemStyle.paddingLeft, 10) || 0;
  offset.top += parseInt(elemStyle.paddingTop, 10) || 0;

  let box = { left: 0, top: 0 };

  const docElem = doc.documentElement;
  if (typeof element.getBoundingClientRect !== 'undefined') {
    box = element.getBoundingClientRect();
  }

  const scrollLeftTop = getScrollLeftTop(element);

  return {
    left:
      box.left + scrollLeftTop.left - (docElem.clientLeft || 0) + offset.left,
    top: box.top + scrollLeftTop.top - (docElem.clientTop || 0) + offset.top,
  };
}

/**
 * 使元素不可选中
 *
 * @param element 要设置为不可选中的元素
 * @returns 传入的元素
 */
export function makeElementUnselectable(element: HTMLElement) {
  if (typeof element.onselectstart !== 'undefined') {
    element.onselectstart = () => false;
  }
  element.style.userSelect = NONE;
  return element;
}
