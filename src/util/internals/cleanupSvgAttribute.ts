import { reNum } from '../../parser/constants';
import { normalizeWs } from './normalizeWhiteSpace';

/**
 * 用于匹配数字的正则表达式
 */
const regex = new RegExp(`(${reNum})`, 'gi');

/**
 * 清理 SVG 属性值
 *
 * @param attributeValue SVG 属性值
 * @returns 清理后的字符串
 */
export const cleanupSvgAttribute = (attributeValue: string) =>
  normalizeWs(
    attributeValue
      .replace(regex, ' $1 ')
      // replace annoying commas and arbitrary whitespace with single spaces
      .replace(/,/gi, ' '),
  );
