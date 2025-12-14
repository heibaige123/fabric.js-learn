import type { TRadian } from '../../typedefs';
import { halfPI } from '../../constants';

/**
 * 计算角度的正弦值，避免对已知结果返回浮点数
 * 此函数仅用于避免在处理实际上是 1 或 0 的数字时得到 0.999999999999999。
 * @param angle 角度
 * @returns 角度的正弦值
 *
 * Calculate the cos of an angle, avoiding returning floats for known results
 * This function is here just to avoid getting 0.999999999999999 when dealing
 * with numbers that are really 1 or 0.
 * @param {TRadian} angle the angle
 * @return {Number} the sin value for angle.
 */
export const sin = (angle: TRadian): number => {
  if (angle === 0) {
    return 0;
  }
  const angleSlice = angle / halfPI;
  const value = Math.sign(angle);
  switch (angleSlice) {
    case 1:
      return value;
    case 2:
      return 0;
    case 3:
      return -value;
  }
  return Math.sin(angle);
};
