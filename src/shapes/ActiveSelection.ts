import type { ControlRenderingStyleOverride } from '../controls/controlRendering';
import { classRegistry } from '../ClassRegistry';
import type { GroupProps } from './Group';
import { Group } from './Group';
import type { FabricObject } from './Object/FabricObject';
import {
  LAYOUT_TYPE_ADDED,
  LAYOUT_TYPE_REMOVED,
} from '../LayoutManager/constants';
import type { TClassProperties } from '../typedefs';
import { log } from '../util/internals/console';
import { ActiveSelectionLayoutManager } from '../LayoutManager/ActiveSelectionLayoutManager';

/**
 * 多选堆叠顺序类型
 * - `canvas-stacking`: 尊重画布对象的堆叠顺序
 * - `selection-order`: 按照选择的顺序堆叠
 */
export type MultiSelectionStacking = 'canvas-stacking' | 'selection-order';

/**
 * ActiveSelection 选项接口
 */
export interface ActiveSelectionOptions extends GroupProps {
  /**
   * 控制多选时的堆叠顺序
   */
  multiSelectionStacking: MultiSelectionStacking;
}

/**
 * ActiveSelection 的默认值
 */
const activeSelectionDefaultValues: Partial<TClassProperties<ActiveSelection>> =
  {
    multiSelectionStacking: 'canvas-stacking',
  };

/**
 * 由 Canvas 用于管理选择。
 *
 * Used by Canvas to manage selection.
 * 由 Canvas 用于管理选择。
 *
 * @example
 * class MyActiveSelection extends ActiveSelection {
 *   ...
 * }
 *
 * // override the default `ActiveSelection` class
 * classRegistry.setClass(MyActiveSelection)
 */
export class ActiveSelection extends Group {
  /**
   * 对象类型标识
   */
  static type = 'ActiveSelection';

