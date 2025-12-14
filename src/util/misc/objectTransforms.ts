import { Point } from '../../Point';
import { CENTER } from '../../constants';
import type { FabricObject } from '../../shapes/Object/Object';
import type { TMat2D } from '../../typedefs';
import { makeBoundingBoxFromPoints } from './boundingBoxFromPoints';
import {
  invertTransform,
  multiplyTransformMatrices,
  qrDecompose,
} from './matrix';

/**
 * 给定一个对象和一个变换，将逆变换应用于该对象，
 * 这相当于从该对象中移除该变换，以便
 * 在移除了变换的空间中添加该对象时，该对象将与之前相同。
 * 从对象中移除缩放 2 的变换就像将其缩放 1/2。
 * 从对象中移除旋转 30 度的变换就像向相反方向旋转 30 度。
 * 此实用程序用于在变换后的组或嵌套组内添加对象。
 * @param object 你想要变换的对象
 * @param transform 目标变换
 *
 * given an object and a transform, apply the inverse transform to the object,
 * this is equivalent to remove from that object that transformation, so that
 * added in a space with the removed transform, the object will be the same as before.
 * Removing from an object a transform that scale by 2 is like scaling it by 1/2.
 * Removing from an object a transform that rotate by 30deg is like rotating by 30deg
 * in the opposite direction.
 * This util is used to add objects inside transformed groups or nested groups.
 * @param {FabricObject} object the object you want to transform
 * @param {TMat2D} transform the destination transform
 */
export const removeTransformFromObject = (
  object: FabricObject,
  transform: TMat2D,
) => {
  const inverted = invertTransform(transform),
    finalTransform = multiplyTransformMatrices(
      inverted,
      object.calcOwnMatrix(),
    );
  applyTransformToObject(object, finalTransform);
};

/**
 * 给定一个对象和一个变换，将变换应用于该对象。
 * 这相当于改变绘制对象的空间。
 * 向对象添加缩放 2 的变换就像将其缩放 2。
 * 例如，当从活动选择中移除对象时使用此方法。
 * @param object 你想要变换的对象
 * @param transform 目标变换
 *
 * given an object and a transform, apply the transform to the object.
 * this is equivalent to change the space where the object is drawn.
 * Adding to an object a transform that scale by 2 is like scaling it by 2.
 * This is used when removing an object from an active selection for example.
 * @param {FabricObject} object the object you want to transform
 * @param {Array} transform the destination transform
 */
export const addTransformToObject = (object: FabricObject, transform: TMat2D) =>
  applyTransformToObject(
    object,
    multiplyTransformMatrices(transform, object.calcOwnMatrix()),
  );

/**
 * 丢弃对象变换状态并应用矩阵中的变换。
 * @param object 你想要变换的对象
 * @param transform 目标变换
 *
 * discard an object transform state and apply the one from the matrix.
 * @param {FabricObject} object the object you want to transform
 * @param {Array} transform the destination transform
 */
export const applyTransformToObject = (
  object: FabricObject,
  transform: TMat2D,
) => {
  const { translateX, translateY, scaleX, scaleY, ...otherOptions } =
      qrDecompose(transform),
    center = new Point(translateX, translateY);
  object.flipX = false;
  object.flipY = false;
  Object.assign(object, otherOptions);
  object.set({ scaleX, scaleY });
  object.setPositionByOrigin(center, CENTER, CENTER);
};
/**
 * 将对象变换状态重置为中性。不考虑 Top 和 left
 * @param target 要变换的对象
 *
 * reset an object transform state to neutral. Top and left are not accounted for
 * @param  {FabricObject} target object to transform
 */
export const resetObjectTransform = (target: FabricObject) => {
  target.scaleX = 1;
  target.scaleY = 1;
  target.skewX = 0;
  target.skewY = 0;
  target.flipX = false;
  target.flipY = false;
  target.rotate(0);
};

/**
 * 提取对象变换值
 * @param target 要读取的对象
 * @returns 变换组件
 *
 * Extract Object transform values
 * @param  {FabricObject} target object to read from
 * @return {Object} Components of transform
 */
export const saveObjectTransform = (target: FabricObject) => ({
  scaleX: target.scaleX,
  scaleY: target.scaleY,
  skewX: target.skewX,
  skewY: target.skewY,
  angle: target.angle,
  left: target.left,
  flipX: target.flipX,
  flipY: target.flipY,
  top: target.top,
});

/**
 * 给定宽度和高度，返回可以包含应用了变换的宽度/高度框的边界框的大小。
 * 用于计算控件周围对象的框。
 * @param width 宽度
 * @param height 高度
 * @param t 变换矩阵
 * @returns 大小
 *
 * given a width and height, return the size of the bounding box
 * that can contains the box with width/height with applied transform.
 * Use to calculate the boxes around objects for controls.
 * @param {Number} width
 * @param {Number} height
 * @param {TMat2D} t
 * @returns {Point} size
 */
export const sizeAfterTransform = (
  width: number,
  height: number,
  t: TMat2D,
) => {
  const dimX = width / 2,
    dimY = height / 2,
    points = [
      new Point(-dimX, -dimY),
      new Point(dimX, -dimY),
      new Point(-dimX, dimY),
      new Point(dimX, dimY),
    ].map((p) => p.transform(t)),
    bbox = makeBoundingBoxFromPoints(points);
  return new Point(bbox.width, bbox.height);
};
