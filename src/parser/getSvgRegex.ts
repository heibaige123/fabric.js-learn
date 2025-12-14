/**
 * 根据字符串数组生成匹配 SVG 标签的正则表达式
 * @param arr 字符串数组
 * @returns 匹配 SVG 标签的正则表达式
 */
export function getSvgRegex(arr: string[]) {
  return new RegExp('^(' + arr.join('|') + ')\\b', 'i');
}
