import { Point } from '../Point';
import {
  CENTER,
  CHANGED,
  MODIFIED,
  MODIFY_PATH,
  MODIFY_POLY,
  MOVING,
  RESIZING,
  ROTATING,
  SCALING,
  SKEWING,
  iMatrix,
} from '../constants';
import type { Group } from '../shapes/Group';
import type { FabricObject } from '../shapes/Object/FabricObject';
import { invertTransform } from '../util/misc/matrix';
import { resolveOrigin } from '../util/misc/resolveOrigin';
import { FitContentLayout } from './LayoutStrategies/FitContentLayout';
import type { LayoutStrategy } from './LayoutStrategies/LayoutStrategy';
import {
  LAYOUT_TYPE_INITIALIZATION,
  LAYOUT_TYPE_ADDED,
  LAYOUT_TYPE_REMOVED,
  LAYOUT_TYPE_IMPERATIVE,
  LAYOUT_TYPE_OBJECT_MODIFIED,
  LAYOUT_TYPE_OBJECT_MODIFYING,
} from './constants';
import type {
  LayoutContext,
  LayoutResult,
  RegistrationContext,
  StrictLayoutContext,
} from './types';
import { classRegistry } from '../ClassRegistry';
import type { TModificationEvents } from '../EventTypeDefs';

/**
 * LayoutManager 类名常量
 */
const LAYOUT_MANAGER = 'layoutManager';

/**
 * 序列化的 LayoutManager 接口
 */
export type SerializedLayoutManager = {
  /**
   * 类型
   */
  type: string;
  /**
   * 策略名称
   */
  strategy: string;
};

/**
 * 布局管理器类，负责管理组的布局
 */
export class LayoutManager {
  /**
   * 上一个布局策略
   */
  declare private _prevLayoutStrategy?: LayoutStrategy;
  /**
   * 订阅映射，存储对象和其对应的取消订阅函数
   */
  declare protected _subscriptions: Map<FabricObject, VoidFunction[]>;

  /**
   * 当前使用的布局策略
   */
  strategy: LayoutStrategy;

  /**
   * 构造函数
   * @param strategy 布局策略，默认为 FitContentLayout
   */
  constructor(strategy: LayoutStrategy = new FitContentLayout()) {
    this.strategy = strategy;
    this._subscriptions = new Map();
  }

  /**
   * 执行布局
   * @param context 布局上下文
   */
  public performLayout(context: LayoutContext) {
    const strictContext: StrictLayoutContext = {
      bubbles: true,
      strategy: this.strategy,
      ...context,
      prevStrategy: this._prevLayoutStrategy,
      stopPropagation() {
        this.bubbles = false;
      },
    };

    this.onBeforeLayout(strictContext);

    const layoutResult = this.getLayoutResult(strictContext);
    if (layoutResult) {
      this.commitLayout(strictContext, layoutResult);
    }

    this.onAfterLayout(strictContext, layoutResult);
    this._prevLayoutStrategy = strictContext.strategy;
  }

  /**
   * 为已知会使布局失效的事件（在子对象上执行的一般变换）附加处理程序。
   * 返回用于稍后取消订阅和清理的清理函数。
   *
   * @param {FabricObject} object 要附加处理程序的对象
   * @param {RegistrationContext & Partial<StrictLayoutContext>} context 注册上下文
   * @returns {VoidFunction[]} 移除处理程序的清理函数数组
   */
  protected attachHandlers(
    object: FabricObject,
    context: RegistrationContext & Partial<StrictLayoutContext>,
  ): VoidFunction[] {
    const { target } = context;
    return (
      [
        MODIFIED,
        MOVING,
        RESIZING,
        ROTATING,
        SCALING,
        SKEWING,
        CHANGED,
        MODIFY_POLY,
        MODIFY_PATH,
      ] as (TModificationEvents & 'modified')[]
    ).map((key) =>
      object.on(key, (e) =>
        this.performLayout(
          key === MODIFIED
            ? {
                type: LAYOUT_TYPE_OBJECT_MODIFIED,
                trigger: key,
                e,
                target,
              }
            : {
                type: LAYOUT_TYPE_OBJECT_MODIFYING,
                trigger: key,
                e,
                target,
              },
        ),
      ),
    );
  }

