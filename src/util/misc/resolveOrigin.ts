import type { TOriginX, TOriginY } from '../../typedefs';

const originOffset = {
  left: -0.5,
  top: -0.5,
  center: 0,
  bottom: 0.5,
  right: 0.5,
};
/**
 * 解析相对于原点的原点值
 * @private
 * @param originValue originX / originY
 * @returns 数值
 *
 * Resolves origin value relative to center
 * @private
 * @param {TOriginX | TOriginY} originValue originX / originY
 * @returns number
 */

export const resolveOrigin = (
  originValue: TOriginX | TOriginY | number,
): number =>
  typeof originValue === 'string'
    ? originOffset[originValue]
    : originValue - 0.5;
