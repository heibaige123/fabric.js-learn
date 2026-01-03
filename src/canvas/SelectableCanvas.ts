import { dragHandler } from '../controls/drag';
import { getActionFromCorner } from '../controls/util';
import { Point } from '../Point';
import { FabricObject } from '../shapes/Object/FabricObject';
import type {
  CanvasEvents,
  ModifierKey,
  TOptionalModifierKey,
  TPointerEvent,
  Transform,
} from '../EventTypeDefs';
import {
  addTransformToObject,
  saveObjectTransform,
} from '../util/misc/objectTransforms';
import type { TCanvasSizeOptions } from './StaticCanvas';
import { StaticCanvas } from './StaticCanvas';
import { isCollection } from '../Collection';
import { isTransparent } from '../util/misc/isTransparent';
import type {
  TMat2D,
  TOriginX,
  TOriginY,
  TSize,
  TSVGReviver,
} from '../typedefs';
import { degreesToRadians } from '../util/misc/radiansDegreesConversion';
import { getPointer, isTouchEvent } from '../util/dom_event';
import type { IText } from '../shapes/IText/IText';
import type { BaseBrush } from '../brushes/BaseBrush';
import { pick } from '../util/misc/pick';
import { sendPointToPlane } from '../util/misc/planeChange';
import { cos, createCanvasElement, sin } from '../util';
import { CanvasDOMManager } from './DOMManagers/CanvasDOMManager';
import {
  BOTTOM,
  CENTER,
  LEFT,
  MODIFIED,
  RESIZING,
  RIGHT,
  ROTATE,
  SCALE,
  SCALE_X,
  SCALE_Y,
  SKEW_X,
  SKEW_Y,
  TOP,
} from '../constants';
import type { CanvasOptions } from './CanvasOptions';
import { canvasDefaults } from './CanvasOptions';
import { Intersection } from '../Intersection';
import { isActiveSelection } from '../util/typeAssertions';

/**
 * 目标信息的数据结构
 */
export type TargetsInfo = {
  /**
   * 我们认为最能延续选择动作的目标。
   */
  target?: FabricObject;
  /**
   * 容器下指针处的嵌套目标
   */
  subTargets: FabricObject[];
};

/**
 * 带有容器目标信息的数据结构
 */
export type TargetsInfoWithContainer = {
  // 我们认为最能延续选择动作的目标。
  // 可能是 hoveredTarget 或当前选定的对象
  // the target we think is the most continuing the selection action.
  // could be hoveredTarget or the currently selected object
  target?: FabricObject;
  /**
   * 容器下指针处的嵌套目标
   */
  subTargets: FabricObject[];
  /**
   * 目标的容器，如果没有可选择的嵌套目标，则为目标本身
   */
  container?: FabricObject;
};

/**
 * 带有容器信息的完整目标信息的数据结构
 */
export type FullTargetsInfoWithContainer = TargetsInfoWithContainer & {
  /**
   * 悬停的目标
   */
  currentTarget?: FabricObject;
  /**
   * hoveredTarget 的容器，或容器本身
   */
  currentContainer?: FabricObject;
  /**
   * 当前容器的嵌套目标
   */
  currentSubTargets: FabricObject[];
};

/**
 * Canvas 类
 * @class Canvas
 * @extends StaticCanvas
 * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-1#canvas}
 *
 * @fires object:modified at the end of a transform
 * @fires object:rotating while an object is being rotated from the control
 * @fires object:scaling while an object is being scaled by controls
 * @fires object:moving while an object is being dragged
 * @fires object:skewing while an object is being skewed from the controls
 *
 * @fires before:transform before a transform is is started
 * @fires before:selection:cleared
 * @fires selection:cleared
 * @fires selection:updated
 * @fires selection:created
 *
 * @fires path:created after a drawing operation ends and the path is added
 * @fires mouse:down
 * @fires mouse:move
 * @fires mouse:up
 * @fires mouse:down:before  on mouse down, before the inner fabric logic runs
 * @fires mouse:move:before on mouse move, before the inner fabric logic runs
 * @fires mouse:up:before on mouse up, before the inner fabric logic runs
 * @fires mouse:over
 * @fires mouse:out
 * @fires mouse:dblclick whenever a native dbl click event fires on the canvas.
 *
 * @fires dragover
 * @fires dragenter
 * @fires dragleave
 * @fires drag:enter object drag enter
 * @fires drag:leave object drag leave
 * @fires drop:before before drop event. Prepare for the drop event (same native event).
 * @fires drop
 * @fires drop:after after drop event. Run logic on canvas after event has been accepted/declined (same native event).
 * @example
 * let a: fabric.Object, b: fabric.Object;
 * let flag = false;
 * canvas.add(a, b);
 * a.on('drop:before', opt => {
 *  //  we want a to accept the drop even though it's below b in the stack
 *  flag = this.canDrop(opt.e);
 * });
 * b.canDrop = function(e) {
 *  !flag && this.draggableTextDelegate.canDrop(e);
 * }
 * b.on('dragover', opt => b.set('fill', opt.dropTarget === b ? 'pink' : 'black'));
 * a.on('drop', opt => {
 *  opt.e.defaultPrevented  //  drop occurred
 *  opt.didDrop             //  drop occurred on canvas
 *  opt.target              //  drop target
 *  opt.target !== a && a.set('text', 'I lost');
 * });
 * canvas.on('drop:after', opt => {
 *  //  inform user who won
 *  if(!opt.e.defaultPrevented) {
 *    // no winners
 *  }
 *  else if(!opt.didDrop) {
 *    //  my objects didn't win, some other lucky object
 *  }
 *  else {
 *    //  we have a winner it's opt.target!!
 *  }
 * })
 *
 * @fires after:render at the end of the render process, receives the context in the callback
 * @fires before:render at start the render process, receives the context in the callback
 *
 * @fires contextmenu:before
 * @fires contextmenu
 * @example
 * let handler;
 * targets.forEach(target => {
 *   target.on('contextmenu:before', opt => {
 *     //  decide which target should handle the event before canvas hijacks it
 *     if (someCaseHappens && opt.targets.includes(target)) {
 *       handler = target;
 *     }
 *   });
 *   target.on('contextmenu', opt => {
 *     //  do something fantastic
 *   });
 * });
 * canvas.on('contextmenu', opt => {
 *   if (!handler) {
 *     //  no one takes responsibility, it's always left to me
 *     //  let's show them how it's done!
 *   }
 * });
 *
 */
