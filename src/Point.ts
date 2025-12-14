import type { TMat2D, TRadian } from './typedefs';
import { cos } from './util/misc/cos';
import { sin } from './util/misc/sin';

/**
 * 坐标接口
 */
export interface XY {
  /**
   * X 坐标
   */
  x: number;
  /**
   * Y 坐标
   */
  y: number;
}

/**
 * 点类
 * 改编自 Kevin Lindsey (kevin@kevlindev.com) 的作品
 *
 * Adaptation of work of Kevin Lindsey(kevin@kevlindev.com)
 */
export class Point implements XY {
  /**
   * X 坐标
   */
  declare x: number;

  /**
   * Y 坐标
   */
  declare y: number;

  constructor();
  constructor(x: number, y: number);
  constructor(point?: XY);
  constructor(arg0: number | XY = 0, y = 0) {
    if (typeof arg0 === 'object') {
      this.x = arg0.x;
      this.y = arg0.y;
    } else {
      this.x = arg0;
      this.y = y;
    }
  }

  /**
   * 将另一个点加到此点上，并返回一个包含和的新点
   * @param {XY} that 另一个点
   * @return {Point} 包含相加值的新 Point 实例
   *
   * Adds another point to this one and returns a new one with the sum
   * @param {XY} that
   * @return {Point} new Point instance with added values
   */
  add(that: XY): Point {
    return new Point(this.x + that.x, this.y + that.y);
  }

  /**
   * 将另一个点加到此点上（修改自身）
   * @param {XY} that 另一个点
   * @return {Point} 当前实例
   * @deprecated
   *
   * Adds another point to this one
   * @param {XY} that
   * @return {Point} thisArg
   * @deprecated
   */
  addEquals(that: XY): Point {
    this.x += that.x;
    this.y += that.y;
    return this;
  }

  /**
   * 将数值加到此点上，并返回一个新点
   * @param {Number} scalar 要加的数值
   * @return {Point} 包含相加值的新 Point 实例
   *
   * Adds value to this point and returns a new one
   * @param {Number} scalar
   * @return {Point} new Point with added value
   */
  scalarAdd(scalar: number): Point {
    return new Point(this.x + scalar, this.y + scalar);
  }

  /**
   * 将数值加到此点上（修改自身）
   * @param {Number} scalar 要加的数值
   * @return {Point} 当前实例
   * @deprecated
   *
   * Adds value to this point
   * @param {Number} scalar
   * @return {Point} thisArg
   * @deprecated
   */
  scalarAddEquals(scalar: number): Point {
    this.x += scalar;
    this.y += scalar;
    return this;
  }

  /**
   * 从此点减去另一个点，并返回一个新点
   * @param {XY} that 另一个点
   * @return {Point} 包含相减值的新 Point 对象
   *
   * Subtracts another point from this point and returns a new one
   * @param {XY} that
   * @return {Point} new Point object with subtracted values
   */
  subtract(that: XY): Point {
    return new Point(this.x - that.x, this.y - that.y);
  }

  /**
   * 从此点减去另一个点（修改自身）
   * @param {XY} that 另一个点
   * @return {Point} 当前实例
   * @deprecated
   *
   * Subtracts another point from this point
   * @param {XY} that
   * @return {Point} thisArg
   * @deprecated
   */
  subtractEquals(that: XY): Point {
    this.x -= that.x;
    this.y -= that.y;
    return this;
  }

  /**
   * 从此点减去数值，并返回一个新点
   * @param {Number} scalar 要减去的数值
   * @return {Point} 包含相减值的新 Point 实例
   *
   * Subtracts value from this point and returns a new one
   * @param {Number} scalar
   * @return {Point}
   */
  scalarSubtract(scalar: number): Point {
    return new Point(this.x - scalar, this.y - scalar);
  }

  /**
   * 从此点减去数值（修改自身）
   * @param {Number} scalar 要减去的数值
   * @return {Point} 当前实例
   * @deprecated
   *
   * Subtracts value from this point
   * @param {Number} scalar
   * @return {Point} thisArg
   * @deprecated
   */
  scalarSubtractEquals(scalar: number): Point {
    this.x -= scalar;
    this.y -= scalar;
    return this;
  }

  /**
   * 将此点乘以另一个点的值，并返回一个新点
   * @param {XY} that 另一个点
   * @return {Point} 包含相乘值的新 Point 实例
   *
   * Multiplies this point by another value and returns a new one
   * @param {XY} that
   * @return {Point}
   */
  multiply(that: XY): Point {
    return new Point(this.x * that.x, this.y * that.y);
  }

