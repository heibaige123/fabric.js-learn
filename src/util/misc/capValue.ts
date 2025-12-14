/**
 * 限制数值在指定范围内
 * @param min 最小值
 * @param value 当前值
 * @param max 最大值
 * @returns 限制后的值
 */
export const capValue = (min: number, value: number, max: number) =>
  Math.max(min, Math.min(value, max));
