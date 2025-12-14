import { Point } from '../Point';
import { Control } from './Control';
import type { TMat2D } from '../typedefs';
import type { Polyline } from '../shapes/Polyline';
import { multiplyTransformMatrices } from '../util/misc/matrix';
import type {
  TModificationEvents,
  TPointerEvent,
  Transform,
  TransformActionHandler,
} from '../EventTypeDefs';
import { wrapWithFireEvent } from './wrapWithFireEvent';
import { sendPointToPlane } from '../util/misc/planeChange';
import { MODIFY_POLY } from '../constants';

/**
 * 路径修改操作名称
 */
const ACTION_NAME: TModificationEvents = MODIFY_POLY;

/**
 * 变换锚点类型
 */
type TTransformAnchor = Transform & { pointIndex: number };

/**
 * 此函数定位控件。
 * 它将用于绘制和交互。
 * @param pointIndex 点索引
 *
 * This function locates the controls.
 * It'll be used both for drawing and for interaction.
 */
export const createPolyPositionHandler = (pointIndex: number) => {
  return function (dim: Point, finalMatrix: TMat2D, polyObject: Polyline) {
    const { points, pathOffset } = polyObject;
    return new Point(points[pointIndex])
      .subtract(pathOffset)
      .transform(
        multiplyTransformMatrices(
          polyObject.getViewportTransform(),
          polyObject.calcTransformMatrix(),
        ),
      );
  };
};

/**
 * 此函数定义控件的作用。
 * 在单击控件并拖动后，每次鼠标移动都会调用它。
 * 该函数接收鼠标事件、当前变换对象和画布坐标中的当前位置作为参数。
 * `transform.target` 是对当前正在变换的对象的引用。
 *
 * This function defines what the control does.
 * It'll be called on every mouse move after a control has been clicked and is being dragged.
 * The function receives as argument the mouse event, the current transform object
 * and the current position in canvas coordinate `transform.target` is a reference to the
 * current object being transformed.
 */
export const polyActionHandler = (
  eventData: TPointerEvent,
  transform: TTransformAnchor,
  x: number,
  y: number,
) => {
  const { target, pointIndex } = transform;
  const poly = target as Polyline;
  const mouseLocalPosition = sendPointToPlane(
    new Point(x, y),
    undefined,
    poly.calcOwnMatrix(),
  );

  poly.points[pointIndex] = mouseLocalPosition.add(poly.pathOffset);
  poly.setDimensions();
  poly.set('dirty', true);
  return true;
};

/**
 * 当我们改变多边形的 `width`/`height`/`top`/`left` 时，保持多边形在相同的位置。
 * @param pointIndex 点索引
 * @param fn 变换操作处理程序
 *
 * Keep the polygon in the same position when we change its `width`/`height`/`top`/`left`.
 */
export const factoryPolyActionHandler = (
  pointIndex: number,
  fn: TransformActionHandler<TTransformAnchor>,
) => {
  return function (
    eventData: TPointerEvent,
    transform: Transform,
    x: number,
    y: number,
  ) {
    const poly = transform.target as Polyline,
      anchorPoint = new Point(
        poly.points[(pointIndex > 0 ? pointIndex : poly.points.length) - 1],
      ),
      anchorPointInParentPlane = anchorPoint
        .subtract(poly.pathOffset)
        .transform(poly.calcOwnMatrix()),
      actionPerformed = fn(eventData, { ...transform, pointIndex }, x, y);

    const newAnchorPointInParentPlane = anchorPoint
      .subtract(poly.pathOffset)
      .transform(poly.calcOwnMatrix());

    const diff = newAnchorPointInParentPlane.subtract(anchorPointInParentPlane);
    poly.left -= diff.x;
    poly.top -= diff.y;

    return actionPerformed;
  };
};

/**
 * 创建多边形动作处理程序。
 *
 * Create polygon action handler.
 *
 * @param pointIndex 点索引
 */
export const createPolyActionHandler = (pointIndex: number) =>
  wrapWithFireEvent(
    ACTION_NAME,
    factoryPolyActionHandler(pointIndex, polyActionHandler),
  );

/**
 * 为多边形或折线创建控件。
 *
 * Create controls for a polygon or polyline.
 *
 * @param arg0 多边形对象或点数
 * @param options 控件选项
 * @returns 控件对象
 */
export function createPolyControls(
  poly: Polyline,
  options?: Partial<Control>,
): Record<string, Control>;
export function createPolyControls(
  numOfControls: number,
  options?: Partial<Control>,
): Record<string, Control>;
export function createPolyControls(
  arg0: number | Polyline,
  options: Partial<Control> = {},
) {
  const controls = {} as Record<string, Control>;
  for (
    let idx = 0;
    idx < (typeof arg0 === 'number' ? arg0 : arg0.points.length);
    idx++
  ) {
    controls[`p${idx}`] = new Control({
      actionName: ACTION_NAME,
      positionHandler: createPolyPositionHandler(idx),
      actionHandler: createPolyActionHandler(idx),
      ...options,
    });
  }
  return controls;
}
