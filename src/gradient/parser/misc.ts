import type { GradientType, GradientUnits } from '../typedefs';

/**
 * 解析 SVG 渐变元素的类型（线性或径向）
 * @param el SVG 渐变元素
 * @returns 渐变类型 'linear' 或 'radial'
 */
export function parseType(el: SVGGradientElement): GradientType {
  return el.nodeName === 'linearGradient' || el.nodeName === 'LINEARGRADIENT'
    ? 'linear'
    : 'radial';
}

/**
 * 解析 SVG 渐变元素的单位
 * @param el SVG 渐变元素
 * @returns 渐变单位 'pixels' (userSpaceOnUse) 或 'percentage' (objectBoundingBox)
 */
export function parseGradientUnits(el: SVGGradientElement): GradientUnits {
  return el.getAttribute('gradientUnits') === 'userSpaceOnUse'
    ? 'pixels'
    : 'percentage';
}
