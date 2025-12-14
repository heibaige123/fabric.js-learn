import type { XY } from '../../../Point';
import { Point } from '../../../Point';
import { degreesToRadians } from '../radiansDegreesConversion';
import { createVector } from '../vectors';
import type { TProjectStrokeOnPointsOptions, TProjection } from './types';

/**
 * 描边投影基类
 * @see https://github.com/fabricjs/fabric.js/pull/8344
 * @todo consider removing skewing from points before calculating stroke projection,
 * see https://github.com/fabricjs/fabric.js/commit/494a10ee2f8c2278ae9a55b20bf50cf6ee25b064#commitcomment-94751537
 */
export abstract class StrokeProjectionsBase {
  /**
   * 选项
   */
  declare options: TProjectStrokeOnPointsOptions;
  /**
   * 缩放比例
   */
  declare scale: Point;
  /**
   * 描边均匀缩放标量
   */
  declare strokeUniformScalar: Point;
  /**
   * 描边投影大小
   */
  declare strokeProjectionMagnitude: number;

  /**
   * 构造函数
   * @param options 选项
   */
  constructor(options: TProjectStrokeOnPointsOptions) {
    this.options = options;
    this.strokeProjectionMagnitude = this.options.strokeWidth / 2;
    this.scale = new Point(this.options.scaleX, this.options.scaleY);
    this.strokeUniformScalar = this.options.strokeUniform
      ? new Point(1 / this.options.scaleX, 1 / this.options.scaleY)
      : new Point(1, 1);
  }

  /**
   * 当描边均匀时，缩放会影响点的排列。所以我们必须考虑到这一点。
   *
   * When the stroke is uniform, scaling affects the arrangement of points. So we must take it into account.
   */
  protected createSideVector(from: XY, to: XY) {
    const v = createVector(from, to);
    return this.options.strokeUniform ? v.multiply(this.scale) : v;
  }

  /**
   * 计算正交投影
   * @param from 起始点
   * @param to 结束点
   * @param magnitude 大小
   * @returns 正交投影点
   */
  protected abstract calcOrthogonalProjection(
    from: Point,
    to: Point,
    magnitude?: number,
  ): Point;

  /**
   * 正交投影
   * @param from 起始点
   * @param to 结束点
   * @param magnitude 大小
   * @returns 投影后的点
   */
  protected projectOrthogonally(from: Point, to: Point, magnitude?: number) {
    return this.applySkew(
      from.add(this.calcOrthogonalProjection(from, to, magnitude)),
    );
  }

  /**
   * 检查是否倾斜
   * @returns 如果倾斜则返回 true
   */
  protected isSkewed() {
    return this.options.skewX !== 0 || this.options.skewY !== 0;
  }

  /**
   * 应用倾斜
   * @param point 要应用倾斜的点
   * @returns 倾斜后的点
   */
  protected applySkew(point: Point) {
    const p = new Point(point);
    // skewY must be applied before skewX as this distortion affects skewX calculation
    p.y += p.x * Math.tan(degreesToRadians(this.options.skewY));
    p.x += p.y * Math.tan(degreesToRadians(this.options.skewX));
    return p;
  }

  /**
   * 缩放单位向量
   * @param unitVector 单位向量
   * @param scalar 标量
   * @returns 缩放后的向量
   */
  protected scaleUnitVector(unitVector: Point, scalar: number) {
    return unitVector.multiply(this.strokeUniformScalar).scalarMultiply(scalar);
  }

  /**
   * 投影点
   * @returns 投影点的数组
   */
  protected abstract projectPoints(): Point[];

  /**
   * 执行投影
   * @returns 投影结果数组
   */
  public abstract project(): TProjection[];
}
