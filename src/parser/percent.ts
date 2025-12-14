import { ifNaN } from '../util/internals/ifNaN';
import { capValue } from '../util/misc/capValue';

/**
 * 检查值是否为百分比字符串
 *
 * Will loosely accept as percent numbers that are not like
 * 3.4a%. This function does not check for the correctness of a percentage
 * but it checks that values that are in theory correct are or arent percentages
 * @param value 要检查的值
 * @returns 如果是百分比字符串则返回 true，否则返回 false
 */
export function isPercent(value: string | null) {
  // /%$/ Matches strings that end with a percent sign (%)
  return value && /%$/.test(value) && Number.isFinite(parseFloat(value));
}

/**
 * 解析 SVG 中的百分比值
 *
 * Parse a percentage value in an svg.
 * @param value 要解析的值
 * @param value
 * @param valueIfNaN 如果无法解析数字时的回退值
 * @param fallback in case of not possible to parse the number
 * @returns 解析后的值，范围在 [0, 1] 之间
 * @returns ∈ [0, 1]
 */
export function parsePercent(
  value: string | number | null | undefined,
  valueIfNaN?: number,
): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseFloat(value) / (isPercent(value) ? 100 : 1)
        : NaN;
  return capValue(0, ifNaN(parsed, valueIfNaN), 1);
}
