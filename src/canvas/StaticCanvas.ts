import { config } from '../config';
import { CENTER, VERSION } from '../constants';
import type { CanvasEvents, StaticCanvasEvents } from '../EventTypeDefs';
import type { Gradient } from '../gradient/Gradient';
import { createCollectionMixin, isCollection } from '../Collection';
import { CommonMethods } from '../CommonMethods';
import type { Pattern } from '../Pattern';
import { Point } from '../Point';
import type { TCachedFabricObject } from '../shapes/Object/Object';
import type {
  Abortable,
  Constructor,
  TCornerPoint,
  TDataUrlOptions,
  TFiller,
  TMat2D,
  TSize,
  TSVGReviver,
  TToCanvasElementOptions,
  TValidToObjectMethod,
  TOptions,
} from '../typedefs';
import {
  cancelAnimFrame,
  requestAnimFrame,
} from '../util/animation/AnimationFrameProvider';
import { runningAnimations } from '../util/animation/AnimationRegistry';
import { uid } from '../util/internals/uid';
import { createCanvasElementFor, toBlob, toDataURL } from '../util/misc/dom';
import { invertTransform, transformPoint } from '../util/misc/matrix';
import type { EnlivenObjectOptions } from '../util/misc/objectEnlive';
import {
  enlivenObjectEnlivables,
  enlivenObjects,
} from '../util/misc/objectEnlive';
import { pick } from '../util/misc/pick';
import { matrixToSVG } from '../util/misc/svgExport';
import { toFixed } from '../util/misc/toFixed';
import { isFiller, isPattern, isTextObject } from '../util/typeAssertions';
import { StaticCanvasDOMManager } from './DOMManagers/StaticCanvasDOMManager';
import type { CSSDimensions } from './DOMManagers/util';
import type { FabricObject } from '../shapes/Object/FabricObject';
import type { StaticCanvasOptions } from './StaticCanvasOptions';
import { staticCanvasDefaults } from './StaticCanvasOptions';
import { log, FabricError } from '../util/internals/console';
import { getDevicePixelRatio } from '../env';

/**
 * 拥有 TCanvasSizeOptions 中的两个选项都设置为 true 会将调用转换为 calcOffset
 * 最好尝试使用类型进行限制以避免混淆。
 */
export type TCanvasSizeOptions =
  | {
      /**
       * 仅将给定的尺寸设置为 canvas backstore 尺寸
       */
      backstoreOnly?: true;
      /**
       * 仅将给定的尺寸设置为 css 尺寸
       */
      cssOnly?: false;
    }
  | {
      /**
       * 仅将给定的尺寸设置为 canvas backstore 尺寸
       */
      backstoreOnly?: false;
      /**
       * 仅将给定的尺寸设置为 css 尺寸
       */
      cssOnly?: true;
    };

/**
 * SVG 导出选项类型定义
 */
export type TSVGExportOptions = {
  /**
   *  指示是否应省略 SVG 输出中的 preamble（XML 声明和 DOCTYPE）
   */
  suppressPreamble?: boolean;
  /**
   * 视口边界框定义
   */
  viewBox?: {
    /**
     * 视口边界框的 x 坐标
     */
    x: number;
    /**
     * 视口边界框的 y 坐标
     */
    y: number;
    /**
     * 视口边界框的宽度
     */
    width: number;
    /**
     * 视口边界框的高度
     */
    height: number;
  };
  /**
   * 编码类型
   */
  encoding?: 'UTF-8'; // test Encoding type and see what happens
  /**
   * 宽度属性
   */
  width?: string;
  /**
   * 高度属性
   */
  height?: string;
  /**
   * SVG 复活回调函数
   */
  reviver?: TSVGReviver;
};

/**
 * 图案质量类型定义
 */
export type PatternQuality = 'fast' | 'good' | 'best' | 'nearest' | 'bilinear';

/**
 * 静态 Canvas 类
 *
 * @see {@link http://fabric5.fabricjs.com/static_canvas|StaticCanvas demo}
 * @fires before:render
 * @fires after:render
 * @fires canvas:cleared
 * @fires object:added
 * @fires object:removed
 */
