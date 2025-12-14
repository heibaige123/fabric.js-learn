import type { ModifierKey, TEvent } from '../EventTypeDefs';
import type { Point } from '../Point';
import { Shadow } from '../Shadow';
import { Path } from '../shapes/Path';
import { getSmoothPathFromPoints, joinPath } from '../util/path';
import type { Canvas } from '../canvas/Canvas';
import { BaseBrush } from './BaseBrush';
import type { TSimplePathData } from '../util/path/typedefs';

/**
 * 检查 SVG 路径数据是否为空
 * @param pathData SVG 路径命令
 *
 * @private
 * @param {TSimplePathData} pathData SVG path commands
 * @returns {boolean}
 */
function isEmptySVGPath(pathData: TSimplePathData): boolean {
  return joinPath(pathData) === 'M 0 0 Q 0 0 0 0 L 0 0';
}

/**
 * 铅笔画笔类
 */
export class PencilBrush extends BaseBrush {
  /**
   * 丢弃彼此距离小于 `decimate` 像素的点
   *
   * Discard points that are less than `decimate` pixel distant from each other
   * @type Number
   * @default 0.4
   */
  decimate = 0.4;

  /**
   * 在最后记录的点与当前指针之间绘制直线
   * 用于 `shift` 功能
   *
   * Draws a straight line between last recorded point to current pointer
   * Used for `shift` functionality
   *
   * @type boolean
   * @default false
   */
  drawStraightLine = false;

  /**
   * 使画笔绘制直线的事件修饰键。
   * 如果为 `null` 或 'none' 或任何其他非修饰键的字符串，则禁用该功能。
   *
   * The event modifier key that makes the brush draw a straight line.
   * If `null` or 'none' or any other string that is not a modifier key the feature is disabled.
   * @type {ModifierKey | undefined | null}
   */
  straightLineKey: ModifierKey | undefined | null = 'shiftKey';

  /**
   * 线帽样式
   */
  declare protected _points: Point[];
  /**
   * 是否包含直线
   */
  declare protected _hasStraightLine: boolean;
  /**
   * 上一个结束点
   */
  declare protected oldEnd?: Point;

  /**
   *
   * @param canvas 上下文
   */
  constructor(canvas: Canvas) {
    super(canvas);
    this._points = [];
    this._hasStraightLine = false;
  }

  /**
   * 判断是否需要完整渲染
   * @returns
   */
  needsFullRender() {
    return super.needsFullRender() || this._hasStraightLine;
  }

  /**
   * 绘制线段
   * @param ctx 渲染上下文
   * @param p1 起点
   * @param p2 终点
   * @returns 中点
   */
  static drawSegment(ctx: CanvasRenderingContext2D, p1: Point, p2: Point) {
    const midPoint = p1.midPointFrom(p2);
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    return midPoint;
  }

  /**
   * 鼠标按下时调用
   * @param pointer 指针位置
   * @param event 事件数据
   *
   * Invoked on mouse down
   * @param {Point} pointer
   */
  onMouseDown(pointer: Point, { e }: TEvent) {
    if (!this.canvas._isMainEvent(e)) {
      return;
    }
    this.drawStraightLine = !!this.straightLineKey && e[this.straightLineKey];
    this._prepareForDrawing(pointer);
    // capture coordinates immediately
    // this allows to draw dots (when movement never occurs)
    this._addPoint(pointer);
    this._render();
  }

