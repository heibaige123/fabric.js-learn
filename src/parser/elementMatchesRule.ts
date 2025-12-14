import { selectorMatches } from './selectorMatches';
import { doesSomeParentMatch } from './doesSomeParentMatch';

/**
 * 检查元素是否匹配给定的 CSS 规则
 * @param element 要检查的元素
 * @param selectors 选择器数组
 * @returns 如果元素匹配规则，则返回 true
 *
 * @private
 */

export function elementMatchesRule(
  element: HTMLElement | SVGElement,
  selectors: string[],
) {
  /**
   * 父元素是否匹配
   */
  let parentMatching = true;
  // start from rightmost selector.
  /**
   * 第一个（最右侧）选择器是否匹配
   */
  const firstMatching = selectorMatches(element, selectors.pop()!);
  if (firstMatching && selectors.length) {
    parentMatching = doesSomeParentMatch(element, selectors);
  }
  return firstMatching && parentMatching && selectors.length === 0;
}
