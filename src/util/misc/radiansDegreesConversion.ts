import type { TRadian, TDegree } from '../../typedefs';
import { PiBy180 } from '../../constants';

/**
 * 将度数转换为弧度。
 * @param degrees 度数值
 * @returns 弧度值
 *
 * Transforms degrees to radians.
 * @param {TDegree} degrees value in degrees
 * @return {TRadian} value in radians
 */
export const degreesToRadians = (degrees: TDegree): TRadian =>
  (degrees * PiBy180) as TRadian;

/**
 * 将弧度转换为度数。
 * @param radians 弧度值
 * @returns 度数值
 *
 * Transforms radians to degrees.
 * @param {TRadian} radians value in radians
 * @return {TDegree} value in degrees
 */
export const radiansToDegrees = (radians: TRadian): TDegree =>
  (radians / PiBy180) as TDegree;
