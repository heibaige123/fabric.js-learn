import type {
  TBBox,
  TCornerPoint,
  TDegree,
  TMat2D,
  TOriginX,
  TOriginY,
} from '../../typedefs';
import { SCALE_X, SCALE_Y, iMatrix } from '../../constants';
import { Intersection } from '../../Intersection';
import { Point } from '../../Point';
import { makeBoundingBoxFromPoints } from '../../util/misc/boundingBoxFromPoints';
import {
  createRotateMatrix,
  createTranslateMatrix,
  composeMatrix,
  invertTransform,
  multiplyTransformMatrices,
  transformPoint,
  calcPlaneRotation,
} from '../../util/misc/matrix';
import { radiansToDegrees } from '../../util/misc/radiansDegreesConversion';
import type { Canvas } from '../../canvas/Canvas';
import type { StaticCanvas } from '../../canvas/StaticCanvas';
import type { ObjectEvents } from '../../EventTypeDefs';
import type { ControlProps } from './types/ControlProps';
import { resolveOrigin } from '../../util/misc/resolveOrigin';
import type { Group } from '../Group';
import { calcDimensionsMatrix } from '../../util/misc/matrix';
import { sizeAfterTransform } from '../../util/misc/objectTransforms';
import { degreesToRadians } from '../../util/misc/radiansDegreesConversion';
import { CommonMethods } from '../../CommonMethods';
import type { BaseProps } from './types/BaseProps';
import type { FillStrokeProps } from './types/FillStrokeProps';
import { CENTER, LEFT, TOP } from '../../constants';

type TMatrixCache = {
  key: number[];
  value: TMat2D;
};

type TACoords = TCornerPoint;

/**
 * 对象几何类，包含与对象位置、尺寸和变换相关的方法
 *
 * Object geometry class, contains methods related to object position, dimensions and transformations
 */
