import type { TPointerEvent } from '../EventTypeDefs';
import { Point } from '../Point';
import { getScrollLeftTop } from './dom_misc';

const touchEvents = ['touchstart', 'touchmove', 'touchend'];

/**
 * 获取触摸信息
 * @param event 触摸事件或鼠标事件
 * @returns 鼠标事件或触摸对象
 */
function getTouchInfo(event: TouchEvent | MouseEvent): MouseEvent | Touch {
  const touchProp = (event as TouchEvent).changedTouches;
  if (touchProp && touchProp[0]) {
    return touchProp[0];
  }
  return event as MouseEvent;
}

/**
 * 获取指针坐标
 * @param event 指针事件
 * @returns 指针坐标点
 */
export const getPointer = (event: TPointerEvent): Point => {
  const element = event.target as HTMLElement,
    scroll = getScrollLeftTop(element),
    _evt = getTouchInfo(event);
  return new Point(_evt.clientX + scroll.left, _evt.clientY + scroll.top);
};

/**
 * 检查是否为触摸事件
 * @param event 指针事件
 * @returns 如果是触摸事件则返回 true，否则返回 false
 */
export const isTouchEvent = (event: TPointerEvent) =>
  touchEvents.includes(event.type) ||
  (event as PointerEvent).pointerType === 'touch';

/**
 * 停止事件传播和默认行为
 * @param e 事件对象
 */
export const stopEvent = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
};
