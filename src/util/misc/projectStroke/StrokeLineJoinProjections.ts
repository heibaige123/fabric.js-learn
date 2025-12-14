import type { XY } from '../../../Point';
import { Point } from '../../../Point';
import { halfPI, twoMathPi } from '../../../constants';
import type { TRadian } from '../../../typedefs';
import { degreesToRadians } from '../radiansDegreesConversion';
import {
  calcAngleBetweenVectors,
  calcVectorRotation,
  crossProduct,
  getOrthonormalVector,
  getUnitVector,
  isBetweenVectors,
  magnitude,
  rotateVector,
} from '../vectors';
import { StrokeProjectionsBase } from './StrokeProjectionsBase';
import type { TProjection, TProjectStrokeOnPointsOptions } from './types';

/**
 * 零向量常量
 */
const zeroVector = new Point();

/**
 * 负责查找每种线连接类型的投影的类
 * @see {@link [Closed path projections at #8344](https://github.com/fabricjs/fabric.js/pull/8344#2-closed-path)}
 *
 * class in charge of finding projections for each type of line join
 * @see {@link [Closed path projections at #8344](https://github.com/fabricjs/fabric.js/pull/8344#2-closed-path)}
 *
 * - MDN:
 *   - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineJoin
 *   - https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin
 * - Spec: https://svgwg.org/svg2-draft/painting.html#StrokeLinejoinProperty
 * - Playground to understand how the line joins works: https://hypertolosana.github.io/efficient-webgl-stroking/index.html
 * - View the calculated projections for each of the control points: https://codesandbox.io/s/project-stroke-points-with-context-to-trace-b8jc4j?file=/src/index.js
 *
 */
export class StrokeLineJoinProjections extends StrokeProjectionsBase {
  /**
   * 被投影的点 (∠BAC 的顶点)
   *
   * The point being projected (the angle ∠BAC)
   */
  declare A: Point;
  /**
   * A 之前的点
   *
   * The point before A
   */
  declare B: Point;
  /**
   * A 之后的点
   *
   * The point after A
   */
  declare C: Point;
  /**
   * AB 向量
   *
   * The AB vector
   */
  AB: Point;
  /**
   * AC 向量
   *
   * The AC vector
   */
  AC: Point;
  /**
   * A 的角度 (∠BAC)
   *
   * The angle of A (∠BAC)
   */
  alpha: TRadian;
  /**
   * A 的角平分线 (∠BAC)
   *
   * The bisector of A (∠BAC)
   */
  bisector: Point;

  /**
   * 计算正交投影的旋转方向因子
   * @param vector1 向量1
   * @param vector2 向量2
   * @returns 正交投影的旋转方向因子
   */
  static getOrthogonalRotationFactor(vector1: Point, vector2?: Point) {
    const angle = vector2
      ? calcAngleBetweenVectors(vector1, vector2)
      : calcVectorRotation(vector1);
    return Math.abs(angle) < halfPI ? -1 : 1;
  }

  constructor(A: XY, B: XY, C: XY, options: TProjectStrokeOnPointsOptions) {
    super(options);
    this.A = new Point(A);
    this.B = new Point(B);
    this.C = new Point(C);
    this.AB = this.createSideVector(this.A, this.B);
    this.AC = this.createSideVector(this.A, this.C);
    this.alpha = calcAngleBetweenVectors(this.AB, this.AC);
    this.bisector = getUnitVector(
      // if AC is also the zero vector nothing will be projected
      // in that case the next point will handle the projection
      rotateVector(this.AB.eq(zeroVector) ? this.AC : this.AB, this.alpha / 2),
    );
  }

  /**
   * 计算正交投影
   * @param from 起始点
   * @param to 结束点
   * @param magnitude 大小
   * @returns 正交投影向量
   */
  calcOrthogonalProjection(
    from: Point,
    to: Point,
    magnitude: number = this.strokeProjectionMagnitude,
  ) {
    const vector = this.createSideVector(from, to);
    const orthogonalProjection = getOrthonormalVector(vector);
    const correctSide = StrokeLineJoinProjections.getOrthogonalRotationFactor(
      orthogonalProjection,
      this.bisector,
    );
    return this.scaleUnitVector(orthogonalProjection, magnitude * correctSide);
  }

