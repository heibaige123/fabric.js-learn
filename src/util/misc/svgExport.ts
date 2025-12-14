import type { TMat2D } from '../../typedefs';
import { toFixed } from './toFixed';
import { config } from '../../config';

/**
 * 给定一个包含 6 个数字的数组，返回类似 `"matrix(...numbers)"` 的字符串
 * @param transform 包含 6 个数字的数组
 * @returns svg 的变换矩阵字符串
 *
 * given an array of 6 number returns something like `"matrix(...numbers)"`
 * @param {TMat2D} transform an array with 6 numbers
 * @return {String} transform matrix for svg
 */
export const matrixToSVG = (transform: TMat2D) =>
  'matrix(' +
  transform
    .map((value) => toFixed(value, config.NUM_FRACTION_DIGITS))
    .join(' ') +
  ')';
