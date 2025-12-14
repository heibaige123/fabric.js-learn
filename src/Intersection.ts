import { Point } from './Point';
import { createVector } from './util/misc/vectors';

/* Adaptation of work of Kevin Lindsey (kevin@kevlindev.com) */

/**
 * 相交类型
 */
export type IntersectionType = 'Intersection' | 'Coincident' | 'Parallel';

/**
 * 相交类
 */
export class Intersection {
  /**
   * 相交点集合
   */
  declare points: Point[];

  /**
   * 相交状态
   */
  declare status?: IntersectionType;

  constructor(status?: IntersectionType) {
    this.status = status;
    this.points = [];
  }

  /**
   * 用于验证点是否已在集合中
   * @param {Point} point 要检查的点
   * @returns {boolean} 如果点已存在则返回 true
   *
   * Used to verify if a point is alredy in the collection
   * @param {Point} point
   * @returns {boolean}
   */
  private includes(point: Point): boolean {
    return this.points.some((p) => p.eq(point));
  }

  /**
   * 追加相交点
   * @param {...Point[]} points 要追加的点
   * @return {Intersection} 当前实例
   *
   * Appends points of intersection
   * @param {...Point[]} points
   * @return {Intersection} thisArg
   */
  private append(...points: Point[]): Intersection {
    this.points = this.points.concat(
      points.filter((point) => {
        return !this.includes(point);
      }),
    );
    return this;
  }

  /**
   * 检查点 T 是否在 A 和 B 定义的线段或直线上
   *
   * @param {Point} T 我们正在检查的点
   * @param {Point} A 线段的一个端点
   * @param {Point} B 线段的另一个端点
   * @param [infinite] 如果为 true，则检查 `T` 是否在由 `A` 和 `B` 定义的直线上
   * @returns 如果 `T` 被包含则返回 true
   *
   * check if point T is on the segment or line defined between A and B
   *
   * @param {Point} T the point we are checking for
   * @param {Point} A one extremity of the segment
   * @param {Point} B the other extremity of the segment
   * @param [infinite] if true checks if `T` is on the line defined by `A` and `B`
   * @returns true if `T` is contained
   */
  static isPointContained(T: Point, A: Point, B: Point, infinite = false) {
    if (A.eq(B)) {
      // Edge case: the segment is a point, we check for coincidence,
      // infinite param has no meaning because there are infinite lines to consider
      return T.eq(A);
    } else if (A.x === B.x) {
      // Edge case: horizontal line.
      // we first check if T.x has the same value, and then if T.y is contained between A.y and B.y
      return (
        T.x === A.x &&
        (infinite || (T.y >= Math.min(A.y, B.y) && T.y <= Math.max(A.y, B.y)))
      );
    } else if (A.y === B.y) {
      // Edge case: vertical line.
      // we first check if T.y has the same value, and then if T.x is contained between A.x and B.x
      return (
        T.y === A.y &&
        (infinite || (T.x >= Math.min(A.x, B.x) && T.x <= Math.max(A.x, B.x)))
      );
    } else {
      // Generic case: sloped line.
      // we check that AT has the same slope as AB
      // for the segment case we need both the vectors to have the same direction and for AT to be lte AB in size
      // for the infinite case we check the absolute value of the slope, since direction is meaningless
      const AB = createVector(A, B);
      const AT = createVector(A, T);
      const s = AT.divide(AB);
      return infinite
        ? Math.abs(s.x) === Math.abs(s.y)
        : s.x === s.y && s.x >= 0 && s.x <= 1;
    }
  }

  /**
   * 使用射线投射算法确定点是否在由点定义的各边形内
   * @see https://en.wikipedia.org/wiki/Point_in_polygon
   * @param point 要检查的点
   * @param points 多边形的点
   * @returns 如果点在多边形内则返回 true
   *
   * Use the ray casting algorithm to determine if point is in the polygon defined by points
   * @see https://en.wikipedia.org/wiki/Point_in_polygon
   * @param point
   * @param points polygon points
   * @returns
   */
  static isPointInPolygon(point: Point, points: Point[]) {
    const other = new Point(point).setX(
      Math.min(point.x - 1, ...points.map((p) => p.x)),
    );
    let hits = 0;
    for (let index = 0; index < points.length; index++) {
      const inter = this.intersectSegmentSegment(
        // polygon side
        points[index],
        points[(index + 1) % points.length],
        // ray
        point,
        other,
      );
      if (inter.includes(point)) {
        // point is on the polygon side
        return true;
      }
      hits += Number(inter.status === 'Intersection');
    }
    return hits % 2 === 1;
  }

