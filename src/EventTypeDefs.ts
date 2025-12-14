import type { Control } from './controls/Control';
import type { Point } from './Point';
import type { FabricObject } from './shapes/Object/FabricObject';
import type { Group } from './shapes/Group';
import type { TOriginX, TOriginY, TRadian } from './typedefs';
import type { saveObjectTransform } from './util/misc/objectTransforms';
import type { Canvas } from './canvas/Canvas';
import type { IText } from './shapes/IText/IText';
import type { StaticCanvas } from './canvas/StaticCanvas';
import type {
  LayoutBeforeEvent,
  LayoutAfterEvent,
} from './LayoutManager/types';
import type {
  MODIFIED,
  MODIFY_PATH,
  MODIFY_POLY,
  MOVING,
  RESIZING,
  ROTATING,
  SCALING,
  SKEWING,
} from './constants';
import type { TOCoord } from './shapes/Object/InteractiveObject';

/**
 * 修饰键类型
 */
export type ModifierKey = keyof Pick<
  MouseEvent | PointerEvent | TouchEvent,
  'altKey' | 'shiftKey' | 'ctrlKey' | 'metaKey'
>;

/**
 * 可选的修饰键类型
 */
export type TOptionalModifierKey = ModifierKey | null | undefined;

/**
 * 指针事件类型
 */
export type TPointerEvent = MouseEvent | TouchEvent | PointerEvent;

/**
 * 变换动作函数类型
 */
export type TransformAction<T extends Transform = Transform, R = void> = (
  eventData: TPointerEvent,
  transform: T,
  x: number,
  y: number,
) => R;

/**
 * 定义变换的控件处理程序
 * 这些处理程序在用户开始变换和变换期间运行
 *
 * Control handlers that define a transformation
 * Those handlers run when the user starts a transform and during a transform
 */
export type TransformActionHandler<T extends Transform = Transform> =
  TransformAction<T, boolean>;

/**
 * 在控件点击/按下/抬起时运行的控件处理程序
 * 这些处理程序在有或没有定义变换的情况下运行
 *
 * Control handlers that run on control click/down/up
 * Those handlers run with or without a transform defined
 */
export type ControlActionHandler = TransformAction<Transform, any>;

/**
 * 控件回调函数类型
 */
export type ControlCallback<R = void> = (
  eventData: TPointerEvent,
  control: Control,
  fabricObject: FabricObject,
) => R;

/**
 * 控件光标回调函数类型
 */
export type ControlCursorCallback<R = string> = (
  eventData: TPointerEvent,
  control: Control,
  fabricObject: FabricObject,
  coord: TOCoord,
) => R;

/**
 * 变换对象类型
 * 相对于目标的包含坐标平面
 * 两者在每个点上都一致
 *
 * relative to target's containing coordinate plane
 * both agree on every point
 */
export type Transform = {
  /**
   * 目标对象
   */
  target: FabricObject;
  /**
   * 动作名称
   */
  action?: string;
  /**
   * 动作处理程序
   */
  actionHandler?: TransformActionHandler;
  /**
   * 角落名称
   */
  corner: string;
  /**
   * X 轴缩放
   */
  scaleX: number;
  /**
   * Y 轴缩放
   */
  scaleY: number;
  /**
   * X 轴倾斜
   */
  skewX: number;
  /**
   * Y 轴倾斜
   */
  skewY: number;
  /**
   * X 轴偏移
   */
  offsetX: number;
  /**
   * Y 轴偏移
   */
  offsetY: number;
  /**
   * X 轴原点
   */
  originX: TOriginX;
  /**
   * Y 轴原点
   */
  originY: TOriginY;
  /**
   * 事件 X 坐标
   */
  ex: number;
  /**
   * 事件 Y 坐标
   */
  ey: number;
  /**
   * 上一次 X 坐标
   */
  lastX: number;
  /**
   * 上一次 Y 坐标
   */
  lastY: number;
  /**
   * 旋转角度（弧度）
   */
  theta: TRadian;
  /**
   * 宽度
   */
  width: number;
  /**
   * 高度
   */
  height: number;
  /**
   * 是否按下 Shift 键
   */
  shiftKey: boolean;
  /**
   * 是否按下 Alt 键
   */
  altKey: boolean;
  /**
   * 原始变换数据
   */
  original: ReturnType<typeof saveObjectTransform> & {
    originX: TOriginX;
    originY: TOriginY;
  };
  /**
   * 是否已执行动作
   */
  actionPerformed: boolean;
};

