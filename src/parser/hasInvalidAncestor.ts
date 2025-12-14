import { svgInvalidAncestors } from './constants';
import { getSvgRegex } from './getSvgRegex';
import { getTagName } from './getTagName';

/**
 * 无效 SVG 祖先元素的正则表达式
 */
const svgInvalidAncestorsRegEx = getSvgRegex(svgInvalidAncestors);

/**
 * 检查元素是否具有无效的 SVG 祖先元素
 * @param element 要检查的元素
 * @returns 如果存在无效祖先元素，则返回 true
 */
export function hasInvalidAncestor(element: Element) {
  /**
   * 当前检查的元素
   */
  let _element: Element | null = element;
  while (_element && (_element = _element.parentElement)) {
    if (
      _element &&
      _element.nodeName &&
      svgInvalidAncestorsRegEx.test(getTagName(_element)) &&
      !_element.getAttribute('instantiated_by_use')
    ) {
      return true;
    }
  }
  return false;
}
