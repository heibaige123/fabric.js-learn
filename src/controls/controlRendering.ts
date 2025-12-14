import { FILL, STROKE, twoMathPi } from '../constants';
import type { InteractiveFabricObject } from '../shapes/Object/InteractiveObject';
import { degreesToRadians } from '../util/misc/radiansDegreesConversion';
import type { Control } from './Control';

/**
 * 控件渲染样式覆盖
 */
export type ControlRenderingStyleOverride = Partial<
  Pick<
    InteractiveFabricObject,
    | 'cornerStyle'
    | 'cornerSize'
    | 'cornerColor'
    | 'cornerStrokeColor'
    | 'cornerDashArray'
    | 'transparentCorners'
  >
>;

/**
 * 控件渲染器类型
 * @param ctx 渲染上下文
 * @param left 控件中心应所在的 x 坐标
 * @param top 控件中心应所在的 y 坐标
 * @param styleOverride FabricObject 控件样式的覆盖
 * @param fabricObject 我们正在为其渲染控件的 fabric 对象
 */
export type ControlRenderer<
  O extends InteractiveFabricObject = InteractiveFabricObject,
> = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: ControlRenderingStyleOverride,
  fabricObject: O,
) => void;

/**
 * 渲染圆形控件，按照 fabric 的特性。
 * 编写此函数是为了尊重对象属性，如 transparentCorners、cornerSize、cornerColor、cornerStrokeColor
 * 加上 offsetY 和 offsetX。
 *
 * Render a round control, as per fabric features.
 * This function is written to respect object properties like transparentCorners, cornerSize
 * cornerColor, cornerStrokeColor
 * plus the addition of offsetY and offsetX.
 * @param {CanvasRenderingContext2D} ctx context to render on
 * @param {Number} left x coordinate where the control center should be
 * @param {Number} top y coordinate where the control center should be
 * @param {Object} styleOverride override for FabricObject controls style
 * @param {FabricObject} fabricObject the fabric object for which we are rendering controls
 * @param ctx 渲染上下文
 * @param left 控件中心应所在的 x 坐标
 * @param top 控件中心应所在的 y 坐标
 * @param styleOverride FabricObject 控件样式的覆盖
 * @param fabricObject 我们正在为其渲染控件的 fabric 对象
 */
export function renderCircleControl(
  this: Control,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: ControlRenderingStyleOverride,
  fabricObject: InteractiveFabricObject,
) {
  styleOverride = styleOverride || {};
  const xSize =
      this.sizeX || styleOverride.cornerSize || fabricObject.cornerSize,
    ySize = this.sizeY || styleOverride.cornerSize || fabricObject.cornerSize,
    transparentCorners =
      typeof styleOverride.transparentCorners !== 'undefined'
        ? styleOverride.transparentCorners
        : fabricObject.transparentCorners,
    methodName = transparentCorners ? STROKE : FILL,
    stroke =
      !transparentCorners &&
      (styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor);
  let myLeft = left,
    myTop = top,
    size;
  ctx.save();
  ctx.fillStyle = styleOverride.cornerColor || fabricObject.cornerColor || '';
  ctx.strokeStyle =
    styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor || '';
  // TODO: use proper ellipse code.
  if (xSize > ySize) {
    size = xSize;
    ctx.scale(1.0, ySize / xSize);
    myTop = (top * xSize) / ySize;
  } else if (ySize > xSize) {
    size = ySize;
    ctx.scale(xSize / ySize, 1.0);
    myLeft = (left * ySize) / xSize;
  } else {
    size = xSize;
  }
  ctx.beginPath();
  ctx.arc(myLeft, myTop, size / 2, 0, twoMathPi, false);
  ctx[methodName]();
  if (stroke) {
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 渲染方形控件，按照 fabric 的特性。
 * 编写此函数是为了尊重对象属性，如 transparentCorners、cornerSize、cornerColor、cornerStrokeColor
 * 加上 offsetY 和 offsetX。
 *
 * Render a square control, as per fabric features.
 * This function is written to respect object properties like transparentCorners, cornerSize
 * cornerColor, cornerStrokeColor
 * plus the addition of offsetY and offsetX.
 * @param {CanvasRenderingContext2D} ctx context to render on
 * @param {Number} left x coordinate where the control center should be
 * @param {Number} top y coordinate where the control center should be
 * @param {Object} styleOverride override for FabricObject controls style
 * @param {FabricObject} fabricObject the fabric object for which we are rendering controls
 * @param ctx 渲染上下文
 * @param left 控件中心应所在的 x 坐标
 * @param top 控件中心应所在的 y 坐标
 * @param styleOverride FabricObject 控件样式的覆盖
 * @param fabricObject 我们正在为其渲染控件的 fabric 对象
 */
export function renderSquareControl(
  this: Control,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: ControlRenderingStyleOverride,
  fabricObject: InteractiveFabricObject,
) {
  styleOverride = styleOverride || {};
  const xSize =
      this.sizeX || styleOverride.cornerSize || fabricObject.cornerSize,
    ySize = this.sizeY || styleOverride.cornerSize || fabricObject.cornerSize,
    transparentCorners =
      typeof styleOverride.transparentCorners !== 'undefined'
        ? styleOverride.transparentCorners
        : fabricObject.transparentCorners,
    methodName = transparentCorners ? STROKE : FILL,
    stroke =
      !transparentCorners &&
      (styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor),
    xSizeBy2 = xSize / 2,
    ySizeBy2 = ySize / 2;
  ctx.save();
  ctx.fillStyle = styleOverride.cornerColor || fabricObject.cornerColor || '';
  ctx.strokeStyle =
    styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor || '';
  ctx.translate(left, top);
  //  angle is relative to canvas plane
  const angle = fabricObject.getTotalAngle();
  ctx.rotate(degreesToRadians(angle));
  // this does not work, and fixed with ( && ) does not make sense.
  // to have real transparent corners we need the controls on upperCanvas
  // transparentCorners || ctx.clearRect(-xSizeBy2, -ySizeBy2, xSize, ySize);
  ctx[`${methodName}Rect`](-xSizeBy2, -ySizeBy2, xSize, ySize);
  if (stroke) {
    ctx.strokeRect(-xSizeBy2, -ySizeBy2, xSize, ySize);
  }
  ctx.restore();
}