  /**
   * 鼠标移动时调用
   * @param pointer 指针位置
   * @param event 事件数据
   *
   * Invoked on mouse move
   * @param {Point} pointer
   */
  onMouseMove(pointer: Point, { e }: TEvent) {
    if (!this.canvas._isMainEvent(e)) {
      return;
    }
    this.drawStraightLine = !!this.straightLineKey && e[this.straightLineKey];
    if (this.limitedToCanvasSize === true && this._isOutSideCanvas(pointer)) {
      return;
    }
    if (this._addPoint(pointer) && this._points.length > 1) {
      if (this.needsFullRender()) {
        // redraw curve
        // clear top canvas
        this.canvas.clearContext(this.canvas.contextTop);
        this._render();
      } else {
        const points = this._points,
          length = points.length,
          ctx = this.canvas.contextTop;
        // draw the curve update
        this._saveAndTransform(ctx);
        if (this.oldEnd) {
          ctx.beginPath();
          ctx.moveTo(this.oldEnd.x, this.oldEnd.y);
        }
        this.oldEnd = PencilBrush.drawSegment(
          ctx,
          points[length - 2],
          points[length - 1],
        );
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /**
   * 鼠标松开时调用
   * @param event 事件数据
   *
   * Invoked on mouse up
   */
  onMouseUp({ e }: TEvent) {
    if (!this.canvas._isMainEvent(e)) {
      return true;
    }
    this.drawStraightLine = false;
    this.oldEnd = undefined;
    this._finalizeAndAddPath();

    return false;
  }

  /**
   * 准备绘制
   * @private
   * @param pointer 相对于画布的实际鼠标位置
   *
   * @private
   * @param {Point} pointer Actual mouse position related to the canvas.
   */
  _prepareForDrawing(pointer: Point) {
    this._reset();
    this._addPoint(pointer);
    this.canvas.contextTop.moveTo(pointer.x, pointer.y);
  }

  /**
   * 添加点
   * @private
   * @param point 要添加到点数组的点
   *
   * @private
   * @param {Point} point Point to be added to points array
   */
  _addPoint(point: Point) {
    if (
      this._points.length > 1 &&
      point.eq(this._points[this._points.length - 1])
    ) {
      return false;
    }
    if (this.drawStraightLine && this._points.length > 1) {
      this._hasStraightLine = true;
      this._points.pop();
    }
    this._points.push(point);
    return true;
  }

  /**
   * 清除点数组并设置 contextTop 画布样式。
   * @private
   *
   * Clear points array and set contextTop canvas style.
   * @private
   */
  _reset() {
    this._points = [];
    this._setBrushStyles(this.canvas.contextTop);
    this._setShadow();
    this._hasStraightLine = false;
  }

  /**
   * 使用 quadraticCurveTo 在 topCanvas 上绘制平滑路径
   * @private
   * @param ctx 渲染上下文
   *
   * Draw a smooth path on the topCanvas using quadraticCurveTo
   * @private
   * @param {CanvasRenderingContext2D} [ctx]
   */
  _render(ctx: CanvasRenderingContext2D = this.canvas.contextTop) {
    let p1 = this._points[0],
      p2 = this._points[1];
    this._saveAndTransform(ctx);
    ctx.beginPath();
    //if we only have 2 points in the path and they are the same
    //it means that the user only clicked the canvas without moving the mouse
    //then we should be drawing a dot. A path isn't drawn between two identical dots
    //that's why we set them apart a bit
    if (this._points.length === 2 && p1.x === p2.x && p1.y === p2.y) {
      const width = this.width / 1000;
      p1.x -= width;
      p2.x += width;
    }
    ctx.moveTo(p1.x, p1.y);

    for (let i = 1; i < this._points.length; i++) {
      // we pick the point between pi + 1 & pi + 2 as the
      // end point and p1 as our control point.
      PencilBrush.drawSegment(ctx, p1, p2);
      p1 = this._points[i];
      p2 = this._points[i + 1];
    }
    // Draw last line as a straight line while
    // we wait for the next point to be able to calculate
    // the bezier control point
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 将点转换为 SVG 路径
   * @param points 点数组
   * @returns SVG 路径命令
   *
   * Converts points to SVG path
   * @param {Point[]} points Array of points
   * @return {TSimplePathData} SVG path commands
   */
  convertPointsToSVGPath(points: Point[]): TSimplePathData {
    const correction = this.width / 1000;
    return getSmoothPathFromPoints(points, correction);
  }

  /**
   * 创建要添加到画布的 Path 对象
   * @param pathData 路径数据
   * @returns 要添加到画布的 Path
   *
   * Creates a Path object to add on canvas
   * @param {TSimplePathData} pathData Path data
   * @return {Path} Path to add on canvas
   */
  createPath(pathData: TSimplePathData): Path {
    const path = new Path(pathData, {
      fill: null,
      stroke: this.color,
      strokeWidth: this.width,
      strokeLineCap: this.strokeLineCap,
      strokeMiterLimit: this.strokeMiterLimit,
      strokeLineJoin: this.strokeLineJoin,
      strokeDashArray: this.strokeDashArray,
    });
    if (this.shadow) {
      this.shadow.affectStroke = true;
      path.shadow = new Shadow(this.shadow);
    }

    return path;
  }

  /**
   * 使用 decimate 值抽取点数组
   * @param points 点数组
   * @param distance 距离
   * @returns 抽取后的点数组
   *
   * Decimate points array with the decimate value
   */
  decimatePoints(points: Point[], distance: number) {
    if (points.length <= 2) {
      return points;
    }
    let lastPoint = points[0],
      cDistance;
    const zoom = this.canvas.getZoom(),
      adjustedDistance = Math.pow(distance / zoom, 2),
      l = points.length - 1,
      newPoints = [lastPoint];
    // TODO investigate why this is not i < l
    for (let i = 1; i < l - 1; i++) {
      cDistance =
        Math.pow(lastPoint.x - points[i].x, 2) +
        Math.pow(lastPoint.y - points[i].y, 2);
      if (cDistance >= adjustedDistance) {
        lastPoint = points[i];
        newPoints.push(lastPoint);
      }
    }
    // Add the last point from the original line to the end of the array.
    // This ensures decimate doesn't delete the last point on the line, and ensures the line is > 1 point.
    newPoints.push(points[l]);
    return newPoints;
  }

  /**
   * 在 contextTop 画布上绘制路径后的 mouseup 事件
   * 我们使用捕获的点创建一个新的 Path 对象
   * 并将其添加到画布。
   *
   * On mouseup after drawing the path on contextTop canvas
   * we use the points captured to create an new Path object
   * and add it to the canvas.
   */
  _finalizeAndAddPath() {
    const ctx = this.canvas.contextTop;
    ctx.closePath();
    if (this.decimate) {
      this._points = this.decimatePoints(this._points, this.decimate);
    }
    const pathData = this.convertPointsToSVGPath(this._points);
    if (isEmptySVGPath(pathData)) {
      // do not create 0 width/height paths, as they are
      // rendered inconsistently across browsers
      // Firefox 4, for example, renders a dot,
      // whereas Chrome 10 renders nothing
      this.canvas.requestRenderAll();
      return;
    }

    const path = this.createPath(pathData);
    this.canvas.clearContext(this.canvas.contextTop);
    this.canvas.fire('before:path:created', { path: path });
    this.canvas.add(path);
    this.canvas.requestRenderAll();
    path.setCoords();
    this._resetShadow();

    // fire event 'path' created
    this.canvas.fire('path:created', { path: path });
  }
}
