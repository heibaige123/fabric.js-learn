import { parseStyleObject } from './parseStyleObject';
import { parseStyleString } from './parseStyleString';

/**
 * 解析 "style" 属性，返回一个包含值的对象
 *
 * Parses "style" attribute, retuning an object with values
 * @param element 要解析的元素
 * @param {SVGElement} element Element to parse
 * @returns 从元素的 style 属性解析出的值对象
 * @return {Object} Objects with values parsed from style attribute of an element
 */
export function parseStyleAttribute(
  element: HTMLElement | SVGElement,
): Record<string, any> {
  const oStyle: Record<string, any> = {},
    style = element.getAttribute('style');

  if (!style) {
    return oStyle;
  }

  if (typeof style === 'string') {
    parseStyleString(style, oStyle);
  } else {
    parseStyleObject(style, oStyle);
  }

  return oStyle;
}
