/**
 * 如果值为 NaN，则返回备用值，否则返回原值
 *
 * @param value 要检查是否为 NaN 的值
 * @param [valueIfNaN] 如果 value 为 NaN 时返回的值
 * @returns 如果 value 是 NaN 且提供了 valueIfNaN，则返回 valueIfNaN，否则返回 value
 *
 * @param value value to check if NaN
 * @param [valueIfNaN]
 * @returns `fallback` is `value is NaN
 */
export const ifNaN = (value: number, valueIfNaN?: number) => {
  return isNaN(value) && typeof valueIfNaN === 'number' ? valueIfNaN : value;
};