  /**
   * 检查一条直线是否与另一条直线相交
   * @see {@link https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection line intersection}
   * @see {@link https://en.wikipedia.org/wiki/Cramer%27s_rule Cramer's rule}
   * @param {Point} a1 直线 A 的第一个点
   * @param {Point} a2 直线 A 的第二个点
   * @param {Point} b1 直线 B 的第一个点
   * @param {Point} b2 直线 B 的第二个点
   * @param {boolean} [aInfinite=true] 通过传递 `false` 检查线段相交
   * @param {boolean} [bInfinite=true] 通过传递 `false` 检查线段相交
   * @return {Intersection} 相交结果
   *
   * Checks if a line intersects another
   * @see {@link https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection line intersection}
   * @see {@link https://en.wikipedia.org/wiki/Cramer%27s_rule Cramer's rule}
   * @param {Point} a1
   * @param {Point} a2
   * @param {Point} b1
   * @param {Point} b2
   * @param {boolean} [aInfinite=true] check segment intersection by passing `false`
   * @param {boolean} [bInfinite=true] check segment intersection by passing `false`
   * @return {Intersection}
   */
  static intersectLineLine(
    a1: Point,
    a2: Point,
    b1: Point,
    b2: Point,
    aInfinite = true,
    bInfinite = true,
  ): Intersection {
    const a2xa1x = a2.x - a1.x,
      a2ya1y = a2.y - a1.y,
      b2xb1x = b2.x - b1.x,
      b2yb1y = b2.y - b1.y,
      a1xb1x = a1.x - b1.x,
      a1yb1y = a1.y - b1.y,
      uaT = b2xb1x * a1yb1y - b2yb1y * a1xb1x,
      ubT = a2xa1x * a1yb1y - a2ya1y * a1xb1x,
      uB = b2yb1y * a2xa1x - b2xb1x * a2ya1y;
    if (uB !== 0) {
      const ua = uaT / uB,
        ub = ubT / uB;
      if (
        (aInfinite || (0 <= ua && ua <= 1)) &&
        (bInfinite || (0 <= ub && ub <= 1))
      ) {
        return new Intersection('Intersection').append(
          new Point(a1.x + ua * a2xa1x, a1.y + ua * a2ya1y),
        );
      } else {
        return new Intersection();
      }
    } else {
      if (uaT === 0 || ubT === 0) {
        const segmentsCoincide =
          aInfinite ||
          bInfinite ||
          Intersection.isPointContained(a1, b1, b2) ||
          Intersection.isPointContained(a2, b1, b2) ||
          Intersection.isPointContained(b1, a1, a2) ||
          Intersection.isPointContained(b2, a1, a2);
        return new Intersection(segmentsCoincide ? 'Coincident' : undefined);
      } else {
        return new Intersection('Parallel');
      }
    }
  }

  /**
   * 检查线段是否与直线相交
   * @see {@link intersectLineLine} 用于直线相交
   * @param {Point} s1 线段的边界点
   * @param {Point} s2 线段的另一个边界点
   * @param {Point} l1 直线上的点
   * @param {Point} l2 直线上的另一个点
   * @return {Intersection} 相交结果
   *
   * Checks if a segment intersects a line
   * @see {@link intersectLineLine} for line intersection
   * @param {Point} s1 boundary point of segment
   * @param {Point} s2 other boundary point of segment
   * @param {Point} l1 point on line
   * @param {Point} l2 other point on line
   * @return {Intersection}
   */
  static intersectSegmentLine(
    s1: Point,
    s2: Point,
    l1: Point,
    l2: Point,
  ): Intersection {
    return Intersection.intersectLineLine(s1, s2, l1, l2, false, true);
  }

  /**
   * 检查线段是否与另一条线段相交
   * @see {@link intersectLineLine} 用于直线相交
   * @param {Point} a1 线段的边界点
   * @param {Point} a2 线段的另一个边界点
   * @param {Point} b1 线段的边界点
   * @param {Point} b2 线段的另一个边界点
   * @return {Intersection} 相交结果
   *
   * Checks if a segment intersects another
   * @see {@link intersectLineLine} for line intersection
   * @param {Point} a1 boundary point of segment
   * @param {Point} a2 other boundary point of segment
   * @param {Point} b1 boundary point of segment
   * @param {Point} b2 other boundary point of segment
   * @return {Intersection}
   */
  static intersectSegmentSegment(
    a1: Point,
    a2: Point,
    b1: Point,
    b2: Point,
  ): Intersection {
    return Intersection.intersectLineLine(a1, a2, b1, b2, false, false);
  }

