import type { TransformActionHandler } from '../EventTypeDefs';
import { CENTER, LEFT, RESIZING, RIGHT } from '../constants';
import { resolveOrigin } from '../util/misc/resolveOrigin';
import { getLocalPoint, isTransformCentered } from './util';
import { wrapWithFireEvent } from './wrapWithFireEvent';
import { wrapWithFixedAnchor } from './wrapWithFixedAnchor';

/**
 * 更改对象宽度的操作处理程序
 * 需要用 `wrapWithFixedAnchor` 包装才能生效
 *
 * Action handler to change object's width
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @param eventData 执行变换的 javascript 事件
 * @param transform 包含有关当前变换的一系列信息的 javascript 对象
 * @param x 当前鼠标 x 位置，画布标准化
 * @param y 当前鼠标 y 位置，画布标准化
 * @return {Boolean} true if some change happened
 * @returns 如果发生了一些变化，则为 true
 */
export const changeObjectWidth: TransformActionHandler = (
  eventData,
  transform,
  x,
  y,
) => {
  const localPoint = getLocalPoint(
    transform,
    transform.originX,
    transform.originY,
    x,
    y,
  );
  //  make sure the control changes width ONLY from it's side of target
  if (
    resolveOrigin(transform.originX) === resolveOrigin(CENTER) ||
    (resolveOrigin(transform.originX) === resolveOrigin(RIGHT) &&
      localPoint.x < 0) ||
    (resolveOrigin(transform.originX) === resolveOrigin(LEFT) &&
      localPoint.x > 0)
  ) {
    const { target } = transform,
      strokePadding =
        target.strokeWidth / (target.strokeUniform ? target.scaleX : 1),
      multiplier = isTransformCentered(transform) ? 2 : 1,
      oldWidth = target.width,
      newWidth =
        Math.abs((localPoint.x * multiplier) / target.scaleX) - strokePadding;
    target.set('width', Math.max(newWidth, 1));
    //  check against actual target width in case `newWidth` was rejected
    return oldWidth !== target.width;
  }
  return false;
};

/**
 * 更改宽度的操作，包含触发事件和固定锚点
 */
export const changeWidth = wrapWithFireEvent(
  RESIZING,
  wrapWithFixedAnchor(changeObjectWidth),
);
