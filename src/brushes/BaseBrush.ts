import { Color } from '../color/Color';
import type { Point } from '../Point';
import type { Shadow } from '../Shadow';
import type { Canvas } from '../canvas/Canvas';
import type { TBrushEventData } from './typedefs';

/**
 * 基础画笔类
 * @see {@link http://fabric5.fabricjs.com/freedrawing|Freedrawing demo}
 */
export abstract class BaseBrush {
  /**
   * 画笔颜色
   *
   * Color of a brush
   * @type String
   */
  color = 'rgb(0, 0, 0)';

  /**
   * 画笔宽度，必须是数字，不能是字符串字面量
   *
   * Width of a brush, has to be a Number, no string literals
   * @type Number
   */
  width = 1;

  /**
   * 表示此形状阴影的阴影对象。
   * <b>向后不兼容说明：</b> 自 v1.2.12 起，此属性替换了 "shadowColor" (String)、"shadowOffsetX" (Number)、
   * "shadowOffsetY" (Number) 和 "shadowBlur" (Number)
   *
   * Shadow object representing shadow of this shape.
   * <b>Backwards incompatibility note:</b> This property replaces "shadowColor" (String), "shadowOffsetX" (Number),
   * "shadowOffsetY" (Number) and "shadowBlur" (Number) since v1.2.12
   * @type Shadow
   */
  shadow: Shadow | null = null;

  /**
   * 画笔的线条末端样式（"butt"、"round"、"square" 之一）
   *
   * Line endings style of a brush (one of "butt", "round", "square")
   * @type String
   */
  strokeLineCap: CanvasLineCap = 'round';

  /**
   * 画笔的角样式（"bevel"、"round"、"miter" 之一）
   *
   * Corner style of a brush (one of "bevel", "round", "miter")
   * @type String
   */
  strokeLineJoin: CanvasLineJoin = 'round';

  /**
   * 画笔的最大斜接长度（用于 strokeLineJoin = "miter"）
   *
   * Maximum miter length (used for strokeLineJoin = "miter") of a brush's
   * @type Number
   */
  strokeMiterLimit = 10;

  /**
   * 虚线数组
   *
   * Stroke Dash Array.
   * @type Array
   */
  strokeDashArray: number[] | null = null;

  /**
   * 当为 `true` 时，自由绘制仅限于白板大小。默认为 false。
   *
   * When `true`, the free drawing is limited to the whiteboard size. Default to false.
   * @type Boolean
   * @default false
   */

  limitedToCanvasSize = false;

  /**
   * 画布实例
   * @todo add type
   */
  declare canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
  }

  abstract _render(): void;
  /**
   * 鼠标按下事件处理
   * @param pointer 指针位置
   * @param ev 事件数据
   */
  abstract onMouseDown(pointer: Point, ev: TBrushEventData): void;
  abstract onMouseMove(pointer: Point, ev: TBrushEventData): void;
  /**
   * 鼠标松开事件处理
   * @param ev 事件数据
   * @returns 如果画笔应继续阻止交互，则返回 true
   *
   * @returns true if brush should continue blocking interaction
   */
  abstract onMouseUp(ev: TBrushEventData): boolean | void;

  /**
   * 设置画笔样式
   * @private
   * @param ctx 渲染上下文
   *
   * Sets brush styles
   * @private
   * @param {CanvasRenderingContext2D} ctx
   */
  _setBrushStyles(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.lineCap = this.strokeLineCap;
    ctx.miterLimit = this.strokeMiterLimit;
    ctx.lineJoin = this.strokeLineJoin;
    ctx.setLineDash(this.strokeDashArray || []);
  }

  /**
   * 在给定上下文上设置变换
   * @param ctx 要渲染的上下文
   * @private
   *
   * Sets the transformation on given context
   * @param {CanvasRenderingContext2D} ctx context to render on
   * @private
   */
  protected _saveAndTransform(ctx: CanvasRenderingContext2D) {
    const v = this.canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
  }

  /**
   * 检查是否需要完全渲染
   * @returns 如果需要完全渲染则返回 true
   */
  protected needsFullRender() {
    const color = new Color(this.color);
    return color.getAlpha() < 1 || !!this.shadow;
  }

  /**
   * 设置画笔阴影样式
   * @private
   *
   * Sets brush shadow styles
   * @private
   */
  protected _setShadow() {
    if (!this.shadow || !this.canvas) {
      return;
    }

    const canvas = this.canvas,
      shadow = this.shadow,
      ctx = canvas.contextTop,
      zoom = canvas.getZoom() * canvas.getRetinaScaling();

    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur * zoom;
    ctx.shadowOffsetX = shadow.offsetX * zoom;
    ctx.shadowOffsetY = shadow.offsetY * zoom;
  }

  /**
   * 移除画笔阴影样式
   * @private
   *
   * Removes brush shadow styles
   * @private
   */
  protected _resetShadow() {
    const ctx = this.canvas.contextTop;

    ctx.shadowColor = '';
    ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  }

  /**
   * 检查指针是否在画布边界之外
   * @param pointer 指针位置
   * @private
   *
   * Check is pointer is outside canvas boundaries
   * @param {Object} pointer
   * @private
   */
  protected _isOutSideCanvas(pointer: Point) {
    return (
      pointer.x < 0 ||
      pointer.x > this.canvas.getWidth() ||
      pointer.y < 0 ||
      pointer.y > this.canvas.getHeight()
    );
  }
}
