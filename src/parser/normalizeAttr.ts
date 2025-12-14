import { attributesMap } from './constants';

/**
 * 规范化属性名称，将其转换为 Fabric.js 内部使用的属性名称
 * @param attr 属性名称
 * @returns 规范化后的属性名称
 */
export const normalizeAttr = (
  attr: keyof typeof attributesMap | string,
): string => attributesMap[attr as keyof typeof attributesMap] ?? attr;