/**
 * 事件接口
 */
export interface TEvent<E extends Event = TPointerEvent> {
  /**
   * 原生事件对象
   */
  e: E;
}

/**
 * 带有目标的事件接口
 */
interface TEventWithTarget<E extends Event = TPointerEvent> extends TEvent<E> {
  /**
   * 目标对象
   */
  target: FabricObject;
}

/**
 * 基本变换事件接口
 */
export interface BasicTransformEvent<E extends Event = TPointerEvent>
  extends TEvent<E> {
  /**
   * 变换数据
   */
  transform: Transform;
  /* This pointer is usually a scenePoint. It isn't in the case of actions inside groups,
   * where it becomes a point relative to the group center
   */
  /**
   * 指针位置
   * 这个指针通常是一个场景点。在组内操作的情况下不是，
   * 此时它变成相对于组中心的点
   */
  pointer: Point;
}

/**
 * 修改事件类型集合
 */
export type TModificationEvents =
  | typeof MOVING
  | typeof SCALING
  | typeof ROTATING
  | typeof SKEWING
  | typeof RESIZING
  | typeof MODIFY_POLY
  | typeof MODIFY_PATH;

/**
 * 已修改事件接口
 */
export interface ModifiedEvent<E extends Event = TPointerEvent> {
  /**
   * 事件对象
   */
  e?: E;
  /**
   * 变换数据
   */
  transform?: Transform;
  /**
   * 目标对象
   */
  target: FabricObject;
  /**
   * 动作名称
   */
  action?: string;
}

/**
 * 修改路径事件接口
 */
export interface ModifyPathEvent {
  /**
   * 命令索引
   */
  commandIndex: number;
  /**
   * 点索引
   */
  pointIndex: number;
}

/**
 * 对象修改事件映射
 */
export type ObjectModificationEvents = {
  [MOVING]: BasicTransformEvent;
  [SCALING]: BasicTransformEvent;
  [ROTATING]: BasicTransformEvent;
  [SKEWING]: BasicTransformEvent;
  [RESIZING]: BasicTransformEvent;
  [MODIFY_POLY]: BasicTransformEvent;
  [MODIFY_PATH]: BasicTransformEvent & ModifyPathEvent;
  [MODIFIED]: ModifiedEvent;
};

/**
 * 画布修改事件映射
 */
type CanvasModificationEvents = {
  'before:transform': TEvent & { transform: Transform };
  'object:moving': BasicTransformEvent & { target: FabricObject };
  'object:scaling': BasicTransformEvent & { target: FabricObject };
  'object:rotating': BasicTransformEvent & { target: FabricObject };
  'object:skewing': BasicTransformEvent & { target: FabricObject };
  'object:resizing': BasicTransformEvent & { target: FabricObject };
  'object:modifyPoly': BasicTransformEvent & { target: FabricObject };
  'object:modifyPath': BasicTransformEvent & {
    target: FabricObject;
  } & ModifyPathEvent;
  'object:modified': ModifiedEvent;
};

/**
 * 指针事件信息接口
 */
export interface TPointerEventInfo<E extends TPointerEvent = TPointerEvent>
  extends TEvent<E> {
  /**
   * 目标对象
   */
  target?: FabricObject;
  /**
   * 子目标对象列表
   */
  subTargets?: FabricObject[];
  /**
   * 变换数据
   */
  transform?: Transform | null;
  /**
   * 场景坐标点
   */
  scenePoint: Point;
  /**
   * 视口坐标点
   */
  viewportPoint: Point;
}