export class ObjectGeometry<EventSpec extends ObjectEvents = ObjectEvents>
  extends CommonMethods<EventSpec>
  implements
    Pick<ControlProps, 'padding'>,
    BaseProps,
    Pick<FillStrokeProps, 'strokeWidth' | 'strokeUniform'>
{
  // #region Geometry

  declare padding: number;

  /**
   * 描述对象在场景坐标中的角位置。
   * 坐标源自以下属性：
   * left, top, width, height, scaleX, scaleY, skewX, skewY, angle, strokeWidth。
   * 坐标不依赖于视口更改。
   * 坐标通过 {@link setCoords} 更新。
   * 您可以使用 {@link calcACoords()} 计算它们而不更新
   *
   * Describe object's corner position in scene coordinates.
   * The coordinates are derived from the following:
   * left, top, width, height, scaleX, scaleY, skewX, skewY, angle, strokeWidth.
   * The coordinates do not depend on viewport changes.
   * The coordinates get updated with {@link setCoords}.
   * You can calculate them without updating with {@link calcACoords()}
   */
  declare aCoords: TACoords;

  /**
   * 对象变换矩阵的存储缓存
   *
   * storage cache for object transform matrix
   */
  declare ownMatrixCache?: TMatrixCache;

  /**
   * 对象完整变换矩阵的存储缓存
   *
   * storage cache for object full transform matrix
   */
  declare matrixCache?: TMatrixCache;

  /**
   * 对象实际添加到的 Canvas 的引用
   *
   * A Reference of the Canvas where the object is actually added
   * @type StaticCanvas | Canvas;
   * @default undefined
   * @private
   */
  declare canvas?: StaticCanvas | Canvas;

  /**
   * 获取根据对象 originX 属性在画布坐标平面中的 x 位置
   *
   * @returns {number} x position according to object's originX property in canvas coordinate plane
   * @returns {number} 根据对象 originX 属性在画布坐标平面中的 x 位置
   */
  getX(): number {
    return this.getXY().x;
  }

  /**
   * 设置根据对象 originX 属性在画布坐标平面中的 x 位置
   *
   * @param {number} value x position according to object's originX property in canvas coordinate plane
   * @param {number} value 根据对象 originX 属性在画布坐标平面中的 x 位置
   */
  setX(value: number) {
    this.setXY(this.getXY().setX(value));
  }

  /**
   * 获取根据对象 originY 属性在画布坐标平面中的 y 位置
   *
   * @returns {number} y position according to object's originY property in canvas coordinate plane
   * @returns {number} 根据对象 originY 属性在画布坐标平面中的 y 位置
   */
  getY(): number {
    return this.getXY().y;
  }

  /**
   * 设置根据对象 originY 属性在画布坐标平面中的 y 位置
   *
   * @param {number} value y position according to object's originY property in canvas coordinate plane
   * @param {number} value 根据对象 originY 属性在画布坐标平面中的 y 位置
   */
  setY(value: number) {
    this.setXY(this.getXY().setY(value));
  }

  /**
   * 获取根据对象 originX 属性在父级坐标平面中的 x 位置
   * 如果父级是画布，则此属性与 {@link getX} 相同
   *
   * @returns {number} x position according to object's originX property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link getX}
   * @returns {number} 根据对象 originX 属性在父级坐标平面中的 x 位置\
   * 如果父级是画布，则此属性与 {@link getX} 相同
   */
  getRelativeX(): number {
    return this.left;
  }

  /**
   * 设置根据对象 originX 属性在父级坐标平面中的 x 位置
   * 如果父级是画布，则此方法与 {@link setX} 相同
   *
   * @param {number} value x position according to object's originX property in parent's coordinate plane\
   * if parent is canvas then this method is identical to {@link setX}
   * @param {number} value 根据对象 originX 属性在父级坐标平面中的 x 位置\
   * 如果父级是画布，则此方法与 {@link setX} 相同
   */
  setRelativeX(value: number) {
    this.left = value;
  }

  /**
   * 获取根据对象 originY 属性在父级坐标平面中的 y 位置
   * 如果父级是画布，则此属性与 {@link getY} 相同
   *
   * @returns {number} y position according to object's originY property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link getY}
   * @returns {number} 根据对象 originY 属性在父级坐标平面中的 y 位置\
   * 如果父级是画布，则此属性与 {@link getY} 相同
   */
  getRelativeY(): number {
    return this.top;
  }

  /**
   * 设置根据对象 originY 属性在父级坐标平面中的 y 位置
   * 如果父级是画布，则此属性与 {@link setY} 相同
   *
   * @param {number} value y position according to object's originY property in parent's coordinate plane\
   * if parent is canvas then this property is identical to {@link setY}
   * @param {number} value 根据对象 originY 属性在父级坐标平面中的 y 位置\
   * 如果父级是画布，则此属性与 {@link setY} 相同
   */
  setRelativeY(value: number) {
    this.top = value;
  }

  /**
   * 获取根据对象 originX originY 属性在画布坐标平面中的 x 位置
   *
   * @returns {Point} x position according to object's originX originY properties in canvas coordinate plane
   * @returns {Point} 根据对象 originX originY 属性在画布坐标平面中的 x 位置
   */
  getXY(): Point {
    const relativePosition = this.getRelativeXY();
    return this.group
      ? transformPoint(relativePosition, this.group.calcTransformMatrix())
      : relativePosition;
  }

  /**
   * 将对象位置设置为特定点，该点旨在绝对（画布）坐标中。
   * 您可以指定 originX 和 originY 值，
   * 否则为对象的当前值。
   *
   * Set an object position to a particular point, the point is intended in absolute ( canvas ) coordinate.
   * You can specify originX and originY values,
   * that otherwise are the object's current values.
   * @example <caption>Set object's bottom left corner to point (5,5) on canvas</caption>
   * object.setXY(new Point(5, 5), 'left', 'bottom').
   * @param {Point} point position in scene coordinate plane
   * @param {Point} point 场景坐标平面中的位置
   * @param {TOriginX} [originX] Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginX} [originX] 水平原点：'left'、'center' 或 'right'
   * @param {TOriginY} [originY] Vertical origin: 'top', 'center' or 'bottom'
   * @param {TOriginY} [originY] 垂直原点：'top'、'center' 或 'bottom'
   */
  setXY(point: Point, originX?: TOriginX, originY?: TOriginY) {
    if (this.group) {
      point = transformPoint(
        point,
        invertTransform(this.group.calcTransformMatrix()),
      );
    }
    this.setRelativeXY(point, originX, originY);
  }

  /**
   * 获取根据对象 originX originY 属性在父级坐标平面中的 x,y 位置
   *
   * @returns {Point} x,y position according to object's originX originY properties in parent's coordinate plane
   * @returns {Point} 根据对象 originX originY 属性在父级坐标平面中的 x,y 位置
   */
  getRelativeXY(): Point {
    return new Point(this.left, this.top);
  }

  /**
   * 与 {@link setXY} 相同，但在当前父级的坐标平面中（当前组（如果有）或画布）
   *
   * As {@link setXY}, but in current parent's coordinate plane (the current group if any or the canvas)
   * @param {Point} point position according to object's originX originY properties in parent's coordinate plane
   * @param {Point} point 根据对象 originX originY 属性在父级坐标平面中的位置
   * @param {TOriginX} [originX] Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginX} [originX] 水平原点：'left'、'center' 或 'right'
   * @param {TOriginY} [originY] Vertical origin: 'top', 'center' or 'bottom'
   * @param {TOriginY} [originY] 垂直原点：'top'、'center' 或 'bottom'
   */
  setRelativeXY(
    point: Point,
    originX: TOriginX = this.originX,
    originY: TOriginY = this.originY,
  ) {
    this.setPositionByOrigin(point, originX, originY);
  }

  /**
   * @deprecated intermidiate method to be removed, do not use
   */
  protected isStrokeAccountedForInDimensions() {
    return false;
  }

  /**
   * 获取场景平面中的 [tl, tr, br, bl]
   *
   * @return {Point[]} [tl, tr, br, bl] in the scene plane
   * @return {Point[]} 场景平面中的 [tl, tr, br, bl]
   */
  getCoords(): Point[] {
    const { tl, tr, br, bl } =
      this.aCoords || (this.aCoords = this.calcACoords());
    const coords = [tl, tr, br, bl];
    if (this.group) {
      const t = this.group.calcTransformMatrix();
      return coords.map((p) => transformPoint(p, t));
    }
    return coords;
  }

  /**
   * Checks if object intersects with the scene rect formed by tl and br
   * 检查对象是否与由 tl 和 br 形成的场景矩形相交
   * @param {Point} tl Top-left point of the rectangle
   * @param {Point} tl 矩形的左上角点
   * @param {Point} br Bottom-right point of the rectangle
   * @param {Point} br 矩形的右下角点
   * @returns {boolean}
   */
  intersectsWithRect(tl: Point, br: Point): boolean {
    const intersection = Intersection.intersectPolygonRectangle(
      this.getCoords(),
      tl,
      br,
    );
    return intersection.status === 'Intersection';
  }

  /**
   * Checks if object intersects with another object
   * 检查对象是否与另一个对象相交
   * @param {Object} other Object to test
   * @param {Object} other 要测试的对象
   * @return {Boolean} true if object intersects with another object
   * @return {Boolean} 如果对象与另一个对象相交，则为 true
   */
  intersectsWithObject(other: ObjectGeometry): boolean {
    const intersection = Intersection.intersectPolygonPolygon(
      this.getCoords(),
      other.getCoords(),
    );

    return (
      intersection.status === 'Intersection' ||
      intersection.status === 'Coincident' ||
      other.isContainedWithinObject(this) ||
      this.isContainedWithinObject(other)
    );
  }

  /**
   * Checks if object is fully contained within area of another object
   * 检查对象是否完全包含在另一个对象的区域内
   * @param {Object} other Object to test
   * @param {Object} other 要测试的对象
   * @return {Boolean} true if object is fully contained within area of another object
   * @return {Boolean} 如果对象完全包含在另一个对象的区域内，则为 true
   */
  isContainedWithinObject(other: ObjectGeometry): boolean {
    const points = this.getCoords();
    return points.every((point) => other.containsPoint(point));
  }

  /**
   * Checks if object is fully contained within the scene rect formed by tl and br
   * 检查对象是否完全包含在由 tl 和 br 形成的场景矩形内
   * @param {Point} tl Top-left point of the rectangle
   * @param {Point} tl 矩形的左上角点
   * @param {Point} br Bottom-right point of the rectangle
   * @param {Point} br 矩形的右下角点
   * @returns {boolean}
   */
  isContainedWithinRect(tl: Point, br: Point): boolean {
    const { left, top, width, height } = this.getBoundingRect();
    return (
      left >= tl.x &&
      left + width <= br.x &&
      top >= tl.y &&
      top + height <= br.y
    );
  }

  /**
   * Checks if object is overlapping with another object
   * 检查对象是否与另一个对象重叠
   * @param {ObjectGeometry} other Object to test
   * @param {ObjectGeometry} other 要测试的对象
   * @returns {boolean}
   */
  isOverlapping<T extends ObjectGeometry>(other: T): boolean {
    return (
      this.intersectsWithObject(other) ||
      this.isContainedWithinObject(other) ||
      other.isContainedWithinObject(this)
    );
  }

  /**
   * Checks if point is inside the object
   * 检查点是否在对象内部
   * @param {Point} point Point to check against
   * @param {Point} point 要检查的点
   * @return {Boolean} true if point is inside the object
   * @return {Boolean} 如果点在对象内部，则为 true
   */
  containsPoint(point: Point): boolean {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  /**
   * Checks if object is contained within the canvas with current viewportTransform
   * the check is done stopping at first point that appears on screen
   * 检查对象是否包含在具有当前 viewportTransform 的画布中
   * 检查在屏幕上出现的第一个点处停止
   * @return {Boolean} true if object is fully or partially contained within canvas
   * @return {Boolean} 如果对象完全或部分包含在画布中，则为 true
   */
  isOnScreen(): boolean {
    if (!this.canvas) {
      return false;
    }
    const { tl, br } = this.canvas.vptCoords;
    const points = this.getCoords();
    // if some point is on screen, the object is on screen.
    if (
      points.some(
        (point) =>
          point.x <= br.x &&
          point.x >= tl.x &&
          point.y <= br.y &&
          point.y >= tl.y,
      )
    ) {
      return true;
    }
    // no points on screen, check intersection with absolute coordinates
    if (this.intersectsWithRect(tl, br)) {
      return true;
    }
    // check if the object is so big that it contains the entire viewport
    return this.containsPoint(tl.midPointFrom(br));
  }

  /**
   * Checks if object is partially contained within the canvas with current viewportTransform
   * 检查对象是否部分包含在当前 viewportTransform 的画布中
   * @return {Boolean} true if object is partially contained within canvas
   */
  isPartiallyOnScreen(): boolean {
    if (!this.canvas) {
      return false;
    }
    const { tl, br } = this.canvas.vptCoords;
    if (this.intersectsWithRect(tl, br)) {
      return true;
    }
    const allPointsAreOutside = this.getCoords().every(
      (point) =>
        (point.x >= br.x || point.x <= tl.x) &&
        (point.y >= br.y || point.y <= tl.y),
    );
    // check if the object is so big that it contains the entire viewport
    return allPointsAreOutside && this.containsPoint(tl.midPointFrom(br));
  }

  /**
   * Returns coordinates of object's bounding rectangle (left, top, width, height)
   * the box is intended as aligned to axis of canvas.
   * 返回对象的边界矩形坐标（left, top, width, height）
   * 该框旨在与画布轴对齐。
   * @return {Object} Object with left, top, width, height properties
   */
  getBoundingRect(): TBBox {
    return makeBoundingBoxFromPoints(this.getCoords());
  }

  /**
   * Returns width of an object's bounding box counting transformations
   * 返回计算变换后的对象边界框宽度
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} width value
   */
  getScaledWidth(): number {
    return this._getTransformedDimensions().x;
  }

  /**
   * Returns height of an object bounding box counting transformations
   * 返回计算变换后的对象边界框高度
   * @todo shouldn't this account for group transform and return the actual size in canvas coordinate plane?
   * @return {Number} height value
   */
  getScaledHeight(): number {
    return this._getTransformedDimensions().y;
  }

  /**
   * Scales an object (equally by x and y)
   * 缩放对象（x 和 y 等比例）
   * @param {Number} value Scale factor
   * @param {Number} value 缩放因子
   * @return {void}
   */
  scale(value: number): void {
    this._set(SCALE_X, value);
    this._set(SCALE_Y, value);
    this.setCoords();
  }

  /**
   * Scales an object to a given width, with respect to bounding box (scaling by x/y equally)
   * 将对象缩放到给定的宽度，相对于边界框（x/y 等比例缩放）
   * @param {Number} value New width value
   * @param {Number} value 新的宽度值
   * @return {void}
   */
  scaleToWidth(value: number) {
    // adjust to bounding rect factor so that rotated shapes would fit as well
    const boundingRectFactor =
      this.getBoundingRect().width / this.getScaledWidth();
    return this.scale(value / this.width / boundingRectFactor);
  }

  /**
   * Scales an object to a given height, with respect to bounding box (scaling by x/y equally)
   * 将对象缩放到给定的高度，相对于边界框（x/y 等比例缩放）
   * @param {Number} value New height value
   * @param {Number} value 新的高度值
   * @return {void}
   */
  scaleToHeight(value: number) {
    // adjust to bounding rect factor so that rotated shapes would fit as well
    const boundingRectFactor =
      this.getBoundingRect().height / this.getScaledHeight();
    return this.scale(value / this.height / boundingRectFactor);
  }

  getCanvasRetinaScaling() {
    return this.canvas?.getRetinaScaling() || 1;
  }

  /**
   * Returns the object angle relative to canvas counting also the group property
   * 返回相对于画布的对象角度，也计算组属性
   * @returns {TDegree}
   */
  getTotalAngle(): TDegree {
    return this.group
      ? radiansToDegrees(calcPlaneRotation(this.calcTransformMatrix()))
      : this.angle;
  }

  /**
   * Retrieves viewportTransform from Object's canvas if available
   * 如果可用，从对象的画布检索 viewportTransform
   * @return {TMat2D}
   */
  getViewportTransform(): TMat2D {
    return this.canvas?.viewportTransform || (iMatrix.concat() as TMat2D);
  }

  /**
   * Calculates the coordinates of the 4 corner of the bbox, in absolute coordinates.
   * those never change with zoom or viewport changes.
   * 计算 bbox 的 4 个角的坐标，以绝对坐标表示。
   * 这些坐标永远不会随缩放或视口更改而更改。
   * @return {TCornerPoint}
   */
  calcACoords(): TCornerPoint {
    const rotateMatrix = createRotateMatrix({ angle: this.angle }),
      { x, y } = this.getRelativeCenterPoint(),
      tMatrix = createTranslateMatrix(x, y),
      finalMatrix = multiplyTransformMatrices(tMatrix, rotateMatrix),
      dim = this._getTransformedDimensions(),
      w = dim.x / 2,
      h = dim.y / 2;
    return {
      // corners
      tl: transformPoint({ x: -w, y: -h }, finalMatrix),
      tr: transformPoint({ x: w, y: -h }, finalMatrix),
      bl: transformPoint({ x: -w, y: h }, finalMatrix),
      br: transformPoint({ x: w, y: h }, finalMatrix),
    };
  }

  /**
   * Sets corner and controls position coordinates based on current angle, width and height, left and top.
   * aCoords are used to quickly find an object on the canvas.
   * See {@link https://github.com/fabricjs/fabric.js/wiki/When-to-call-setCoords} and {@link http://fabric5.fabricjs.com/fabric-gotchas}
   * 根据当前角度、宽度和高度、左侧和顶部设置角和控件位置坐标。
   * aCoords 用于在画布上快速查找对象。
   * 参见 {@link https://github.com/fabricjs/fabric.js/wiki/When-to-call-setCoords} 和 {@link http://fabric5.fabricjs.com/fabric-gotchas}
   */
  setCoords(): void {
    this.aCoords = this.calcACoords();
  }

  /**
   * 转换矩阵键，用于缓存变换矩阵
   * @param skipGroup 是否跳过组变换
   * @returns
   */
  transformMatrixKey(skipGroup = false): number[] {
    let prefix: number[] = [];
    if (!skipGroup && this.group) {
      prefix = this.group.transformMatrixKey(skipGroup);
    }
    prefix.push(
      this.top,
      this.left,
      this.width,
      this.height,
      this.scaleX,
      this.scaleY,
      this.angle,
      this.strokeWidth,
      this.skewX,
      this.skewY,
      +this.flipX,
      +this.flipY,
      resolveOrigin(this.originX),
      resolveOrigin(this.originY),
    );

    return prefix;
  }

  /**
   * calculate transform matrix that represents the current transformations from the
   * object's properties.
   * 计算表示当前对象属性变换的变换矩阵。
   * @param {Boolean} [skipGroup] return transform matrix for object not counting parent transformations
   * @param {Boolean} [skipGroup] 返回不计算父变换的对象的变换矩阵
   * There are some situation in which this is useful to avoid the fake rotation.
   * 在某些情况下，这对于避免伪旋转很有用。
   * @return {TMat2D} transform matrix for the object
   */
  calcTransformMatrix(skipGroup = false): TMat2D {
    let matrix = this.calcOwnMatrix();
    if (skipGroup || !this.group) {
      return matrix;
    }
    const key = this.transformMatrixKey(skipGroup),
      cache = this.matrixCache;
    if (cache && cache.key.every((x, i) => x === key[i])) {
      return cache.value;
    }
    if (this.group) {
      matrix = multiplyTransformMatrices(
        this.group.calcTransformMatrix(false),
        matrix,
      );
    }
    this.matrixCache = {
      key,
      value: matrix,
    };
    return matrix;
  }

  /**
   * calculate transform matrix that represents the current transformations from the
   * object's properties, this matrix does not include the group transformation
   * 计算表示当前对象属性变换的变换矩阵，此矩阵不包括组变换
   * @return {TMat2D} transform matrix for the object
   */
  calcOwnMatrix(): TMat2D {
    const key = this.transformMatrixKey(true),
      cache = this.ownMatrixCache;
    if (cache && cache.key === key) {
      return cache.value;
    }
    const center = this.getRelativeCenterPoint(),
      options = {
        angle: this.angle,
        translateX: center.x,
        translateY: center.y,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        skewX: this.skewX,
        skewY: this.skewY,
        flipX: this.flipX,
        flipY: this.flipY,
      },
      value = composeMatrix(options);
    this.ownMatrixCache = {
      key,
      value,
    };
    return value;
  }

  /**
   * Calculate object dimensions from its properties
   * 根据其属性计算对象尺寸
   * @private
   * @returns {Point} dimensions
   */
  _getNonTransformedDimensions(): Point {
    return new Point(this.width, this.height).scalarAdd(this.strokeWidth);
  }

  /**
   * Calculate object dimensions for controls box, including padding and canvas zoom.
   * and active selection
   * 计算控件框的对象尺寸，包括填充和画布缩放。
   * 以及活动选择
   * @private
   * @param {object} [options] transform options
   * @param {object} [options] 变换选项
   * @returns {Point} dimensions
   */
  _calculateCurrentDimensions(options?: any): Point {
    return this._getTransformedDimensions(options)
      .transform(this.getViewportTransform(), true)
      .scalarAdd(2 * this.padding);
  }

  // #region Origin

  declare top: number;
  declare left: number;
  declare width: number;
  declare height: number;
  declare flipX: boolean;
  declare flipY: boolean;
  declare scaleX: number;
  declare scaleY: number;
  declare skewX: number;
  declare skewY: number;
  /**
   * @deprecated please use 'center' as value in new projects
   * @deprecated 请在新项目中使用 'center' 作为值
   * */
  declare originX: TOriginX;
  /**
   * @deprecated please use 'center' as value in new projects
   * @deprecated 请在新项目中使用 'center' 作为值
   * */
  declare originY: TOriginY;
  declare angle: TDegree;
  declare strokeWidth: number;
  declare strokeUniform: boolean;

  /**
   * Object containing this object.
   * can influence its size and position
   * 包含此对象的对象。
   * 可以影响其大小和位置
   */
  declare group?: Group;

  /**
   * Calculate object bounding box dimensions from its properties scale, skew.
   * This bounding box is aligned with object angle and not with canvas axis or screen.
   * 根据其属性 scale, skew 计算对象边界框尺寸。
   * 此边界框与对象角度对齐，而不是与画布轴或屏幕对齐。
   * @param {Object} [options]
   * @param {Number} [options.scaleX]
   * @param {Number} [options.scaleY]
   * @param {Number} [options.skewX]
   * @param {Number} [options.skewY]
   * @private
   * @returns {Point} dimensions
   */
  _getTransformedDimensions(options: any = {}): Point {
    const dimOptions = {
      // if scaleX or scaleY are negative numbers,
      // this will return dimensions that are negative.
      // and this will break assumptions around the codebase
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      skewX: this.skewX,
      skewY: this.skewY,
      width: this.width,
      height: this.height,
      strokeWidth: this.strokeWidth,
      // TODO remove this spread. is visible in the performance inspection
      ...options,
    };
    // stroke is applied before/after transformations are applied according to `strokeUniform`
    const strokeWidth = dimOptions.strokeWidth;
    let preScalingStrokeValue = strokeWidth,
      postScalingStrokeValue = 0;

    if (this.strokeUniform) {
      preScalingStrokeValue = 0;
      postScalingStrokeValue = strokeWidth;
    }
    const dimX = dimOptions.width + preScalingStrokeValue,
      dimY = dimOptions.height + preScalingStrokeValue,
      noSkew = dimOptions.skewX === 0 && dimOptions.skewY === 0;
    let finalDimensions;
    if (noSkew) {
      finalDimensions = new Point(
        dimX * dimOptions.scaleX,
        dimY * dimOptions.scaleY,
      );
    } else {
      finalDimensions = sizeAfterTransform(
        dimX,
        dimY,
        calcDimensionsMatrix(dimOptions),
      );
    }

    return finalDimensions.scalarAdd(postScalingStrokeValue);
  }

  /**
   * Translates the coordinates from a set of origin to another (based on the object's dimensions)
   * 将坐标从一组原点转换为另一组原点（基于对象的尺寸）
   * @param {Point} point The point which corresponds to the originX and originY params
   * @param {Point} point 对应于 originX 和 originY 参数的点
   * @param {TOriginX} fromOriginX Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginX} fromOriginX 水平原点：'left', 'center' 或 'right'
   * @param {TOriginY} fromOriginY Vertical origin: 'top', 'center' or 'bottom'
   * @param {TOriginY} fromOriginY 垂直原点：'top', 'center' 或 'bottom'
   * @param {TOriginX} toOriginX Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginX} toOriginX 水平原点：'left', 'center' 或 'right'
   * @param {TOriginY} toOriginY Vertical origin: 'top', 'center' or 'bottom'
   * @param {TOriginY} toOriginY 垂直原点：'top', 'center' 或 'bottom'
   * @return {Point}
   */
  translateToGivenOrigin(
    point: Point,
    fromOriginX: TOriginX,
    fromOriginY: TOriginY,
    toOriginX: TOriginX,
    toOriginY: TOriginY,
  ): Point {
    let x = point.x,
      y = point.y;
    const offsetX = resolveOrigin(toOriginX) - resolveOrigin(fromOriginX),
      offsetY = resolveOrigin(toOriginY) - resolveOrigin(fromOriginY);

    if (offsetX || offsetY) {
      const dim = this._getTransformedDimensions();
      x += offsetX * dim.x;
      y += offsetY * dim.y;
    }

    return new Point(x, y);
  }

  /**
   * Translates the coordinates from origin to center coordinates (based on the object's dimensions)
   * 将坐标从原点转换为中心坐标（基于对象的尺寸）
   * @param {Point} point The point which corresponds to the originX and originY params
   * @param {Point} point 对应于 originX 和 originY 参数的点
   * @param {TOriginX} originX Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginX} originX 水平原点：'left', 'center' 或 'right'
   * @param {TOriginY} originY Vertical origin: 'top', 'center' or 'bottom'
   * @param {TOriginY} originY 垂直原点：'top', 'center' 或 'bottom'
   * @return {Point}
   */
  translateToCenterPoint(
    point: Point,
    originX: TOriginX,
    originY: TOriginY,
  ): Point {
    if (originX === CENTER && originY === CENTER) {
      return point;
    }
    const p = this.translateToGivenOrigin(
      point,
      originX,
      originY,
      CENTER,
      CENTER,
    );
    if (this.angle) {
      return p.rotate(degreesToRadians(this.angle), point);
    }
    return p;
  }

  /**
   * Translates the coordinates from center to origin coordinates (based on the object's dimensions)
   * 将坐标从中心转换为原点坐标（基于对象的尺寸）
   * @param {Point} center The point which corresponds to center of the object
   * @param {Point} center 对应于对象中心的点
   * @param {OriginX} originX Horizontal origin: 'left', 'center' or 'right'
   * @param {OriginX} originX 水平原点：'left', 'center' 或 'right'
   * @param {OriginY} originY Vertical origin: 'top', 'center' or 'bottom'
   * @param {OriginY} originY 垂直原点：'top', 'center' 或 'bottom'
   * @return {Point}
   */
  translateToOriginPoint(
    center: Point,
    originX: TOriginX,
    originY: TOriginY,
  ): Point {
    const p = this.translateToGivenOrigin(
      center,
      CENTER,
      CENTER,
      originX,
      originY,
    );
    if (this.angle) {
      return p.rotate(degreesToRadians(this.angle), center);
    }
    return p;
  }

  /**
   * Returns the center coordinates of the object relative to canvas
   * 返回相对于画布的对象中心坐标
   * @return {Point}
   */
  getCenterPoint(): Point {
    const relCenter = this.getRelativeCenterPoint();
    return this.group
      ? transformPoint(relCenter, this.group.calcTransformMatrix())
      : relCenter;
  }

  /**
   * Returns the center coordinates of the object relative to it's parent
   * 返回相对于其父对象的对象中心坐标
   * @return {Point}
   */
  getRelativeCenterPoint(): Point {
    return this.translateToCenterPoint(
      new Point(this.left, this.top),
      this.originX,
      this.originY,
    );
  }

  /**
   * Alias of {@link getPositionByOrigin}
   * {@link getPositionByOrigin} 的别名
   * @deprecated use {@link getPositionByOrigin} instead
   * @deprecated 请改用 {@link getPositionByOrigin}
   */
  getPointByOrigin(originX: TOriginX, originY: TOriginY): Point {
    return this.getPositionByOrigin(originX, originY);
  }

  /**
   * This function is the mirror of {@link setPositionByOrigin}
   * Returns the position of the object based on specified origin.
   * Take an object that has left, top set to 100, 100 with origin 'left', 'top'.
   * Return the values of left top ( wrapped in a point ) that you would need to keep
   * the same position if origin where different ( ex: center, bottom )
   * Alternatively you can use this to also find which point in the parent plane is a specific origin
   * ( where is the bottom right corner of my object? )
   * 此函数是 {@link setPositionByOrigin} 的镜像
   * 返回基于指定原点的对象位置。
   * 假设一个对象的 left, top 设置为 100, 100，原点为 'left', 'top'。
   * 返回如果原点不同（例如：center, bottom）时保持相同位置所需的 left top 值（包装在点中）
   * 或者，您也可以使用此函数查找父平面中的哪个点是特定原点
   * （我的对象的右下角在哪里？）
   * @param {TOriginX} originX Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginX} originX 水平原点：'left', 'center' 或 'right'
   * @param {TOriginY} originY Vertical origin: 'top', 'center' or 'bottom'
   * @param {TOriginY} originY 垂直原点：'top', 'center' 或 'bottom'
   * @return {Point}
   */
  getPositionByOrigin(originX: TOriginX, originY: TOriginY) {
    return this.translateToOriginPoint(
      this.getRelativeCenterPoint(),
      originX,
      originY,
    );
  }

  /**
   * Sets the position of the object taking into consideration the object's origin
   * 考虑对象的原点设置对象的位置
   * @param {Point} pos The new position of the object
   * @param {Point} pos 对象的新位置
   * @param {TOriginX} originX Horizontal origin: 'left', 'center' or 'right'
   * @param {TOriginX} originX 水平原点：'left', 'center' 或 'right'
   * @param {TOriginY} originY Vertical origin: 'top', 'center' or 'bottom'
   * @param {TOriginY} originY 垂直原点：'top', 'center' 或 'bottom'
   * @return {void}
   */
  setPositionByOrigin(pos: Point, originX: TOriginX, originY: TOriginY) {
    const center = this.translateToCenterPoint(pos, originX, originY),
      position = this.translateToOriginPoint(
        center,
        this.originX,
        this.originY,
      );
    this.set({ left: position.x, top: position.y });
  }

  /**
   * 获取对象左上角的坐标
   *
   * @private
   */
  _getLeftTopCoords() {
    return this.getPositionByOrigin(LEFT, TOP);
  }

  /**
   * 设置对象左上角的坐标
   *
   * An utility method to position the object by its left top corner.
   * Useful to reposition objects since now the default origin is center/center
   * Places the left/top corner of the object bounding box in p.
   */
  positionByLeftTop(p: Point) {
    return this.setPositionByOrigin(p, LEFT, TOP);
  }
}
