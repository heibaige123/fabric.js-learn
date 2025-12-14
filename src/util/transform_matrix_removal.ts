import { CENTER, SCALE_X, SCALE_Y } from '../constants';
import type { FabricImage, ParsedPAROffsets } from '../shapes/Image';
import type { FabricObject } from '../shapes/Object/FabricObject';
import type { TMat2D } from '../typedefs';
import { qrDecompose } from './misc/matrix';

/**
 * 带有变换矩阵的 Fabric 对象类型
 */
type FabricObjectWithTransformMatrix = FabricObject & {
  /**
   * 变换矩阵
   */
  transformMatrix?: TMat2D;
};

/**
 * 此函数是 SVG 导入的辅助函数。它分解 transformMatrix 并将属性分配给对象。
 * 未变换的坐标
 *
 * This function is an helper for svg import. it decompose the transformMatrix
 * and assign properties to object.
 * untransformed coordinates
 * @private
 * @param object 带有变换矩阵的 Fabric 对象
 */
const _assignTransformMatrixProps = (
  object: FabricObjectWithTransformMatrix,
) => {
  if (object.transformMatrix) {
    const { scaleX, scaleY, angle, skewX } = qrDecompose(
      object.transformMatrix,
    );
    object.flipX = false;
    object.flipY = false;
    object.set(SCALE_X, scaleX);
    object.set(SCALE_Y, scaleY);
    object.angle = angle;
    object.skewX = skewX;
    object.skewY = 0;
  }
};

/**
 * 此函数是 SVG 导入的辅助函数。它移除变换矩阵并设置为 fabricjs 可以处理的对象属性。
 *
 * This function is an helper for svg import. it removes the transform matrix
 * and set to object properties that fabricjs can handle
 * @private
 * @param object 带有变换矩阵的 Fabric 对象
 * @param preserveAspectRatioOptions 保持纵横比选项
 * @param {Object} preserveAspectRatioOptions
 */
export const removeTransformMatrixForSvgParsing = (
  object: FabricObjectWithTransformMatrix,
  preserveAspectRatioOptions?: ParsedPAROffsets,
) => {
  let center = object._findCenterFromElement();
  if (object.transformMatrix) {
    _assignTransformMatrixProps(object);
    center = center.transform(object.transformMatrix);
  }
  delete object.transformMatrix;
  if (preserveAspectRatioOptions) {
    object.scaleX *= preserveAspectRatioOptions.scaleX;
    object.scaleY *= preserveAspectRatioOptions.scaleY;
    (object as FabricImage).cropX = preserveAspectRatioOptions.cropX;
    (object as FabricImage).cropY = preserveAspectRatioOptions.cropY;
    center.x += preserveAspectRatioOptions.offsetLeft;
    center.y += preserveAspectRatioOptions.offsetTop;
    object.width = preserveAspectRatioOptions.width;
    object.height = preserveAspectRatioOptions.height;
  }
  object.setPositionByOrigin(center, CENTER, CENTER);
};