/**
 * 简单事件处理程序接口
 */
interface SimpleEventHandler<T extends Event = TPointerEvent>
  extends TEvent<T> {
  /**
   * 目标对象
   */
  target?: FabricObject;
  /**
   * 子目标对象列表
   */
  subTargets: FabricObject[];
}

/**
 * 进入事件接口
 */
interface InEvent {
  /**
   * 上一个目标对象
   */
  previousTarget?: FabricObject;
}

/**
 * 离开事件接口
 */
interface OutEvent {
  /**
   * 下一个目标对象
   */
  nextTarget?: FabricObject;
}

/**
 * 拖拽事件数据接口
 */
export interface DragEventData extends TEvent<DragEvent> {
  /**
   * 目标对象
   */
  target?: FabricObject;
  /**
   * 子目标对象列表
   */
  subTargets?: FabricObject[];
  /**
   * 拖拽源对象
   */
  dragSource?: FabricObject;
  /**
   * 是否可以放置
   */
  canDrop?: boolean;
  /**
   * 是否已放置
   */
  didDrop?: boolean;
  /**
   * 放置目标对象
   */
  dropTarget?: FabricObject;
}

/**
 * 放置事件数据接口
 */
export interface DropEventData extends DragEventData {
  /**
   * 场景坐标点
   */
  scenePoint: Point;
  /**
   * 视口坐标点
   */
  viewportPoint: Point;
}

/**
 * 拖放事件映射
 */
interface DnDEvents {
  dragstart: TEventWithTarget<DragEvent>;
  drag: DragEventData;
  dragover: DragEventData;
  dragenter: DragEventData & InEvent;
  dragleave: DragEventData & OutEvent;
  dragend: DragEventData;
  'drop:before': DropEventData;
  drop: DropEventData;
  'drop:after': DropEventData;
}

/**
 * 画布拖放事件映射
 */
interface CanvasDnDEvents extends DnDEvents {
  'drag:enter': DragEventData & InEvent;
  'drag:leave': DragEventData & OutEvent;
}

/**
 * 画布选择事件映射
 */
interface CanvasSelectionEvents {
  'selection:created': Partial<TEvent> & {
    selected: FabricObject[];
  };
  'selection:updated': Partial<TEvent> & {
    selected: FabricObject[];
    deselected: FabricObject[];
  };
  'before:selection:cleared': Partial<TEvent> & {
    deselected: FabricObject[];
  };
  'selection:cleared': Partial<TEvent> & {
    deselected: FabricObject[];
  };
}

/**
 * 集合事件映射
 */
export interface CollectionEvents {
  'object:added': { target: FabricObject };
  'object:removed': { target: FabricObject };
}

/**
 * 前缀类型
 */
type BeforeSuffix<T extends string> = `${T}:before`;
/**
 * 带前缀类型
 */
type WithBeforeSuffix<T extends string> = T | BeforeSuffix<T>;

/**
 * 指针事件映射类型
 */
type TPointerEvents<Prefix extends string> = Record<
  `${Prefix}${
    | WithBeforeSuffix<'down'>
    | WithBeforeSuffix<'move'>
    | 'dblclick'
    | 'tripleclick'}`,
  TPointerEventInfo
> &
  Record<
    `${Prefix}down`,
    TPointerEventInfo & {
      /**
       * 指示目标或当前目标在鼠标按下 -> 鼠标抬起循环开始之前是否已被选中
       *
       * Indicates if the target or current target where already selected
       * before the cycle of mouse down -> mouse up started
       */
      alreadySelected: boolean;
    }
  > &
  Record<
    `${Prefix}${WithBeforeSuffix<'up'>}`,
    TPointerEventInfo & {
      /**
       * 是否为点击
       */
      isClick: boolean;
    }
  > &
  Record<`${Prefix}wheel`, TPointerEventInfo<WheelEvent>> &
  Record<`${Prefix}over`, TPointerEventInfo & InEvent> &
  Record<`${Prefix}out`, TPointerEventInfo & OutEvent> &
  Record<'pinch', TPointerEventInfo & { scale: number }> &
  Record<'rotate', TPointerEventInfo & { rotation: number }>;

