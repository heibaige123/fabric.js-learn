import { elementMatchesRule } from './elementMatchesRule';
import type { CSSRules } from './typedefs';

/**
 * 获取元素的全局样式
 * @param element 要检查的元素
 * @param cssRules CSS 规则对象
 * @returns 匹配的样式对象
 *
 * @private
 */

export function getGlobalStylesForElement(
  element: HTMLElement | SVGElement,
  cssRules: CSSRules = {},
) {
  /**
   * 存储匹配的样式
   */
  let styles: Record<string, string> = {};
  for (const rule in cssRules) {
    if (elementMatchesRule(element, rule.split(' '))) {
      styles = {
        ...styles,
        ...cssRules[rule],
      };
    }
  }
  return styles;
}
