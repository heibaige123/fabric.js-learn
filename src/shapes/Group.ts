import type { CollectionEvents, ObjectEvents } from '../EventTypeDefs';
import { createCollectionMixin } from '../Collection';
import type {
  TClassProperties,
  TSVGReviver,
  TOptions,
  Abortable,
} from '../typedefs';
import {
  invertTransform,
  multiplyTransformMatrices,
} from '../util/misc/matrix';
import {
  enlivenObjectEnlivables,
  enlivenObjects,
} from '../util/misc/objectEnlive';
import { applyTransformToObject } from '../util/misc/objectTransforms';
import { FabricObject } from './Object/FabricObject';
import { Rect } from './Rect';
import { classRegistry } from '../ClassRegistry';
import type { FabricObjectProps, SerializedObjectProps } from './Object/types';
import { log } from '../util/internals/console';
import type {
  ImperativeLayoutOptions,
  LayoutBeforeEvent,
  LayoutAfterEvent,
} from '../LayoutManager/types';
import { LayoutManager } from '../LayoutManager/LayoutManager';
import {
  LAYOUT_TYPE_ADDED,
  LAYOUT_TYPE_IMPERATIVE,
  LAYOUT_TYPE_INITIALIZATION,
  LAYOUT_TYPE_REMOVED,
} from '../LayoutManager/constants';
import type { SerializedLayoutManager } from '../LayoutManager/LayoutManager';
import type { FitContentLayout } from '../LayoutManager';
import type { DrawContext } from './Object/Object';

/**
 * 此类处理使用 {@link Group#fromObject} 创建组的特定情况，不打算在任何其他情况下使用。
 * 我们本可以像以前那样在构造函数中使用布尔值，但我们认为布尔值
 * 会保留在组的构造函数接口中并产生混淆，因此将其删除。
 * 这个布局管理器什么都不做，因此保持 {@link Group#toObject} 被调用时组的确切布局。
 */
class NoopLayoutManager extends LayoutManager {
  performLayout() {}
}

/**
 * 组事件接口
 */
export interface GroupEvents extends ObjectEvents, CollectionEvents {
  'layout:before': LayoutBeforeEvent;
  'layout:after': LayoutAfterEvent;
}

/**
 * 组自身属性接口
 */
export interface GroupOwnProps {
  /**
   * 是否检查子目标
   */
  subTargetCheck: boolean;
  /**
   * 是否交互
   */
  interactive: boolean;
}

/**
 * 序列化后的组属性接口
 */
export interface SerializedGroupProps
  extends SerializedObjectProps,
    GroupOwnProps {
  objects: SerializedObjectProps[];
  layoutManager: SerializedLayoutManager;
}

/**
 * 组属性接口
 */
export interface GroupProps extends FabricObjectProps, GroupOwnProps {
  layoutManager: LayoutManager;
}

/**
 * 组默认值
 */
export const groupDefaultValues: Partial<TClassProperties<Group>> = {
  strokeWidth: 0,
  subTargetCheck: false,
  interactive: false,
};

/**
 * @fires object:added
 * @fires object:removed
 * @fires layout:before
 * @fires layout:after
 */