/**
 * 指针事件名称类型
 */
export type TPointerEventNames =
  | WithBeforeSuffix<'down'>
  | WithBeforeSuffix<'move'>
  | WithBeforeSuffix<'up'>
  | 'dblclick'
  | 'tripleclick'
  | 'wheel';

/**
 * 对象指针事件类型
 */
export type ObjectPointerEvents = TPointerEvents<'mouse'>;
/**
 * 画布指针事件类型
 */
export type CanvasPointerEvents = TPointerEvents<'mouse:'>;

/**
 * 杂项事件接口
 */
export interface MiscEvents {
  'contextmenu:before': SimpleEventHandler<Event>;
  contextmenu: SimpleEventHandler<Event>;
}

/**
 * 对象事件接口
 */
export interface ObjectEvents
  extends ObjectPointerEvents,
    DnDEvents,
    MiscEvents,
    ObjectModificationEvents {
  // selection
  /**
   * 选中事件
   */
  selected: Partial<TEvent> & {
    target: FabricObject;
  };
  /**
   * 取消选中事件
   */
  deselected: Partial<TEvent> & {
    target: FabricObject;
  };
  // tree
  /**
   * 添加事件
   */
  added: { target: Group | Canvas | StaticCanvas };
  /**
   * 移除事件
   */
  removed: { target: Group | Canvas | StaticCanvas };

  // erasing
  /**
   * 擦除结束事件
   */
  'erasing:end': { path: FabricObject };
}

/**
 * 静态画布事件接口
 */
export interface StaticCanvasEvents extends CollectionEvents {
  // tree
  /**
   * 画布清除事件
   */
  'canvas:cleared': never;

  // rendering
  /**
   * 渲染前事件
   */
  'before:render': { ctx: CanvasRenderingContext2D };
  /**
   * 渲染后事件
   */
  'after:render': { ctx: CanvasRenderingContext2D };
  /**
   * 对象布局前事件
   */
  'object:layout:before': LayoutBeforeEvent & { target: Group };
  /**
   * 对象布局后事件
   */
  'object:layout:after': LayoutAfterEvent & { target: Group };
}

/**
 * 画布事件接口
 */
export interface CanvasEvents
  extends StaticCanvasEvents,
    CanvasPointerEvents,
    CanvasDnDEvents,
    MiscEvents,
    CanvasModificationEvents,
    CanvasSelectionEvents {
  // brushes
  /**
   * 路径创建前事件
   */
  'before:path:created': { path: FabricObject };
  /**
   * 路径创建事件
   */
  'path:created': { path: FabricObject };

  // erasing
  /**
   * 擦除开始事件
   */
  'erasing:start': never;
  /**
   * 擦除结束事件
   */
  'erasing:end':
    | never
    | {
        path: FabricObject;
        targets: FabricObject[];
        subTargets: FabricObject[];
        drawables: {
          backgroundImage?: FabricObject;
          overlayImage?: FabricObject;
        };
      };

  // IText
  /**
   * 文本选择改变事件
   */
  'text:selection:changed': { target: IText };
  /**
   * 文本改变事件
   */
  'text:changed': { target: IText };
  /**
   * 进入文本编辑事件
   */
  'text:editing:entered': { target: IText } & Partial<TEvent>;
  /**
   * 退出文本编辑事件
   */
  'text:editing:exited': { target: IText };
}

/**
 * 事件额外数据类型
 */
export type TEventsExtraData = Record<PropertyKey, Record<PropertyKey, never>> &
  Record<'down', { alreadySelected: boolean }>;
