import { selectorMatches } from './selectorMatches';

/**
 * 检查元素的祖先元素是否匹配给定的选择器列表
 * @param element 起始元素
 * @param selectors 选择器字符串数组
 * @returns 如果所有选择器都在祖先元素中找到匹配，则返回 true
 */
export function doesSomeParentMatch(
  element: HTMLElement | SVGElement,
  selectors: string[],
) {
  /**
   * 当前要匹配的选择器
   */
  let selector: string,
    /**
     * 标记当前父元素是否匹配当前选择器
     */
    parentMatching = true;
  while (
    element.parentElement &&
    element.parentElement.nodeType === 1 &&
    selectors.length
  ) {
    if (parentMatching) {
      selector = selectors.pop()!;
    }
    element = element.parentElement;
    parentMatching = selectorMatches(element, selector!);
  }
  return selectors.length === 0;
}
