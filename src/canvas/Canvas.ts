import { classRegistry } from '../ClassRegistry';
import { NONE } from '../constants';
import type {
  CanvasEvents,
  DragEventData,
  ObjectEvents,
  TEventsExtraData,
  TPointerEvent,
  TPointerEventNames,
  Transform,
} from '../EventTypeDefs';
import { Point } from '../Point';
import type { ActiveSelection } from '../shapes/ActiveSelection';
import type { Group } from '../shapes/Group';
import type { IText } from '../shapes/IText/IText';
import type { FabricObject } from '../shapes/Object/FabricObject';
import { isTouchEvent, stopEvent } from '../util/dom_event';
import { getDocumentFromElement, getWindowFromElement } from '../util/dom_misc';
import { sendPointToPlane } from '../util/misc/planeChange';
import { isActiveSelection } from '../util/typeAssertions';
import type { CanvasOptions, TCanvasOptions } from './CanvasOptions';
import { SelectableCanvas } from './SelectableCanvas';
import { TextEditingManager } from './TextEditingManager';

/**
 * 添加事件监听器的选项
 */
const addEventOptions = { passive: false } as EventListenerOptions;

/**
 * 获取事件的视口坐标和场景坐标
 * @param canvas Canvas 实例
 * @param e 指针事件
 * @returns 包含视口坐标和场景坐标的对象
 */
const getEventPoints = (canvas: Canvas, e: TPointerEvent) => {
  const viewportPoint = canvas.getViewportPoint(e);
  const scenePoint = canvas.getScenePoint(e);
  return {
    viewportPoint,
    scenePoint,
  };
};

// just to be clear, the utils are now deprecated and those are here exactly as minifier helpers
// because el.addEventListener can't me be minified while a const yes and we use it 47 times in this file.
// few bytes but why give it away.
/**
 * 添加事件监听器
 * @param el HTML 元素或文档
 * @param args addEventListener 的参数
 */
const addListener = (
  el: HTMLElement | Document,
  ...args: Parameters<HTMLElement['addEventListener']>
) => el.addEventListener(...args);
/**
 * 移除事件监听器
 * @param el HTML 元素或文档
 * @param args removeEventListener 的参数
 */
const removeListener = (
  el: HTMLElement | Document,
  ...args: Parameters<HTMLElement['removeEventListener']>
) => el.removeEventListener(...args);

/**
 * 合成事件配置
 */
const syntheticEventConfig = {
  mouse: {
    in: 'over',
    out: 'out',
    targetIn: 'mouseover',
    targetOut: 'mouseout',
    canvasIn: 'mouse:over',
    canvasOut: 'mouse:out',
  },
  drag: {
    in: 'enter',
    out: 'leave',
    targetIn: 'dragenter',
    targetOut: 'dragleave',
    canvasIn: 'drag:enter',
    canvasOut: 'drag:leave',
  },
} as const;

/**
 * 合成事件上下文类型
 */
type TSyntheticEventContext = {
  mouse: { e: TPointerEvent };
  drag: DragEventData;
};

export class Canvas extends SelectableCanvas implements CanvasOptions {
  /**
   * 包含拥有 fabric 变换的触摸事件的 id
   *
   * Contains the id of the touch event that owns the fabric transform
   * @type Number
   * @private
   */
  declare mainTouchId?: number;

  /**
   * 指示是否启用指针事件
   */
  declare enablePointerEvents: boolean;

  /**
   * 保存用于事件同步的 setTimeout 计时器的引用
   *
   * Holds a reference to a setTimeout timer for event synchronization
   * @type number
   * @private
   */
  declare private _willAddMouseDown: number;

  /**
   * 保存对正在接收 drag over 事件的 canvas 上的对象的引用。
   *
   * Holds a reference to an object on the canvas that is receiving the drag over event.
   * @type FabricObject
   * @private
   */
  declare private _draggedoverTarget?: FabricObject;

  /**
   * 保存对拖动操作开始的 canvas 上的对象的引用
   *
   * Holds a reference to an object on the canvas from where the drag operation started
   * @type FabricObject
   * @private
   */
  declare private _dragSource?: FabricObject;

  /**
   * 保存对作为当前放置目标的 canvas 上的对象的引用
   * 可能与 {@link _draggedoverTarget} 不同
   *
   * Holds a reference to an object on the canvas that is the current drop target
   * May differ from {@link _draggedoverTarget}
   * @todo inspect whether {@link _draggedoverTarget} and {@link _dropTarget} should be merged somehow
   * @type FabricObject
   * @private
   */
  declare private _dropTarget: FabricObject<ObjectEvents> | undefined;

  /**
   * 一个布尔值，用于跟踪鼠标按下/松开循环期间的点击状态。
   * 如果发生鼠标移动，它将变为 false。
   * 默认为 true，在鼠标移动时变为 false。
   * 用于确定 mouseUp 是否为点击
   *
   * a boolean that keeps track of the click state during a cycle of mouse down/up.
   * If a mouse move occurs it becomes false.
   * Is true by default, turns false on mouse move.
   * Used to determine if a mouseUp is a click
   */
  private _isClick: boolean;

  /**
   * 文本编辑管理器
   */
  textEditingManager = new TextEditingManager(this);

