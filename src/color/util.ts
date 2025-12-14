import type { TRGBAColorSource } from './typedefs';

/**
 * 将色相转换为 RGB 值
 * @param p
 * @param q
 * @param t
 * @returns RGB 值
 *
 * @param {Number} p
 * @param {Number} q
 * @param {Number} t
 * @return {Number}
 */
export const hue2rgb = (p: number, q: number, t: number): number => {
  if (t < 0) {
    t += 1;
  }
  if (t > 1) {
    t -= 1;
  }
  if (t < 1 / 6) {
    return p + (q - p) * 6 * t;
  }
  if (t < 1 / 2) {
    return q;
  }
  if (t < 2 / 3) {
    return p + (q - p) * (2 / 3 - t) * 6;
  }
  return p;
};

/**
 * 将 RGB 转换为 HSL
 * 改编自 {@link https://gist.github.com/mjackson/5311256 https://gist.github.com/mjackson}
 * @param r 红色值
 * @param g 绿色值
 * @param b 蓝色值
 * @param a Alpha 值（透传）
 * @returns HSL 颜色
 *
 * Adapted from {@link https://gist.github.com/mjackson/5311256 https://gist.github.com/mjackson}
 * @param {Number} r Red color value
 * @param {Number} g Green color value
 * @param {Number} b Blue color value
 * @param {Number} a Alpha color value pass through
 * @return {TRGBColorSource} Hsl color
 */
export const rgb2Hsl = (
  r: number,
  g: number,
  b: number,
  a: number,
): TRGBAColorSource => {
  r /= 255;
  g /= 255;
  b /= 255;
  const maxValue = Math.max(r, g, b),
    minValue = Math.min(r, g, b);

  let h!: number, s: number;
  const l = (maxValue + minValue) / 2;

  if (maxValue === minValue) {
    h = s = 0; // achromatic
  } else {
    const d = maxValue - minValue;
    s = l > 0.5 ? d / (2 - maxValue - minValue) : d / (maxValue + minValue);
    switch (maxValue) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100), a];
};

/**
 * 将 alpha 字符串转换为浮点数
 * @param value alpha 值字符串
 * @returns 浮点数
 */
export const fromAlphaToFloat = (value = '1') =>
  parseFloat(value) / (value.endsWith('%') ? 100 : 1);

/**
 * 将 [0, 255] 范围内的值转换为十六进制
 * @param value 数值
 * @returns 十六进制字符串
 *
 * Convert a value in the inclusive range [0, 255] to hex
 */
export const hexify = (value: number) =>
  Math.min(Math.round(value), 255).toString(16).toUpperCase().padStart(2, '0');

/**
 * 计算 RGB 的灰度平均值并透传 alpha
 * @param color RGBA 颜色源
 * @returns 灰度 RGBA 颜色源
 *
 * Calculate the grey average value for rgb and pass through alpha
 */
export const greyAverage = ([
  r,
  g,
  b,
  a = 1,
]: TRGBAColorSource): TRGBAColorSource => {
  const avg = Math.round(r * 0.3 + g * 0.59 + b * 0.11);
  return [avg, avg, avg, a];
};