  /**
   * ActiveSelection 自身的默认值
   */
  static ownDefaults: Record<string, any> = activeSelectionDefaultValues;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return { ...super.getDefaults(), ...ActiveSelection.ownDefaults };
  }

  /**
   * ActiveSelection 需要使用 ActiveSelectionLayoutManager，否则交互组上的选择可能会损坏
   *
   * The ActiveSelection needs to use the ActiveSelectionLayoutManager
   * or selections on interactive groups may be broken
   */
  declare layoutManager: ActiveSelectionLayoutManager;

  /**
   * 控制在多选事件期间如何添加选定的对象
   * - `canvas-stacking` 将选定的对象添加到活动选择中，同时尊重画布对象的堆叠顺序
   * - `selection-order` 将选定的对象添加到堆栈的顶部，这意味着堆栈按选择对象的顺序排序
   *
   * controls how selected objects are added during a multiselection event
   * - `canvas-stacking` adds the selected object to the active selection while respecting canvas object stacking order
   * - `selection-order` adds the selected object to the top of the stack,
   * meaning that the stack is ordered by the order in which objects were selected
   * @default `canvas-stacking`
   */
  declare multiSelectionStacking: MultiSelectionStacking;

  /**
   * 构造函数
   * @param objects 实例对象数组
   * @param options 选项对象
   */
  constructor(
    objects: FabricObject[] = [],
    options: Partial<ActiveSelectionOptions> = {},
  ) {
    super();
    Object.assign(this, ActiveSelection.ownDefaults);
    this.setOptions(options);
    const { left, top, layoutManager } = options;
    this.groupInit(objects, {
      left,
      top,
      layoutManager: layoutManager ?? new ActiveSelectionLayoutManager(),
    });
  }

  /**
   * 是否应该设置嵌套坐标
   * @returns 总是返回 true
   *
   * @private
   */
  _shouldSetNestedCoords() {
    return true;
  }

  /**
   * 对象选择监视器
   * 我们不希望选择监视器处于活动状态
   *
   * @private
   * @override we don't want the selection monitor to be active
   */
  __objectSelectionMonitor() {
    //  noop
  }

  /**
   * 根据 {@link multiSelectionStacking} 添加对象
   * @param targets 要添加到选择的对象
   *
   * Adds objects with respect to {@link multiSelectionStacking}
   * @param targets object to add to selection
   */
  multiSelectAdd(...targets: FabricObject[]) {
    if (this.multiSelectionStacking === 'selection-order') {
      this.add(...targets);
    } else {
      //  respect object stacking as it is on canvas
      //  perf enhancement for large ActiveSelection: consider a binary search of `isInFrontOf`
      targets.forEach((target) => {
        const index = this._objects.findIndex((obj) => obj.isInFrontOf(target));
        const insertAt =
          index === -1
            ? //  `target` is in front of all other objects
              this.size()
            : index;
        this.insertAt(insertAt, target);
      });
    }
  }

  /**
   * 阻止选定对象的祖先/后代被选中，以防止循环对象树
   * @param object 要检查的对象
   * @returns 如果可以进入组则返回 true，否则返回 false
   *
   * @override block ancestors/descendants of selected objects from being selected to prevent a circular object tree
   */
  canEnterGroup(object: FabricObject) {
    if (
      this.getObjects().some(
        (o) => o.isDescendantOf(object) || object.isDescendantOf(o),
      )
    ) {
      //  prevent circular object tree
      log(
        'error',
        'ActiveSelection: circular object trees are not supported, this call has no effect',
      );
      return false;
    }

    return super.canEnterGroup(object);
  }

  /**
   * 更改对象，使其可以成为活动选择的一部分。
   * 此方法由画布代码中的 multiselectAdd 调用。
   * @param object 要进入组的对象
   * @param removeParentTransform 如果对象在画布坐标平面中，则为 true
   *
   * Change an object so that it can be part of an active selection.
   * this method is called by multiselectAdd from canvas code.
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object is in canvas coordinate plane
   */
  enterGroup(object: FabricObject, removeParentTransform?: boolean) {
    // This condition check that the object has currently a group, and the group
    // is also its parent, meaning that is not in an active selection, but is
    // in a normal group.
    if (object.parent && object.parent === object.group) {
      // Disconnect the object from the group functionalities, but keep the ref parent intact
      // for later re-enter
      object.parent._exitGroup(object);
      // in this case the object is probably inside an active selection.
    } else if (object.group && object.parent !== object.group) {
      // in this case group.remove will also clear the old parent reference.
      object.group.remove(object);
    }
    // enter the active selection from a render perspective
    // the object will be in the objects array of both the ActiveSelection and the Group
    // but referenced in the group's _activeObjects so that it won't be rendered twice.
    this._enterGroup(object, removeParentTransform);
  }

  /**
   * 我们希望对象在退出实例时保留其画布引用
   * @param object 要退出组的对象
   * @param removeParentTransform 如果对象应在不应用组变换的情况下退出组，则为 true
   *
   * we want objects to retain their canvas ref when exiting instance
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object should exit group without applying group's transform to it
   */
  exitGroup(object: FabricObject, removeParentTransform?: boolean) {
    this._exitGroup(object, removeParentTransform);
    // return to parent
    object.parent && object.parent._enterGroup(object, true);
  }

  /**
   * 对象更改后的回调
   * @param type 更改类型 'added' 或 'removed'
   * @param targets 更改的对象数组
   *
   * @private
   * @param {'added'|'removed'} type
   * @param {FabricObject[]} targets
   */
  _onAfterObjectsChange(type: 'added' | 'removed', targets: FabricObject[]) {
    super._onAfterObjectsChange(type, targets);
    const groups = new Set<Group>();
    targets.forEach((object) => {
      const { parent } = object;
      parent && groups.add(parent);
    });
    if (type === LAYOUT_TYPE_REMOVED) {
      //  invalidate groups' layout and mark as dirty
      groups.forEach((group) => {
        group._onAfterObjectsChange(LAYOUT_TYPE_ADDED, targets);
      });
    } else {
      //  mark groups as dirty
      groups.forEach((group) => {
        group._set('dirty', true);
      });
    }
  }

  /**
   * 取消选择时移除所有对象
   * @returns 总是返回 false
   *
   * @override remove all objects
   */
  onDeselect() {
    this.removeAll();
    return false;
  }

  /**
   * 返回组的字符串表示形式
   * @returns 字符串表示形式
   *
   * Returns string representation of a group
   * @return {String}
   */
  toString() {
    return `#<ActiveSelection: (${this.complexity()})>`;
  }

  /**
   * 决定对象是否应该缓存。活动选择从不缓存
   * @returns 总是返回 false
   *
   * Decide if the object should cache or not. The Active selection never caches
   * @return {Boolean}
   */
  shouldCache() {
    return false;
  }

  /**
   * 检查此组或其父组是否正在缓存，递归向上检查
   * @returns 总是返回 false
   *
   * Check if this group or its parent group are caching, recursively up
   * @return {Boolean}
   */
  isOnACache() {
    return false;
  }

  /**
   * 渲染对象的控件和边框
   * @param ctx 要渲染的上下文
   * @param styleOverride 覆盖对象样式的属性
   * @param childrenOverride 覆盖子项覆盖的属性
   *
   * Renders controls and borders for the object
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Object} [styleOverride] properties to override the object style
   * @param {Object} [childrenOverride] properties to override the children overrides
   */
  _renderControls(
    ctx: CanvasRenderingContext2D,
    styleOverride?: ControlRenderingStyleOverride,
    childrenOverride?: ControlRenderingStyleOverride,
  ) {
    ctx.save();
    ctx.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
    const options = {
      hasControls: false,
      ...childrenOverride,
      forActiveSelection: true,
    };
    for (let i = 0; i < this._objects.length; i++) {
      this._objects[i]._renderControls(ctx, options);
    }
    super._renderControls(ctx, styleOverride);
    ctx.restore();
  }
}

classRegistry.setClass(ActiveSelection);
classRegistry.setClass(ActiveSelection, 'activeSelection');