  /**
   * 将此点乘以一个数值，并返回一个新点
   * @param {Number} scalar 乘数
   * @return {Point} 包含相乘值的新 Point 实例
   *
   * Multiplies this point by a value and returns a new one
   * @param {Number} scalar
   * @return {Point}
   */
  scalarMultiply(scalar: number): Point {
    return new Point(this.x * scalar, this.y * scalar);
  }

  /**
   * 将此点乘以一个数值（修改自身）
   * @param {Number} scalar 乘数
   * @return {Point} 当前实例
   * @deprecated
   *
   * Multiplies this point by a value
   * @param {Number} scalar
   * @return {Point} thisArg
   * @deprecated
   */
  scalarMultiplyEquals(scalar: number): Point {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * 将此点除以另一个点，并返回一个新点
   * @param {XY} that 另一个点
   * @return {Point} 包含相除值的新 Point 实例
   *
   * Divides this point by another and returns a new one
   * @param {XY} that
   * @return {Point}
   */
  divide(that: XY): Point {
    return new Point(this.x / that.x, this.y / that.y);
  }

  /**
   * 将此点除以一个数值，并返回一个新点
   * @param {Number} scalar 除数
   * @return {Point} 包含相除值的新 Point 实例
   *
   * Divides this point by a value and returns a new one
   * @param {Number} scalar
   * @return {Point}
   */
  scalarDivide(scalar: number): Point {
    return new Point(this.x / scalar, this.y / scalar);
  }

  /**
   * 将此点除以一个数值（修改自身）
   * @param {Number} scalar 除数
   * @return {Point} 当前实例
   * @deprecated
   *
   * Divides this point by a value
   * @param {Number} scalar
   * @return {Point} thisArg
   * @deprecated
   */
  scalarDivideEquals(scalar: number): Point {
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  /**
   * 如果此点等于另一个点，则返回 true
   * @param {XY} that 另一个点
   * @return {Boolean} 如果相等则返回 true
   *
   * Returns true if this point is equal to another one
   * @param {XY} that
   * @return {Boolean}
   */
  eq(that: XY): boolean {
    return this.x === that.x && this.y === that.y;
  }

  /**
   * 如果此点小于另一个点，则返回 true
   * @param {XY} that 另一个点
   * @return {Boolean} 如果小于则返回 true
   *
   * Returns true if this point is less than another one
   * @param {XY} that
   * @return {Boolean}
   */
  lt(that: XY): boolean {
    return this.x < that.x && this.y < that.y;
  }

  /**
   * 如果此点小于或等于另一个点，则返回 true
   * @param {XY} that 另一个点
   * @return {Boolean} 如果小于或等于则返回 true
   *
   * Returns true if this point is less than or equal to another one
   * @param {XY} that
   * @return {Boolean}
   */
  lte(that: XY): boolean {
    return this.x <= that.x && this.y <= that.y;
  }

  /**
   * 如果此点大于另一个点，则返回 true
   * @param {XY} that 另一个点
   * @return {Boolean} 如果大于则返回 true
   *
   * Returns true if this point is greater another one
   * @param {XY} that
   * @return {Boolean}
   */
  gt(that: XY): boolean {
    return this.x > that.x && this.y > that.y;
  }

  /**
   * 如果此点大于或等于另一个点，则返回 true
   * @param {XY} that 另一个点
   * @return {Boolean} 如果大于或等于则返回 true
   *
   * Returns true if this point is greater than or equal to another one
   * @param {XY} that
   * @return {Boolean}
   */
  gte(that: XY): boolean {
    return this.x >= that.x && this.y >= that.y;
  }

  /**
   * 返回一个新点，该点是此点与另一个点的线性插值结果
   * @param {XY} that 另一个点
   * @param {Number} t 插值位置，介于 0 和 1 之间，默认为 0.5
   * @return {Point} 插值后的新 Point 实例
   *
   * Returns new point which is the result of linear interpolation with this one and another one
   * @param {XY} that
   * @param {Number} t , position of interpolation, between 0 and 1 default 0.5
   * @return {Point}
   */
  lerp(that: XY, t = 0.5): Point {
    t = Math.max(Math.min(1, t), 0);
    return new Point(
      this.x + (that.x - this.x) * t,
      this.y + (that.y - this.y) * t,
    );
  }

  /**
   * 返回此点与另一个点之间的距离
   * @param {XY} that 另一个点
   * @return {Number} 距离
   *
   * Returns distance from this point and another one
   * @param {XY} that
   * @return {Number}
   */
  distanceFrom(that: XY): number {
    const dx = this.x - that.x,
      dy = this.y - that.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 返回此点与另一个点之间的中点
   * @param {XY} that 另一个点
   * @return {Point} 中点
   *
   * Returns the point between this point and another one
   * @param {XY} that
   * @return {Point}
   */
  midPointFrom(that: XY): Point {
    return this.lerp(that);
  }

  /**
   * 返回一个新点，该点是此点与另一个点的最小值
   * @param {XY} that 另一个点
   * @return {Point} 包含最小坐标的新 Point 实例
   *
   * Returns a new point which is the min of this and another one
   * @param {XY} that
   * @return {Point}
   */
  min(that: XY): Point {
    return new Point(Math.min(this.x, that.x), Math.min(this.y, that.y));
  }

  /**
   * 返回一个新点，该点是此点与另一个点的最大值
   * @param {XY} that 另一个点
   * @return {Point} 包含最大坐标的新 Point 实例
   *
   * Returns a new point which is the max of this and another one
   * @param {XY} that
   * @return {Point}
   */
  max(that: XY): Point {
    return new Point(Math.max(this.x, that.x), Math.max(this.y, that.y));
  }

  /**
   * 返回此点的字符串表示形式
   * @return {String} 字符串表示
   *
   * Returns string representation of this point
   * @return {String}
   */
  toString(): string {
    return `${this.x},${this.y}`;
  }

  /**
   * 设置此点的 x/y 坐标
   * @param {Number} x X 坐标
   * @param {Number} y Y 坐标
   *
   * Sets x/y of this point
   * @param {Number} x
   * @param {Number} y
   */
  setXY(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * 设置此点的 x 坐标
   * @param {Number} x X 坐标
   *
   * Sets x of this point
   * @param {Number} x
   */
  setX(x: number) {
    this.x = x;
    return this;
  }

  /**
   * 设置此点的 y 坐标
   * @param {Number} y Y 坐标
   *
   * Sets y of this point
   * @param {Number} y
   */
  setY(y: number) {
    this.y = y;
    return this;
  }

  /**
   * 从另一个点设置此点的 x/y 坐标
   * @param {XY} that 另一个点
   *
   * Sets x/y of this point from another point
   * @param {XY} that
   */
  setFromPoint(that: XY) {
    this.x = that.x;
    this.y = that.y;
    return this;
  }

  /**
   * 交换此点与另一个点的 x/y 坐标
   * @param {XY} that 另一个点
   *
   * Swaps x/y of this point and another point
   * @param {XY} that
   */
  swap(that: XY) {
    const x = this.x,
      y = this.y;
    this.x = that.x;
    this.y = that.y;
    that.x = x;
    that.y = y;
  }

  /**
   * 返回此点的克隆实例
   * @return {Point} 克隆的 Point 实例
   *
   * return a cloned instance of the point
   * @return {Point}
   */
  clone(): Point {
    return new Point(this.x, this.y);
  }

  /**
   * 将 `point` 绕 `origin` 旋转 `radians` 弧度
   * @param {XY} origin 旋转原点
   * @param {TRadian} radians 旋转角度（弧度）
   * @return {Point} 旋转后的新点
   *
   * Rotates `point` around `origin` with `radians`
   * @param {XY} origin The origin of the rotation
   * @param {TRadian} radians The radians of the angle for the rotation
   * @return {Point} The new rotated point
   */
  rotate(radians: TRadian, origin: XY = ZERO): Point {
    // TODO benchmark and verify the add and subtract how much cost
    // and then in case early return if no origin is passed
    const sinus = sin(radians),
      cosinus = cos(radians);
    const p = this.subtract(origin);
    const rotated = new Point(
      p.x * cosinus - p.y * sinus,
      p.x * sinus + p.y * cosinus,
    );
    return rotated.add(origin);
  }

  /**
   * 对点 p 应用变换 t
   * @param  {TMat2D} t 变换矩阵
   * @param  {Boolean} [ignoreOffset] 指示是否应忽略偏移
   * @return {Point} 变换后的点
   *
   * Apply transform t to point p
   * @param  {TMat2D} t The transform
   * @param  {Boolean} [ignoreOffset] Indicates that the offset should not be applied
   * @return {Point} The transformed point
   */
  transform(t: TMat2D, ignoreOffset = false): Point {
    return new Point(
      t[0] * this.x + t[2] * this.y + (ignoreOffset ? 0 : t[4]),
      t[1] * this.x + t[3] * this.y + (ignoreOffset ? 0 : t[5]),
    );
  }
}

/**
 * 零点 (0, 0)
 */
export const ZERO = new Point(0, 0);
