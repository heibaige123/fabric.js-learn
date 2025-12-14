import type {
  ControlCallback,
  ControlCursorCallback,
  TPointerEvent,
  TransformActionHandler,
} from '../EventTypeDefs';
import { SCALE_X, SCALE_Y, SKEW_X, SKEW_Y } from '../constants';
import type { FabricObject } from '../shapes/Object/FabricObject';
import type { TAxisKey } from '../typedefs';
import { scaleCursorStyleHandler, scalingX, scalingY } from './scale';
import { skewCursorStyleHandler, skewHandlerX, skewHandlerY } from './skew';

/**
 * 检查是否按下了替代键以切换动作
 * @param eventData 事件数据
 * @param target 目标 Fabric 对象
 * @returns
 */
function isAltAction(eventData: TPointerEvent, target: FabricObject) {
  return eventData[target.canvas!.altActionKey!];
}

/**
 * 检查事件、控件和 fabricObject 以返回正确的动作名称
 *
 * Inspect event, control and fabricObject to return the correct action name
 * @param {Event} eventData the javascript event that is causing the scale
 * @param {Control} control the control that is interested in the action
 * @param {FabricObject} fabricObject the fabric object that is interested in the action
 * @return {String} an action name
 */
export const scaleOrSkewActionName: ControlCallback<
  TAxisKey<'skew' | 'scale'> | ''
> = (eventData, control, fabricObject) => {
  const isAlternative = isAltAction(eventData, fabricObject);
  if (control.x === 0) {
    // then is scaleY or skewX
    return isAlternative ? SKEW_X : SCALE_Y;
  }
  if (control.y === 0) {
    // then is scaleY or skewX
    return isAlternative ? SKEW_Y : SCALE_X;
  }
  return '';
};

/**
 * 结合倾斜和缩放样式处理程序以覆盖 fabric 标准用例
 *
 * Combine skew and scale style handlers to cover fabric standard use case
 * @param {Event} eventData the javascript event that is causing the scale
 * @param {Control} control the control that is interested in the action
 * @param {FabricObject} fabricObject the fabric object that is interested in the action
 * @return {String} a valid css string for the cursor
 */
export const scaleSkewCursorStyleHandler: ControlCursorCallback = (
  eventData,
  control,
  fabricObject,
  coord,
) => {
  return isAltAction(eventData, fabricObject)
    ? skewCursorStyleHandler(eventData, control, fabricObject, coord)
    : scaleCursorStyleHandler(eventData, control, fabricObject, coord);
};
/**
 * 组合动作处理程序，用于缩放 X 或倾斜 Y
 * 需要用 `wrapWithFixedAnchor` 包装才能生效。
 *
 * Composed action handler to either scale X or skew Y
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @return {Boolean} true if some change happened
 */
export const scalingXOrSkewingY: TransformActionHandler = (
  eventData,
  transform,
  x,
  y,
) => {
  return isAltAction(eventData, transform.target)
    ? skewHandlerY(eventData, transform, x, y)
    : scalingX(eventData, transform, x, y);
};

/**
 * 组合动作处理程序，用于缩放 Y 或倾斜 X
 * 需要用 `wrapWithFixedAnchor` 包装才能生效。
 *
 * Composed action handler to either scale Y or skew X
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @return {Boolean} true if some change happened
 */
export const scalingYOrSkewingX: TransformActionHandler = (
  eventData,
  transform,
  x,
  y,
) => {
  return isAltAction(eventData, transform.target)
    ? skewHandlerX(eventData, transform, x, y)
    : scalingY(eventData, transform, x, y);
};
