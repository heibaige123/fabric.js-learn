import type {
  BasicTransformEvent,
  ModifiedEvent,
  TModificationEvents,
} from '../EventTypeDefs';
import type { Point } from '../Point';
import type { Group } from '../shapes/Group';
import type { ITextEvents } from '../shapes/IText/ITextBehavior';
import type { FabricObject } from '../shapes/Object/FabricObject';
import type { LayoutStrategy } from './LayoutStrategies/LayoutStrategy';
import type {
  LAYOUT_TYPE_INITIALIZATION,
  LAYOUT_TYPE_ADDED,
  LAYOUT_TYPE_IMPERATIVE,
  LAYOUT_TYPE_REMOVED,
  LAYOUT_TYPE_OBJECT_MODIFIED,
  LAYOUT_TYPE_OBJECT_MODIFYING,
} from './constants';

/**
 * 布局触发器类型
 */
export type LayoutTrigger =
  | typeof LAYOUT_TYPE_INITIALIZATION
  | typeof LAYOUT_TYPE_OBJECT_MODIFYING
  | typeof LAYOUT_TYPE_OBJECT_MODIFIED
  | typeof LAYOUT_TYPE_ADDED
  | typeof LAYOUT_TYPE_REMOVED
  | typeof LAYOUT_TYPE_IMPERATIVE;

/**
 * 布局策略结果接口
 */
export type LayoutStrategyResult = {
  /**
   * 在**包含**平面中测量的新中心点（与 `originX` 设置为 `center` 时的 `left` 相同）
   *
   * new center point as measured by the **containing** plane (same as `left` with `originX` set to `center`)
   */
  center: Point;

  /**
   * 用于平移对象的校正向量，在与 `center` 相同的平面中测量
   *
   * 由于对象是相对于组的中心测量的，一旦组的大小发生变化，我们必须对对象的位置应用校正，以便它们与新中心相关联。
   * 换句话说，此值使得可以相对于左上角（例如，但不限于）布局对象。
   *
   * correction vector to translate objects by, measured in the same plane as `center`
   *
   * Since objects are measured relative to the group's center, once the group's size changes we must apply a correction to
   * the objects' positions so that they relate to the new center.
   * In other words, this value makes it possible to layout objects relative to the tl corner, for instance, but not only.
   */
  correction?: Point;

  /**
   * 由平面测量的用于平移对象的校正向量
   *
   * correction vector to translate objects by as measured by the plane
   */
  relativeCorrection?: Point;

  /**
   * 布局目标的新宽度和高度
   *
   * new width and height of the layout target
   */
  size: Point;
};

/**
 * 布局结果接口
 */
export type LayoutResult = {
  /**
   * 布局策略结果
   */
  result?: LayoutStrategyResult;
  /**
   * 上一个中心点
   */
  prevCenter: Point;
  /**
   * 下一个中心点
   */
  nextCenter: Point;
  /**
   * 用于偏移对象的向量，由平面测量
   *
   * The vector used to offset objects by, as measured by the plane
   */
  offset: Point;
};

/**
 * 命令式布局通用选项
 */
type ImperativeLayoutCommonOptions = {
  /**
   * 覆盖的布局策略结果
   */
  overrides?: LayoutStrategyResult;
  /**
   * 是否冒泡
   */
  bubbles?: boolean;
  /**
   * 是否深度布局
   */
  deep?: boolean;
};

/**
 * 命令式布局选项
 */
export type ImperativeLayoutOptions = ImperativeLayoutCommonOptions & {
  /**
   * 布局策略
   */
  strategy?: LayoutStrategy;
};

/**
 * 通用布局上下文
 */
export type CommonLayoutContext = {
  /**
   * 目标组
   */
  target: Group;
  /**
   * 布局策略
   */
  strategy?: LayoutStrategy;
  /**
   * 布局触发器类型
   */
  type: LayoutTrigger;
  /**
   * 从触发当前调用的对象开始的对象数组
   *
   * array of objects starting from the object that triggered the call to the current one
   */
  path?: Group[];
};

/**
 * 初始化布局上下文
 */
export type InitializationLayoutContext = CommonLayoutContext & {
  /**
   * 类型：初始化
   */
  type: typeof LAYOUT_TYPE_INITIALIZATION;
  /**
   * 目标对象数组
   */
  targets: FabricObject[];
  /**
   * X 坐标
   */
  x?: number;
  /**
   * Y 坐标
   */
  y?: number;
};

/**
 * 集合更改布局上下文
 */
export type CollectionChangeLayoutContext = CommonLayoutContext & {
  /**
   * 类型：添加或移除
   */
  type: typeof LAYOUT_TYPE_ADDED | typeof LAYOUT_TYPE_REMOVED;
  /**
   * 目标对象数组
   */
  targets: FabricObject[];
};

/**
 * 对象修改完成布局上下文
 */
export type ObjectModifiedLayoutContext = CommonLayoutContext & {
  /**
   * 类型：对象修改完成
   */
  type: typeof LAYOUT_TYPE_OBJECT_MODIFIED;
  /**
   * 触发器：modified
   */
  trigger: 'modified';
  /**
   * 修改事件
   */
  e: ModifiedEvent;
};

/**
 * 对象正在修改布局上下文
 */
export type ObjectModifyingLayoutContext = CommonLayoutContext & {
  /**
   * 类型：对象正在修改
   */
  type: typeof LAYOUT_TYPE_OBJECT_MODIFYING;
} & (
    | {
        /**
         * 触发器：修改事件类型
         */
        trigger: TModificationEvents;
        /**
         * 基础变换事件
         */
        e: BasicTransformEvent;
      }
    | {
        /**
         * 触发器：changed
         */
        trigger: 'changed';
        /**
         * IText changed 事件
         */
        e: ITextEvents['changed'];
      }
  );

/**
 * 命令式布局上下文
 */
export type ImperativeLayoutContext = CommonLayoutContext &
  ImperativeLayoutCommonOptions & {
    /**
     * 类型：命令式
     */
    type: typeof LAYOUT_TYPE_IMPERATIVE;
  };

/**
 * 布局上下文联合类型
 */
export type LayoutContext =
  | InitializationLayoutContext
  | CollectionChangeLayoutContext
  | ObjectModifiedLayoutContext
  | ObjectModifyingLayoutContext
  | ImperativeLayoutContext;

/**
 * 严格布局上下文
 */
export type StrictLayoutContext = LayoutContext & {
  /**
   * 布局策略
   */
  strategy: LayoutStrategy;
  /**
   * 上一个布局策略
   */
  prevStrategy?: LayoutStrategy;
  /**
   * 是否冒泡
   */
  bubbles: boolean;
  /**
   * 停止传播
   */
  stopPropagation(): void;
};

/**
 * 注册上下文
 */
export type RegistrationContext = {
  /**
   * 目标对象数组
   */
  targets: FabricObject[];
  /**
   * 目标组
   */
  target: Group;
};

/**
 * 布局前事件
 */
export type LayoutBeforeEvent = {
  /**
   * 严格布局上下文
   */
  context: StrictLayoutContext;
};

/**
 * 布局后事件
 */
export type LayoutAfterEvent = {
  /**
   * 严格布局上下文
   */
  context: StrictLayoutContext;
  /**
   * 布局结果（如果跳过布局则为 undefined）
   *
   * will be undefined if layout was skipped
   */
  result?: LayoutResult;
};