  /**
   * 订阅对象以转换将触发父级布局更改的事件。
   * 这仅对交互式组很重要。
   *
   * @param object 要订阅的对象
   * @param context 注册上下文
   */
  protected subscribe(
    object: FabricObject,
    context: RegistrationContext & Partial<StrictLayoutContext>,
  ) {
    this.unsubscribe(object, context);
    const disposers = this.attachHandlers(object, context);
    this._subscriptions.set(object, disposers);
  }

  /**
   * 取消订阅对象布局触发器
   *
   * @param object 要取消订阅的对象
   * @param _context 注册上下文（可选）
   */
  protected unsubscribe(
    object: FabricObject,
    _context?: RegistrationContext & Partial<StrictLayoutContext>,
  ) {
    (this._subscriptions.get(object) || []).forEach((d) => d());
    this._subscriptions.delete(object);
  }

  /**
   * 取消订阅目标列表中的所有对象
   * @param context 注册上下文
   */
  unsubscribeTargets(
    context: RegistrationContext & Partial<StrictLayoutContext>,
  ) {
    context.targets.forEach((object) => this.unsubscribe(object, context));
  }

  /**
   * 订阅目标列表中的所有对象
   * @param context 注册上下文
   */
  subscribeTargets(
    context: RegistrationContext & Partial<StrictLayoutContext>,
  ) {
    context.targets.forEach((object) => this.subscribe(object, context));
  }

  /**
   * 在布局之前调用的钩子方法
   * @param context 严格布局上下文
   */
  protected onBeforeLayout(context: StrictLayoutContext) {
    const { target, type } = context;
    const { canvas } = target;
    // handle layout triggers subscription
    // @TODO: gate the registration when the group is interactive
    if (type === LAYOUT_TYPE_INITIALIZATION || type === LAYOUT_TYPE_ADDED) {
      this.subscribeTargets(context);
    } else if (type === LAYOUT_TYPE_REMOVED) {
      this.unsubscribeTargets(context);
    }
    // fire layout event (event will fire only for layouts after initialization layout)
    target.fire('layout:before', {
      context,
    });
    canvas &&
      canvas.fire('object:layout:before', {
        target,
        context,
      });

    if (type === LAYOUT_TYPE_IMPERATIVE && context.deep) {
      const { strategy: _, ...tricklingContext } = context;
      // traverse the tree
      target.forEachObject(
        (object) =>
          (object as Group).layoutManager &&
          (object as Group).layoutManager.performLayout({
            ...tricklingContext,
            bubbles: false,
            target: object as Group,
          }),
      );
    }
  }

  /**
   * 获取布局结果
   * @param context 严格布局上下文
   * @returns 布局结果或 undefined
   */
  protected getLayoutResult(
    context: StrictLayoutContext,
  ): Required<LayoutResult> | undefined {
    const { target, strategy, type } = context;

    const result = strategy.calcLayoutResult(context, target.getObjects());

    if (!result) {
      return;
    }

    const prevCenter =
      type === LAYOUT_TYPE_INITIALIZATION
        ? new Point()
        : target.getRelativeCenterPoint();

    const {
      center: nextCenter,
      correction = new Point(),
      relativeCorrection = new Point(),
    } = result;
    const offset = prevCenter
      .subtract(nextCenter)
      .add(correction)
      .transform(
        // in `initialization` we do not account for target's transformation matrix
        type === LAYOUT_TYPE_INITIALIZATION
          ? iMatrix
          : invertTransform(target.calcOwnMatrix()),
        true,
      )
      .add(relativeCorrection);

    return {
      result,
      prevCenter,
      nextCenter,
      offset,
    };
  }