export class Group
  extends createCollectionMixin(
    FabricObject<GroupProps, SerializedGroupProps, GroupEvents>,
  )
  implements GroupProps
{
  /**
   * 用于优化性能
   * 如果不需要包含的对象成为事件的目标，请设置为 `false`
   *
   * Used to optimize performance
   * set to `false` if you don't need contained objects to be targets of events
   * 用于优化性能
   * 如果不需要包含的对象成为事件的目标，请设置为 `false`
   * @type boolean
   */
  declare subTargetCheck: boolean;

  /**
   * 用于允许定位组内的对象。
   * 如果要选择组内的对象，请设置为 true。\
   * **需要** `subTargetCheck` 设置为 true
   * 这不会被删除，而是慢慢被 setInteractive 方法取代
   * 该方法将负责启用 subTargetCheck 和必要的对象事件。
   *
   * Used to allow targeting of object inside groups.
   * set to true if you want to select an object inside a group.\
   * **REQUIRES** `subTargetCheck` set to true
   * This will be not removed but slowly replaced with a method setInteractive
   * that will take care of enabling subTargetCheck and necessary object events.
   * 用于允许定位组内的对象。
   * 如果要选择组内的对象，请设置为 true。\
   * **需要** `subTargetCheck` 设置为 true
   * 这不会被删除，而是慢慢被 setInteractive 方法取代
   * 该方法将负责启用 subTargetCheck 和必要的对象事件。
   * There is too much attached to group interactivity to just be evaluated by a
   * boolean in the code
   * @deprecated
   * @type boolean
   */
  declare interactive: boolean;

  /**
   * 布局管理器
   */
  declare layoutManager: LayoutManager;

  /**
   * 内部用于优化性能
   * 一旦选择了对象，实例将在没有所选对象的情况下呈现。
   * 这样，实例仅在与所选对象的整个交互过程中缓存一次。
   *
   * Used internally to optimize performance
   * Once an object is selected, instance is rendered without the selected object.
   * This way instance is cached only once for the entire interaction with the selected object.
   * 内部用于优化性能
   * 一旦选择了对象，实例将在没有所选对象的情况下呈现。
   * 这样，实例仅在与所选对象的整个交互过程中缓存一次。
   * @private
   */
  protected _activeObjects: FabricObject[] = [];

  /**
   * 类型标识
   */
  static type = 'Group';

  /**
   * 自身默认值
   */
  static ownDefaults: Record<string, any> = groupDefaultValues;
  /**
   * 跟踪选定对象的函数
   */
  private __objectSelectionTracker: (ev: ObjectEvents['selected']) => void;
  /**
   * 取消跟踪选定对象的函数
   */
  private __objectSelectionDisposer: (ev: ObjectEvents['deselected']) => void;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Group.ownDefaults,
    };
  }

  /**
   * 构造函数
   * @param objects 实例对象数组
   * @param options 选项对象
   *
   * Constructor
   * 构造函数
   *
   * @param {FabricObject[]} [objects] instance objects
   * @param {FabricObject[]} [objects] 实例对象
   * @param {Object} [options] Options object
   * @param {Object} [options] 选项对象
   */
  constructor(objects: FabricObject[] = [], options: Partial<GroupProps> = {}) {
    super();
    Object.assign(this, Group.ownDefaults);
    this.setOptions(options);
    this.groupInit(objects, options);
  }

  /**
   * 组和活动选择之间的共享代码
   * 旨在由构造函数使用。
   * @param objects 对象数组
   * @param options 选项对象
   *
   * Shared code between group and active selection
   * Meant to be used by the constructor.
   * 组和活动选择之间的共享代码
   * 旨在由构造函数使用。
   */
  protected groupInit(
    objects: FabricObject[],
    options: {
      layoutManager?: LayoutManager;
      top?: number;
      left?: number;
    },
  ) {
    this._objects = [...objects]; // Avoid unwanted mutations of Collection to affect the caller

    this.__objectSelectionTracker = this.__objectSelectionMonitor.bind(
      this,
      true,
    );
    this.__objectSelectionDisposer = this.__objectSelectionMonitor.bind(
      this,
      false,
    );

    this.forEachObject((object) => {
      this.enterGroup(object, false);
    });

    // perform initial layout
    this.layoutManager = options.layoutManager ?? new LayoutManager();
    this.layoutManager.performLayout({
      type: LAYOUT_TYPE_INITIALIZATION,
      target: this,
      targets: [...objects],
      // @TODO remove this concept from the layout manager.
      // Layout manager will calculate the correct position,
      // group options can override it later.
      x: options.left,
      y: options.top,
    });
  }

  /**
   * 检查对象是否可以进入组并记录相关警告
   * @param object 要检查的对象
   * @returns 如果可以进入组则返回 true，否则返回 false
   *
   * Checks if object can enter group and logs relevant warnings
   * 检查对象是否可以进入组并记录相关警告
   * @private
   * @param {FabricObject} object
   * @returns
   */
  canEnterGroup(object: FabricObject) {
    if (object === this || this.isDescendantOf(object)) {
      //  prevent circular object tree
      log(
        'error',
        'Group: circular object trees are not supported, this call has no effect',
      );
      return false;
    } else if (this._objects.indexOf(object) !== -1) {
      // is already in the objects array
      log(
        'error',
        'Group: duplicate objects are not supported inside group, this call has no effect',
      );
      return false;
    }
    return true;
  }

  /**
   * 覆盖此方法以提高性能（对于包含大量对象的组）。
   * 如果覆盖，请确保不要将非法对象传递给组 - 这会破坏您的应用程序。
   * @param objects 要过滤的对象数组
   * @returns 过滤后的对象数组
   *
   * Override this method to enhance performance (for groups with a lot of objects).
   * If Overriding, be sure not pass illegal objects to group - it will break your app.
   * 覆盖此方法以提高性能（对于包含大量对象的组）。
   * 如果覆盖，请确保不要将非法对象传递给组 - 这会破坏您的应用程序。
   * @private
   */
  protected _filterObjectsBeforeEnteringGroup(objects: FabricObject[]) {
    return objects.filter((object, index, array) => {
      // can enter AND is the first occurrence of the object in the passed args (to prevent adding duplicates)
      return this.canEnterGroup(object) && array.indexOf(object) === index;
    });
  }

  /**
   * 添加对象
   * @param objects 要添加的对象
   * @returns 添加后的集合大小
   *
   * Add objects
   * 添加对象
   * @param {...FabricObject[]} objects
   */
  add(...objects: FabricObject[]) {
    const allowedObjects = this._filterObjectsBeforeEnteringGroup(objects);
    const size = super.add(...allowedObjects);
    this._onAfterObjectsChange(LAYOUT_TYPE_ADDED, allowedObjects);
    return size;
  }

  /**
   * 在指定索引处将对象插入集合
   * @param index 插入对象的索引
   * @param objects 要插入的对象
   * @returns 插入后的集合大小
   *
   * Inserts an object into collection at specified index
   * 在指定索引处将对象插入集合
   * @param {Number} index Index to insert object at
   * @param {Number} index 插入对象的索引
   * @param {FabricObject[]} objects Object to insert
   * @param {FabricObject[]} objects 要插入的对象
   */
  insertAt(index: number, ...objects: FabricObject[]) {
    const allowedObjects = this._filterObjectsBeforeEnteringGroup(objects);
    const size = super.insertAt(index, ...allowedObjects);
    this._onAfterObjectsChange(LAYOUT_TYPE_ADDED, allowedObjects);
    return size;
  }

  /**
   * 移除对象
   * @param objects 要移除的对象
   * @returns 已移除的对象
   *
   * Remove objects
   * 移除对象
   * @param {...FabricObject[]} objects
   * @returns {FabricObject[]} removed objects
   * @returns {FabricObject[]} 已移除的对象
   */
  remove(...objects: FabricObject[]) {
    const removed = super.remove(...objects);
    this._onAfterObjectsChange(LAYOUT_TYPE_REMOVED, removed);
    return removed;
  }

  /**
   * 对象添加后的回调
   * @param object 添加的对象
   */
  _onObjectAdded(object: FabricObject) {
    this.enterGroup(object, true);
    this.fire('object:added', { target: object });
    object.fire('added', { target: this });
  }

  /**
   * 对象移除后的回调
   * @param object 移除的对象
   * @param removeParentTransform 如果对象应退出组而不对其应用组的变换，则为 true
   *
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object should exit group without applying group's transform to it
   * @param {boolean} [removeParentTransform] 如果对象应退出组而不对其应用组的变换，则为 true
   */
  _onObjectRemoved(object: FabricObject, removeParentTransform?: boolean) {
    this.exitGroup(object, removeParentTransform);
    this.fire('object:removed', { target: object });
    object.fire('removed', { target: this });
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
    this.layoutManager.performLayout({
      type,
      targets,
      target: this,
    });
  }

  /**
   * 堆叠顺序更改后的回调
   */
  _onStackOrderChanged() {
    this._set('dirty', true);
  }

  /**
   * 设置属性
   * @param key 属性键
   * @param value 属性值
   * @returns 当前实例
   *
   * @private
   * @param {string} key
   * @param {*} value
   */
  _set(key: string, value: any) {
    const prev = this[key as keyof this];
    super._set(key, value);
    if (key === 'canvas' && prev !== value) {
      (this._objects || []).forEach((object) => {
        object._set(key, value);
      });
    }
    return this;
  }

  /**
   * 是否应该设置嵌套坐标
   * @returns 如果 subTargetCheck 为 true，则返回 true
   *
   * @private
   */
  _shouldSetNestedCoords() {
    return this.subTargetCheck;
  }

  /**
   * 移除所有对象
   * @returns 已移除的对象
   *
   * Remove all objects
   * 移除所有对象
   * @returns {FabricObject[]} removed objects
   * @returns {FabricObject[]} 已移除的对象
   */
  removeAll() {
    this._activeObjects = [];
    return this.remove(...this._objects);
  }

  /**
   * 跟踪选定的对象
   * @param selected 是否选中
   * @param event 事件对象
   *
   * keeps track of the selected objects
   * 跟踪选定的对象
   * @private
   */
  __objectSelectionMonitor<T extends boolean>(
    selected: T,
    {
      target: object,
    }: ObjectEvents[T extends true ? 'selected' : 'deselected'],
  ) {
    const activeObjects = this._activeObjects;
    if (selected) {
      activeObjects.push(object);
      this._set('dirty', true);
    } else if (activeObjects.length > 0) {
      const index = activeObjects.indexOf(object);
      if (index > -1) {
        activeObjects.splice(index, 1);
        this._set('dirty', true);
      }
    }
  }

  /**
   * 监视对象
   * @param watch 是否监视
   * @param object 要监视的对象
   *
   * @private
   * @param {boolean} watch
   * @param {FabricObject} object
   */
  _watchObject(watch: boolean, object: FabricObject) {
    //  make sure we listen only once
    watch && this._watchObject(false, object);
    if (watch) {
      object.on('selected', this.__objectSelectionTracker);
      object.on('deselected', this.__objectSelectionDisposer);
    } else {
      object.off('selected', this.__objectSelectionTracker);
      object.off('deselected', this.__objectSelectionDisposer);
    }
  }

  /**
   * 进入组
   *
   * Enters the group
   * @param {FabricObject} object Object to enter group
   * @param {FabricObject} object 要进入组的对象
   * @param {boolean} [removeParentTransform] true if object is in canvas coordinate plane
   * @param {boolean} [removeParentTransform] 如果对象在画布坐标平面中，则为 true
   */
  enterGroup(object: FabricObject, removeParentTransform?: boolean) {
    object.group && object.group.remove(object);
    object._set('parent', this);
    this._enterGroup(object, removeParentTransform);
  }

  /**
   * 内部进入组逻辑
   * @param object 要进入组的对象
   * @param removeParentTransform 如果对象在画布坐标平面中，则为 true
   *
   * @private
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object is in canvas coordinate plane
   * @param {boolean} [removeParentTransform] 如果对象在画布坐标平面中，则为 true
   */
  _enterGroup(object: FabricObject, removeParentTransform?: boolean) {
    if (removeParentTransform) {
      // can this be converted to utils (sendObjectToPlane)?
      applyTransformToObject(
        object,
        multiplyTransformMatrices(
          invertTransform(this.calcTransformMatrix()),
          object.calcTransformMatrix(),
        ),
      );
    }
    this._shouldSetNestedCoords() && object.setCoords();
    object._set('group', this);
    object._set('canvas', this.canvas);
    this._watchObject(true, object);
    const activeObject =
      this.canvas &&
      this.canvas.getActiveObject &&
      this.canvas.getActiveObject();
    // if we are adding the activeObject in a group
    if (
      activeObject &&
      (activeObject === object || object.isDescendantOf(activeObject))
    ) {
      this._activeObjects.push(object);
    }
  }

  /**
   * 从组中移除对象
   * @param object 要移除的对象
   * @param removeParentTransform 如果对象应该退出组而不应用组的变换，则为 true
   *
   * Removes an object from the group;
   * 从组中移除对象
   * @param {FabricObject} object Object to remove
   * @param {FabricObject} object 要移除的对象
   * @param {boolean} [removeParentTransform] true if object should exit group without applying group's transform to it
   * @param {boolean} [removeParentTransform] 如果对象应该退出组而不应用组的变换，则为 true
   */
  exitGroup(object: FabricObject, removeParentTransform?: boolean) {
    this._exitGroup(object, removeParentTransform);
    object._set('parent', undefined);
    object._set('canvas', undefined);
  }

  /**
   * 执行退出组的内部 fabric 逻辑。
   * - 停止监视对象
   * - 从优化映射 this._activeObjects 中移除对象
   * - 取消设置对象的 group 属性
   * @param object 要退出组的对象
   * @param removeParentTransform 如果对象应该退出组而不应用组的变换，则为 true
   *
   * Executes the inner fabric logic of exiting a group.
   * 执行退出组的内部 fabric 逻辑。
   * - Stop watching the object
   * - 停止监视对象
   * - Remove the object from the optimization map this._activeObjects
   * - 从优化映射 this._activeObjects 中移除对象
   * - unset the group property of the object
   * - 取消设置对象的 group 属性
   * @protected
   * @param {FabricObject} object
   * @param {boolean} [removeParentTransform] true if object should exit group without applying group's transform to it
   * @param {boolean} [removeParentTransform] 如果对象应该退出组而不应用组的变换，则为 true
   */
  _exitGroup(object: FabricObject, removeParentTransform?: boolean) {
    object._set('group', undefined);
    if (!removeParentTransform) {
      applyTransformToObject(
        object,
        multiplyTransformMatrices(
          this.calcTransformMatrix(),
          object.calcTransformMatrix(),
        ),
      );
      object.setCoords();
    }
    this._watchObject(false, object);
    const index =
      this._activeObjects.length > 0 ? this._activeObjects.indexOf(object) : -1;
    if (index > -1) {
      this._activeObjects.splice(index, 1);
    }
  }

  /**
   * 决定组是否应该缓存。创建自己的缓存级别
   * 当对象绘制方法需要缓存步骤时，应使用 needsItsOwnCache。
   * 通常不在组中缓存对象，因为组已经缓存了。
   * @returns 是否应该缓存
   *
   * Decide if the group should cache or not. Create its own cache level
   * 决定组是否应该缓存。创建自己的缓存级别
   * needsItsOwnCache should be used when the object drawing method requires
   * a cache step.
   * 当对象绘制方法需要缓存步骤时，应使用 needsItsOwnCache。
   * Generally you do not cache objects in groups because the group is already cached.
   * 通常不在组中缓存对象，因为组已经缓存了。
   * @return {Boolean}
   */
  shouldCache() {
    const ownCache = FabricObject.prototype.shouldCache.call(this);
    if (ownCache) {
      for (let i = 0; i < this._objects.length; i++) {
        if (this._objects[i].willDrawShadow()) {
          this.ownCaching = false;
          return false;
        }
      }
    }
    return ownCache;
  }

  /**
   * 检查此对象或子对象是否会投射阴影
   * @returns 如果会投射阴影则返回 true
   *
   * Check if this object or a child object will cast a shadow
   * 检查此对象或子对象是否会投射阴影
   * @return {Boolean}
   */
  willDrawShadow() {
    if (super.willDrawShadow()) {
      return true;
    }
    for (let i = 0; i < this._objects.length; i++) {
      if (this._objects[i].willDrawShadow()) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查实例或其组是否正在缓存，递归向上
   * @returns 如果正在缓存则返回 true
   *
   * Check if instance or its group are caching, recursively up
   * 检查实例或其组是否正在缓存，递归向上
   * @return {Boolean}
   */
  isOnACache(): boolean {
    return this.ownCaching || (!!this.parent && this.parent.isOnACache());
  }

  /**
   * 在指定的上下文中执行对象的绘制操作
   * @param ctx 渲染上下文
   * @param forClipping 是否用于裁剪
   * @param context 绘制上下文
   *
   * Execute the drawing operation for an object on a specified context
   * 在指定的上下文中执行对象的绘制操作
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   */
  drawObject(
    ctx: CanvasRenderingContext2D,
    forClipping: boolean | undefined,
    context: DrawContext,
  ) {
    this._renderBackground(ctx);
    for (let i = 0; i < this._objects.length; i++) {
      const obj = this._objects[i];
      // TODO: handle rendering edge case somehow
      if (this.canvas?.preserveObjectStacking && obj.group !== this) {
        ctx.save();
        ctx.transform(...invertTransform(this.calcTransformMatrix()));
        obj.render(ctx);
        ctx.restore();
      } else if (obj.group === this) {
        obj.render(ctx);
      }
    }
    this._drawClipPath(ctx, this.clipPath, context);
  }

  /**
   * 设置对象的坐标
   *
   * Sets coordinates of the object
   * 设置对象的坐标
   * @override
   * @return {Boolean}
   */
  setCoords() {
    super.setCoords();
    this._shouldSetNestedCoords() &&
      this.forEachObject((object) => object.setCoords());
  }

  /**
   * 触发布局
   * @param options 布局选项
   *
   * Triggers layout
   * 触发布局
   * @param {ImperativeLayoutOptions} [options] Layout options
   * @param {ImperativeLayoutOptions} [options] 布局选项
   */
  triggerLayout(options: ImperativeLayoutOptions = {}) {
    this.layoutManager.performLayout({
      target: this,
      type: LAYOUT_TYPE_IMPERATIVE,
      ...options,
    });
  }

  /**
   * 在给定的上下文中渲染实例
   * @param ctx 渲染实例的上下文
   *
   * Renders instance on a given context
   * 在给定的上下文中渲染实例
   * @param {CanvasRenderingContext2D} ctx context to render instance on
   * @param {CanvasRenderingContext2D} ctx 渲染实例的上下文
   */
  render(ctx: CanvasRenderingContext2D) {
    this._transformDone = true;
    super.render(ctx);
    this._transformDone = false;
  }

  /**
   * 序列化对象
   * @param method 序列化方法 'toObject' 或 'toDatalessObject'
   * @param propertiesToInclude 您可能希望额外包含在输出中的任何属性
   * @returns 序列化的对象
   *
   * @private
   * @param {'toObject'|'toDatalessObject'} [method]
   * @param {string[]} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @param {string[]} [propertiesToInclude] 您可能希望额外包含在输出中的任何属性
   * @returns {FabricObject[]} serialized objects
   * @returns {FabricObject[]} 序列化的对象
   */
  __serializeObjects(
    method: 'toObject' | 'toDatalessObject',
    propertiesToInclude?: string[],
  ) {
    const _includeDefaultValues = this.includeDefaultValues;
    return this._objects
      .filter(function (obj) {
        return !obj.excludeFromExport;
      })
      .map(function (obj) {
        const originalDefaults = obj.includeDefaultValues;
        obj.includeDefaultValues = _includeDefaultValues;
        const data = obj[method || 'toObject'](propertiesToInclude);
        obj.includeDefaultValues = originalDefaults;
        // delete data.version;
        return data;
      });
  }

  /**
   * 返回实例的对象表示
   * @param propertiesToInclude 您可能希望额外包含在输出中的任何属性
   * @returns 实例的对象表示
   *
   * Returns object representation of an instance
   * @param {string[]} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @param {string[]} [propertiesToInclude] 您可能希望额外包含在输出中的任何属性
   * @return {Object} object representation of an instance
   * @return {Object} 实例的对象表示
   */
  toObject<
    T extends Omit<
      GroupProps & TClassProperties<this>,
      keyof SerializedGroupProps
    >,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SerializedGroupProps {
    const layoutManager = this.layoutManager.toObject();

    return {
      ...super.toObject([
        'subTargetCheck',
        'interactive',
        ...propertiesToInclude,
      ]),
      ...(layoutManager.strategy !== 'fit-content' || this.includeDefaultValues
        ? { layoutManager }
        : {}),
      objects: this.__serializeObjects(
        'toObject',
        propertiesToInclude as string[],
      ),
    };
  }

  /**
   * 返回实例的字符串表示
   * @returns 字符串表示
   */
  toString() {
    return `#<Group: (${this.complexity()})>`;
  }

  /**
   * 销毁组
   *
   */
  dispose() {
    this.layoutManager.unsubscribeTargets({
      targets: this.getObjects(),
      target: this,
    });
    this._activeObjects = [];
    this.forEachObject((object) => {
      this._watchObject(false, object);
      object.dispose();
    });
    super.dispose();
  }

  /**
   * 创建 SVG 背景矩形
   * @param reviver 用于进一步解析 svg 表示的方法
   * @returns SVG 字符串
   *
   * @private
   */
  _createSVGBgRect(reviver?: TSVGReviver) {
    if (!this.backgroundColor) {
      return '';
    }
    const fillStroke = Rect.prototype._toSVG.call(this);
    const commons = fillStroke.indexOf('COMMON_PARTS');
    fillStroke[commons] = 'for="group" ';
    const markup = fillStroke.join('');
    return reviver ? reviver(markup) : markup;
  }

  /**
   * 返回实例的 svg 表示
   * @param reviver 用于进一步解析 svg 表示的方法
   * @returns 实例的 svg 表示
   *
   * Returns svg representation of an instance
   * 返回实例的 svg 表示
   * @param {TSVGReviver} [reviver] Method for further parsing of svg representation.
   * @param {TSVGReviver} [reviver] 用于进一步解析 svg 表示的方法。
   * @return {String} svg representation of an instance
   * @return {String} 实例的 svg 表示
   */
  _toSVG(reviver?: TSVGReviver) {
    const svgString = ['<g ', 'COMMON_PARTS', ' >\n'];
    const bg = this._createSVGBgRect(reviver);
    bg && svgString.push('\t\t', bg);
    for (let i = 0; i < this._objects.length; i++) {
      svgString.push('\t\t', this._objects[i].toSVG(reviver));
    }
    svgString.push('</g>\n');
    return svgString;
  }

  /**
   * 返回用于 svg 导出的样式字符串，组的特定版本
   * @returns 样式字符串
   *
   * Returns styles-string for svg-export, specific version for group
   * 返回用于 svg 导出的样式字符串，组的特定版本
   * @return {String}
   */
  getSvgStyles(): string {
    const opacity =
        typeof this.opacity !== 'undefined' && this.opacity !== 1
          ? `opacity: ${this.opacity};`
          : '',
      visibility = this.visible ? '' : ' visibility: hidden;';
    return [opacity, this.getSvgFilter(), visibility].join('');
  }

  /**
   * 返回实例的 svg clipPath 表示
   * @param reviver 用于进一步解析 svg 表示的方法
   * @returns 实例的 svg clipPath 表示
   *
   * Returns svg clipPath representation of an instance
   * @param {Function} [reviver] Method for further parsing of svg representation.
   * @param {Function} [reviver] 用于进一步解析 svg 表示的方法。
   * @return {String} svg representation of an instance
   * @return {String} 实例的 svg 表示
   */
  toClipPathSVG(reviver?: TSVGReviver): string {
    const svgString = [];
    const bg = this._createSVGBgRect(reviver);
    bg && svgString.push('\t', bg);
    for (let i = 0; i < this._objects.length; i++) {
      svgString.push('\t', this._objects[i].toClipPathSVG(reviver));
    }
    return this._createBaseClipPathSVGMarkup(svgString, {
      reviver,
    });
  }

  /**
   * 从对象创建组
   * @param object 用于创建组的对象
   * @param abortable 可中止对象
   * @returns 组实例的 Promise
   *
   * @todo support loading from svg
   * @private
   */
  static fromObject<T extends TOptions<SerializedGroupProps>>(
    { type, objects = [], layoutManager, ...options }: T,
    abortable?: Abortable,
  ) {
    return Promise.all([
      enlivenObjects<FabricObject>(objects, abortable),
      enlivenObjectEnlivables(options, abortable),
    ]).then(([objects, hydratedOptions]) => {
      const group = new this(objects, {
        ...options,
        ...hydratedOptions,
        layoutManager: new NoopLayoutManager(),
      });
      if (layoutManager) {
        const layoutClass = classRegistry.getClass<typeof LayoutManager>(
          layoutManager.type,
        );
        const strategyClass = classRegistry.getClass<typeof FitContentLayout>(
          layoutManager.strategy,
        );
        group.layoutManager = new layoutClass(new strategyClass());
      } else {
        group.layoutManager = new LayoutManager();
      }
      group.layoutManager.subscribeTargets({
        type: LAYOUT_TYPE_INITIALIZATION,
        target: group,
        targets: group.getObjects(),
      });
      group.setCoords();
      return group;
    });
  }
}

classRegistry.setClass(Group);