  /**
   * 检查直线是否与多边形相交
   *
   * @todo account for stroke
   *
   * @see {@link intersectSegmentPolygon} 用于线段相交
   * @param {Point} a1 直线上的点
   * @param {Point} a2 直线上的另一个点
   * @param {Point[]} points 多边形的点
   * @param {boolean} [infinite=true] 通过传递 `false` 检查线段相交
   * @return {Intersection} 相交结果
   *
   * Checks if line intersects polygon
   *
   * @todo account for stroke
   *
   * @see {@link intersectSegmentPolygon} for segment intersection
   * @param {Point} a1 point on line
   * @param {Point} a2 other point on line
   * @param {Point[]} points polygon points
   * @param {boolean} [infinite=true] check segment intersection by passing `false`
   * @return {Intersection}
   */
  static intersectLinePolygon(
    a1: Point,
    a2: Point,
    points: Point[],
    infinite = true,
  ): Intersection {
    const result = new Intersection();
    const length = points.length;

    for (let i = 0, b1, b2, inter; i < length; i++) {
      b1 = points[i];
      b2 = points[(i + 1) % length];
      inter = Intersection.intersectLineLine(a1, a2, b1, b2, infinite, false);
      if (inter.status === 'Coincident') {
        return inter;
      }
      result.append(...inter.points);
    }

    if (result.points.length > 0) {
      result.status = 'Intersection';
    }

    return result;
  }

  /**
   * 检查线段是否与多边形相交
   * @see {@link intersectLinePolygon} 用于直线相交
   * @param {Point} a1 线段的边界点
   * @param {Point} a2 线段的另一个边界点
   * @param {Point[]} points 多边形的点
   * @return {Intersection} 相交结果
   *
   * Checks if segment intersects polygon
   * @see {@link intersectLinePolygon} for line intersection
   * @param {Point} a1 boundary point of segment
   * @param {Point} a2 other boundary point of segment
   * @param {Point[]} points polygon points
   * @return {Intersection}
   */
  static intersectSegmentPolygon(
    a1: Point,
    a2: Point,
    points: Point[],
  ): Intersection {
    return Intersection.intersectLinePolygon(a1, a2, points, false);
  }

  /**
   * 检查多边形是否与另一个多边形相交
   *
   * @todo account for stroke
   *
   * @param {Point[]} points1 第一个多边形的点
   * @param {Point[]} points2 第二个多边形的点
   * @return {Intersection} 相交结果
   *
   * Checks if polygon intersects another polygon
   *
   * @todo account for stroke
   *
   * @param {Point[]} points1
   * @param {Point[]} points2
   * @return {Intersection}
   */
  static intersectPolygonPolygon(
    points1: Point[],
    points2: Point[],
  ): Intersection {
    const result = new Intersection(),
      length = points1.length;
    const coincidences: Intersection[] = [];

    for (let i = 0; i < length; i++) {
      const a1 = points1[i],
        a2 = points1[(i + 1) % length],
        inter = Intersection.intersectSegmentPolygon(a1, a2, points2);
      if (inter.status === 'Coincident') {
        coincidences.push(inter);
        result.append(a1, a2);
      } else {
        result.append(...inter.points);
      }
    }

    if (coincidences.length > 0 && coincidences.length === points1.length) {
      return new Intersection('Coincident');
    } else if (result.points.length > 0) {
      result.status = 'Intersection';
    }

    return result;
  }

  /**
   * 检查多边形是否与矩形相交
   * @see {@link intersectPolygonPolygon} 用于多边形相交
   * @param {Point[]} points 多边形的点
   * @param {Point} r1 矩形的左上角点
   * @param {Point} r2 矩形的右下角点
   * @return {Intersection} 相交结果
   *
   * Checks if polygon intersects rectangle
   * @see {@link intersectPolygonPolygon} for polygon intersection
   * @param {Point[]} points polygon points
   * @param {Point} r1 top left point of rect
   * @param {Point} r2 bottom right point of rect
   * @return {Intersection}
   */
  static intersectPolygonRectangle(
    points: Point[],
    r1: Point,
    r2: Point,
  ): Intersection {
    const min = r1.min(r2),
      max = r1.max(r2),
      topRight = new Point(max.x, min.y),
      bottomLeft = new Point(min.x, max.y);

    return Intersection.intersectPolygonPolygon(points, [
      min,
      topRight,
      max,
      bottomLeft,
    ]);
  }
}