export class SelectableCanvas<EventSpec extends CanvasEvents = CanvasEvents>
  extends StaticCanvas<EventSpec>
  implements Omit<CanvasOptions, 'enablePointerEvents'>
{
  /**
   * 对象列表
   */
  declare _objects: FabricObject[];

  // transform config
  /**
   * 当为 true 时，对象可以通过拖动通常不会进行单边变换的角来进行单边（不成比例）变换。
   */
  declare uniformScaling: boolean;
  /**
   * 指示哪个键切换统一缩放。
   */
  declare uniScaleKey: TOptionalModifierKey;
  /**
   * 当为 true 时，对象使用中心点作为缩放变换的原点。
   */
  declare centeredScaling: boolean;
  /**
   * 当为 true 时，对象使用中心点作为旋转变换的原点。
   */
  declare centeredRotation: boolean;
  /**
   * 指示哪个键启用中心变换。
   */
  declare centeredKey: TOptionalModifierKey;
  /**
   * 指示哪个键启用角上的替代操作。
   */
  declare altActionKey: TOptionalModifierKey;

  // selection config
  /**
   * 指示是否应启用组选择
   */
  declare selection: boolean;
  /**
   * 指示哪个键或哪些键启用多选点击。
   */
  declare selectionKey: TOptionalModifierKey | ModifierKey[];
  /**
   * 指示哪个键启用替代选择。
   */
  declare altSelectionKey: TOptionalModifierKey;
  /**
   * 选择的颜色
   */
  declare selectionColor: string;
  /**
   * 默认虚线数组模式。
   */
  declare selectionDashArray: number[];
  /**
   * 选择边框的颜色
   */
  declare selectionBorderColor: string;
  /**
   * 用于对象/组选择的线条宽度
   */
  declare selectionLineWidth: number;
  /**
   * 仅选择完全包含在拖动选择矩形中的形状。
   */
  declare selectionFullyContained: boolean;

  // cursors
  /**
   * 悬停在 canvas 上的对象时使用的默认光标值
   */
  declare hoverCursor: CSSStyleDeclaration['cursor'];
  /**
   * 在 canvas 上移动对象时使用的默认光标值
   */
  declare moveCursor: CSSStyleDeclaration['cursor'];
  /**
   * 整个 canvas 使用的默认光标值
   */
  declare defaultCursor: CSSStyleDeclaration['cursor'];
  /**
   * 自由绘制期间使用的光标值
   */
  declare freeDrawingCursor: CSSStyleDeclaration['cursor'];
  /**
   * 用于禁用元素（具有禁用操作的角）的光标值
   */
  declare notAllowedCursor: CSSStyleDeclaration['cursor'];

  /**
   * 赋予 canvas 包装器 (div) 元素的默认元素类
   */
  declare containerClass: string;

  // target find config
  /**
   * 当为 true 时，对象检测基于每个像素而不是每个边界框进行
   */
  declare perPixelTargetFind: boolean;
  /**
   * 对象检测期间容忍的目标像素周围的像素数
   */
  declare targetFindTolerance: number;
  /**
   * 当为 true 时，跳过目标检测。
   */
  declare skipTargetFind: boolean;

  /**
   * 当为 true 时，canvas 上的鼠标事件（mousedown/mousemove/mouseup）会导致自由绘图。
   * mousedown 后，mousemove 创建形状，
   * mouseup 完成它并将 `fabric.Path` 的实例添加到 canvas 上。
   *
   * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-4#free_drawing}
   * @type Boolean
   */
  declare isDrawingMode: boolean;

  /**
   * 指示对象在被选中时是否应保持在当前堆栈位置。
   */
  declare preserveObjectStacking: boolean;

  // event config
  /**
   * 指示 canvas 上的右键单击是否可以输出上下文菜单
   */
  declare stopContextMenu: boolean;
  /**
   * 指示 canvas 是否可以触发右键单击事件
   */
  declare fireRightClick: boolean;
  /**
   * 指示 canvas 是否可以触发中键单击事件
   */
  declare fireMiddleClick: boolean;

  /**
   * 跟踪上一个事件中悬停的目标
   *
   * @private
   */
  declare _hoveredTarget?: FabricObject;

  /**
   * 保存上一个事件中悬停的嵌套目标列表
   *
   * @private
   */
  _hoveredTargets: FabricObject[] = [];

  /**
   * 保存要渲染的对象列表
   *
   * @private
   */
  declare _objectsToRender?: FabricObject[];

  /**
   * 保存对包含当前正在进行的变换信息的数据结构的引用
   *
   * @private
   */
  _currentTransform: Transform | null = null;

  /**
   * 保存对用于跟踪 canvas 拖动上的选择框的数据结构的引用
   * 在当前正在进行的变换上
   * x, y, deltaX 和 deltaY 在场景平面中
   *
   * @private
   */
  protected _groupSelector: {
    x: number;
    y: number;
    deltaX: number;
    deltaY: number;
  } | null = null;

  /**
   * 内部标志，用于了解 context top 是否需要清理
   * 如果为 true，则 contextTop 将在下一次渲染时被清除
   *
   * @private
   */
  contextTopDirty = false;

  /**
   * 在鼠标事件期间，我们可能需要在多个函数中多次使用指针。
   * _scenePoint 保存对 fabricCanvas/design 坐标中指针的引用，该引用在事件生命周期内有效。
   * 每个 fabricJS 鼠标事件每次都会创建和删除缓存
   * 我们这样做是因为有一些 HTML DOM 检查函数可以获取实际的指针坐标
   *
   */
  declare protected _scenePoint?: Point;

  /**
   * 在鼠标事件期间，我们可能需要在多个函数中多次使用指针。
   * _viewportPoint 保存对 html 坐标中指针的引用，该引用在事件生命周期内有效。
   * 每个 fabricJS 鼠标事件每次都会创建和删除缓存
   * 我们这样做是因为有一些 HTML DOM 检查函数可以获取实际的指针坐标
   */
  declare protected _viewportPoint?: Point;

  /**
   * 保存我们在事件生命周期内缓存的信息
   * 在事件期间多次需要此数据，我们要避免多次重新计算它。
   *
   */
  declare protected _targetInfo: FullTargetsInfoWithContainer | undefined;

  static ownDefaults = canvasDefaults;

  static getDefaults(): Record<string, any> {
    return { ...super.getDefaults(), ...SelectableCanvas.ownDefaults };
  }

  /**
   * Canvas DOM 管理器
   */
  declare elements: CanvasDOMManager;
  /**
   * 获取上层 canvas 元素
   */
  get upperCanvasEl() {
    return this.elements.upper?.el;
  }
  /**
   * 获取上层 canvas 上下文
   */
  get contextTop() {
    return this.elements.upper?.ctx;
  }
  /**
   * 获取包装器元素
   */
  get wrapperEl() {
    return this.elements.container;
  }
  /**
   * 用于像素检测的 canvas 元素
   */
  declare private pixelFindCanvasEl: HTMLCanvasElement;
  /**
   * 用于像素检测的 canvas 上下文
   */
  declare private pixelFindContext: CanvasRenderingContext2D;

  /**
   * 指示当前是否正在绘图
   */
  declare protected _isCurrentlyDrawing: boolean;
  /**
   * 自由绘图画笔
   */
  declare freeDrawingBrush?: BaseBrush;
  /**
   * 当前活动对象
   */
  declare _activeObject?: FabricObject;

  /**
   * 初始化元素
   * @param el canvas 元素或其 id
   */
  protected initElements(el?: string | HTMLCanvasElement) {
    this.elements = new CanvasDOMManager(el, {
      allowTouchScrolling: this.allowTouchScrolling,
      containerClass: this.containerClass,
    });
    this._createCacheCanvas();
  }

  /**
   * 对象添加时的处理
   * @private
   * @param {FabricObject} obj 被添加的对象
   * @param {FabricObject} obj Object that was added
   */
  _onObjectAdded(obj: FabricObject) {
    this._objectsToRender = undefined;
    super._onObjectAdded(obj);
  }

  /**
   * 对象移除时的处理
   * @private
   * @param {FabricObject} obj 被移除的对象
   * @param {FabricObject} obj Object that was removed
   */
  _onObjectRemoved(obj: FabricObject) {
    this._objectsToRender = undefined;
    // removing active object should fire "selection:cleared" events
    if (obj === this._activeObject) {
      this.fire('before:selection:cleared', { deselected: [obj] });
      this._discardActiveObject();
      this.fire('selection:cleared', { deselected: [obj] });
      obj.fire('deselected', {
        target: obj,
      });
    }
    if (obj === this._hoveredTarget) {
      this._hoveredTarget = undefined;
      this._hoveredTargets = [];
    }
    super._onObjectRemoved(obj);
  }

  /**
   * 堆栈顺序改变时的处理
   */
  _onStackOrderChanged() {
    this._objectsToRender = undefined;
    super._onStackOrderChanged();
  }

  /**
   * 将对象分为两组，一组立即渲染，另一组作为 activeGroup 渲染。
   *
   * @return {Array} 立即渲染的对象并将其他推送到 activeGroup 中。
   */
  _chooseObjectsToRender(): FabricObject[] {
    const activeObject = this._activeObject;
    return !this.preserveObjectStacking && activeObject
      ? this._objects
          .filter((object) => !object.group && object !== activeObject)
          .concat(activeObject)
      : this._objects;
  }

  /**
   * 渲染顶部 canvas 和辅助容器 canvas。
   *
   */
  renderAll() {
    this.cancelRequestedRender();
    if (this.destroyed) {
      return;
    }
    if (this.contextTopDirty && !this._groupSelector && !this.isDrawingMode) {
      this.clearContext(this.contextTop);
      this.contextTopDirty = false;
    }
    if (this.hasLostContext) {
      this.renderTopLayer(this.contextTop);
      this.hasLostContext = false;
    }
    !this._objectsToRender &&
      (this._objectsToRender = this._chooseObjectsToRender());
    this.renderCanvas(this.getContext(), this._objectsToRender);
  }

  /**
   * 文本选择在渲染周期中由活动文本实例渲染
   *
   */
  renderTopLayer(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.isDrawingMode && this._isCurrentlyDrawing) {
      this.freeDrawingBrush && this.freeDrawingBrush._render();
      this.contextTopDirty = true;
    }
    // we render the top context - last object
    if (this.selection && this._groupSelector) {
      this._drawSelection(ctx);
      this.contextTopDirty = true;
    }
    ctx.restore();
  }

  /**
   * 仅渲染顶部 canvas 的方法。
   * 也用于渲染组选择框。
   * 不渲染文本选择。
   *
   */
  renderTop() {
    const ctx = this.contextTop;
    this.clearContext(ctx);
    this.renderTopLayer(ctx);
    // todo: how do i know if the after:render is for the top or normal contex?
    this.fire('after:render', { ctx });
  }

  /**
   * 设置像素目标查找的 canvas 容差值。
   * 仅使用整数。
   *
   * @private
   */
  setTargetFindTolerance(value: number) {
    value = Math.round(value);
    this.targetFindTolerance = value;
    const retina = this.getRetinaScaling();
    const size = Math.ceil((value * 2 + 1) * retina);
    this.pixelFindCanvasEl.width = this.pixelFindCanvasEl.height = size;
    this.pixelFindContext.scale(retina, retina);
  }

  /**
   * 如果对象在特定位置是透明的，则返回 true
   * 说明：这是 `目标在位置 X 处是透明的还是那里有控件`
   * @TODO 这似乎很愚蠢，我们用透明度处理控件。我们可以通过编程方式找到控件而无需绘制它们，缓存 canvas 优化始终有效
   *
   * @param {FabricObject} target 目标对象
   * @param {Number} x 视口空间中的左坐标
   * @param {Number} y 视口空间中的顶部坐标
   * @return {Boolean}
   */
  isTargetTransparent(target: FabricObject, x: number, y: number): boolean {
    const tolerance = this.targetFindTolerance;
    const ctx = this.pixelFindContext;
    this.clearContext(ctx);
    ctx.save();
    ctx.translate(-x + tolerance, -y + tolerance);
    ctx.transform(...this.viewportTransform);
    const selectionBgc = target.selectionBackgroundColor;
    target.selectionBackgroundColor = '';
    target.render(ctx);
    target.selectionBackgroundColor = selectionBgc;
    ctx.restore();
    // our canvas is square, and made around tolerance.
    // so tolerance in this case also represent the center of the canvas.
    const enhancedTolerance = Math.round(tolerance * this.getRetinaScaling());
    return isTransparent(
      ctx,
      enhancedTolerance,
      enhancedTolerance,
      enhancedTolerance,
    );
  }

  /**
   * 获取事件并确定是否按下了选择键
   *
   * @private
   * @param {TPointerEvent} e 事件对象
   */
  _isSelectionKeyPressed(e: TPointerEvent): boolean {
    const sKey = this.selectionKey;
    if (!sKey) {
      return false;
    }
    if (Array.isArray(sKey)) {
      return !!sKey.find((key) => !!key && e[key] === true);
    } else {
      return e[sKey];
    }
  }

  /**
   * 决定是否应该清除选择
   * @private
   * @param {TPointerEvent} e 事件对象
   * @param {FabricObject} target 目标对象
   * @param {TPointerEvent} e Event object
   * @param {FabricObject} target
   */
  _shouldClearSelection(
    e: TPointerEvent,
    target?: FabricObject,
  ): target is undefined {
    const activeObjects = this.getActiveObjects(),
      activeObject = this._activeObject;

    return !!(
      !target ||
      (target &&
        activeObject &&
        activeObjects.length > 1 &&
        activeObjects.indexOf(target) === -1 &&
        activeObject !== target &&
        !this._isSelectionKeyPressed(e)) ||
      (target && !target.evented) ||
      (target && !target.selectable && activeObject && activeObject !== target)
    );
  }

  /**
   * 此方法将考虑按下的修饰键和我们要拖动的控件，并尝试猜测变换的锚点（原点）。
   * 这实际上应该属于控件领域，我们应该删除用于遗留嵌入式操作的特定代码。
   * @TODO 这可能值得讨论/重新发现和更改/重构
   *
   * @private
   * @deprecated
   * @param {FabricObject} target
   * @param {string} action
   * @param {boolean} altKey
   * @returns {boolean} true if the transformation should be centered
   */
  private _shouldCenterTransform(
    target: FabricObject,
    action: string,
    modifierKeyPressed: boolean,
  ) {
    if (!target) {
      return;
    }

    let centerTransform;

    if (
      action === SCALE ||
      action === SCALE_X ||
      action === SCALE_Y ||
      action === RESIZING
    ) {
      centerTransform = this.centeredScaling || target.centeredScaling;
    } else if (action === ROTATE) {
      centerTransform = this.centeredRotation || target.centeredRotation;
    }

    return centerTransform ? !modifierKeyPressed : modifierKeyPressed;
  }

  /**
   * 给定点击的控件，确定变换的原点。
   * 这很糟糕，因为控件完全可以有自定义名称
   * 应该在 4.0 版本之前消失
   *
   * @private
   * @deprecated
   */
  _getOriginFromCorner(
    target: FabricObject,
    controlName: string,
  ): { x: TOriginX; y: TOriginY } {
    const origin = {
      x: target.originX,
      y: target.originY,
    };

    if (!controlName) {
      return origin;
    }

    // is a left control ?
    if (['ml', 'tl', 'bl'].includes(controlName)) {
      origin.x = RIGHT;
      // is a right control ?
    } else if (['mr', 'tr', 'br'].includes(controlName)) {
      origin.x = LEFT;
    }
    // is a top control ?
    if (['tl', 'mt', 'tr'].includes(controlName)) {
      origin.y = BOTTOM;
      // is a bottom control ?
    } else if (['bl', 'mb', 'br'].includes(controlName)) {
      origin.y = TOP;
    }
    return origin;
  }

  /**
   * 设置当前变换
   * @private
   * @param {Event} e 事件对象
   * @param {FabricObject} target 目标对象
   * @param {boolean} [alreadySelected] 传递 true 以设置活动控件
   */
  _setupCurrentTransform(
    e: TPointerEvent,
    target: FabricObject,
    alreadySelected: boolean,
  ): void {
    const pointer = target.group
      ? // transform pointer to target's containing coordinate plane
        sendPointToPlane(
          this.getScenePoint(e),
          undefined,
          target.group.calcTransformMatrix(),
        )
      : this.getScenePoint(e);
    const { key: corner = '', control } = target.getActiveControl() || {},
      actionHandler =
        alreadySelected && control
          ? control.getActionHandler(e, target, control)?.bind(control)
          : dragHandler,
      action = getActionFromCorner(alreadySelected, corner, e, target),
      altKey = e[this.centeredKey as ModifierKey],
      origin = this._shouldCenterTransform(target, action, altKey)
        ? ({ x: CENTER, y: CENTER } as const)
        : this._getOriginFromCorner(target, corner),
      /**
       * relative to target's containing coordinate plane
       * both agree on every point
       **/
      transform: Transform = {
        target: target,
        action,
        actionHandler,
        actionPerformed: false,
        corner,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        skewX: target.skewX,
        skewY: target.skewY,
        offsetX: pointer.x - target.left,
        offsetY: pointer.y - target.top,
        originX: origin.x,
        originY: origin.y,
        ex: pointer.x,
        ey: pointer.y,
        lastX: pointer.x,
        lastY: pointer.y,
        theta: degreesToRadians(target.angle),
        width: target.width,
        height: target.height,
        shiftKey: e.shiftKey,
        altKey,
        original: {
          ...saveObjectTransform(target),
          originX: origin.x,
          originY: origin.y,
        },
      };

    this._currentTransform = transform;

    this.fire('before:transform', {
      e,
      transform,
    });
  }

  /**
   * 设置 canvas 元素的光标类型
   *
   * @param {String} value Cursor type of the canvas element.
   * @see http://www.w3.org/TR/css3-ui/#cursor
   */
  setCursor(value: CSSStyleDeclaration['cursor']): void {
    this.upperCanvasEl.style.cursor = value;
  }

  /**
   * 绘制选择区域
   * @private
   * @param {CanvasRenderingContext2D} ctx 用于绘制选择的上下文
   * @param {CanvasRenderingContext2D} ctx to draw the selection on
   */
  _drawSelection(ctx: CanvasRenderingContext2D): void {
    const { x, y, deltaX, deltaY } = this._groupSelector!,
      start = new Point(x, y).transform(this.viewportTransform),
      extent = new Point(x + deltaX, y + deltaY).transform(
        this.viewportTransform,
      ),
      strokeOffset = this.selectionLineWidth / 2;
    let minX = Math.min(start.x, extent.x),
      minY = Math.min(start.y, extent.y),
      maxX = Math.max(start.x, extent.x),
      maxY = Math.max(start.y, extent.y);

    if (this.selectionColor) {
      ctx.fillStyle = this.selectionColor;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    }

    if (!this.selectionLineWidth || !this.selectionBorderColor) {
      return;
    }
    ctx.lineWidth = this.selectionLineWidth;
    ctx.strokeStyle = this.selectionBorderColor;

    minX += strokeOffset;
    minY += strokeOffset;
    maxX -= strokeOffset;
    maxY -= strokeOffset;
    // selection border
    // @TODO: is _setLineDash still necessary on modern canvas?
    FabricObject.prototype._setLineDash.call(
      this,
      ctx,
      this.selectionDashArray,
    );
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * 此函数负责决定哪个对象是交互事件的当前目标。
   * 对于交互事件，我们指的是 canvas 上与指针相关的操作。
   * 哪个是
   * 11/09/2018 TODO: 如果 findTarget 可以区分是完整目标还是角的外部部分，那就太酷了。
   *
   * @param {Event} e 鼠标事件
   * @return {TargetsInfoWithContainer} 找到的目标
   */
  findTarget(e: TPointerEvent): FullTargetsInfoWithContainer {
    // this._targetInfo is cached by _cacheTransformEventData
    // and destroyed by _resetTransformEventData
    if (this._targetInfo) {
      return this._targetInfo;
    }

    if (this.skipTargetFind) {
      return {
        subTargets: [],
        currentSubTargets: [],
      };
    }

    const pointer = this.getScenePoint(e),
      activeObject = this._activeObject,
      aObjects = this.getActiveObjects(),
      targetInfo = this.searchPossibleTargets(this._objects, pointer);

    const {
      subTargets: currentSubTargets,
      container: currentContainer,
      target: currentTarget,
    } = targetInfo;

    const fullTargetInfo: FullTargetsInfoWithContainer = {
      ...targetInfo,
      currentSubTargets,
      currentContainer,
      currentTarget,
    };

    // simplest case no active object, return a new target
    if (!activeObject) {
      return fullTargetInfo;
    }

    // check pointer is over active selection and possibly perform `subTargetCheck`
    const activeObjectTargetInfo: FullTargetsInfoWithContainer = {
      ...this.searchPossibleTargets([activeObject], pointer),
      currentSubTargets,
      currentContainer,
      currentTarget,
    };

    const activeObjectControl = activeObject.findControl(
      this.getViewportPoint(e),
      isTouchEvent(e),
    );

    // we are clicking exactly the control of an active object, shortcut to that object.
    if (activeObjectControl) {
      return {
        ...activeObjectTargetInfo,
        target: activeObject, // we override target in case we are in the outside part of the corner.
      };
    }

    // in case we are over the active object
    if (activeObjectTargetInfo.target) {
      if (aObjects.length > 1) {
        // in case of active selection and target hit over the activeSelection, just exit
        // TODO Verify if we need to override target with container
        return activeObjectTargetInfo;
      }
      // from here onward not an active selection, just an activeOject that maybe is a group

      // preserveObjectStacking is false, so activeObject is drawn on top, just return activeObject
      if (!this.preserveObjectStacking) {
        // TODO Verify if we need to override target with container
        return activeObjectTargetInfo;
      }

      // In case we are in preserveObjectStacking ( selection in stack )
      // there is the possibility to force with `altSelectionKey` to return the activeObject
      // from any point in the stack, even if we have another object completely on top of it.
      if (
        this.preserveObjectStacking &&
        e[this.altSelectionKey as ModifierKey]
      ) {
        // TODO Verify if we need to override target with container
        return activeObjectTargetInfo;
      }
    }

    // we have an active object, but we ruled out it being our target in any way.
    return fullTargetInfo;
  }

  /**
   * 检查点是否在对象选择区域内，包括填充
   *
   * @param {FabricObject} obj 要测试的对象
   * @param {Object} [pointer] 场景坐标中的点
   * @return {Boolean} 如果点包含在给定对象的区域内则返回true
   * @private
   */
  private _pointIsInObjectSelectionArea(obj: FabricObject, point: Point) {
    // getCoords will already take care of group de-nesting
    let coords = obj.getCoords();
    const viewportZoom = this.getZoom();
    const padding = obj.padding / viewportZoom;
    if (padding) {
      const [tl, tr, br, bl] = coords;
      // what is the angle of the object?
      // we could use getTotalAngle, but is way easier to look at it
      // from how coords are oriented, since if something went wrong
      // at least we are consistent.
      const angleRadians = Math.atan2(tr.y - tl.y, tr.x - tl.x),
        cosP = cos(angleRadians) * padding,
        sinP = sin(angleRadians) * padding,
        cosPSinP = cosP + sinP,
        cosPMinusSinP = cosP - sinP;

      coords = [
        new Point(tl.x - cosPMinusSinP, tl.y - cosPSinP),
        new Point(tr.x + cosPSinP, tr.y - cosPMinusSinP),
        new Point(br.x + cosPMinusSinP, br.y + cosPSinP),
        new Point(bl.x - cosPSinP, bl.y + cosPMinusSinP),
      ];
      // in case of padding we calculate the new coords on the fly.
      // otherwise we have to maintain 2 sets of coordinates for everything.
      // we can reiterate on storing them.
      // if this is slow, for now the semplification is large and doesn't impact
      // rendering.
      // the idea behind this is that outside target check we don't need ot know
      // where those coords are
    }
    return Intersection.isPointInPolygon(point, coords);
  }

  /**
   * 检查点是否在对象选择条件内。要么是带填充的区域，要么是像素（如果启用了 perPixelTargetFind）
   *
   * @param {FabricObject} obj 要测试的对象
   * @param {Point} pointer 场景中的点
   * @return {Boolean} 如果点包含在给定对象的区域内则返回true
   * @private
   */
  _checkTarget(obj: FabricObject, pointer: Point): boolean {
    if (
      obj &&
      obj.visible &&
      obj.evented &&
      this._pointIsInObjectSelectionArea(obj, pointer)
    ) {
      if (
        (this.perPixelTargetFind || obj.perPixelTargetFind) &&
        !(obj as unknown as IText).isEditing
      ) {
        const viewportPoint = pointer.transform(this.viewportTransform);
        if (!this.isTargetTransparent(obj, viewportPoint.x, viewportPoint.y)) {
          return true;
        }
      } else {
        return true;
      }
    }
    return false;
  }

  /**
   * 给定一个对象数组，搜索指针位置下的可能目标
   * 返回一个
   *
   * @param {Array} objects 对象数组以进行检查
   * @param {Object} pointer 视口空间中的点以进行检查
   * @param {Object} subTargets 收集的子目标数组
   * @return {TargetsInfo} 找到的目标和子目标数组
   * @private
   */
  _searchPossibleTargets(
    objects: FabricObject[],
    pointer: Point,
    subTargets: FabricObject[],
  ): TargetsInfo {
    let i = objects.length;
    // Do not check for currently grouped objects, since we check the parent group itself.
    // until we call this function specifically to search inside the activeGroup
    while (i--) {
      const target = objects[i];
      if (this._checkTarget(target, pointer)) {
        if (isCollection(target) && target.subTargetCheck) {
          const { target: subTarget } = this._searchPossibleTargets(
            target._objects,
            pointer,
            subTargets,
          );
          subTarget && subTargets.push(subTarget);
        }
        return {
          target,
          subTargets,
        };
      }
    }
    return {
      subTargets: [],
    };
  }

  /**
   * 在对象数组中搜索包含指针的第一个对象
   * 将该对象的子目标收集到作为参数传递的 subTargets 数组中
   *
   * @param {FabricObject[]} objects 对象数组以进行检查
   * @param {Point} pointer 视口空间中的点以进行检查
   * @return {FabricObject} **top most object on screen** that contains pointer
   */
  searchPossibleTargets(
    objects: FabricObject[],
    pointer: Point,
  ): TargetsInfoWithContainer {
    const targetInfo: TargetsInfoWithContainer = this._searchPossibleTargets(
      objects,
      pointer,
      [],
    );

    // outermost target is the container.
    targetInfo.container = targetInfo.target;
    const { container, subTargets } = targetInfo;

    if (
      container &&
      isCollection(container) &&
      container.interactive &&
      subTargets[0]
    ) {
      /** subTargets[0] is the innermost nested target, but it could be inside non interactive groups
       * and so not a possible selection target.
       * We loop the array from the end that is outermost innertarget.
       */
      for (let i = subTargets.length - 1; i > 0; i--) {
        const t = subTargets[i];
        if (!(isCollection(t) && t.interactive)) {
          // one of the subtargets was not interactive. that is the last subtarget we can return.
          // we can't dig more deep;
          targetInfo.target = t;
          return targetInfo;
        }
      }
      targetInfo.target = subTargets[0];
      return targetInfo;
    }

    return targetInfo;
  }

  /**
   * 返回与 {@link HTMLCanvasElement} 处于同一平面的点，
   * `(0, 0)` 是 {@link HTMLCanvasElement} 的左上角。
   * 这意味着对 {@link viewportTransform} 的更改不会更改点的值
   * 并且从查看者的角度来看它保持不变。
   *
   * @example
   * const scenePoint = sendPointToPlane(
   *  this.getViewportPoint(e),
   *  undefined,
   *  canvas.viewportTransform
   * );
   *
   */
  getViewportPoint(e: TPointerEvent) {
    if (this._viewportPoint) {
      return this._viewportPoint;
    }
    return this._getPointerImpl(e, true);
  }

  /**
   * 返回场景中存在的点（与 {@link FabricObject#getCenterPoint} 所在的平面相同）。
   * 这意味着对 {@link viewportTransform} 的更改不会更改点的值，
   * 但是，从查看者的角度来看，该点已更改。
   *
   *
   * @example
   * const viewportPoint = sendPointToPlane(
   *  this.getScenePoint(e),
   *  canvas.viewportTransform
   * );
   *
   */
  getScenePoint(e: TPointerEvent) {
    if (this._scenePoint) {
      return this._scenePoint;
    }
    return this._getPointerImpl(e);
  }

  /**
   * 返回相对于 canvas 的指针。
   *
   * 请改用 {@link getViewportPoint} 或 {@link getScenePoint}。
   *
   * @param {Event} e
   * @param {Boolean} [fromViewport] whether to return the point from the viewport or in the scene
   * @return {Point}
   */
  protected _getPointerImpl(e: TPointerEvent, fromViewport = false): Point {
    const upperCanvasEl = this.upperCanvasEl,
      bounds = upperCanvasEl.getBoundingClientRect();
    let pointer = getPointer(e),
      boundsWidth = bounds.width || 0,
      boundsHeight = bounds.height || 0;

    if (!boundsWidth || !boundsHeight) {
      if (TOP in bounds && BOTTOM in bounds) {
        boundsHeight = Math.abs(bounds.top - bounds.bottom);
      }
      if (RIGHT in bounds && LEFT in bounds) {
        boundsWidth = Math.abs(bounds.right - bounds.left);
      }
    }

    this.calcOffset();
    pointer.x = pointer.x - this._offset.left;
    pointer.y = pointer.y - this._offset.top;
    if (!fromViewport) {
      pointer = sendPointToPlane(pointer, undefined, this.viewportTransform);
    }

    const retinaScaling = this.getRetinaScaling();
    if (retinaScaling !== 1) {
      pointer.x /= retinaScaling;
      pointer.y /= retinaScaling;
    }

    // If bounds are not available (i.e. not visible), do not apply scale.
    const cssScale =
      boundsWidth === 0 || boundsHeight === 0
        ? new Point(1, 1)
        : new Point(
            upperCanvasEl.width / boundsWidth,
            upperCanvasEl.height / boundsHeight,
          );

    return pointer.multiply(cssScale);
  }

  /**
   * 设置画布尺寸的实现
   *
   * 仅供内部使用
   *
   * @protected
   */
  protected _setDimensionsImpl(
    dimensions: TSize,
    options?: TCanvasSizeOptions,
  ) {
    // @ts-expect-error this method exists in the subclass - should be moved or declared as abstract
    this._resetTransformEventData();
    super._setDimensionsImpl(dimensions, options);
    if (this._isCurrentlyDrawing) {
      this.freeDrawingBrush &&
        this.freeDrawingBrush._setBrushStyles(this.contextTop);
    }
  }

  /**
   * 创建用于像素检测的缓存 canvas
   * @protected
   */
  protected _createCacheCanvas() {
    this.pixelFindCanvasEl = createCanvasElement();
    this.pixelFindContext = this.pixelFindCanvasEl.getContext('2d', {
      willReadFrequently: true,
    })!;
    this.setTargetFindTolerance(this.targetFindTolerance);
  }

  /**
   * 返回绘制交互的顶部 canvas 的上下文
   *
   * @returns {CanvasRenderingContext2D}
   */
  getTopContext(): CanvasRenderingContext2D {
    return this.elements.upper.ctx;
  }

  /**
   * 返回绘制对象选择的 canvas 的上下文
   *
   * @alias
   * @return {CanvasRenderingContext2D}
   */
  getSelectionContext(): CanvasRenderingContext2D {
    return this.elements.upper.ctx;
  }

  /**
   * 返回绘制对象选择的 &lt;canvas> 元素
   *
   * @return {HTMLCanvasElement}
   */
  getSelectionElement(): HTMLCanvasElement {
    return this.elements.upper.el;
  }

  /**
   * 返回当前活动对象
   *
   * @return {FabricObject | null} active object
   */
  getActiveObject(): FabricObject | undefined {
    return this._activeObject;
  }

  /**
   * 返回包含当前选定对象的数组
   *
   * @return {FabricObject[]} 活动对象数组
   */
  getActiveObjects(): FabricObject[] {
    const active = this._activeObject;
    return isActiveSelection(active)
      ? active.getObjects()
      : active
        ? [active]
        : [];
  }

  /**
   * 比较旧的 activeObject 和当前的 activeObject 并触发正确的事件
   * @private
   * @param {FabricObject[]} oldObjects 旧的活动对象数组
   * @param {TPointerEvent} e 事件对象
   */
  _fireSelectionEvents(oldObjects: FabricObject[], e?: TPointerEvent) {
    let somethingChanged = false,
      invalidate = false;
    const objects = this.getActiveObjects(),
      added: FabricObject[] = [],
      removed: FabricObject[] = [];

    oldObjects.forEach((target) => {
      if (!objects.includes(target)) {
        somethingChanged = true;
        target.fire('deselected', {
          e,
          target,
        });
        removed.push(target);
      }
    });

    objects.forEach((target) => {
      if (!oldObjects.includes(target)) {
        somethingChanged = true;
        target.fire('selected', {
          e,
          target,
        });
        added.push(target);
      }
    });

    if (oldObjects.length > 0 && objects.length > 0) {
      invalidate = true;
      somethingChanged &&
        this.fire('selection:updated', {
          e,
          selected: added,
          deselected: removed,
        });
    } else if (objects.length > 0) {
      invalidate = true;
      this.fire('selection:created', {
        e,
        selected: added,
      });
    } else if (oldObjects.length > 0) {
      invalidate = true;
      this.fire('selection:cleared', {
        e,
        deselected: removed,
      });
    }
    invalidate && (this._objectsToRender = undefined);
  }

  /**
   * 将给定对象设置为 canvas 上唯一的活动对象
   *
   * @param {FabricObject} object 要设置为活动的对象
   * @param {TPointerEvent} [e] 事件对象
   * @return {Boolean} 如果对象已被选中则为 true
   */
  setActiveObject(object: FabricObject, e?: TPointerEvent) {
    // we can't inline this, since _setActiveObject will change what getActiveObjects returns
    const currentActives = this.getActiveObjects();
    const selected = this._setActiveObject(object, e);
    this._fireSelectionEvents(currentActives, e);
    return selected;
  }

  /**
   * 这应该等同于 setActiveObject 但不触发任何事件。
   * 承诺保持这种方式。
   * 这是 setActiveObject 的功能部分。
   *
   * @param {Object} object 要设置为活动的对象
   * @param {Event} [e] 事件对象
   * @return {Boolean} 如果对象已被选中则为 true
   */
  _setActiveObject(object: FabricObject, e?: TPointerEvent) {
    const prevActiveObject = this._activeObject;
    if (prevActiveObject === object) {
      return false;
    }
    // after calling this._discardActiveObject, this,_activeObject could be undefined
    if (!this._discardActiveObject(e, object) && this._activeObject) {
      // refused to deselect
      return false;
    }
    if (object.onSelect({ e })) {
      return false;
    }

    this._activeObject = object;

    if (isActiveSelection(object) && prevActiveObject !== object) {
      object.set('canvas', this);
    }
    object.setCoords();

    return true;
  }

  /**
   * 这应该等同于 discardActiveObject 但不触发任何选择事件（仍然可以触发对象变换事件）。
   * 承诺保持这种方式。
   * 这是 discardActiveObject 的功能部分。
   *
   * @param {Event} [e] 事件对象
   * @param {Object} object 要设置为活动的下一个对象，丢弃当前对象的原因
   * @return {Boolean} 如果活动对象已被丢弃则为 true
   */
  _discardActiveObject(
    e?: TPointerEvent,
    object?: FabricObject,
  ): this is { _activeObject: undefined } {
    const obj = this._activeObject;
    if (obj) {
      // onDeselect return TRUE to cancel selection;
      if (obj.onDeselect({ e, object })) {
        return false;
      }
      if (this._currentTransform && this._currentTransform.target === obj) {
        this.endCurrentTransform(e);
      }
      if (isActiveSelection(obj) && obj === this._hoveredTarget) {
        this._hoveredTarget = undefined;
      }
      this._activeObject = undefined;
      return true;
    }
    return false;
  }

  /**
   * 丢弃当前活动对象并触发事件。如果该函数由 fabric 调用
   * 作为鼠标事件的结果，该事件作为参数传递并
   * 发送到自定义事件的 fire 函数。当用作方法时
   * e 参数没有任何应用。
   *
   * @param {event} e 事件对象
   * @return {Boolean} 如果活动对象已被丢弃则为 true
   */
  discardActiveObject(e?: TPointerEvent): this is { _activeObject: undefined } {
    const currentActives = this.getActiveObjects(),
      activeObject = this.getActiveObject();
    if (currentActives.length) {
      this.fire('before:selection:cleared', {
        e,
        deselected: [activeObject!],
      });
    }
    const discarded = this._discardActiveObject(e);
    this._fireSelectionEvents(currentActives, e);
    return discarded;
  }

  /**
   * 结束当前变换。
   * 通常不需要调用此方法，除非您要中断用户发起的变换
   * 因为某些其他事件（按下组合键，或阻止用户 UX 的某些内容）
   *
   * @param {Event} [e] 发送生成 finalize down 的鼠标事件，以便在事件中使用
   */
  endCurrentTransform(e?: TPointerEvent) {
    const transform = this._currentTransform;
    this._finalizeCurrentTransform(e);
    if (transform && transform.target) {
      // this could probably go inside _finalizeCurrentTransform
      transform.target.isMoving = false;
    }
    this._currentTransform = null;
  }

  /**
   * 完成当前变换
   * @private
   * @param {Event} e 发送生成 finalize down 的鼠标事件，以便在事件中使用
   * @param {Event} e send the mouse event that generate the finalize down, so it can be used in the event
   */
  _finalizeCurrentTransform(e?: TPointerEvent) {
    const transform = this._currentTransform!,
      target = transform.target,
      options = {
        e,
        target,
        transform,
        action: transform.action,
      };

    if (target._scaling) {
      target._scaling = false;
    }

    target.setCoords();

    if (transform.actionPerformed) {
      this.fire('object:modified', options);
      target.fire(MODIFIED, options);
    }
  }

  /**
   * 设置此 canvas 实例的视口变换
   *
   * @param {Array} vpt Canvas 2D API 变换矩阵
   */
  setViewportTransform(vpt: TMat2D) {
    super.setViewportTransform(vpt);
    const activeObject = this._activeObject;
    if (activeObject) {
      activeObject.setCoords();
    }
  }

  /**
   * @override 清除活动选择引用以及交互式 canvas 元素和上下文
   */
  destroy() {
    // dispose of active selection
    const activeObject = this._activeObject;
    if (isActiveSelection(activeObject)) {
      activeObject.removeAll();
      activeObject.dispose();
    }

    delete this._activeObject;

    super.destroy();

    // free resources

    // pixel find canvas
    // @ts-expect-error disposing
    this.pixelFindContext = null;
    // @ts-expect-error disposing
    this.pixelFindCanvasEl = undefined;
  }

  /**
   * 清除实例的所有上下文（背景、主、顶部）
   *
   */
  clear() {
    // discard active object and fire events
    this.discardActiveObject();
    // make sure we clear the active object in case it refused to be discarded
    this._activeObject = undefined;
    this.clearContext(this.contextTop);
    super.clear();
  }

  /**
   * 绘制对象的控件（边框/控件）
   *
   * @param {CanvasRenderingContext2D} ctx 用于渲染控件的上下文
   */
  drawControls(ctx: CanvasRenderingContext2D) {
    const activeObject = this._activeObject;

    if (activeObject) {
      activeObject._renderControls(ctx);
    }
  }

  /**
   * 转换为对象
   * @private
   */
  protected _toObject(
    instance: FabricObject,
    methodName: 'toObject' | 'toDatalessObject',
    propertiesToInclude: string[],
  ): Record<string, any> {
    // If the object is part of the current selection group, it should
    // be transformed appropriately
    // i.e. it should be serialised as it would appear if the selection group
    // were to be destroyed.
    const originalProperties = this._realizeGroupTransformOnObject(instance),
      object = super._toObject(instance, methodName, propertiesToInclude);
    //Undo the damage we did by changing all of its properties
    instance.set(originalProperties);
    return object;
  }

  /**
   * 在对象上实现对象的组变换
   *
   * @private
   * @param {FabricObject} [instance] 要变换的对象（会被修改）
   * @returns 被更改的实例的原始值
   */
  private _realizeGroupTransformOnObject(
    instance: FabricObject,
  ): Partial<typeof instance> {
    const { group } = instance;
    if (group && isActiveSelection(group) && this._activeObject === group) {
      const layoutProps = [
        'angle',
        'flipX',
        'flipY',
        LEFT,
        SCALE_X,
        SCALE_Y,
        SKEW_X,
        SKEW_Y,
        TOP,
      ] as (keyof typeof instance)[];
      const originalValues = pick<typeof instance>(instance, layoutProps);
      addTransformToObject(instance, group.calcOwnMatrix());
      return originalValues;
    } else {
      return {};
    }
  }

  /**
   * 设置 SVG 对象
   * @param {string[]} markup SVG 标记
   * @param {FabricObject} instance 要设置的对象
   * @param {TSVGReviver} [reviver] SVG 重生器函数
   *
   * @private
   */
  _setSVGObject(
    markup: string[],
    instance: FabricObject,
    reviver?: TSVGReviver,
  ) {
    // If the object is in a selection group, simulate what would happen to that
    // object when the group is deselected
    const originalProperties = this._realizeGroupTransformOnObject(instance);
    super._setSVGObject(markup, instance, reviver);
    instance.set(originalProperties);
  }
}