  /**
   * 提交布局结果，更新目标对象的属性
   * @param context 严格布局上下文
   * @param layoutResult 布局结果
   */
  protected commitLayout(
    context: StrictLayoutContext,
    layoutResult: Required<LayoutResult>,
  ) {
    const { target } = context;
    const {
      result: { size },
      nextCenter,
    } = layoutResult;
    // set dimensions
    target.set({ width: size.x, height: size.y });
    // layout descendants
    this.layoutObjects(context, layoutResult);
    //  set position
    // in `initialization` we do not account for target's transformation matrix
    if (context.type === LAYOUT_TYPE_INITIALIZATION) {
      // TODO: what about strokeWidth?
      target.set({
        left:
          context.x ?? nextCenter.x + size.x * resolveOrigin(target.originX),
        top: context.y ?? nextCenter.y + size.y * resolveOrigin(target.originY),
      });
    } else {
      target.setPositionByOrigin(nextCenter, CENTER, CENTER);
      // invalidate
      target.setCoords();
      target.set('dirty', true);
    }
  }

  /**
   * 布局子对象
   * @param context 严格布局上下文
   * @param layoutResult 布局结果
   */
  protected layoutObjects(
    context: StrictLayoutContext,
    layoutResult: Required<LayoutResult>,
  ) {
    const { target } = context;
    //  adjust objects to account for new center
    target.forEachObject((object) => {
      object.group === target &&
        this.layoutObject(context, layoutResult, object);
    });
    // adjust clip path to account for new center
    context.strategy.shouldLayoutClipPath(context) &&
      this.layoutObject(context, layoutResult, target.clipPath as FabricObject);
  }

  /**
   * 布局单个对象
   * @param context 严格布局上下文
   * @param layoutResult 布局结果，包含偏移量
   * @param object 要布局的对象
   *
   */
  protected layoutObject(
    context: StrictLayoutContext,
    { offset }: Required<LayoutResult>,
    object: FabricObject,
  ) {
    // TODO: this is here for cache invalidation.
    // verify if this is necessary since we have explicit
    // cache invalidation at the end of commitLayout
    object.set({
      left: object.left + offset.x,
      top: object.top + offset.y,
    });
  }

  /**
   * 在布局之后调用的钩子方法
   * @param context 严格布局上下文
   * @param layoutResult 布局结果（可选）
   */
  protected onAfterLayout(
    context: StrictLayoutContext,
    layoutResult?: LayoutResult,
  ) {
    const {
      target,
      strategy,
      bubbles,
      prevStrategy: _,
      ...bubblingContext
    } = context;
    const { canvas } = target;

    //  fire layout event (event will fire only for layouts after initialization layout)
    target.fire('layout:after', {
      context,
      result: layoutResult,
    });
    canvas &&
      canvas.fire('object:layout:after', {
        context,
        result: layoutResult,
        target,
      });

    //  bubble
    const parent = target.parent;
    if (bubbles && parent?.layoutManager) {
      //  add target to context#path
      (bubblingContext.path || (bubblingContext.path = [])).push(target);
      //  all parents should invalidate their layout
      parent.layoutManager.performLayout({
        ...bubblingContext,
        target: parent,
      });
    }
    target.set('dirty', true);
  }

  /**
   * 释放资源，取消所有订阅
   */
  dispose() {
    const { _subscriptions } = this;
    _subscriptions.forEach((disposers) => disposers.forEach((d) => d()));
    _subscriptions.clear();
  }

  /**
   * 转换为对象表示
   * @returns 对象表示
   */
  toObject() {
    return {
      type: LAYOUT_MANAGER,
      strategy: (this.strategy.constructor as typeof LayoutStrategy).type,
    };
  }

  /**
   * 转换为 JSON
   * @returns JSON 对象
   */
  toJSON() {
    return this.toObject();
  }
}

classRegistry.setClass(LayoutManager, LAYOUT_MANAGER);
