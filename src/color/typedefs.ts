import type { Color } from './Color';

/**
 * RGB 格式
 *
 * RGB format
 */
export type TRGBColorSource = [red: number, green: number, blue: number];

/**
 * RGBA 格式
 *
 * RGBA format
 */
export type TRGBAColorSource = [
  red: number,
  green: number,
  blue: number,
  alpha: number,
];

/**
 * 颜色参数类型
 */
export type TColorArg = string | TRGBColorSource | TRGBAColorSource | Color;