  /**
   * BEVEL 连接
   * 计算：投影点由与顶点正交的向量形成。
   *
   * BEVEL
   * Calculation: the projection points are formed by the vector orthogonal to the vertex.
   *
   * @see https://github.com/fabricjs/fabric.js/pull/8344#2-2-bevel
   */
  projectBevel() {
    const projections: Point[] = [];
    // if `alpha` equals 0 or 2*PI, the projections are the same for `B` and `C`
    (this.alpha % twoMathPi === 0 ? [this.B] : [this.B, this.C]).forEach(
      (to) => {
        projections.push(this.projectOrthogonally(this.A, to));
        projections.push(
          this.projectOrthogonally(this.A, to, -this.strokeProjectionMagnitude),
        );
      },
    );
    return projections;
  }

  /**
   * MITER 连接
   * 计算：角由描边的外边缘在路径段的切线上延伸直到相交形成。
   *
   * MITER
   * Calculation: the corner is formed by extending the outer edges of the stroke
   * at the tangents of the path segments until they intersect.
   *
   * @see https://github.com/fabricjs/fabric.js/pull/8344#2-1-miter
   */
  projectMiter() {
    const projections: Point[] = [],
      alpha = Math.abs(this.alpha),
      hypotUnitScalar = 1 / Math.sin(alpha / 2),
      miterVector = this.scaleUnitVector(
        this.bisector,
        -this.strokeProjectionMagnitude * hypotUnitScalar,
      );

    // When two line segments meet at a sharp angle, it is possible for the join to extend,
    // far beyond the thickness of the line stroking the path. The stroke-miterlimit imposes
    // a limit on the extent of the line join.
    // MDN: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-miterlimit
    // When the stroke is uniform, scaling changes the arrangement of points, this changes the miter-limit
    const strokeMiterLimit = this.options.strokeUniform
      ? magnitude(
          this.scaleUnitVector(this.bisector, this.options.strokeMiterLimit),
        )
      : this.options.strokeMiterLimit;

    if (
      magnitude(miterVector) / this.strokeProjectionMagnitude <=
      strokeMiterLimit
    ) {
      projections.push(this.applySkew(this.A.add(miterVector)));
    }
    /* when the miter-limit is reached, the stroke line join becomes of type bevel.
      We always need two orthogonal projections which are basically bevel-type projections,
      so regardless of whether the miter-limit was reached or not, we include these projections.
    */
    projections.push(...this.projectBevel());

    return projections;
  }

  /**
   * ROUND (无倾斜)
   * 计算：投影是平行于 X 和 Y 轴的两个向量
   *
   * ROUND (without skew)
   * Calculation: the projections are the two vectors parallel to X and Y axes
   *
   * @see https://github.com/fabricjs/fabric.js/pull/8344#2-3-1-round-without-skew
   */
  private projectRoundNoSkew(startCircle: Point, endCircle: Point) {
    const projections: Point[] = [],
      // correctSide is used to only consider projecting for the outer side
      correctSide = new Point(
        StrokeLineJoinProjections.getOrthogonalRotationFactor(this.bisector),
        StrokeLineJoinProjections.getOrthogonalRotationFactor(
          new Point(this.bisector.y, this.bisector.x),
        ),
      ),
      radiusOnAxisX = new Point(1, 0)
        .scalarMultiply(this.strokeProjectionMagnitude)
        .multiply(this.strokeUniformScalar)
        .multiply(correctSide),
      radiusOnAxisY = new Point(0, 1)
        .scalarMultiply(this.strokeProjectionMagnitude)
        .multiply(this.strokeUniformScalar)
        .multiply(correctSide);

    [radiusOnAxisX, radiusOnAxisY].forEach((vector) => {
      if (isBetweenVectors(vector, startCircle, endCircle)) {
        projections.push(this.A.add(vector));
      }
    });
    return projections;
  }

