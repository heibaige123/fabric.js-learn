/**
 * 从数组中移除指定的值。
 * 值的存在（及其在数组中的位置）通过 `Array.prototype.indexOf` 确定
 *
 * Removes value from an array.
 * Presence of value (and its position in an array) is determined via `Array.prototype.indexOf`
 * @param array 数组
 * @param value 要移除的值
 * @returns 原始数组
 *
 * @param {Array} array
 * @param {*} value
 * @return {Array} original array
 */
export const removeFromArray = <T>(array: T[], value: T): T[] => {
  const idx = array.indexOf(value);
  if (idx !== -1) {
    array.splice(idx, 1);
  }
  return array;
};
