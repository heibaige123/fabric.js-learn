import type { TSize } from '../../typedefs';

/**
 * 找到适合对象源以适应对象目标的缩放比例，
 * 保持纵横比不变。
 * 尊重缓存的总允许区域。
 *
 * Finds the scale for the object source to fit inside the object destination,
 * keeping aspect ratio intact.
 * respect the total allowed area for the cache.
 * @param source 对象的自然未缩放大小
 * @param destination 对象的自然未缩放大小
 * @returns 应用于源以适应目标的缩放因子
 *
 * @param {TSize} source natural unscaled size of the object
 * @param {TSize} destination natural unscaled size of the object
 * @return {Number} scale factor to apply to source to fit into destination
 */
export const findScaleToFit = (source: TSize, destination: TSize) =>
  Math.min(
    destination.width / source.width,
    destination.height / source.height,
  );

/**
 * 找到适合对象源以完全覆盖对象目标的缩放比例，
 * 保持纵横比不变。
 * 尊重缓存的总允许区域。
 *
 * Finds the scale for the object source to cover entirely the object destination,
 * keeping aspect ratio intact.
 * respect the total allowed area for the cache.
 * @param source 对象的自然未缩放大小
 * @param destination 对象的自然未缩放大小
 * @returns 应用于源以覆盖目标的缩放因子
 *
 * @param {TSize} source natural unscaled size of the object
 * @param {TSize} destination natural unscaled size of the object
 * @return {Number} scale factor to apply to source to cover destination
 */
export const findScaleToCover = (source: TSize, destination: TSize) =>
  Math.max(
    destination.width / source.width,
    destination.height / source.height,
  );
