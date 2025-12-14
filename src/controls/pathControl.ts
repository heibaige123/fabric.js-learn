import { Point } from '../Point';
import { Control } from './Control';
import type { TMat2D } from '../typedefs';
import type { Path } from '../shapes/Path';
import { multiplyTransformMatrices } from '../util/misc/matrix';
import type {
  TModificationEvents,
  TPointerEvent,
  Transform,
} from '../EventTypeDefs';
import { sendPointToPlane } from '../util/misc/planeChange';
import type { TSimpleParseCommandType } from '../util/path/typedefs';
import type { ControlRenderingStyleOverride } from './controlRendering';
import { fireEvent } from './fireEvent';
import { commonEventInfo } from './util';

/**
 * 路径修改操作名称
 */
const ACTION_NAME: TModificationEvents = 'modifyPath' as const;

/**
 * 变换锚点类型
 */
type TTransformAnchor = Transform;

/**
 * 路径点控件样式
 */
export type PathPointControlStyle = {
  /**
   * 控件填充颜色
   */
  controlFill?: string;
  /**
   * 控件描边颜色
   */
  controlStroke?: string;
  /**
   * 连接虚线数组
   */
  connectionDashArray?: number[];
};

/**
 * 计算路径点位置
 * @param pathObject 路径对象
 * @param commandIndex 命令索引
 * @param pointIndex 点索引
 * @returns 路径点位置
 */
const calcPathPointPosition = (
  pathObject: Path,
  commandIndex: number,
  pointIndex: number,
) => {
  const { path, pathOffset } = pathObject;
  const command = path[commandIndex];
  return new Point(
    (command[pointIndex] as number) - pathOffset.x,
    (command[pointIndex + 1] as number) - pathOffset.y,
  ).transform(
    multiplyTransformMatrices(
      pathObject.getViewportTransform(),
      pathObject.calcTransformMatrix(),
    ),
  );
};

/**
 * 移动路径点
 * @param pathObject 路径对象
 * @param x 目标 x 坐标
 * @param y 目标 y 坐标
 * @param commandIndex 命令索引
 * @param pointIndex 点索引
 * @returns 如果发生移动，则为 true
 */
const movePathPoint = (
  pathObject: Path,
  x: number,
  y: number,
  commandIndex: number,
  pointIndex: number,
) => {
  const { path, pathOffset } = pathObject;

  const anchorCommand =
    path[(commandIndex > 0 ? commandIndex : path.length) - 1];
  const anchorPoint = new Point(
    anchorCommand[pointIndex] as number,
    anchorCommand[pointIndex + 1] as number,
  );

  const anchorPointInParentPlane = anchorPoint
    .subtract(pathOffset)
    .transform(pathObject.calcOwnMatrix());

  const mouseLocalPosition = sendPointToPlane(
    new Point(x, y),
    undefined,
    pathObject.calcOwnMatrix(),
  );

  path[commandIndex][pointIndex] = mouseLocalPosition.x + pathOffset.x;
  path[commandIndex][pointIndex + 1] = mouseLocalPosition.y + pathOffset.y;
  pathObject.setDimensions();

  const newAnchorPointInParentPlane = anchorPoint
    .subtract(pathObject.pathOffset)
    .transform(pathObject.calcOwnMatrix());

  const diff = newAnchorPointInParentPlane.subtract(anchorPointInParentPlane);
  pathObject.left -= diff.x;
  pathObject.top -= diff.y;
  pathObject.set('dirty', true);
  return true;
};

/**
 * 此函数定位控件。
 * 它将用于绘制和交互。
 *
 * This function locates the controls.
 * It'll be used both for drawing and for interaction.
 */
function pathPositionHandler(
  this: PathPointControl,
  dim: Point,
  finalMatrix: TMat2D,
  pathObject: Path,
) {
  const { commandIndex, pointIndex } = this;
  return calcPathPointPosition(pathObject, commandIndex, pointIndex);
}

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
function pathActionHandler(
  this: PathPointControl,
  eventData: TPointerEvent,
  transform: TTransformAnchor,
  x: number,
  y: number,
) {
  const { target } = transform;
  const { commandIndex, pointIndex } = this;
  const actionPerformed = movePathPoint(
    target as Path,
    x,
    y,
    commandIndex,
    pointIndex,
  );
  if (actionPerformed) {
    fireEvent(this.actionName as TModificationEvents, {
      ...commonEventInfo(eventData, transform, x, y),
      commandIndex,
      pointIndex,
    });
  }
  return actionPerformed;
}

/**
 * 从上一个命令获取索引
 * @param previousCommandType 上一个命令类型
 * @returns 索引
 */
const indexFromPrevCommand = (previousCommandType: TSimpleParseCommandType) =>
  previousCommandType === 'C' ? 5 : previousCommandType === 'Q' ? 3 : 1;

/**
 * 路径点控件类
 */
class PathPointControl extends Control {
  /**
   * 命令索引
   */
  declare commandIndex: number;
  /**
   * 点索引
   */
  declare pointIndex: number;
  /**
   * 控件填充颜色
   */
  declare controlFill: string;
  /**
   * 控件描边颜色
   */
  declare controlStroke: string;
  /**
   *
   * @param options 选项
   */
  constructor(options?: Partial<PathPointControl>) {
    super(options);
  }

