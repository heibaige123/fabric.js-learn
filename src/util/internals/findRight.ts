/**
 * 从右向左查找数组中满足条件的元素的索引
 * @param array 要查找的数组
 * @param predicate 用于测试每个元素的函数
 * @returns 找到的元素的索引，如果未找到则返回 -1
 */
export const findIndexRight = <T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => boolean,
) => {
  for (let index = array.length - 1; index >= 0; index--) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
};