// TODO: fix `EventSpec` inheritance https://github.com/microsoft/TypeScript/issues/26154#issuecomment-1366616260
export class StaticCanvas<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    EventSpec extends StaticCanvasEvents = StaticCanvasEvents,
  >
  extends createCollectionMixin(CommonMethods<CanvasEvents>)
  implements StaticCanvasOptions
{
  /**
   * Canvas 宽度（像素）
   */
  declare width: number;
  /**
   * Canvas 高度（像素）
   */
  declare height: number;

  // background
  /**
   * 如果为 true，背景图像/颜色受视口变换的影响
   */
  declare backgroundVpt: boolean;
  /**
   * 背景颜色实例或字符串
   */
  declare backgroundColor: TFiller | string;
  /**
   * 背景图像实例
   */
  declare backgroundImage?: FabricObject;
  // overlay
  /**
   * 如果为 true，覆盖图像/颜色受视口变换的影响
   */
  declare overlayVpt: boolean;
  /**
   * 覆盖颜色实例或字符串
   */
  declare overlayColor: TFiller | string;
  /**
   * 覆盖图像实例
   */
  declare overlayImage?: FabricObject;

  /**
   * 裁剪路径对象
   */
  declare clipPath?: FabricObject;

  /**
   * 指示是否在导出时包含默认值
   */
  declare includeDefaultValues: boolean;

  // rendering config
  /**
   * 指示是否在添加/删除对象时重新渲染
   */
  declare renderOnAddRemove: boolean;
  /**
   * 指示是否跳过屏幕外对象的渲染
   */
  declare skipOffscreen: boolean;
  /**
   * 指示是否启用视网膜缩放
   */
  declare enableRetinaScaling: boolean;
  /**
   * 指示是否启用图像平滑
   */
  declare imageSmoothingEnabled: boolean;

  /**
   * 指示控件是否渲染在覆盖层之上
   *
   * @todo move to Canvas
   */
  declare controlsAboveOverlay: boolean;

  /**
   * 指示是否允许触摸滚动
   *
   * @todo move to Canvas
   */
  declare allowTouchScrolling: boolean;

  /**
   * 视口变换矩阵
   */
  declare viewportTransform: TMat2D;

  /**
   * 场景平面坐标中的视口边界框，参见 {@link calcViewportBoundaries}
   *
   * The viewport bounding box in scene plane coordinates, see {@link calcViewportBoundaries}
   */
  declare vptCoords: TCornerPoint;

  /**
   * 对 canvas 实际 HTMLCanvasElement 的引用。
   * 可用于读取原始像素，但切勿写入或操作
   *
   * A reference to the canvas actual HTMLCanvasElement.
   * Can be use to read the raw pixels, but never write or manipulate
   * @type HTMLCanvasElement
   */
  get lowerCanvasEl() {
    return this.elements.lower?.el;
  }

  /**
   * 获取容器的 canvas 上下文
   */
  get contextContainer() {
    return this.elements.lower?.ctx;
  }

  /**
   * 如果为 true，则 Canvas 正在处理或已被销毁/销毁。
   * 此 canvas 上将不再执行任何渲染操作。
   *
   * If true the Canvas is in the process or has been disposed/destroyed.
   * No more rendering operation will be executed on this canvas.
   * @type boolean
   */
  declare destroyed?: boolean;

  /**
   * 已开始销毁过程但尚未完成。
   * 可能会完成已安排的渲染周期，但停止添加更多。
   *
   * Started the process of disposing but not done yet.
   * WIll likely complete the render cycle already scheduled but stopping adding more.
   * @type boolean
   */
  declare disposed?: boolean;

  /**
   * Canvas 偏移量
   */
  declare _offset: { left: number; top: number };
  /**
   * 指示是否丢失上下文
   */
  declare protected hasLostContext: boolean;
  /**
   * 下一次渲染的句柄
   */
  declare protected nextRenderHandle: number;

  /**
   * Canvas DOM 管理器
   */
  declare elements: StaticCanvasDOMManager;

  /**
   * 当为 true 时，跳过控件绘制。
   * 此布尔值用于避免 toDataURL 导出控件。
   * 不支持使用此布尔值来构建其他流程和功能
   *
   * When true control drawing is skipped.
   * This boolean is used to avoid toDataURL to export controls.
   * Usage of this boolean to build up other flows and features is not supported
   * @type Boolean
   * @default false
   */
  declare protected skipControlsDrawing: boolean;

  /**
   * 控制 node-canvas 下图像的渲染。
   * 对浏览器上下文没有影响。
   *
   * Controls the rendering of images under node-canvas.
   * Has no effects on the browser context.
   */
  declare patternQuality: PatternQuality;

  /**
   * 静态 Canvas 默认值
   */
  static ownDefaults = staticCanvasDefaults;

  // reference to
  /**
   * 清理任务的引用
   */
  declare protected __cleanupTask?: {
    (): void;
    kill: (reason?: any) => void;
  };

  /**
   * 返回静态 Canvas 默认值
   * @returns
   */
  static getDefaults(): Record<string, any> {
    return StaticCanvas.ownDefaults;
  }

  /**
   * 构造函数
   * @param el Canvas 元素或其 ID
   * @param options 选项对象
   */
  constructor(
    el?: string | HTMLCanvasElement,
    options: TOptions<StaticCanvasOptions> = {},
  ) {
    super();
    Object.assign(
      this,
      (this.constructor as typeof StaticCanvas).getDefaults(),
    );
    this.set(options);
    this.initElements(el);
    this._setDimensionsImpl({
      width: this.width || this.elements.lower.el.width || 0,
      height: this.height || this.elements.lower.el.height || 0,
    });
    this.skipControlsDrawing = false;
    this.viewportTransform = [...this.viewportTransform];
    this.calcViewportBoundaries();
  }

  /**
   * 初始化 DOM 元素
   * @param el Canvas 元素或其 ID
   */
  protected initElements(el?: string | HTMLCanvasElement) {
    this.elements = new StaticCanvasDOMManager(el);
  }

  /**
   * 添加对象到 canvas
   * @param objects 要添加的对象
   * @returns 集合的新大小
   */
  add(...objects: FabricObject[]) {
    const size = super.add(...objects);
    objects.length > 0 && this.renderOnAddRemove && this.requestRenderAll();
    return size;
  }

  /**
   * 在指定索引处插入对象
   * @param index 插入索引
   * @param objects 要插入的对象
   * @returns 集合的新大小
   */
  insertAt(index: number, ...objects: FabricObject[]) {
    const size = super.insertAt(index, ...objects);
    objects.length > 0 && this.renderOnAddRemove && this.requestRenderAll();
    return size;
  }

  /**
   * 从 canvas 中移除对象
   * @param objects 要移除的对象
   * @returns 移除的对象数组
   */
  remove(...objects: FabricObject[]) {
    const removed = super.remove(...objects);
    removed.length > 0 && this.renderOnAddRemove && this.requestRenderAll();
    return removed;
  }

  /**
   * 对象添加时的处理程序
   * @param obj 添加的对象
   */
  _onObjectAdded(obj: FabricObject) {
    if (obj.canvas && (obj.canvas as StaticCanvas) !== this) {
      log(
        'warn',
        'Canvas is trying to add an object that belongs to a different canvas.\n' +
          'Resulting to default behavior: removing object from previous canvas and adding to new canvas',
      );
      obj.canvas.remove(obj);
    }
    obj._set('canvas', this);
    obj.setCoords();
    this.fire('object:added', { target: obj });
    obj.fire('added', { target: this });
  }

  /**
   * 对象移除时的处理程序
   * @param obj 移除的对象
   */
  _onObjectRemoved(obj: FabricObject) {
    obj._set('canvas', undefined);
    this.fire('object:removed', { target: obj });
    obj.fire('removed', { target: this });
  }

  /**
   * 堆栈顺序更改时的处理程序
   */
  _onStackOrderChanged() {
    this.renderOnAddRemove && this.requestRenderAll();
  }

  /**
   * 获取视网膜缩放比例
   *
   * @private
   * @see https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/SettingUptheCanvas/SettingUptheCanvas.html
   * @return {Number} retinaScaling if applied, otherwise 1;
   */
  getRetinaScaling() {
    return this.enableRetinaScaling ? getDevicePixelRatio() : 1;
  }

  /**
   * 计算 canvas 元素相对于文档的偏移量
   * 此方法也作为 window 的 "resize" 事件处理程序附加
   *
   * Calculates canvas element offset relative to the document
   * This method is also attached as "resize" event handler of window
   */
  calcOffset() {
    return (this._offset = this.elements.calcOffset());
  }

  /**
   * 返回 canvas 宽度（以像素为单位）
   *
   * Returns canvas width (in px)
   * @return {Number}
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * 返回 canvas 高度（以像素为单位）
   *
   * Returns canvas height (in px)
   * @return {Number}
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * 仅供内部使用
   *
   * Internal use only
   * @protected
   */
  protected _setDimensionsImpl(
    dimensions: Partial<TSize | CSSDimensions>,
    { cssOnly = false, backstoreOnly = false }: TCanvasSizeOptions = {},
  ) {
    if (!cssOnly) {
      const size = {
        width: this.width,
        height: this.height,
        ...(dimensions as Partial<TSize>),
      };
      this.elements.setDimensions(size, this.getRetinaScaling());
      this.hasLostContext = true;
      this.width = size.width;
      this.height = size.height;
    }
    if (!backstoreOnly) {
      this.elements.setCSSDimensions(dimensions);
    }

    this.calcOffset();
  }

  /**
   * 设置此 canvas 实例的尺寸（宽度，高度）。当 options.cssOnly 标志处于活动状态时，您还应提供度量单位 (px/%/em)
   *
   * Sets dimensions (width, height) of this canvas instance. when options.cssOnly flag active you should also supply the unit of measure (px/%/em)
   * @param {Object}        dimensions                    Object with width/height properties
   * @param {Number|String} [dimensions.width]            Width of canvas element
   * @param {Number|String} [dimensions.height]           Height of canvas element
   * @param {Object}        [options]                     Options object
   * @param {Boolean}       [options.backstoreOnly=false] Set the given dimensions only as canvas backstore dimensions
   * @param {Boolean}       [options.cssOnly=false]       Set the given dimensions only as css dimensions
   */
  setDimensions(
    dimensions: Partial<CSSDimensions>,
    options?: { cssOnly?: true; backstoreOnly?: false },
  ): void;
  setDimensions(
    dimensions: Partial<TSize>,
    options?: { backstoreOnly?: true; cssOnly?: false },
  ): void;
  setDimensions(dimensions: Partial<TSize>, options?: never): void;
  setDimensions(
    dimensions: Partial<TSize | CSSDimensions>,
    options?: TCanvasSizeOptions,
  ) {
    this._setDimensionsImpl(dimensions, options);
    if (!options || !options.cssOnly) {
      this.requestRenderAll();
    }
  }

  /**
   * 返回 canvas 缩放级别
   *
   * Returns canvas zoom level
   * @return {Number}
   */
  getZoom() {
    return this.viewportTransform[0];
  }

  /**
   * 设置此 canvas 实例的视口变换
   *
   * Sets viewport transformation of this canvas instance
   * @param {Array} vpt a Canvas 2D API transform matrix
   */
  setViewportTransform(vpt: TMat2D) {
    this.viewportTransform = vpt;
    this.calcViewportBoundaries();
    this.renderOnAddRemove && this.requestRenderAll();
  }

  /**
   * 设置此 canvas 实例的缩放级别，缩放以点为中心
   * 意味着随后对同一点的缩放将具有从该点开始缩放的视觉效果。该点不会移动。
   * 这与 canvas 中心或视口的视觉中心无关。
   *
   * Sets zoom level of this canvas instance, the zoom centered around point
   * meaning that following zoom to point with the same point will have the visual
   * effect of the zoom originating from that point. The point won't move.
   * It has nothing to do with canvas center or visual center of the viewport.
   * @param {Point} point to zoom with respect to
   * @param {Number} value to set zoom to, less than 1 zooms out
   */
  zoomToPoint(point: Point, value: number) {
    // TODO: just change the scale, preserve other transformations
    const before = point,
      vpt: TMat2D = [...this.viewportTransform];
    const newPoint = transformPoint(point, invertTransform(vpt));
    vpt[0] = value;
    vpt[3] = value;
    const after = transformPoint(newPoint, vpt);
    vpt[4] += before.x - after.x;
    vpt[5] += before.y - after.y;
    this.setViewportTransform(vpt);
  }

  /**
   * 设置此 canvas 实例的缩放级别
   *
   * Sets zoom level of this canvas instance
   * @param {Number} value to set zoom to, less than 1 zooms out
   */
  setZoom(value: number) {
    this.zoomToPoint(new Point(0, 0), value);
  }

  /**
   * 平移视口，以便将点放置在 canvas 的左上角
   *
   * Pan viewport so as to place point at top left corner of canvas
   * @param {Point} point to move to
   */
  absolutePan(point: Point) {
    const vpt: TMat2D = [...this.viewportTransform];
    vpt[4] = -point.x;
    vpt[5] = -point.y;
    return this.setViewportTransform(vpt);
  }

  /**
   * 相对平移视点
   *
   * Pans viewpoint relatively
   * @param {Point} point (position vector) to move by
   */
  relativePan(point: Point) {
    return this.absolutePan(
      new Point(
        -point.x - this.viewportTransform[4],
        -point.y - this.viewportTransform[5],
      ),
    );
  }

  /**
   * 返回对应于此实例的 &lt;canvas> 元素
   *
   * Returns &lt;canvas> element corresponding to this instance
   * @return {HTMLCanvasElement}
   */
  getElement(): HTMLCanvasElement {
    return this.elements.lower.el;
  }

  /**
   * 清除 canvas 元素的指定上下文
   *
   * Clears specified context of canvas element
   * @param {CanvasRenderingContext2D} ctx Context to clear
   */
  clearContext(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * 返回绘制对象的 canvas 上下文
   *
   * Returns context of canvas where objects are drawn
   * @return {CanvasRenderingContext2D}
   */
  getContext(): CanvasRenderingContext2D {
    return this.elements.lower.ctx;
  }

  /**
   * 清除实例的所有上下文（背景、主、顶部）
   *
   * Clears all contexts (background, main, top) of an instance
   */
  clear() {
    this.remove(...this.getObjects());
    this.backgroundImage = undefined;
    this.overlayImage = undefined;
    this.backgroundColor = '';
    this.overlayColor = '';
    this.clearContext(this.getContext());
    this.fire('canvas:cleared');
    this.renderOnAddRemove && this.requestRenderAll();
  }

  /**
   * 渲染 canvas
   *
   * Renders the canvas
   */
  renderAll() {
    this.cancelRequestedRender();
    if (this.destroyed) {
      return;
    }
    this.renderCanvas(this.getContext(), this._objects);
  }

  /**
   * 创建用于在初始化时绑定实例的函数
   * 用于 requestAnimationFrame 渲染
   * 让 fabricJS 调用它。如果你手动调用它，你可能会有更多的 animationFrame 堆叠在一起
   * 对于命令式渲染，请使用 canvas.renderAll
   *
   * Function created to be instance bound at initialization
   * used in requestAnimationFrame rendering
   * Let the fabricJS call it. If you call it manually you could have more
   * animationFrame stacking on to of each other
   * for an imperative rendering, use canvas.renderAll
   * @private
   */
  renderAndReset() {
    this.nextRenderHandle = 0;
    this.renderAll();
  }

  /**
   * 将 renderAll 请求附加到下一个动画帧。
   * 除非已经有一个正在进行中，在这种情况下什么也不做
   * 布尔标志将避免附加更多。
   *
   * Append a renderAll request to next animation frame.
   * unless one is already in progress, in that case nothing is done
   * a boolean flag will avoid appending more.
   */
  requestRenderAll() {
    if (!this.nextRenderHandle && !this.disposed && !this.destroyed) {
      this.nextRenderHandle = requestAnimFrame(() => this.renderAndReset());
    }
  }

  /**
   * 使用当前 viewportTransform 计算 canvas 的 4 个角的位置。
   * 有助于确定对象何时处于当前渲染视口中
   *
   * Calculate the position of the 4 corner of canvas with current viewportTransform.
   * helps to determinate when an object is in the current rendering viewport
   */
  calcViewportBoundaries(): TCornerPoint {
    const width = this.width,
      height = this.height,
      iVpt = invertTransform(this.viewportTransform),
      a = transformPoint({ x: 0, y: 0 }, iVpt),
      b = transformPoint({ x: width, y: height }, iVpt),
      // we don't support vpt flipping
      // but the code is robust enough to mostly work with flipping
      min = a.min(b),
      max = a.max(b);
    return (this.vptCoords = {
      tl: min,
      tr: new Point(max.x, min.y),
      bl: new Point(min.x, max.y),
      br: max,
    });
  }

  /**
   * 取消请求的渲染
   */
  cancelRequestedRender() {
    if (this.nextRenderHandle) {
      cancelAnimFrame(this.nextRenderHandle);
      this.nextRenderHandle = 0;
    }
  }

  /**
   * 绘制控件（静态 Canvas 没有控件）
   * @param _ctx Canvas 上下文
   */
  drawControls(_ctx: CanvasRenderingContext2D) {
    // Static canvas has no controls
  }

  /**
   * 渲染背景、对象、覆盖和控件。
   *
   * Renders background, objects, overlay and controls.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} objects to render
   */
  renderCanvas(ctx: CanvasRenderingContext2D, objects: FabricObject[]) {
    if (this.destroyed) {
      return;
    }

    const v = this.viewportTransform,
      path = this.clipPath;
    this.calcViewportBoundaries();
    this.clearContext(ctx);
    ctx.imageSmoothingEnabled = this.imageSmoothingEnabled;
    // @ts-expect-error node-canvas stuff
    ctx.patternQuality = this.patternQuality;
    this.fire('before:render', { ctx });
    this._renderBackground(ctx);

    ctx.save();
    //apply viewport transform once for all rendering process
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    this._renderObjects(ctx, objects);
    ctx.restore();
    if (!this.controlsAboveOverlay && !this.skipControlsDrawing) {
      this.drawControls(ctx);
    }
    if (path) {
      path._set('canvas', this);
      // needed to setup a couple of variables
      // todo migrate to the newer one
      path.shouldCache();
      path._transformDone = true;
      (path as TCachedFabricObject).renderCache({ forClipping: true });
      this.drawClipPathOnCanvas(ctx, path as TCachedFabricObject);
    }
    this._renderOverlay(ctx);
    if (this.controlsAboveOverlay && !this.skipControlsDrawing) {
      this.drawControls(ctx);
    }
    this.fire('after:render', { ctx });

    if (this.__cleanupTask) {
      this.__cleanupTask();
      this.__cleanupTask = undefined;
    }
  }

  /**
   * 在 lowerCanvasEl 上绘制缓存的 clipPath
   *
   * Paint the cached clipPath on the lowerCanvasEl
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  drawClipPathOnCanvas(
    ctx: CanvasRenderingContext2D,
    clipPath: TCachedFabricObject,
  ) {
    const v = this.viewportTransform;
    ctx.save();
    ctx.transform(...v);
    // DEBUG: uncomment this line, comment the following
    // ctx.globalAlpha = 0.4;
    ctx.globalCompositeOperation = 'destination-in';
    clipPath.transform(ctx);
    ctx.scale(1 / clipPath.zoomX, 1 / clipPath.zoomY);
    ctx.drawImage(
      clipPath._cacheCanvas,
      -clipPath.cacheTranslationX,
      -clipPath.cacheTranslationY,
    );
    ctx.restore();
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} objects to render
   */
  _renderObjects(ctx: CanvasRenderingContext2D, objects: FabricObject[]) {
    for (let i = 0, len = objects.length; i < len; ++i) {
      objects[i] && objects[i].render(ctx);
    }
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {string} property 'background' or 'overlay'
   */
  _renderBackgroundOrOverlay(
    ctx: CanvasRenderingContext2D,
    property: 'background' | 'overlay',
  ) {
    const fill = this[`${property}Color`],
      object = this[`${property}Image`],
      v = this.viewportTransform,
      needsVpt = this[`${property}Vpt`];
    if (!fill && !object) {
      return;
    }
    const isAFiller = isFiller(fill);
    if (fill) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.width, 0);
      ctx.lineTo(this.width, this.height);
      ctx.lineTo(0, this.height);
      ctx.closePath();
      ctx.fillStyle = isAFiller ? fill.toLive(ctx /* this */)! : fill;
      if (needsVpt) {
        ctx.transform(...v);
      }
      if (isAFiller) {
        ctx.transform(1, 0, 0, 1, fill.offsetX || 0, fill.offsetY || 0);
        const m = ((fill as Gradient<'linear'>).gradientTransform ||
          (fill as Pattern).patternTransform) as TMat2D;
        m && ctx.transform(...m);
      }
      ctx.fill();
      ctx.restore();
    }
    if (object) {
      ctx.save();
      const { skipOffscreen } = this;
      // if the object doesn't move with the viewport,
      // the offscreen concept does not apply;
      this.skipOffscreen = needsVpt;
      if (needsVpt) {
        ctx.transform(...v);
      }
      object.render(ctx);
      this.skipOffscreen = skipOffscreen;
      ctx.restore();
    }
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderBackground(ctx: CanvasRenderingContext2D) {
    this._renderBackgroundOrOverlay(ctx, 'background');
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderOverlay(ctx: CanvasRenderingContext2D) {
    this._renderBackgroundOrOverlay(ctx, 'overlay');
  }

  /**
   * 返回 canvas 中心的坐标。
   *
   * Returns coordinates of a center of canvas.
   * @return {Point}
   */
  getCenterPoint() {
    return new Point(this.width / 2, this.height / 2);
  }

  /**
   * 在 canvas 中水平居中对象
   *
   * Centers object horizontally in the canvas
   */
  centerObjectH(object: FabricObject) {
    return this._centerObject(
      object,
      new Point(this.getCenterPoint().x, object.getCenterPoint().y),
    );
  }

  /**
   * 在 canvas 中垂直居中对象
   *
   * Centers object vertically in the canvas
   * @param {FabricObject} object Object to center vertically
   */
  centerObjectV(object: FabricObject) {
    return this._centerObject(
      object,
      new Point(object.getCenterPoint().x, this.getCenterPoint().y),
    );
  }

  /**
   * 在 canvas 中垂直和水平居中对象
   *
   * Centers object vertically and horizontally in the canvas
   * @param {FabricObject} object Object to center vertically and horizontally
   */
  centerObject(object: FabricObject) {
    return this._centerObject(object, this.getCenterPoint());
  }

  /**
   * 在视口中垂直和水平居中对象
   *
   * Centers object vertically and horizontally in the viewport
   * @param {FabricObject} object Object to center vertically and horizontally
   */
  viewportCenterObject(object: FabricObject) {
    return this._centerObject(object, this.getVpCenter());
  }

  /**
   * 在视口中水平居中对象，object.top 不变
   *
   * Centers object horizontally in the viewport, object.top is unchanged
   * @param {FabricObject} object Object to center vertically and horizontally
   */
  viewportCenterObjectH(object: FabricObject) {
    return this._centerObject(
      object,
      new Point(this.getVpCenter().x, object.getCenterPoint().y),
    );
  }

  /**
   * 在视口中垂直居中对象，object.top 不变
   *
   * Centers object Vertically in the viewport, object.top is unchanged
   * @param {FabricObject} object Object to center vertically and horizontally
   */
  viewportCenterObjectV(object: FabricObject) {
    return this._centerObject(
      object,
      new Point(object.getCenterPoint().x, this.getVpCenter().y),
    );
  }

  /**
   * 计算 canvas 中对应于实际视口中心的点。
   *
   * Calculate the point in canvas that correspond to the center of actual viewport.
   * @return {Point} vpCenter, viewport center
   */
  getVpCenter(): Point {
    return transformPoint(
      this.getCenterPoint(),
      invertTransform(this.viewportTransform),
    );
  }

  /**
   * @private
   * @param {FabricObject} object Object to center
   * @param {Point} center Center point
   */
  _centerObject(object: FabricObject, center: Point) {
    object.setXY(center, CENTER, CENTER);
    object.setCoords();
    this.renderOnAddRemove && this.requestRenderAll();
  }

  /**
   * 返回 canvas 的无数据 JSON 表示
   *
   * Returns dataless JSON representation of canvas
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {String} json string
   */
  toDatalessJSON(propertiesToInclude?: string[]) {
    return this.toDatalessObject(propertiesToInclude);
  }

  /**
   * 返回 canvas 的对象表示
   *
   * Returns object representation of canvas
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toObject(propertiesToInclude?: string[]) {
    return this._toObjectMethod('toObject', propertiesToInclude);
  }

  /**
   * 返回 canvas 的对象表示
   * 提供此别名是因为如果在实例上调用 JSON.stringify，
   * 如果存在 toJSON 对象，则会调用它。
   * 拥有 toJSON 方法意味着你可以执行 JSON.stringify(myCanvas)
   * JSON 不支持其他属性，因为 toJSON 有自己的签名
   *
   * Returns Object representation of canvas
   * this alias is provided because if you call JSON.stringify on an instance,
   * the toJSON object will be invoked if it exists.
   * Having a toJSON method means you can do JSON.stringify(myCanvas)
   * JSON does not support additional properties because toJSON has its own signature
   * @return {Object} JSON compatible object
   * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-3#serialization}
   * @see {@link http://jsfiddle.net/fabricjs/pec86/|jsFiddle demo}
   * @example <caption>JSON representation of canvas </caption>
   * const json = canvas.toJSON();
   * @example <caption>JSON representation of canvas </caption>
   * const json = JSON.stringify(canvas);
   */
  toJSON() {
    return this.toObject();
  }

  /**
   * 返回 canvas 的无数据对象表示
   *
   * Returns dataless object representation of canvas
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toDatalessObject(propertiesToInclude?: string[]) {
    return this._toObjectMethod('toDatalessObject', propertiesToInclude);
  }

  /**
   * 内部使用的 toObject 方法
   * @param methodName 方法名称
   * @param propertiesToInclude 要包含的属性
   * @private
   */
  _toObjectMethod(
    methodName: TValidToObjectMethod,
    propertiesToInclude?: string[],
  ) {
    const clipPath = this.clipPath;
    const clipPathData =
      clipPath && !clipPath.excludeFromExport
        ? this._toObject(clipPath, methodName, propertiesToInclude)
        : null;
    return {
      version: VERSION,
      ...pick(this, propertiesToInclude as (keyof this)[]),
      objects: this._objects
        .filter((object) => !object.excludeFromExport)
        .map((instance) =>
          this._toObject(instance, methodName, propertiesToInclude),
        ),
      ...this.__serializeBgOverlay(methodName, propertiesToInclude),
      ...(clipPathData ? { clipPath: clipPathData } : null),
    };
  }

  /**
   * 内部使用的对象序列化方法
   * @param instance 对象实例
   * @param methodName 方法名称
   * @param propertiesToInclude 要包含的属性
   * @private
   */
  protected _toObject(
    instance: FabricObject,
    methodName: TValidToObjectMethod,
    propertiesToInclude?: string[],
  ) {
    let originalValue;

    if (!this.includeDefaultValues) {
      originalValue = instance.includeDefaultValues;
      instance.includeDefaultValues = false;
    }

    const object = instance[methodName](propertiesToInclude);
    if (!this.includeDefaultValues) {
      instance.includeDefaultValues = !!originalValue;
    }
    return object;
  }

  /**
   * 序列化背景和覆盖层
   * @param methodName 方法名称
   * @param propertiesToInclude 要包含的属性
   * @private
   */
  __serializeBgOverlay(
    methodName: TValidToObjectMethod,
    propertiesToInclude?: string[],
  ) {
    const data: any = {},
      bgImage = this.backgroundImage,
      overlayImage = this.overlayImage,
      bgColor = this.backgroundColor,
      overlayColor = this.overlayColor;

    if (isFiller(bgColor)) {
      if (!bgColor.excludeFromExport) {
        data.background = bgColor.toObject(propertiesToInclude);
      }
    } else if (bgColor) {
      data.background = bgColor;
    }

    if (isFiller(overlayColor)) {
      if (!overlayColor.excludeFromExport) {
        data.overlay = overlayColor.toObject(propertiesToInclude);
      }
    } else if (overlayColor) {
      data.overlay = overlayColor;
    }

    if (bgImage && !bgImage.excludeFromExport) {
      data.backgroundImage = this._toObject(
        bgImage,
        methodName,
        propertiesToInclude,
      );
    }
    if (overlayImage && !overlayImage.excludeFromExport) {
      data.overlayImage = this._toObject(
        overlayImage,
        methodName,
        propertiesToInclude,
      );
    }

    return data;
  }

  /* _TO_SVG_START_ */

  /**
   * 指示是否应用 SVG 视口变换
   */
  declare svgViewportTransformation: boolean;

  /**
   * 返回 canvas 的 SVG 表示
   *
   * Returns SVG representation of canvas
   * @param {Object} [options] Options object for SVG output
   * @param {Boolean} [options.suppressPreamble=false] If true xml tag is not included
   * @param {Object} [options.viewBox] SVG viewbox object
   * @param {Number} [options.viewBox.x] x-coordinate of viewbox
   * @param {Number} [options.viewBox.y] y-coordinate of viewbox
   * @param {Number} [options.viewBox.width] Width of viewbox
   * @param {Number} [options.viewBox.height] Height of viewbox
   * @param {String} [options.encoding=UTF-8] Encoding of SVG output
   * @param {String} [options.width] desired width of svg with or without units
   * @param {String} [options.height] desired height of svg with or without units
   * @param {Function} [reviver] Method for further parsing of svg elements, called after each fabric object converted into svg representation.
   * @return {String} SVG string
   * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-3#serialization}
   * @see {@link http://jsfiddle.net/fabricjs/jQ3ZZ/|jsFiddle demo}
   * @example <caption>Normal SVG output</caption>
   * var svg = canvas.toSVG();
   * @example <caption>SVG output without preamble (without &lt;?xml ../>)</caption>
   * var svg = canvas.toSVG({suppressPreamble: true});
   * @example <caption>SVG output with viewBox attribute</caption>
   * var svg = canvas.toSVG({
   *   viewBox: {
   *     x: 100,
   *     y: 100,
   *     width: 200,
   *     height: 300
   *   }
   * });
   * @example <caption>SVG output with different encoding (default: UTF-8)</caption>
   * var svg = canvas.toSVG({encoding: 'ISO-8859-1'});
   * @example <caption>Modify SVG output with reviver function</caption>
   * var svg = canvas.toSVG(null, function(svg) {
   *   return svg.replace('stroke-dasharray: ; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; ', '');
   * });
   */
  toSVG(options: TSVGExportOptions = {}, reviver?: TSVGReviver) {
    options.reviver = reviver;
    const markup: string[] = [];

    this._setSVGPreamble(markup, options);
    this._setSVGHeader(markup, options);
    if (this.clipPath) {
      markup.push(`<g clip-path="url(#${this.clipPath.clipPathId})" >\n`);
    }
    this._setSVGBgOverlayColor(markup, 'background');
    this._setSVGBgOverlayImage(markup, 'backgroundImage', reviver);
    this._setSVGObjects(markup, reviver);
    if (this.clipPath) {
      markup.push('</g>\n');
    }
    this._setSVGBgOverlayColor(markup, 'overlay');
    this._setSVGBgOverlayImage(markup, 'overlayImage', reviver);

    markup.push('</svg>');

    return markup.join('');
  }

  /**
   * 设置 SVG 前言
   * @param markup 标记数组
   * @param options SVG 导出选项
   * @private
   */
  _setSVGPreamble(markup: string[], options: TSVGExportOptions): void {
    if (options.suppressPreamble) {
      return;
    }
    markup.push(
      '<?xml version="1.0" encoding="',
      options.encoding || 'UTF-8',
      '" standalone="no" ?>\n',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ',
      '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n',
    );
  }

  /**
   * 设置 SVG 头部
   * @param markup 标记数组
   * @param options SVG 导出选项
   * @private
   */
  _setSVGHeader(markup: string[], options: TSVGExportOptions): void {
    const width = options.width || `${this.width}`,
      height = options.height || `${this.height}`,
      NUM_FRACTION_DIGITS = config.NUM_FRACTION_DIGITS,
      optViewBox = options.viewBox;
    let viewBox: string;
    if (optViewBox) {
      viewBox = `viewBox="${optViewBox.x} ${optViewBox.y} ${optViewBox.width} ${optViewBox.height}" `;
    } else if (this.svgViewportTransformation) {
      const vpt = this.viewportTransform;
      viewBox = `viewBox="${toFixed(
        -vpt[4] / vpt[0],
        NUM_FRACTION_DIGITS,
      )} ${toFixed(-vpt[5] / vpt[3], NUM_FRACTION_DIGITS)} ${toFixed(
        this.width / vpt[0],
        NUM_FRACTION_DIGITS,
      )} ${toFixed(this.height / vpt[3], NUM_FRACTION_DIGITS)}" `;
    } else {
      viewBox = `viewBox="0 0 ${this.width} ${this.height}" `;
    }

    markup.push(
      '<svg ',
      'xmlns="http://www.w3.org/2000/svg" ',
      'xmlns:xlink="http://www.w3.org/1999/xlink" ',
      'version="1.1" ',
      'width="',
      width,
      '" ',
      'height="',
      height,
      '" ',
      viewBox,
      'xml:space="preserve">\n',
      '<desc>Created with Fabric.js ',
      VERSION,
      '</desc>\n',
      '<defs>\n',
      this.createSVGFontFacesMarkup(),
      this.createSVGRefElementsMarkup(),
      this.createSVGClipPathMarkup(options),
      '</defs>\n',
    );
  }

  /**
   * 创建 SVG 裁剪路径标记
   * @param options SVG 导出选项
   * @returns SVG 裁剪路径字符串
   */
  createSVGClipPathMarkup(options: TSVGExportOptions): string {
    const clipPath = this.clipPath;
    if (clipPath) {
      clipPath.clipPathId = `CLIPPATH_${uid()}`;
      return `<clipPath id="${clipPath.clipPathId}" >\n${clipPath.toClipPathSVG(
        options.reviver,
      )}</clipPath>\n`;
    }
    return '';
  }

  /**
   * 创建包含 SVG 引用元素（如模式、渐变等）的标记。
   *
   * Creates markup containing SVG referenced elements like patterns, gradients etc.
   * @return {String}
   */
  createSVGRefElementsMarkup(): string {
    return (['background', 'overlay'] as const)
      .map((prop) => {
        const fill = this[`${prop}Color`];
        if (isFiller(fill)) {
          const shouldTransform = this[`${prop}Vpt`],
            vpt = this.viewportTransform,
            object = {
              // otherwise circular dependency
              isType: () => false,
              width: this.width / (shouldTransform ? vpt[0] : 1),
              height: this.height / (shouldTransform ? vpt[3] : 1),
            };
          return fill.toSVG(object as FabricObject, {
            additionalTransform: shouldTransform ? matrixToSVG(vpt) : '',
          });
        }
      })
      .join('');
  }

  /**
   * 创建包含 SVG 字体外观的标记，
   * 字体外观的字体 URL 必须由开发人员收集
   * 并且不会由 fabricjs 从 DOM 中提取
   *
   * Creates markup containing SVG font faces,
   * font URLs for font faces must be collected by developers
   * and are not extracted from the DOM by fabricjs
   * @param {Array} objects Array of fabric objects
   * @return {String}
   */
  createSVGFontFacesMarkup(): string {
    const objects: FabricObject[] = [],
      fontList: Record<string, boolean> = {},
      fontPaths = config.fontPaths;

    this._objects.forEach(function add(object) {
      objects.push(object);
      if (isCollection(object)) {
        object._objects.forEach(add);
      }
    });

    objects.forEach((obj) => {
      if (!isTextObject(obj)) {
        return;
      }
      const { styles, fontFamily } = obj;
      if (fontList[fontFamily] || !fontPaths[fontFamily]) {
        return;
      }
      fontList[fontFamily] = true;
      if (!styles) {
        return;
      }
      Object.values(styles).forEach((styleRow) => {
        Object.values(styleRow).forEach(({ fontFamily = '' }) => {
          if (!fontList[fontFamily] && fontPaths[fontFamily]) {
            fontList[fontFamily] = true;
          }
        });
      });
    });

    const fontListMarkup = Object.keys(fontList)
      .map(
        (fontFamily) =>
          `\t\t@font-face {\n\t\t\tfont-family: '${fontFamily}';\n\t\t\tsrc: url('${fontPaths[fontFamily]}');\n\t\t}\n`,
      )
      .join('');

    if (fontListMarkup) {
      return `\t<style type="text/css"><![CDATA[\n${fontListMarkup}]]></style>\n`;
    }
    return '';
  }

  /**
   * 设置 SVG 对象
   * @param markup 标记数组
   * @param reviver SVG 复活回调函数
   * @private
   */
  _setSVGObjects(markup: string[], reviver?: TSVGReviver) {
    this.forEachObject((fabricObject) => {
      if (fabricObject.excludeFromExport) {
        return;
      }
      this._setSVGObject(markup, fabricObject, reviver);
    });
  }

  /**
   * 这是一个单独的函数，因为 Canvas (非静态) 在这里需要额外的代码
   *
   * This is its own function because the Canvas ( non static ) requires extra code here
   * @param markup 标记数组
   * @param instance 对象实例
   * @param reviver SVG 复活回调函数
   * @private
   */
  _setSVGObject(
    markup: string[],
    instance: FabricObject,
    reviver?: TSVGReviver,
  ) {
    markup.push(instance.toSVG(reviver));
  }

  /**
   * 设置 SVG 背景或覆盖图像
   * @param markup 标记数组
   * @param property 属性名称 ('overlayImage' 或 'backgroundImage')
   * @param reviver SVG 复活回调函数
   * @private
   */
  _setSVGBgOverlayImage(
    markup: string[],
    property: 'overlayImage' | 'backgroundImage',
    reviver?: TSVGReviver,
  ) {
    const bgOrOverlay = this[property];
    if (bgOrOverlay && !bgOrOverlay.excludeFromExport && bgOrOverlay.toSVG) {
      markup.push(bgOrOverlay.toSVG(reviver));
    }
  }

  /**
   * 设置 SVG 背景或覆盖颜色
   * @param markup 标记数组
   * @param property 属性名称 ('background' 或 'overlay')
   * @TODO this seems to handle patterns but fail at gradients.
   * @private
   */
  _setSVGBgOverlayColor(markup: string[], property: 'background' | 'overlay') {
    const filler = this[`${property}Color`];
    if (!filler) {
      return;
    }
    if (isFiller(filler)) {
      const repeat = (filler as Pattern).repeat || '',
        finalWidth = this.width,
        finalHeight = this.height,
        shouldInvert = this[`${property}Vpt`],
        additionalTransform = shouldInvert
          ? matrixToSVG(invertTransform(this.viewportTransform))
          : '';
      markup.push(
        `<rect transform="${additionalTransform} translate(${finalWidth / 2},${
          finalHeight / 2
        })" x="${filler.offsetX - finalWidth / 2}" y="${
          filler.offsetY - finalHeight / 2
        }" width="${
          (repeat === 'repeat-y' || repeat === 'no-repeat') && isPattern(filler)
            ? (filler.source as HTMLImageElement).width
            : finalWidth
        }" height="${
          (repeat === 'repeat-x' || repeat === 'no-repeat') && isPattern(filler)
            ? (filler.source as HTMLImageElement).height
            : finalHeight
        }" fill="url(#SVGID_${filler.id})"></rect>\n`,
      );
    } else {
      markup.push(
        '<rect x="0" y="0" width="100%" height="100%" ',
        'fill="',
        filler,
        '"',
        '></rect>\n',
      );
    }
  }
  /* _TO_SVG_END_ */

  /**
   * 使用指定 JSON 中的数据填充 canvas。
   * JSON 格式必须符合 {@link fabric.Canvas#toJSON} 的格式
   *
   * **重要**：建议在调用此方法之前中止加载任务，以防止竞争条件和不必要的网络连接
   *
   * Populates canvas with data from the specified JSON.
   * JSON format must conform to the one of {@link fabric.Canvas#toJSON}
   *
   * **IMPORTANT**: It is recommended to abort loading tasks before calling this method to prevent race conditions and unnecessary networking
   *
   * @param {String|Object} json JSON string or object
   * @param {Function} [reviver] Method for further parsing of JSON elements, called after each fabric object created.
   * @param {Object} [options] options
   * @param {AbortSignal} [options.signal] see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
   * @return {Promise<Canvas | StaticCanvas>} instance
   * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-3#deserialization}
   * @see {@link http://jsfiddle.net/fabricjs/fmgXt/|jsFiddle demo}
   * @example <caption>loadFromJSON</caption>
   * canvas.loadFromJSON(json).then((canvas) => canvas.requestRenderAll());
   * @example <caption>loadFromJSON with reviver</caption>
   * canvas.loadFromJSON(json, function(o, object) {
   *   // `o` = json object
   *   // `object` = fabric.Object instance
   *   // ... do some stuff ...
   * }).then((canvas) => {
   *   ... canvas is restored, add your code.
   * });
   *
   */
  loadFromJSON(
    json: string | Record<string, any>,
    reviver?: EnlivenObjectOptions['reviver'],
    { signal }: Abortable = {},
  ): Promise<this> {
    if (!json) {
      return Promise.reject(new FabricError('`json` is undefined'));
    }

    // parse json if it wasn't already
    const { objects = [], ...serialized } =
      typeof json === 'string' ? JSON.parse(json) : json;
    const { backgroundImage, background, overlayImage, overlay, clipPath } =
      serialized;
    const renderOnAddRemove = this.renderOnAddRemove;
    this.renderOnAddRemove = false;

    return Promise.all([
      enlivenObjects<FabricObject>(objects, {
        reviver,
        signal,
      }),
      enlivenObjectEnlivables(
        {
          backgroundImage,
          backgroundColor: background,
          overlayImage,
          overlayColor: overlay,
          clipPath,
        },
        { signal },
      ),
    ]).then(([enlived, enlivedMap]) => {
      this.clear();
      this.add(...enlived);
      this.set(serialized);
      this.set(enlivedMap);
      this.renderOnAddRemove = renderOnAddRemove;
      return this;
    });
  }

  /**
   * 克隆 canvas 实例
   *
   * Clones canvas instance
   * @param {string[]} [properties] Array of properties to include in the cloned canvas and children
   */
  clone(properties: string[]) {
    const data = this.toObject(properties);
    const canvas = this.cloneWithoutData();
    return canvas.loadFromJSON(data);
  }

  /**
   * 克隆 canvas 实例而不克隆现有数据。
   * 这本质上是复制 canvas 尺寸，因为 loadFromJSON 不会影响 canvas 大小。
   *
   * Clones canvas instance without cloning existing data.
   * This essentially copies canvas dimensions since loadFromJSON does not affect canvas size.
   */
  cloneWithoutData() {
    const el = createCanvasElementFor(this);
    return new (this.constructor as Constructor<this>)(el);
  }

  /**
   * 将 canvas 元素导出为 dataurl 图像。请注意，当使用乘数时，裁剪会适当缩放
   *
   * Exports canvas element to a dataurl image. Note that when multiplier is used, cropping is scaled appropriately
   * @param {Object} [options] 选项对象
   * @param {String} [options.format=png] 输出图像的格式。 "jpeg" 或 "png"
   * @param {Number} [options.quality=1] 质量级别 (0..1)。仅用于 jpeg。
   * @param {Number} [options.multiplier=1] 缩放乘数，用于保持一致性
   * @param {Number} [options.left] 裁剪左偏移量。在 v1.2.14 中引入
   * @param {Number} [options.top] 裁剪顶部偏移量。在 v1.2.14 中引入
   * @param {Number} [options.width] 裁剪宽度。在 v1.2.14 中引入
   * @param {Number} [options.height] 裁剪高度。在 v1.2.14 中引入
   * @param {Boolean} [options.enableRetinaScaling] 为克隆图像启用视网膜缩放。在 2.0.0 中引入
   * @param {(object: fabric.Object) => boolean} [options.filter] 过滤对象的函数。
   * @return {String} Returns a data: URL containing a representation of the object in the format specified by options.format
   * @see {@link https://jsfiddle.net/xsjua1rd/ demo}
   * @example <caption>Generate jpeg dataURL with lower quality</caption>
   * var dataURL = canvas.toDataURL({
   *   format: 'jpeg',
   *   quality: 0.8
   * });
   * @example <caption>Generate cropped png dataURL (clipping of canvas)</caption>
   * var dataURL = canvas.toDataURL({
   *   format: 'png',
   *   left: 100,
   *   top: 100,
   *   width: 200,
   *   height: 200
   * });
   * @example <caption>Generate double scaled png dataURL</caption>
   * var dataURL = canvas.toDataURL({
   *   format: 'png',
   *   multiplier: 2
   * });
   * @example <caption>Generate dataURL with objects that overlap a specified object</caption>
   * var myObject;
   * var dataURL = canvas.toDataURL({
   *   filter: (object) => object.isContainedWithinObject(myObject) || object.intersectsWithObject(myObject)
   * });
   */
  toDataURL(options = {} as TDataUrlOptions): string {
    const {
      format = 'png',
      quality = 1,
      multiplier = 1,
      enableRetinaScaling = false,
    } = options;
    const finalMultiplier =
      multiplier * (enableRetinaScaling ? this.getRetinaScaling() : 1);

    return toDataURL(
      this.toCanvasElement(finalMultiplier, options),
      format,
      quality,
    );
  }
  /**
   * 将 canvas 元素导出为 Blob
   * @param options 选项对象
   * @returns Blob 对象 Promise
   */
  toBlob(options = {} as TDataUrlOptions): Promise<Blob | null> {
    const {
      format = 'png',
      quality = 1,
      multiplier = 1,
      enableRetinaScaling = false,
    } = options;
    const finalMultiplier =
      multiplier * (enableRetinaScaling ? this.getRetinaScaling() : 1);

    return toBlob(
      this.toCanvasElement(finalMultiplier, options),
      format,
      quality,
    );
  }

  /**
   * 创建一个绘制有当前 canvas 内容的新 HTMLCanvas 元素。
   * 无需调整实际大小或重新绘制它。
   * 将对象所有权转移到新 canvas，绘制它，然后将所有内容设置回来。
   * 这是一个用于获取 dataUrl 的中间步骤，但也用于
   * 创建 canvas 的快速图像副本，而无需传递 dataUrl 字符串
   *
   * Create a new HTMLCanvas element painted with the current canvas content.
   * No need to resize the actual one or repaint it.
   * Will transfer object ownership to a new canvas, paint it, and set everything back.
   * This is an intermediary step used to get to a dataUrl but also it is useful to
   * create quick image copies of a canvas without passing for the dataUrl string
   * @param {Number} [multiplier] a zoom factor.
   * @param {Object} [options] Cropping informations
   * @param {Number} [options.left] Cropping left offset.
   * @param {Number} [options.top] Cropping top offset.
   * @param {Number} [options.width] Cropping width.
   * @param {Number} [options.height] Cropping height.
   * @param {(object: fabric.Object) => boolean} [options.filter] Function to filter objects.
   */
  toCanvasElement(
    multiplier = 1,
    { width, height, left, top, filter } = {} as TToCanvasElementOptions,
  ): HTMLCanvasElement {
    const scaledWidth = (width || this.width) * multiplier,
      scaledHeight = (height || this.height) * multiplier,
      zoom = this.getZoom(),
      originalWidth = this.width,
      originalHeight = this.height,
      originalSkipControlsDrawing = this.skipControlsDrawing,
      newZoom = zoom * multiplier,
      vp = this.viewportTransform,
      translateX = (vp[4] - (left || 0)) * multiplier,
      translateY = (vp[5] - (top || 0)) * multiplier,
      newVp = [newZoom, 0, 0, newZoom, translateX, translateY] as TMat2D,
      originalRetina = this.enableRetinaScaling,
      canvasEl = createCanvasElementFor({
        width: scaledWidth,
        height: scaledHeight,
      }),
      objectsToRender = filter
        ? this._objects.filter((obj) => filter(obj))
        : this._objects;
    this.enableRetinaScaling = false;
    this.viewportTransform = newVp;
    this.width = scaledWidth;
    this.height = scaledHeight;
    this.skipControlsDrawing = true;
    this.calcViewportBoundaries();
    this.renderCanvas(canvasEl.getContext('2d')!, objectsToRender);
    this.viewportTransform = vp;
    this.width = originalWidth;
    this.height = originalHeight;
    this.calcViewportBoundaries();
    this.enableRetinaScaling = originalRetina;
    this.skipControlsDrawing = originalSkipControlsDrawing;
    return canvasEl;
  }

  /**
   * 等待渲染完成以销毁 canvas
   *
   * Waits until rendering has settled to destroy the canvas
   * @returns {Promise<boolean>} a promise resolving to `true` once the canvas has been destroyed or to `false` if the canvas has was already destroyed
   * @throws if aborted by a consequent call
   */
  dispose() {
    !this.disposed &&
      this.elements.cleanupDOM({ width: this.width, height: this.height });
    runningAnimations.cancelByCanvas(this);
    this.disposed = true;
    return new Promise<boolean>((resolve, reject) => {
      const task = () => {
        this.destroy();
        resolve(true);
      };
      task.kill = reject;
      if (this.__cleanupTask) {
        this.__cleanupTask.kill('aborted');
      }

      if (this.destroyed) {
        resolve(false);
      } else if (this.nextRenderHandle) {
        this.__cleanupTask = task;
      } else {
        task();
      }
    });
  }

  /**
   * 清除 canvas 元素，销毁对象并释放资源。
   *
   * 作为 {@link dispose} 的 **异步** 操作的一部分调用。
   *
   * **注意**：
   *
   * 此方法是 **不安全** 的。
   * 如果有请求的渲染，使用它可能会遇到竞争条件。
   * 仅当您确定渲染已完成时才调用此方法。
   * 考虑使用 {@link dispose}，因为它是 **安全** 的
   *
   * Clears the canvas element, disposes objects and frees resources.
   *
   * Invoked as part of the **async** operation of {@link dispose}.
   *
   * **CAUTION**:
   *
   * This method is **UNSAFE**.
   * You may encounter a race condition using it if there's a requested render.
   * Call this method only if you are sure rendering has settled.
   * Consider using {@link dispose} as it is **SAFE**
   *
   * @private
   */
  destroy() {
    this.destroyed = true;
    this.cancelRequestedRender();
    this.forEachObject((object) => object.dispose());
    this._objects = [];
    if (this.backgroundImage) {
      this.backgroundImage.dispose();
    }
    this.backgroundImage = undefined;
    if (this.overlayImage) {
      this.overlayImage.dispose();
    }
    this.overlayImage = undefined;
    this.elements.dispose();
  }

  /**
   * 返回实例的字符串表示形式
   *
   * Returns a string representation of an instance
   * @return {String} string representation of an instance
   */
  toString() {
    return `#<Canvas (${this.complexity()}): { objects: ${
      this._objects.length
    } }>`;
  }
}