  /**
   * ROUND (有倾斜)
   * 计算：投影是变形后在 X 和 Y 轴方向上距离顶点最远的点。
   *
   * ROUND (with skew)
   * Calculation: the projections are the points furthest from the vertex in
   * the direction of the X and Y axes after distortion.
   *
   * @see https://github.com/fabricjs/fabric.js/pull/8344#2-3-2-round-skew
   */
  private projectRoundWithSkew(startCircle: Point, endCircle: Point) {
    const projections: Point[] = [];

    const { skewX, skewY, scaleX, scaleY, strokeUniform } = this.options,
      shearing = new Point(
        Math.tan(degreesToRadians(skewX)),
        Math.tan(degreesToRadians(skewY)),
      );
    // The points furthest from the vertex in the direction of the X and Y axes after distortion
    const circleRadius = this.strokeProjectionMagnitude,
      newY = strokeUniform
        ? circleRadius /
          scaleY /
          Math.sqrt(1 / scaleY ** 2 + (1 / scaleX ** 2) * shearing.y ** 2)
        : circleRadius / Math.sqrt(1 + shearing.y ** 2),
      furthestY = new Point(
        // Safe guard due to floating point precision. In some situations the square root
        // was returning NaN because of a negative number close to zero.
        Math.sqrt(Math.max(circleRadius ** 2 - newY ** 2, 0)),
        newY,
      ),
      newX = strokeUniform
        ? circleRadius /
          Math.sqrt(
            1 +
              (shearing.x ** 2 * (1 / scaleY) ** 2) /
                (1 / scaleX + (1 / scaleX) * shearing.x * shearing.y) ** 2,
          )
        : circleRadius /
          Math.sqrt(1 + shearing.x ** 2 / (1 + shearing.x * shearing.y) ** 2),
      furthestX = new Point(
        newX,
        Math.sqrt(Math.max(circleRadius ** 2 - newX ** 2, 0)),
      );

    [
      furthestX,
      furthestX.scalarMultiply(-1),
      furthestY,
      furthestY.scalarMultiply(-1),
    ]
      // We need to skew the vector here as this information is used to check if
      // it is between the start and end of the circle segment
      .map((vector) =>
        this.applySkew(
          strokeUniform ? vector.multiply(this.strokeUniformScalar) : vector,
        ),
      )
      .forEach((vector) => {
        if (isBetweenVectors(vector, startCircle, endCircle)) {
          projections.push(this.applySkew(this.A).add(vector));
        }
      });

    return projections;
  }

  /**
   * ROUND 连接
   * 计算：与描边连接 `round` 相同
   *
   * @returns
   */
  projectRound() {
    const projections: Point[] = [];
    /* Include the start and end points of the circle segment, so that only
      the projections contained within it are included */
    // add the orthogonal projections (start and end points of circle segment)
    projections.push(...this.projectBevel());
    // let's determines which one of the orthogonal projection is the beginning and end of the circle segment.
    // when `alpha` equals 0 or 2*PI, we have a straight line, so the way to find the start/end is different.
    const isStraightLine = this.alpha % twoMathPi === 0,
      // change the origin of the projections to point A
      // so that the cross product calculation is correct
      newOrigin = this.applySkew(this.A),
      proj0 = projections[isStraightLine ? 0 : 2].subtract(newOrigin),
      proj1 = projections[isStraightLine ? 1 : 0].subtract(newOrigin),
      // when `isStraightLine` === true, we compare with the vector opposite AB, otherwise we compare with the bisector.
      comparisonVector = isStraightLine
        ? this.applySkew(this.AB.scalarMultiply(-1))
        : this.applySkew(
            this.bisector.multiply(this.strokeUniformScalar).scalarMultiply(-1),
          ),
      // the beginning of the circle segment is always to the right of the comparison vector (cross product > 0)
      isProj0Start = crossProduct(proj0, comparisonVector) > 0,
      startCircle = isProj0Start ? proj0 : proj1,
      endCircle = isProj0Start ? proj1 : proj0;
    if (!this.isSkewed()) {
      projections.push(...this.projectRoundNoSkew(startCircle, endCircle));
    } else {
      projections.push(...this.projectRoundWithSkew(startCircle, endCircle));
    }
    return projections;
  }

  /**
   * 将描边宽度投影到点上，返回每个点的投影如下：
   * - `miter`: 对应于外边界的 1 个点。如果超过斜接限制，它将是 2 个点（变为 bevel）
   * - `bevel`: 对应于 bevel 可能边界的 2 个点，与描边正交。
   * - `round`: 当没有倾斜时与 `bevel` 相同，有倾斜时是 4 个点。
   *
   * Project stroke width on points returning projections for each point as follows:
   * - `miter`: 1 point corresponding to the outer boundary. If the miter limit is exceeded, it will be 2 points (becomes bevel)
   * - `bevel`: 2 points corresponding to the bevel possible boundaries, orthogonal to the stroke.
   * - `round`: same as `bevel` when it has no skew, with skew are 4 points.
   */
  protected projectPoints() {
    switch (this.options.strokeLineJoin) {
      case 'miter':
        return this.projectMiter();
      case 'round':
        return this.projectRound();
      default:
        return this.projectBevel();
    }
  }

  /**
   * 投影描边宽度到点上
   * @returns
   */
  public project(): TProjection[] {
    return this.projectPoints().map((point) => ({
      originPoint: this.A,
      projectedPoint: point,
      angle: this.alpha,
      bisector: this.bisector,
    }));
  }
}
