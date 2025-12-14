import { Pattern } from '../Pattern';
import { createCanvasElement } from '../util/misc/dom';
import type { Canvas } from '../canvas/Canvas';
import { PencilBrush } from './PencilBrush';
import type { TSimplePathData } from '../util/path/typedefs';

/**
 * 图案画笔类
 */
export class PatternBrush extends PencilBrush {
  /**
   * 图片源
   */
  declare source?: CanvasImageSource;

  /**
   *
   * @param canvas 上下文
   */
  constructor(canvas: Canvas) {
    super(canvas);
  }

  /**
   * 获取图案源
   * @returns
   */
  getPatternSrc() {
    const dotWidth = 20,
      dotDistance = 5,
      patternCanvas = createCanvasElement(),
      patternCtx = patternCanvas.getContext('2d');

    patternCanvas.width = patternCanvas.height = dotWidth + dotDistance;
    if (patternCtx) {
      patternCtx.fillStyle = this.color;
      patternCtx.beginPath();
      patternCtx.arc(
        dotWidth / 2,
        dotWidth / 2,
        dotWidth / 2,
        0,
        Math.PI * 2,
        false,
      );
      patternCtx.closePath();
      patternCtx.fill();
    }
    return patternCanvas;
  }

  /**
   * 创建 "pattern" 实例属性
   * @param ctx 渲染上下文
   *
   * Creates "pattern" instance property
   * @param {CanvasRenderingContext2D} ctx
   */
  getPattern(ctx: CanvasRenderingContext2D) {
    return ctx.createPattern(this.source || this.getPatternSrc(), 'repeat');
  }

  /**
   * 设置画笔样式
   * @param ctx 渲染上下文
   *
   * Sets brush styles
   * @param {CanvasRenderingContext2D} ctx
   */
  _setBrushStyles(ctx: CanvasRenderingContext2D) {
    super._setBrushStyles(ctx);
    const pattern = this.getPattern(ctx);
    pattern && (ctx.strokeStyle = pattern);
  }

  /**
   * 创建路径
   * @param pathData 路径数据
   *
   * Creates path
   */
  createPath(pathData: TSimplePathData) {
    const path = super.createPath(pathData),
      topLeft = path._getLeftTopCoords().scalarAdd(path.strokeWidth / 2);

    path.stroke = new Pattern({
      source: this.source || this.getPatternSrc(),
      offsetX: -topLeft.x,
      offsetY: -topLeft.y,
    });
    return path;
  }
}
