import type { XY } from '../Point';

/**
 * 解析 "points" 属性，返回一个点数组
 *
 * Parses "points" attribute, returning an array of values
 * @param points points 属性字符串
 * @param {String} points points attribute string
 * @returns 点数组
 * @return {Array} array of points
 */
export function parsePointsAttribute(points: string | null): XY[] {
  // points attribute is required and must not be empty
  // points 属性是必需的且不能为空
  if (!points) {
    return [];
  }

  // replace commas with whitespace and remove bookending whitespace
  // 将逗号替换为空格并移除首尾空格
  /**
   * 分割后的点字符串数组
   */
  const pointsSplit: string[] = points.replace(/,/g, ' ').trim().split(/\s+/);

  /**
   * 解析后的点数组
   */
  const parsedPoints = [];

  for (let i = 0; i < pointsSplit.length; i += 2) {
    parsedPoints.push({
      x: parseFloat(pointsSplit[i]),
      y: parseFloat(pointsSplit[i + 1]),
    });
  }

  // odd number of points is an error
  // 奇数个点是错误的
  // if (parsedPoints.length % 2 !== 0) {
  //   return null;
  // }
  return parsedPoints;
}