  /**
   * 渲染控件
   * @param ctx  渲染上下文
   * @param left  控件中心应所在的 x 坐标
   * @param top  控件中心应所在的 y 坐标
   * @param styleOverride  FabricObject 控件样式的覆盖
   * @param fabricObject  我们正在为其渲染控件的 fabric 对象
   */
  render(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: ControlRenderingStyleOverride | undefined,
    fabricObject: Path,
  ) {
    const overrides: ControlRenderingStyleOverride = {
      ...styleOverride,
      cornerColor: this.controlFill,
      cornerStrokeColor: this.controlStroke,
      transparentCorners: !this.controlFill,
    };
    super.render(ctx, left, top, overrides, fabricObject);
  }
}

/**
 * 路径控制点控件类
 */
class PathControlPointControl extends PathPointControl {
  /**
   * 连接虚线数组
   */
  declare connectionDashArray?: number[];
  /**
   * 连接到的命令索引
   */
  declare connectToCommandIndex: number;
  /**
   * 连接到的点索引
   */
  declare connectToPointIndex: number;
  constructor(options?: Partial<PathControlPointControl>) {
    super(options);
  }

  /**
   * 渲染控件
   * @param this  PathControlPointControl 实例
   * @param ctx  渲染上下文
   * @param left 控件中心应所在的 x 坐标
   * @param top 控件中心应所在的 y 坐标
   * @param styleOverride FabricObject 控件样式的覆盖
   * @param fabricObject 我们正在为其渲染控件的 fabric 对象
   */
  render(
    this: PathControlPointControl,
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: ControlRenderingStyleOverride | undefined,
    fabricObject: Path,
  ) {
    const { path } = fabricObject;
    const {
      commandIndex,
      pointIndex,
      connectToCommandIndex,
      connectToPointIndex,
    } = this;
    ctx.save();
    ctx.strokeStyle = this.controlStroke;
    if (this.connectionDashArray) {
      ctx.setLineDash(this.connectionDashArray);
    }
    const [commandType] = path[commandIndex];
    const point = calcPathPointPosition(
      fabricObject,
      connectToCommandIndex,
      connectToPointIndex,
    );

    if (commandType === 'Q') {
      // one control point connects to 2 points
      const point2 = calcPathPointPosition(
        fabricObject,
        commandIndex,
        pointIndex + 2,
      );
      ctx.moveTo(point2.x, point2.y);
      ctx.lineTo(left, top);
    } else {
      ctx.moveTo(left, top);
    }
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();

    super.render(ctx, left, top, styleOverride, fabricObject);
  }
}

/**
 * 创建控件
 * @param commandIndexPos 命令索引位置
 * @param pointIndexPos 点索引位置
 * @param isControlPoint 是否为控制点
 * @param options 选项
 * @param connectToCommandIndex 连接到的命令索引
 * @param connectToPointIndex 连接到的点索引
 * @returns 控件实例
 */
const createControl = (
  commandIndexPos: number,
  pointIndexPos: number,
  isControlPoint: boolean,
  options: Partial<Control> & {
    controlPointStyle?: PathPointControlStyle;
    pointStyle?: PathPointControlStyle;
  },
  connectToCommandIndex?: number,
  connectToPointIndex?: number,
) =>
  new (isControlPoint ? PathControlPointControl : PathPointControl)({
    commandIndex: commandIndexPos,
    pointIndex: pointIndexPos,
    actionName: ACTION_NAME,
    positionHandler: pathPositionHandler,
    actionHandler: pathActionHandler,
    connectToCommandIndex,
    connectToPointIndex,
    ...options,
    ...(isControlPoint ? options.controlPointStyle : options.pointStyle),
  } as Partial<PathControlPointControl>);

/**
 * 创建路径控件
 * @param path 路径对象
 * @param options 选项
 * @returns 控件记录
 */
export function createPathControls(
  path: Path,
  options: Partial<Control> & {
    controlPointStyle?: PathPointControlStyle;
    pointStyle?: PathPointControlStyle;
  } = {},
): Record<string, Control> {
  const controls = {} as Record<string, Control>;
  let previousCommandType: TSimpleParseCommandType = 'M';
  path.path.forEach((command, commandIndex) => {
    const commandType = command[0];

    if (commandType !== 'Z') {
      controls[`c_${commandIndex}_${commandType}`] = createControl(
        commandIndex,
        command.length - 2,
        false,
        options,
      );
    }
    switch (commandType) {
      case 'C':
        controls[`c_${commandIndex}_C_CP_1`] = createControl(
          commandIndex,
          1,
          true,
          options,
          commandIndex - 1,
          indexFromPrevCommand(previousCommandType),
        );
        controls[`c_${commandIndex}_C_CP_2`] = createControl(
          commandIndex,
          3,
          true,
          options,
          commandIndex,
          5,
        );
        break;
      case 'Q':
        controls[`c_${commandIndex}_Q_CP_1`] = createControl(
          commandIndex,
          1,
          true,
          options,
          commandIndex,
          3,
        );
        break;
    }
    previousCommandType = commandType;
  });
  return controls;
}