  /**
   * 构造函数
   * @param el Canvas 元素或其 ID
   * @param options 选项对象
   */
  constructor(el?: string | HTMLCanvasElement, options: TCanvasOptions = {}) {
    super(el, options);
    // bind event handlers
    (
      [
        '_onMouseDown',
        '_onTouchStart',
        '_onMouseMove',
        '_onMouseUp',
        '_onTouchEnd',
        '_onResize',
        // '_onGesture',
        // '_onDrag',
        // '_onShake',
        // '_onLongPress',
        // '_onOrientationChange',
        '_onMouseWheel',
        '_onMouseOut',
        '_onMouseEnter',
        '_onContextMenu',
        '_onClick',
        '_onDragStart',
        '_onDragEnd',
        '_onDragProgress',
        '_onDragOver',
        '_onDragEnter',
        '_onDragLeave',
        '_onDrop',
      ] as (keyof this)[]
    ).forEach((eventHandler) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      this[eventHandler] = (this[eventHandler] as Function).bind(this);
    });
    // register event handlers
    this.addOrRemove(addListener);
  }

  /**
   * 返回事件前缀 pointer 或 mouse。
   *
   * return an event prefix pointer or mouse.
   * @private
   */
  private _getEventPrefix() {
    return this.enablePointerEvents ? 'pointer' : 'mouse';
  }

  /**
   * 添加或移除事件监听器
   * @param functor 添加或移除监听器的函数
   * @param forTouch 是否针对触摸事件
   */
  addOrRemove(functor: any, forTouch = false) {
    const canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    functor(getWindowFromElement(canvasElement), 'resize', this._onResize);
    functor(canvasElement, eventTypePrefix + 'down', this._onMouseDown);
    functor(
      canvasElement,
      `${eventTypePrefix}move`,
      this._onMouseMove,
      addEventOptions,
    );
    functor(canvasElement, `${eventTypePrefix}out`, this._onMouseOut);
    functor(canvasElement, `${eventTypePrefix}enter`, this._onMouseEnter);
    functor(canvasElement, 'wheel', this._onMouseWheel, { passive: false });
    functor(canvasElement, 'contextmenu', this._onContextMenu);
    if (!forTouch) {
      functor(canvasElement, 'click', this._onClick);
      functor(canvasElement, 'dblclick', this._onClick);
    }
    functor(canvasElement, 'dragstart', this._onDragStart);
    functor(canvasElement, 'dragend', this._onDragEnd);
    functor(canvasElement, 'dragover', this._onDragOver);
    functor(canvasElement, 'dragenter', this._onDragEnter);
    functor(canvasElement, 'dragleave', this._onDragLeave);
    functor(canvasElement, 'drop', this._onDrop);
    if (!this.enablePointerEvents) {
      functor(canvasElement, 'touchstart', this._onTouchStart, addEventOptions);
    }
  }

  /**
   * 移除所有事件监听器，在销毁实例时使用
   *
   * Removes all event listeners, used when disposing the instance
   */
  removeListeners() {
    this.addOrRemove(removeListener);
    // if you dispose on a mouseDown, before mouse up, you need to clean document to...
    const eventTypePrefix = this._getEventPrefix();
    const doc = getDocumentFromElement(this.upperCanvasEl);
    removeListener(
      doc,
      `${eventTypePrefix}up`,
      this._onMouseUp as EventListener,
    );
    removeListener(
      doc,
      'touchend',
      this._onTouchEnd as EventListener,
      addEventOptions,
    );
    removeListener(
      doc,
      `${eventTypePrefix}move`,
      this._onMouseMove as EventListener,
      addEventOptions,
    );
    removeListener(
      doc,
      'touchmove',
      this._onMouseMove as EventListener,
      addEventOptions,
    );
    clearTimeout(this._willAddMouseDown);
  }

  /**
   * 鼠标滚轮事件处理程序
   * @private
   * @param {Event} [e] Event object fired on wheel event
   */
  private _onMouseWheel(e: MouseEvent) {
    this._cacheTransformEventData(e);
    this._handleEvent(e, 'wheel');
    this._resetTransformEventData();
  }

  /**
   * 鼠标移出事件处理程序
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  private _onMouseOut(e: TPointerEvent) {
    const target = this._hoveredTarget;
    const shared = {
      e,
      ...getEventPoints(this, e),
    };
    this.fire('mouse:out', { ...shared, target });
    this._hoveredTarget = undefined;
    target && target.fire('mouseout', { ...shared });
    this._hoveredTargets.forEach((nestedTarget) => {
      this.fire('mouse:out', { ...shared, target: nestedTarget });
      nestedTarget && nestedTarget.fire('mouseout', { ...shared });
    });
    this._hoveredTargets = [];
  }

  /**
   * 鼠标进入事件处理程序
   * 当鼠标光标从外部进入 canvas 时使用
   *
   * @private
   * Used when the mouse cursor enter the canvas from outside
   * @param {Event} e Event object fired on mouseenter
   */
  private _onMouseEnter(e: TPointerEvent) {
    // This find target and consequent 'mouse:over' is used to
    // clear old instances on hovered target.
    // calling findTarget has the side effect of killing target.__corner.
    // as a short term fix we are not firing this if we are currently transforming.
    // as a long term fix we need to separate the action of finding a target with the
    // side effects we added to it.
    const { target } = this.findTarget(e);
    // we fire the event only when there is no target, if there is a target, the specific
    // target event will fire.
    if (!this._currentTransform && !target) {
      this.fire('mouse:over', {
        e,
        ...getEventPoints(this, e),
      });
      this._hoveredTarget = undefined;
      this._hoveredTargets = [];
    }
  }

  /**
   * 拖动开始事件处理程序
   * 支持类似原生的文本拖动
   *
   * supports native like text dragging
   * @private
   * @param {DragEvent} e
   */
  private _onDragStart(e: DragEvent) {
    this._isClick = false;
    const activeObject = this.getActiveObject();
    if (activeObject && activeObject.onDragStart(e)) {
      this._dragSource = activeObject;
      const options = { e, target: activeObject };
      this.fire('dragstart', options);
      activeObject.fire('dragstart', options);
      addListener(
        this.upperCanvasEl,
        'drag',
        this._onDragProgress as EventListener,
      );
      return;
    }
    stopEvent(e);
  }

  /**
   * 渲染拖动效果
   * 首先清除正在渲染效果的顶部上下文。
   * 然后渲染效果。
   * 这样做将为所有情况渲染正确的效果，包括 `source` 和 `target` 之间的重叠。
   *
   * First we clear top context where the effects are being rendered.
   * Then we render the effects.
   * Doing so will render the correct effect for all cases including an overlap between `source` and `target`.
   * @private
   */
  private _renderDragEffects(
    e: DragEvent,
    source?: FabricObject,
    target?: FabricObject,
  ) {
    let dirty = false;
    // clear top context
    const dropTarget = this._dropTarget;
    if (dropTarget && dropTarget !== source && dropTarget !== target) {
      dropTarget.clearContextTop();
      dirty = true;
    }
    source?.clearContextTop();
    target !== source && target?.clearContextTop();
    // render effects
    const ctx = this.contextTop;
    ctx.save();
    ctx.transform(...this.viewportTransform);
    if (source) {
      ctx.save();
      source.transform(ctx);
      source.renderDragSourceEffect(e);
      ctx.restore();
      dirty = true;
    }
    if (target) {
      ctx.save();
      target.transform(ctx);
      target.renderDropTargetEffect(e);
      ctx.restore();
      dirty = true;
    }
    ctx.restore();
    dirty && (this.contextTopDirty = true);
  }

  /**
   * 拖动结束事件处理程序
   * 支持类似原生的文本拖动
   *
   * supports native like text dragging
   * https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#finishing_a_drag
   * @private
   * @param {DragEvent} e
   */
  private _onDragEnd(e: DragEvent) {
    const { currentSubTargets } = this.findTarget(e);
    const didDrop = !!e.dataTransfer && e.dataTransfer.dropEffect !== NONE,
      dropTarget = didDrop ? this._activeObject : undefined,
      options = {
        e,
        target: this._dragSource as FabricObject,
        subTargets: currentSubTargets,
        dragSource: this._dragSource as FabricObject,
        didDrop,
        dropTarget: dropTarget as FabricObject,
      };
    removeListener(
      this.upperCanvasEl,
      'drag',
      this._onDragProgress as EventListener,
    );
    this.fire('dragend', options);
    this._dragSource && this._dragSource.fire('dragend', options);
    delete this._dragSource;
    // we need to call mouse up synthetically because the browser won't
    this._onMouseUp(e);
  }

  /**
   * 拖动进行中事件处理程序
   * 在 canvas 和拖动源上触发 `drag` 事件
   *
   * fire `drag` event on canvas and drag source
   * @private
   * @param {DragEvent} e
   */
  private _onDragProgress(e: DragEvent) {
    const options = {
      e,
      target: this._dragSource,
      dragSource: this._dragSource,
      dropTarget: this._draggedoverTarget as FabricObject,
    };
    this.fire('drag', options);
    this._dragSource && this._dragSource.fire('drag', options);
  }

  /**
   * 拖动悬停事件处理程序
   * 阻止默认行为以允许触发 drop 事件
   *
   * prevent default to allow drop event to be fired
   * https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#specifying_drop_targets
   * @private
   * @param {DragEvent} [e] Event object fired on Event.js shake
   */
  private _onDragOver(e: DragEvent) {
    const eventType = 'dragover';
    const { currentContainer: target, currentSubTargets } = this.findTarget(e);
    const dragSource = this._dragSource as FabricObject;
    const options = {
      e,
      target,
      subTargets: currentSubTargets,
      dragSource,
      canDrop: false,
      dropTarget: undefined,
    };
    let dropTarget;
    //  fire on canvas
    this.fire(eventType, options);
    //  make sure we fire dragenter events before dragover
    //  if dragleave is needed, object will not fire dragover so we don't need to trouble ourselves with it
    this._fireEnterLeaveEvents(e, target, options);
    if (target) {
      if (target.canDrop(e)) {
        dropTarget = target;
      }
      target.fire(eventType, options);
    }
    //  propagate the event to subtargets
    for (let i = 0; i < currentSubTargets.length; i++) {
      const subTarget = currentSubTargets[i];
      // accept event only if previous targets didn't (the accepting target calls `preventDefault` to inform that the event is taken)
      // TODO: verify if those should loop in inverse order then?
      // what is the order of subtargets?
      if (subTarget.canDrop(e)) {
        dropTarget = subTarget;
      }
      subTarget.fire(eventType, options);
    }
    //  render drag effects now that relations between source and target is clear
    this._renderDragEffects(e, dragSource, dropTarget);
    this._dropTarget = dropTarget;
  }

  /**
   * 拖动进入事件处理程序
   * 在 `dragover` 目标上触发 `dragleave`
   *
   * fire `dragleave` on `dragover` targets
   * @private
   * @param {Event} [e] Event object fired on Event.js shake
   */
  private _onDragEnter(e: DragEvent) {
    const { currentContainer, currentSubTargets } = this.findTarget(e);
    const options = {
      e,
      target: currentContainer,
      subTargets: currentSubTargets,
      dragSource: this._dragSource,
    };
    this.fire('dragenter', options);
    //  fire dragenter on targets
    this._fireEnterLeaveEvents(e, currentContainer, options);
  }

  /**
   * 拖动离开事件处理程序
   * 在 `dragover` 目标上触发 `dragleave`
   *
   * fire `dragleave` on `dragover` targets
   * @private
   * @param {Event} [e] Event object fired on Event.js shake
   */
  private _onDragLeave(e: DragEvent) {
    const { currentSubTargets } = this.findTarget(e);
    const options = {
      e,
      target: this._draggedoverTarget,
      subTargets: currentSubTargets,
      dragSource: this._dragSource,
    };
    this.fire('dragleave', options);

    //  fire dragleave on targets
    this._fireEnterLeaveEvents(e, undefined, options);
    this._renderDragEffects(e, this._dragSource);
    this._dropTarget = undefined;
    this._hoveredTargets = [];
  }

  /**
   * 放置事件处理程序
   * `drop:before` 是一个允许你在 `drop` 事件之前安排逻辑的事件。
   * 始终首选 `drop` 事件，但如果你需要在事件上运行一些禁用放置的逻辑，
   * 由于无法处理事件处理程序的顺序，请使用 `drop:before`
   *
   * `drop:before` is a an event that allows you to schedule logic
   * before the `drop` event. Prefer `drop` event always, but if you need
   * to run some drop-disabling logic on an event, since there is no way
   * to handle event handlers ordering, use `drop:before`
   * @private
   * @param {Event} e
   */
  private _onDrop(e: DragEvent) {
    const { currentContainer, currentSubTargets } = this.findTarget(e);
    const options = this._basicEventHandler('drop:before', {
      e,
      target: currentContainer,
      subTargets: currentSubTargets,
      dragSource: this._dragSource,
      ...getEventPoints(this, e),
    });
    //  will be set by the drop target
    options.didDrop = false;
    //  will be set by the drop target, used in case options.target refuses the drop
    options.dropTarget = undefined;
    //  fire `drop`
    this._basicEventHandler('drop', options);
    //  inform canvas of the drop
    //  we do this because canvas was unaware of what happened at the time the `drop` event was fired on it
    //  use for side effects
    this.fire('drop:after', options);
  }

  /**
   * 上下文菜单事件处理程序
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  private _onContextMenu(e: TPointerEvent): false {
    const { target, subTargets } = this.findTarget(e);
    const options = this._basicEventHandler('contextmenu:before', {
      e,
      target,
      subTargets,
    });
    // TODO: this line is silly because the dev can subscribe to the event and prevent it themselves
    this.stopContextMenu && stopEvent(e);
    this._basicEventHandler('contextmenu', options);
    return false;
  }

  /**
   * 点击事件处理程序
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  private _onClick(e: TPointerEvent) {
    const clicks = e.detail;
    if (clicks > 3 || clicks < 2) return;
    this._cacheTransformEventData(e);
    clicks == 2 && e.type === 'dblclick' && this._handleEvent(e, 'dblclick');
    clicks == 3 && this._handleEvent(e, 'tripleclick');
    this._resetTransformEventData();
  }

  /**
   * 支持手势事件触发
   * 这是一个保持代码组织的方法，它以一种有效的方式公开私有方法，并仍然保持它们的私有性
   * 这应该镜像 _handleEvent
   *
   * This supports gesture event firing
   * It is a method to keep some code organized, it exposes private methods
   * in a way that works and still keep them private
   * This is supposed to mirror _handleEvent
   */
  fireEventFromPointerEvent(
    e: TPointerEvent,
    eventName: keyof CanvasEvents,
    secondaryName: keyof ObjectEvents,
    extraData:
      | Record<string, unknown>
      | { rotation: number }
      | { ping: number } = {},
  ) {
    this._cacheTransformEventData(e);
    const { target, subTargets } = this.findTarget(e),
      options = {
        e,
        target,
        subTargets,
        ...getEventPoints(this, e),
        transform: this._currentTransform,
        ...extraData,
      };
    this.fire(eventName, options);
    // this may be a little be more complicated of what we want to handle
    target && target.fire(secondaryName, options);
    for (let i = 0; i < subTargets.length; i++) {
      subTargets[i] !== target && subTargets[i].fire(secondaryName, options);
    }
    this._resetTransformEventData();
  }

  /**
   * 返回事件的 id。
   * 返回 pointerId 或 identifier，对于鼠标事件返回 0
   *
   * Return a the id of an event.
   * returns either the pointerId or the identifier or 0 for the mouse event
   * @private
   * @param {Event} evt Event object
   */
  getPointerId(evt: TouchEvent | PointerEvent): number {
    const changedTouches = (evt as TouchEvent).changedTouches;

    if (changedTouches) {
      return changedTouches[0] && changedTouches[0].identifier;
    }

    if (this.enablePointerEvents) {
      return (evt as PointerEvent).pointerId;
    }

    return -1;
  }

  /**
   * 确定事件是否具有被视为主事件的 id
   *
   * Determines if an event has the id of the event that is considered main
   * @private
   * @param {evt} event Event object
   */
  _isMainEvent(evt: TPointerEvent): boolean {
    if ((evt as PointerEvent).isPrimary === true) {
      return true;
    }
    if ((evt as PointerEvent).isPrimary === false) {
      return false;
    }
    if (evt.type === 'touchend' && (evt as TouchEvent).touches.length === 0) {
      return true;
    }
    if ((evt as TouchEvent).changedTouches) {
      return (
        (evt as TouchEvent).changedTouches[0].identifier === this.mainTouchId
      );
    }
    return true;
  }

  /**
   * 触摸开始事件处理程序
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onTouchStart(e: TouchEvent) {
    this._cacheTransformEventData(e);
    // we will prevent scrolling if allowTouchScrolling is not enabled and
    let shouldPreventScrolling = !this.allowTouchScrolling;
    const currentActiveObject = this._activeObject;
    if (this.mainTouchId === undefined) {
      this.mainTouchId = this.getPointerId(e);
    }
    this.__onMouseDown(e);
    const { target } = this.findTarget(e);
    // after executing fabric logic for mouse down let's see
    // if we didn't change target or if we are drawing
    // we want to prevent scrolling anyway
    if (
      this.isDrawingMode ||
      (currentActiveObject && target === currentActiveObject)
    ) {
      shouldPreventScrolling = true;
    }
    // prevent default, will block scrolling from start
    shouldPreventScrolling && e.preventDefault();
    const canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    const doc = getDocumentFromElement(canvasElement);
    addListener(
      doc,
      'touchend',
      this._onTouchEnd as EventListener,
      addEventOptions,
    );
    // if we scroll don't register the touch move event
    shouldPreventScrolling &&
      addListener(
        doc,
        'touchmove',
        this._onMouseMove as EventListener,
        addEventOptions,
      );
    // Unbind mousedown to prevent double triggers from touch devices
    removeListener(
      canvasElement,
      `${eventTypePrefix}down`,
      this._onMouseDown as EventListener,
    );
    this._resetTransformEventData();
  }

  /**
   * 鼠标按下事件处理程序
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onMouseDown(e: TPointerEvent) {
    this._cacheTransformEventData(e);
    this.__onMouseDown(e);
    const canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    // switch from moving on the canvas element to moving on the document
    removeListener(
      canvasElement,
      `${eventTypePrefix}move`,
      this._onMouseMove as EventListener,
      addEventOptions,
    );
    const doc = getDocumentFromElement(canvasElement);
    addListener(doc, `${eventTypePrefix}up`, this._onMouseUp as EventListener);
    addListener(
      doc,
      `${eventTypePrefix}move`,
      this._onMouseMove as EventListener,
      addEventOptions,
    );
    this._resetTransformEventData();
  }

  /**
   * 触摸结束事件处理程序
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onTouchEnd(e: TouchEvent) {
    if (e.touches.length > 0) {
      // if there are still touches stop here
      return;
    }
    this._cacheTransformEventData(e);
    this.__onMouseUp(e);
    this._resetTransformEventData();
    delete this.mainTouchId;
    const eventTypePrefix = this._getEventPrefix();
    const doc = getDocumentFromElement(this.upperCanvasEl);
    removeListener(
      doc,
      'touchend',
      this._onTouchEnd as EventListener,
      addEventOptions,
    );
    removeListener(
      doc,
      'touchmove',
      this._onMouseMove as EventListener,
      addEventOptions,
    );
    if (this._willAddMouseDown) {
      clearTimeout(this._willAddMouseDown);
    }
    this._willAddMouseDown = setTimeout(() => {
      // Wait 400ms before rebinding mousedown to prevent double triggers
      // from touch devices
      addListener(
        this.upperCanvasEl,
        `${eventTypePrefix}down`,
        this._onMouseDown as EventListener,
      );
      this._willAddMouseDown = 0;
    }, 400) as unknown as number;
  }

  /**
   * 鼠标抬起事件处理程序
   * @private
   * @param {Event} e Event object fired on mouseup
   */
  _onMouseUp(e: TPointerEvent) {
    this._cacheTransformEventData(e);
    this.__onMouseUp(e);
    const canvasElement = this.upperCanvasEl,
      eventTypePrefix = this._getEventPrefix();
    if (this._isMainEvent(e)) {
      const doc = getDocumentFromElement(this.upperCanvasEl);
      removeListener(
        doc,
        `${eventTypePrefix}up`,
        this._onMouseUp as EventListener,
      );
      removeListener(
        doc,
        `${eventTypePrefix}move`,
        this._onMouseMove as EventListener,
        addEventOptions,
      );
      addListener(
        canvasElement,
        `${eventTypePrefix}move`,
        this._onMouseMove as EventListener,
        addEventOptions,
      );
    }
    this._resetTransformEventData();
  }

  /**
   * 鼠标移动事件处理程序
   * @private
   * @param {Event} e Event object fired on mousemove
   */
  _onMouseMove(e: TPointerEvent) {
    this._cacheTransformEventData(e);

    const activeObject = this.getActiveObject();
    !this.allowTouchScrolling &&
      (!activeObject ||
        // a drag event sequence is started by the active object flagging itself on mousedown / mousedown:before
        // we must not prevent the event's default behavior in order for the window to start dragging
        !activeObject.shouldStartDragging(e)) &&
      e.preventDefault &&
      e.preventDefault();
    this.__onMouseMove(e);
    this._resetTransformEventData();
  }

  /**
   * 调整大小事件处理程序
   * @private
   */
  _onResize() {
    this.calcOffset();
    this._resetTransformEventData();
  }

  /**
   * 决定是否应在 mouseup 和 mousedown 事件中重绘 canvas。
   *
   * Decides whether the canvas should be redrawn in mouseup and mousedown events.
   * @private
   * @param {Object} target
   */
  _shouldRender(target: FabricObject | undefined) {
    const activeObject = this.getActiveObject();
    // if just one of them is available or if they are both but are different objects
    // this covers: switch of target, from target to no target, selection of target
    // multiSelection with key and mouse
    return (
      !!activeObject !== !!target ||
      (activeObject && target && activeObject !== target)
    );
  }

  /**
   * 定义在 canvas 上释放鼠标时的操作的方法。
   * 该方法重置 currentTransform 参数，将图像角位置存储在图像对象中，并在顶部渲染 canvas。
   *
   * Method that defines the actions when mouse is released on canvas.
   * The method resets the currentTransform parameters, store the image corner
   * position in the image object and render the canvas on top.
   * @private
   * @param {Event} e Event object fired on mouseup
   */
  __onMouseUp(e: TPointerEvent) {
    this._handleEvent(e, 'up:before');

    const transform = this._currentTransform;
    const isClick = this._isClick;
    const { target } = this.findTarget(e);

    // if right/middle click just fire events and return
    // target undefined will make the _handleEvent search the target
    const { button } = e as MouseEvent;
    if (button) {
      ((this.fireMiddleClick && button === 1) ||
        (this.fireRightClick && button === 2)) &&
        this._handleEvent(e, 'up');
      return;
    }

    if (this.isDrawingMode && this._isCurrentlyDrawing) {
      this._onMouseUpInDrawingMode(e);
      return;
    }

    if (!this._isMainEvent(e)) {
      return;
    }
    let shouldRender = false;
    if (transform) {
      this._finalizeCurrentTransform(e);
      shouldRender = transform.actionPerformed;
    }
    if (!isClick) {
      const targetWasActive = target === this._activeObject;
      this.handleSelection(e);
      if (!shouldRender) {
        shouldRender =
          this._shouldRender(target) ||
          (!targetWasActive && target === this._activeObject);
      }
    }
    let pointer, corner;
    if (target) {
      const found = target.findControl(
        this.getViewportPoint(e),
        isTouchEvent(e),
      );
      const { key, control } = found || {};
      corner = key;
      if (
        target.selectable &&
        target !== this._activeObject &&
        target.activeOn === 'up'
      ) {
        this.setActiveObject(target, e);
        shouldRender = true;
      } else if (control) {
        const mouseUpHandler = control.getMouseUpHandler(e, target, control);
        if (mouseUpHandler) {
          pointer = this.getScenePoint(e);
          mouseUpHandler.call(control, e, transform!, pointer.x, pointer.y);
        }
      }
      target.isMoving = false;
    }
    // if we are ending up a transform on a different control or a new object
    // fire the original mouse up from the corner that started the transform
    if (
      transform &&
      (transform.target !== target || transform.corner !== corner)
    ) {
      const originalControl =
          transform.target && transform.target.controls[transform.corner],
        originalMouseUpHandler =
          originalControl &&
          originalControl.getMouseUpHandler(
            e,
            transform.target,
            originalControl,
          );
      pointer = pointer || this.getScenePoint(e);
      originalMouseUpHandler &&
        originalMouseUpHandler.call(
          originalControl,
          e,
          transform,
          pointer.x,
          pointer.y,
        );
    }
    this._setCursorFromEvent(e, target);
    this._handleEvent(e, 'up');
    this._groupSelector = null;
    this._currentTransform = null;
    // reset the target information about which corner is selected
    target && (target.__corner = undefined);
    if (shouldRender) {
      this.requestRenderAll();
    } else if (!isClick && !(this._activeObject as IText)?.isEditing) {
      this.renderTop();
    }
  }

  /**
   * 基本事件处理程序
   * @private
   * @param {String} eventType
   * @param {Object} options
   */
  _basicEventHandler<T extends keyof (CanvasEvents | ObjectEvents)>(
    eventType: T,
    options: (CanvasEvents & ObjectEvents)[T],
  ) {
    const { target, subTargets = [] } = options as {
      target?: FabricObject;
      subTargets: FabricObject[];
    };
    this.fire(eventType, options);
    target && target.fire(eventType, options);
    for (let i = 0; i < subTargets.length; i++) {
      subTargets[i] !== target && subTargets[i].fire(eventType, options);
    }
    return options;
  }

  /**
   * 处理目标和子目标的事件触发
   *
   * @private
   * Handle event firing for target and subtargets
   * @param {TPointerEvent} e event from mouse
   * @param {TPointerEventNames} eventType
   */
  _handleEvent<T extends TPointerEventNames>(
    e: TPointerEvent,
    eventType: T,
    extraData?: TEventsExtraData[T],
  ) {
    const { target, subTargets } = this.findTarget(e),
      options: CanvasEvents[`mouse:${T}`] = {
        e,
        target,
        subTargets,
        ...getEventPoints(this, e),
        transform: this._currentTransform,
        ...(eventType === 'down:before' || eventType === 'down'
          ? extraData
          : {}),
      } as CanvasEvents[`mouse:${T}`];
    if (eventType === 'up:before' || eventType === 'up') {
      (options as CanvasEvents[`mouse:up`]).isClick = this._isClick;
    }

    this.fire(`mouse:${eventType}`, options);
    // this may be a little be more complicated of what we want to handle
    target && target.fire(`mouse${eventType}`, options);
    for (let i = 0; i < subTargets.length; i++) {
      subTargets[i] !== target &&
        subTargets[i].fire(`mouse${eventType}`, options);
    }
  }

  /**
   * 绘图模式下的鼠标按下事件处理程序
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  _onMouseDownInDrawingMode(e: TPointerEvent) {
    this._isCurrentlyDrawing = true;
    if (this.getActiveObject()) {
      this.discardActiveObject(e);
      this.requestRenderAll();
    }
    // TODO: this is a scene point so it should be renamed
    const pointer = this.getScenePoint(e);
    this.freeDrawingBrush &&
      this.freeDrawingBrush.onMouseDown(pointer, { e, pointer });
    this._handleEvent(e, 'down', { alreadySelected: false });
  }

  /**
   * 绘图模式下的鼠标移动事件处理程序
   * @private
   * @param {Event} e Event object fired on mousemove
   */
  _onMouseMoveInDrawingMode(e: TPointerEvent) {
    if (this._isCurrentlyDrawing) {
      const pointer = this.getScenePoint(e);
      this.freeDrawingBrush &&
        this.freeDrawingBrush.onMouseMove(pointer, {
          e,
          // this is an absolute pointer, the naming is wrong
          pointer,
        });
    }
    this.setCursor(this.freeDrawingCursor);
    this._handleEvent(e, 'move');
  }

  /**
   * 绘图模式下的鼠标抬起事件处理程序
   * @private
   * @param {Event} e Event object fired on mouseup
   */
  _onMouseUpInDrawingMode(e: TPointerEvent) {
    const pointer = this.getScenePoint(e);
    if (this.freeDrawingBrush) {
      this._isCurrentlyDrawing = !!this.freeDrawingBrush.onMouseUp({
        e: e,
        // this is an absolute pointer, the naming is wrong
        pointer,
      });
    } else {
      this._isCurrentlyDrawing = false;
    }
    this._handleEvent(e, 'up');
  }

  /**
   * 定义在 canvas 上点击鼠标时的操作的方法。
   * 该方法初始化 currentTransform 参数并渲染所有 canvas，
   * 以便当前图像可以放置在顶部 canvas 上，其余图像放置在容器 canvas 上。
   *
   * Method that defines the actions when mouse is clicked on canvas.
   * The method inits the currentTransform parameters and renders all the
   * canvas so the current image can be placed on the top canvas and the rest
   * in on the container one.
   * @private
   * @param {Event} e Event object fired on mousedown
   */
  __onMouseDown(e: TPointerEvent) {
    this._isClick = true;
    this._handleEvent(e, 'down:before');

    let { target } = this.findTarget(e);
    let alreadySelected = !!target && target === this._activeObject;
    // if right/middle click just fire events
    const { button } = e as MouseEvent;
    if (button) {
      ((this.fireMiddleClick && button === 1) ||
        (this.fireRightClick && button === 2)) &&
        this._handleEvent(e, 'down', {
          alreadySelected,
        });
      return;
    }

    if (this.isDrawingMode) {
      this._onMouseDownInDrawingMode(e);
      return;
    }

    if (!this._isMainEvent(e)) {
      return;
    }

    // ignore if some object is being transformed at this moment
    if (this._currentTransform) {
      return;
    }

    let shouldRender = this._shouldRender(target);
    let grouped = false;
    if (this.handleMultiSelection(e, target)) {
      // active object might have changed while grouping
      target = this._activeObject;
      grouped = true;
      shouldRender = true;
    } else if (this._shouldClearSelection(e, target)) {
      this.discardActiveObject(e);
    }
    // we start a group selector rectangle if
    // selection is enabled
    // and there is no target, or the following 3 conditions are satisfied:
    // target is not selectable ( otherwise we selected it )
    // target is not editing
    // target is not already selected ( otherwise we drag )
    if (
      this.selection &&
      (!target ||
        (!target.selectable &&
          !(target as IText).isEditing &&
          target !== this._activeObject))
    ) {
      const p = this.getScenePoint(e);
      this._groupSelector = {
        x: p.x,
        y: p.y,
        deltaY: 0,
        deltaX: 0,
      };
    }

    // check again because things could have changed
    alreadySelected = !!target && target === this._activeObject;
    if (target) {
      if (target.selectable && target.activeOn === 'down') {
        this.setActiveObject(target, e);
      }
      const handle = target.findControl(
        this.getViewportPoint(e),
        isTouchEvent(e),
      );
      if (target === this._activeObject && (handle || !grouped)) {
        this._setupCurrentTransform(e, target, alreadySelected);
        const control = handle ? handle.control : undefined,
          pointer = this.getScenePoint(e),
          mouseDownHandler =
            control && control.getMouseDownHandler(e, target, control);
        mouseDownHandler &&
          mouseDownHandler.call(
            control,
            e,
            this._currentTransform!,
            pointer.x,
            pointer.y,
          );
      }
    }
    //  we clear `_objectsToRender` in case of a change in order to repopulate it at rendering
    //  run before firing the `down` event to give the dev a chance to populate it themselves
    shouldRender && (this._objectsToRender = undefined);
    this._handleEvent(e, 'down', { alreadySelected: alreadySelected });
    // we must renderAll so that we update the visuals
    shouldRender && this.requestRenderAll();
  }

  /**
   * 重置事件处理期间所需的公共信息缓存
   *
   * reset cache form common information needed during event processing
   * @private
   */
  _resetTransformEventData() {
    this._targetInfo = this._viewportPoint = this._scenePoint = undefined;
  }

  /**
   * 缓存事件处理期间所需的公共信息
   *
   * Cache common information needed during event processing
   * @private
   * @param {Event} e Event object fired on event
   */
  _cacheTransformEventData(e: TPointerEvent) {
    // reset in order to avoid stale caching
    this._resetTransformEventData();
    this._viewportPoint = this.getViewportPoint(e);
    this._scenePoint = sendPointToPlane(
      this._viewportPoint,
      undefined,
      this.viewportTransform,
    );
    this._targetInfo = this.findTarget(e);
    // TODO: investigate better if this can be made less implicit in the code
    if (this._currentTransform) {
      this._targetInfo.target = this._currentTransform.target;
    }
  }

  /**
   * 定义鼠标悬停在 canvas 上时的操作的方法。
   * currentTransform 参数将定义用户是否正在旋转/缩放/平移图像，或者两者都不是（仅悬停）。
   * 组选择也是可能的，并且会取消所有任何其他类型的操作。
   * 在仅图像变换的情况下，仅渲染顶部 canvas。
   *
   * Method that defines the actions when mouse is hovering the canvas.
   * The currentTransform parameter will define whether the user is rotating/scaling/translating
   * an image or neither of them (only hovering). A group selection is also possible and would cancel
   * all any other type of action.
   * In case of an image transformation only the top canvas will be rendered.
   * @private
   * @param {Event} e Event object fired on mousemove
   */
  __onMouseMove(e: TPointerEvent) {
    this._isClick = false;
    this._handleEvent(e, 'move:before');

    if (this.isDrawingMode) {
      this._onMouseMoveInDrawingMode(e);
      return;
    }

    if (!this._isMainEvent(e)) {
      return;
    }

    const groupSelector = this._groupSelector;

    // We initially clicked in an empty area, so we draw a box for multiple selection
    if (groupSelector) {
      const pointer = this.getScenePoint(e);

      groupSelector.deltaX = pointer.x - groupSelector.x;
      groupSelector.deltaY = pointer.y - groupSelector.y;

      this.renderTop();
    } else if (!this._currentTransform) {
      const { target } = this.findTarget(e);
      this._setCursorFromEvent(e, target);
      this._fireOverOutEvents(e, target);
    } else {
      this._transformObject(e);
    }
    this.textEditingManager.onMouseMove(e);
    this._handleEvent(e, 'move');
  }

  /**
   * 管理 canvas 上 fabric 对象的 mouseout、mouseover 事件
   *
   * Manage the mouseout, mouseover events for the fabric object on the canvas
   * @param {Fabric.Object} target the target where the target from the mousemove event
   * @param {Event} e Event object fired on mousemove
   * @private
   */
  _fireOverOutEvents(e: TPointerEvent, target?: FabricObject) {
    const { _hoveredTarget, _hoveredTargets } = this,
      { subTargets } = this.findTarget(e),
      length = Math.max(_hoveredTargets.length, subTargets.length);

    this.fireSyntheticInOutEvents('mouse', {
      e,
      target,
      oldTarget: _hoveredTarget,
      fireCanvas: true,
    });
    for (let i = 0; i < length; i++) {
      if (
        subTargets[i] === target ||
        (_hoveredTargets[i] && _hoveredTargets[i] === _hoveredTarget)
      ) {
        continue;
      }
      this.fireSyntheticInOutEvents('mouse', {
        e,
        target: subTargets[i],
        oldTarget: _hoveredTargets[i],
      });
    }
    this._hoveredTarget = target;
    this._hoveredTargets = subTargets;
  }

  /**
   * 管理 canvas 上 fabric 对象的 dragEnter、dragLeave 事件
   *
   * Manage the dragEnter, dragLeave events for the fabric objects on the canvas
   * @param {Fabric.Object} target the target where the target from the onDrag event
   * @param {Object} data Event object fired on dragover
   * @private
   */
  _fireEnterLeaveEvents(
    e: TPointerEvent,
    target: FabricObject | undefined,
    data: DragEventData,
  ) {
    const draggedoverTarget = this._draggedoverTarget,
      _hoveredTargets = this._hoveredTargets,
      { subTargets } = this.findTarget(e),
      length = Math.max(_hoveredTargets.length, subTargets.length);

    this.fireSyntheticInOutEvents('drag', {
      ...data,
      target,
      oldTarget: draggedoverTarget,
      fireCanvas: true,
    });
    for (let i = 0; i < length; i++) {
      this.fireSyntheticInOutEvents('drag', {
        ...data,
        target: subTargets[i],
        oldTarget: _hoveredTargets[i],
      });
    }
    this._draggedoverTarget = target;
  }

  /**
   * 管理 canvas 上 fabric 对象的合成进入/离开事件
   *
   * Manage the synthetic in/out events for the fabric objects on the canvas
   * @param {Fabric.Object} target the target where the target from the supported events
   * @param {Object} data Event object fired
   * @param {Object} config configuration for the function to work
   * @param {String} config.targetName property on the canvas where the old target is stored
   * @param {String} [config.canvasEvtOut] name of the event to fire at canvas level for out
   * @param {String} config.evtOut name of the event to fire for out
   * @param {String} [config.canvasEvtIn] name of the event to fire at canvas level for in
   * @param {String} config.evtIn name of the event to fire for in
   * @private
   */
  fireSyntheticInOutEvents<T extends keyof TSyntheticEventContext>(
    type: T,
    {
      target,
      oldTarget,
      fireCanvas,
      e,
      ...data
    }: TSyntheticEventContext[T] & {
      target?: FabricObject;
      oldTarget?: FabricObject;
      fireCanvas?: boolean;
    },
  ) {
    const { targetIn, targetOut, canvasIn, canvasOut } =
      syntheticEventConfig[type];
    const targetChanged = oldTarget !== target;

    if (oldTarget && targetChanged) {
      const outOpt: CanvasEvents[typeof canvasOut] = {
        ...data,
        e,
        target: oldTarget,
        nextTarget: target,
        ...getEventPoints(this, e),
      };
      fireCanvas && this.fire(canvasOut, outOpt);
      oldTarget.fire(targetOut, outOpt);
    }
    if (target && targetChanged) {
      const inOpt: CanvasEvents[typeof canvasIn] = {
        ...data,
        e,
        target,
        previousTarget: oldTarget,
        ...getEventPoints(this, e),
      };
      fireCanvas && this.fire(canvasIn, inOpt);
      target.fire(targetIn, inOpt);
    }
  }

  /**
   * @private
   * @param {Event} e Event fired on mousemove
   */
  _transformObject(e: TPointerEvent) {
    const scenePoint = this.getScenePoint(e),
      transform = this._currentTransform!,
      target = transform.target,
      //  transform pointer to target's containing coordinate plane
      //  both pointer and object should agree on every point
      localPointer = target.group
        ? sendPointToPlane(
            scenePoint,
            undefined,
            target.group.calcTransformMatrix(),
          )
        : scenePoint;
    transform.shiftKey = e.shiftKey;
    transform.altKey = !!this.centeredKey && e[this.centeredKey];

    this._performTransformAction(e, transform, localPointer);
    transform.actionPerformed && this.requestRenderAll();
  }

  /**
   * @private
   */
  _performTransformAction(
    e: TPointerEvent,
    transform: Transform,
    pointer: Point,
  ) {
    const { action, actionHandler, target } = transform;

    const actionPerformed =
      !!actionHandler && actionHandler(e, transform, pointer.x, pointer.y);
    actionPerformed && target.setCoords();

    // this object could be created from the function in the control handlers
    if (action === 'drag' && actionPerformed) {
      transform.target.isMoving = true;
      this.setCursor(transform.target.moveCursor || this.moveCursor);
    }
    transform.actionPerformed = transform.actionPerformed || actionPerformed;
  }

  /**
   * 根据鼠标悬停的位置设置光标。
   * 注意：在 Opera 中非常多 bug
   *
   * Sets the cursor depending on where the canvas is being hovered.
   * Note: very buggy in Opera
   * @param {Event} e Event object
   * @param {Object} target Object that the mouse is hovering, if so.
   */
  _setCursorFromEvent(e: TPointerEvent, target?: FabricObject) {
    if (!target) {
      this.setCursor(this.defaultCursor);
      return;
    }
    let hoverCursor = target.hoverCursor || this.hoverCursor;
    const activeSelection = isActiveSelection(this._activeObject)
        ? this._activeObject
        : null,
      // only show proper corner when group selection is not active
      corner =
        (!activeSelection || target.group !== activeSelection) &&
        // here we call findTargetCorner always with undefined for the touch parameter.
        // we assume that if you are using a cursor you do not need to interact with
        // the bigger touch area.
        target.findControl(this.getViewportPoint(e));

    if (!corner) {
      if ((target as Group).subTargetCheck) {
        // hoverCursor should come from top-most subTarget,
        // so we walk the array backwards
        const { subTargets } = this.findTarget(e);
        subTargets
          .concat()
          .reverse()
          .forEach((_target) => {
            hoverCursor = _target.hoverCursor || hoverCursor;
          });
      }
      this.setCursor(hoverCursor);
    } else {
      const { control, coord } = corner;
      this.setCursor(control.cursorStyleHandler(e, control, target, coord));
    }
  }

  /**
   * ## 处理多重选择
   * - 切换 `target` 选择（如果未选中则选中，如果已选中则取消选中）
   * - 在未设置活动对象或活动选择下仅剩一个活动对象的情况下设置活动对象。
   * ---
   * - 如果活动对象是活动选择，我们将 `target` 添加到其中/从中移除
   * - 如果不是，将活动对象和 `target` 添加到活动选择中，并使其成为活动对象。
   * @TODO rewrite this after find target is refactored
   *
   * ## Handles multiple selection
   * - toggles `target` selection (selects/deselects `target` if it isn't/is selected respectively)
   * - sets the active object in case it is not set or in case there is a single active object left under active selection.
   * ---
   * - If the active object is the active selection we add/remove `target` from it
   * - If not, add the active object and `target` to the active selection and make it the active object.
   * @TODO rewrite this after find target is refactored
   * @private
   * @param {TPointerEvent} e Event object
   * @param {FabricObject} target target of event to select/deselect
   * @returns true if grouping occurred
   */
  protected handleMultiSelection(e: TPointerEvent, target?: FabricObject) {
    const activeObject = this._activeObject;
    const isAS = isActiveSelection(activeObject);
    if (
      // check if an active object exists on canvas and if the user is pressing the `selectionKey` while canvas supports multi selection.
      !!activeObject &&
      this._isSelectionKeyPressed(e) &&
      this.selection &&
      // on top of that the user also has to hit a target that is selectable.
      !!target &&
      target.selectable &&
      // group target and active object only if they are different objects
      // else we try to find a subtarget of `ActiveSelection`
      (activeObject !== target || isAS) &&
      //  make sure `activeObject` and `target` aren't ancestors of each other in case `activeObject` is not `ActiveSelection`
      // if it is then we want to remove `target` from it
      (isAS ||
        (!target.isDescendantOf(activeObject) &&
          !activeObject.isDescendantOf(target))) &&
      //  target accepts selection
      !target.onSelect({ e }) &&
      // make sure we are not on top of a control
      !activeObject.getActiveControl()
    ) {
      if (isAS) {
        const prevActiveObjects = activeObject.getObjects();
        let subTargets: FabricObject[] = [];
        // const { subTargets: testSubTargets } = this.findTarget(e);
        if (target === activeObject) {
          const pointer = this.getScenePoint(e);
          let targetInfo = this.searchPossibleTargets(
            prevActiveObjects,
            pointer,
          );
          // console.log(testSubTargets.includes(targetInfo.target));
          if (targetInfo.target) {
            target = targetInfo.target;
            subTargets = targetInfo.subTargets;
          } else {
            targetInfo = this.searchPossibleTargets(this._objects, pointer);
            target = targetInfo.target;
            subTargets = targetInfo.subTargets;
          }
          // if nothing is found bail out
          if (!target || !target.selectable) {
            return false;
          }
        }
        if (target.group === activeObject) {
          // `target` is part of active selection => remove it
          activeObject.remove(target);
          this._hoveredTarget = target;
          this._hoveredTargets = subTargets;
          // if after removing an object we are left with one only...
          if (activeObject.size() === 1) {
            // activate last remaining object
            // deselecting the active selection will remove the remaining object from it
            this._setActiveObject(activeObject.item(0), e);
          }
        } else {
          // `target` isn't part of active selection => add it
          activeObject.multiSelectAdd(target);
          this._hoveredTarget = activeObject;
          this._hoveredTargets = subTargets;
        }
        this._fireSelectionEvents(prevActiveObjects, e);
      } else {
        (activeObject as IText).isEditing &&
          (activeObject as IText).exitEditing();
        // add the active object and the target to the active selection and set it as the active object
        const klass =
          classRegistry.getClass<typeof ActiveSelection>('ActiveSelection');
        const newActiveSelection = new klass([], {
          /**
           * it is crucial to pass the canvas ref before calling {@link ActiveSelection#multiSelectAdd}
           * since it uses {@link FabricObject#isInFrontOf} which relies on the canvas ref
           */
          canvas: this,
        });
        newActiveSelection.multiSelectAdd(activeObject, target);
        this._hoveredTarget = newActiveSelection;
        // ISSUE 4115: should we consider subTargets here?
        // this._hoveredTargets = [];
        // this._hoveredTargets = this.targets.concat();
        this._setActiveObject(newActiveSelection, e);
        this._fireSelectionEvents([activeObject], e);
      }
      return true;
    }
    return false;
  }

  /**
   * ## 处理选择
   * - 选择包含在（并且可能相交）选择边界框中的对象
   * - 设置活动对象
   * ---
   * 在鼠标移动后的鼠标抬起时运行
   *
   * ## Handles selection
   * - selects objects that are contained in (and possibly intersecting) the selection bounding box
   * - sets the active object
   * ---
   * runs on mouse up after a mouse move
   */
  protected handleSelection(e: TPointerEvent) {
    if (!this.selection || !this._groupSelector) {
      return false;
    }
    const { x, y, deltaX, deltaY } = this._groupSelector,
      point1 = new Point(x, y),
      point2 = point1.add(new Point(deltaX, deltaY)),
      tl = point1.min(point2),
      br = point1.max(point2),
      size = br.subtract(tl);

    const collectedObjects = this.collectObjects(
      {
        left: tl.x,
        top: tl.y,
        width: size.x,
        height: size.y,
      },
      { includeIntersecting: !this.selectionFullyContained },
    ) as FabricObject[];

    const objects =
      // though this method runs only after mouse move the pointer could do a mouse up on the same position as mouse down
      // should it be handled as is?
      point1.eq(point2)
        ? collectedObjects[0]
          ? [collectedObjects[0]]
          : []
        : collectedObjects.length > 1
          ? collectedObjects
              .filter((object) => !object.onSelect({ e }))
              .reverse()
          : // `setActiveObject` will call `onSelect(collectedObjects[0])` in this case
            collectedObjects;

    // set active object
    if (objects.length === 1) {
      // set as active object
      this.setActiveObject(objects[0], e);
    } else if (objects.length > 1) {
      // add to active selection and make it the active object
      const klass =
        classRegistry.getClass<typeof ActiveSelection>('ActiveSelection');
      this.setActiveObject(new klass(objects, { canvas: this }), e);
    }

    // cleanup
    this._groupSelector = null;
    return true;
  }

  /**
   * @override 清除 {@link textEditingManager}
   *
   * @override clear {@link textEditingManager}
   */
  clear() {
    this.textEditingManager.clear();
    super.clear();
  }

  /**
   * @override 清除 {@link textEditingManager}
   *
   * @override clear {@link textEditingManager}
   */
  destroy() {
    this.removeListeners();
    this.textEditingManager.dispose();
    super.destroy();
  }
}
