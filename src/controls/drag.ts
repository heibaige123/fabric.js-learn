import type { TransformActionHandler } from '../EventTypeDefs';
import { LEFT, TOP, MOVING } from '../constants';
import { fireEvent } from './fireEvent';
import { commonEventInfo, isLocked } from './util';

/**
 * 拖动操作处理程序
 *
 * Action handler
 * @private
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @param eventData 执行变换的 javascript 事件
 * @param transform 包含有关当前变换的一系列信息的 javascript 对象
 * @param x 当前鼠标 x 位置，画布标准化
 * @param y 当前鼠标 y 位置，画布标准化
 * @return {Boolean} true if the translation occurred
 * @returns 如果发生平移，则为 true
 */
export const dragHandler: TransformActionHandler = (
  eventData,
  transform,
  x,
  y,
) => {
  const { target, offsetX, offsetY } = transform,
    newLeft = x - offsetX,
    newTop = y - offsetY,
    moveX = !isLocked(target, 'lockMovementX') && target.left !== newLeft,
    moveY = !isLocked(target, 'lockMovementY') && target.top !== newTop;
  moveX && target.set(LEFT, newLeft);
  moveY && target.set(TOP, newTop);
  if (moveX || moveY) {
    fireEvent(MOVING, commonEventInfo(eventData, transform, x, y));
  }
  return moveX || moveY;
};
