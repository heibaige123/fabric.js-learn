/**
 * 规范化空白字符，将多个连续的空白字符替换为单个空格
 * @param value 要处理的字符串
 * @returns 规范化后的字符串
 */
export const normalizeWs = (value: string) => value.replace(/\s+/g, ' ');
