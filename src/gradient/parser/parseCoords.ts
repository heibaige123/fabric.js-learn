import { isPercent } from '../../parser/percent';
import type { TSize } from '../../typedefs';
import type { GradientCoords, GradientType, GradientUnits } from '../typedefs';
import { parseGradientUnits, parseType } from './misc';

/**
 * 将百分比单位转换为数值
 * @param valuesToConvert 需要转换的值的对象
 * @param options 包含宽度、高度和渐变单位的选项
 * @returns 转换后的数值对象
 */
function convertPercentUnitsToValues<
  T extends GradientType,
  K extends keyof GradientCoords<T>,
>(
  valuesToConvert: Record<K, string | number>,
  { width, height, gradientUnits }: TSize & { gradientUnits: GradientUnits },
) {
  let finalValue;
  return (Object.entries(valuesToConvert) as [K, string | number][]).reduce(
    (acc, [prop, propValue]) => {
      if (propValue === 'Infinity') {
        finalValue = 1;
      } else if (propValue === '-Infinity') {
        finalValue = 0;
      } else {
        const isString = typeof propValue === 'string';
        finalValue = isString ? parseFloat(propValue) : propValue;
        if (isString && isPercent(propValue)) {
          finalValue *= 0.01;
          if (gradientUnits === 'pixels') {
            // then we need to fix those percentages here in svg parsing
            if (prop === 'x1' || prop === 'x2' || prop === 'r2') {
              finalValue *= width;
            }
            if (prop === 'y1' || prop === 'y2') {
              finalValue *= height;
            }
          }
        }
      }
      acc[prop] = finalValue;
      return acc;
    },
    {} as Record<K, number>,
  );
}

/**
 * 获取 SVG 元素的属性值
 * @param el SVG 渐变元素
 * @param key 属性名
 * @returns 属性值
 */
function getValue(el: SVGGradientElement, key: string) {
  return el.getAttribute(key);
}

/**
 * 解析线性渐变的坐标
 * @param el SVG 渐变元素
 * @returns 线性渐变坐标对象
 */
export function parseLinearCoords(el: SVGGradientElement) {
  return {
    x1: getValue(el, 'x1') || 0,
    y1: getValue(el, 'y1') || 0,
    x2: getValue(el, 'x2') || '100%',
    y2: getValue(el, 'y2') || 0,
  };
}

/**
 * 解析径向渐变的坐标
 * @param el SVG 渐变元素
 * @returns 径向渐变坐标对象
 */
export function parseRadialCoords(el: SVGGradientElement) {
  return {
    x1: getValue(el, 'fx') || getValue(el, 'cx') || '50%',
    y1: getValue(el, 'fy') || getValue(el, 'cy') || '50%',
    r1: 0,
    x2: getValue(el, 'cx') || '50%',
    y2: getValue(el, 'cy') || '50%',
    r2: getValue(el, 'r') || '50%',
  };
}

/**
 * 解析渐变坐标
 * @param el SVG 渐变元素
 * @param size 尺寸对象
 * @returns 解析后的渐变坐标
 */
export function parseCoords(el: SVGGradientElement, size: TSize) {
  return convertPercentUnitsToValues(
    parseType(el) === 'linear' ? parseLinearCoords(el) : parseRadialCoords(el),
    {
      ...size,
      gradientUnits: parseGradientUnits(el),
    },
  );
}
