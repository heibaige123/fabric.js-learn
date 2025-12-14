/**
 * 返回两个指定数字之间的随机整数
 *
 * Returns random number between 2 specified ones.
 * @param min 下限
 * @param max 上限
 * @returns 随机值（在 min 和 max 之间）
 *
 * @param {Number} min lower limit
 * @param {Number} max upper limit
 * @return {Number} random value (between min and max)
 */
export const getRandomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
