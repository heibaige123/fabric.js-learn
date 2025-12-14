import type { XY } from '../../Point';
import { Point } from '../../Point';
import type { TRadian } from '../../typedefs';

const unitVectorX = new Point(1, 0);
const zero = new Point();

/**
 * 用 `radians` 旋转 `vector`
 * @param vector 要旋转的向量（x 和 y）
 * @param radians 旋转角度的弧度
 * @returns 新的旋转点
 *
 * Rotates `vector` with `radians`
 * @param {Point} vector The vector to rotate (x and y)
 * @param {Number} radians The radians of the angle for the rotation
 * @return {Point} The new rotated point
 */
export const rotateVector = (vector: Point, radians: TRadian) =>
  vector.rotate(radians);

/**
 * 从表示为点的点创建向量
 *
 * @param from 起点
 * @param to 终点
 * @returns 向量
 *
 * Creates a vector from points represented as a point
 *
 * @param {Point} from
 * @param {Point} to
 * @returns {Point} vector
 */
export const createVector = (from: XY, to: XY): Point =>
  new Point(to).subtract(from);

/**
 * 返回向量的大小
 * @returns 大小
 *
 * return the magnitude of a vector
 * @return {number}
 */
export const magnitude = (point: Point) => point.distanceFrom(zero);

/**
 * 计算 2 个向量之间的角度
 * @param a 向量 a
 * @param b 向量 b
 * @returns 从 `a` 到 `b` 的弧度角
 *
 * Calculates the angle between 2 vectors
 * @param {Point} a
 * @param {Point} b
 * @returns the angle in radians from `a` to `b`
 */
export const calcAngleBetweenVectors = (a: Point, b: Point): TRadian =>
  Math.atan2(crossProduct(a, b), dotProduct(a, b)) as TRadian;

/**
 * 计算 x 轴和向量之间的角度
 * @param v 向量
 * @returns `v` 的弧度角
 *
 * Calculates the angle between the x axis and the vector
 * @param {Point} v
 * @returns the angle in radians of `v`
 */
export const calcVectorRotation = (v: Point) =>
  calcAngleBetweenVectors(unitVectorX, v);

/**
 * @param v 向量
 * @returns 表示指向 `v` 方向的单位向量的向量
 *
 * @param {Point} v
 * @returns {Point} vector representing the unit vector pointing to the direction of `v`
 */
export const getUnitVector = (v: Point): Point =>
  v.eq(zero) ? v : v.scalarDivide(magnitude(v));

/**
 * @param v 向量
 * @param [counterClockwise] 正交向量的方向，默认为 `true`
 * @returns 单位正交向量
 *
 * @param {Point} v
 * @param {Boolean} [counterClockwise] the direction of the orthogonal vector, defaults to `true`
 * @returns {Point} the unit orthogonal vector
 */
export const getOrthonormalVector = (
  v: Point,
  counterClockwise = true,
): Point =>
  getUnitVector(new Point(-v.y, v.x).scalarMultiply(counterClockwise ? 1 : -1));

/**
 * 2D 中两个向量的叉积
 * @param a 向量 a
 * @param b 向量 b
 * @returns Z 向量的大小
 *
 * Cross product of two vectors in 2D
 * @param {Point} a
 * @param {Point} b
 * @returns {number} the magnitude of Z vector
 */
export const crossProduct = (a: Point, b: Point): number =>
  a.x * b.y - a.y * b.x;

/**
 * 2D 中两个向量的点积
 * @param a 向量 a
 * @param b 向量 b
 * @returns 点积
 *
 * Dot product of two vectors in 2D
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export const dotProduct = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

/**
 * 检查向量是否在另外两个向量之间。
 * 当要测试的向量在逆时针方向上位于初始向量和最终向量（包括）之间时，
 * 认为它在内部。
 * @param t 要测试的向量
 * @param a 初始向量
 * @param b 最终向量
 * @returns 如果向量在其他向量之间，则为 true
 *
 * Checks if the vector is between two others. It is considered
 * to be inside when the vector to be tested is between the
 * initial vector and the final vector (included) in a counterclockwise direction.
 * @param {Point} t vector to be tested
 * @param {Point} a initial vector
 * @param {Point} b final vector
 * @returns {boolean} true if the vector is among the others
 */
export const isBetweenVectors = (t: Point, a: Point, b: Point): boolean => {
  if (t.eq(a) || t.eq(b)) return true;
  const AxB = crossProduct(a, b),
    AxT = crossProduct(a, t),
    BxT = crossProduct(b, t);
  return AxB >= 0 ? AxT >= 0 && BxT <= 0 : !(AxT <= 0 && BxT >= 0);
};
