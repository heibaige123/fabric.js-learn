import { DEFAULT_SVG_FONT_SIZE } from '../constants';
import { parseUnit } from '../util/misc/svgParsing';
import { cPath, fSize, svgValidParentsRegEx } from './constants';
import { getGlobalStylesForElement } from './getGlobalStylesForElement';
import { normalizeAttr } from './normalizeAttr';
import { normalizeValue } from './normalizeValue';
import { parseFontDeclaration } from './parseFontDeclaration';
import { parseStyleAttribute } from './parseStyleAttribute';
import { setStrokeFillOpacity } from './setStrokeFillOpacity';
import type { CSSRules } from './typedefs';

/**
 * 给定元素和属性名称数组，返回属性名/值的对象；
 * 递归向上解析父级 "g" 节点。
 *
 * Returns an object of attributes' name/value, given element and an array of attribute names;
 * Parses parent "g" nodes recursively upwards.
 * @param element 要解析的元素
 * @param {SVGElement | HTMLElement} element Element to parse
 * @param attributes 要解析的属性数组
 * @param {Array} attributes Array of attributes to parse
 * @param cssRules CSS 规则
 * @returns 包含解析后的属性名/值的对象
 * @return {Object} object containing parsed attributes' names/values
 */
export function parseAttributes(
  element: HTMLElement | SVGElement | null,
  attributes: string[],
  cssRules?: CSSRules,
): Record<string, any> {
  if (!element) {
    return {};
  }

  /**
   * 父级属性
   */
  let parentAttributes: Record<string, string> = {},
    /**
     * 字体大小
     */
    fontSize: number,
    /**
     * 父级字体大小
     */
    parentFontSize = DEFAULT_SVG_FONT_SIZE;

  // if there's a parent container (`g` or `a` or `symbol` node), parse its attributes recursively upwards
  // 如果有父容器（`g` 或 `a` 或 `symbol` 节点），则递归向上解析其属性
  if (
    element.parentNode &&
    svgValidParentsRegEx.test(element.parentNode.nodeName)
  ) {
    parentAttributes = parseAttributes(
      element.parentElement,
      attributes,
      cssRules,
    );
    if (parentAttributes.fontSize) {
      fontSize = parentFontSize = parseUnit(parentAttributes.fontSize);
    }
  }

  /**
   * 自身属性
   */
  const ownAttributes: Record<string, string> = {
    ...attributes.reduce<Record<string, string>>((memo, attr) => {
      const value = element.getAttribute(attr);
      if (value) {
        memo[attr] = value;
      }
      return memo;
    }, {}),
    // add values parsed from style, which take precedence over attributes
    // (see: http://www.w3.org/TR/SVG/styling.html#UsingPresentationAttributes)
    // 添加从 style 解析的值，这些值优先于属性
    // (参见: http://www.w3.org/TR/SVG/styling.html#UsingPresentationAttributes)
    ...getGlobalStylesForElement(element, cssRules),
    ...parseStyleAttribute(element),
  };

  if (ownAttributes[cPath]) {
    element.setAttribute(cPath, ownAttributes[cPath]);
  }
  if (ownAttributes[fSize]) {
    // looks like the minimum should be 9px when dealing with ems. this is what looks like in browsers.
    // 看起来在处理 ems 时最小值应该是 9px。这是浏览器中的样子。
    fontSize = parseUnit(ownAttributes[fSize], parentFontSize);
    ownAttributes[fSize] = `${fontSize}`;
  }

  // this should have its own complex type
  // 这应该有它自己的复杂类型
  /**
   * 规范化后的样式
   */
  const normalizedStyle: Record<
    string,
    string | boolean | number | number[] | null
  > = {};
  for (const attr in ownAttributes) {
    /**
     * 规范化后的属性名
     */
    const normalizedAttr = normalizeAttr(attr);
    /**
     * 规范化后的属性值
     */
    const normalizedValue = normalizeValue(
      normalizedAttr,
      ownAttributes[attr],
      parentAttributes,
      fontSize!,
    );
    normalizedStyle[normalizedAttr] = normalizedValue;
  }
  if (normalizedStyle && normalizedStyle.font) {
    parseFontDeclaration(normalizedStyle.font as string, normalizedStyle);
  }
  /**
   * 合并后的属性
   */
  const mergedAttrs = { ...parentAttributes, ...normalizedStyle };
  return svgValidParentsRegEx.test(element.nodeName)
    ? mergedAttrs
    : setStrokeFillOpacity(mergedAttrs);
}
