import { getMultipleNodes } from './getMultipleNodes';
import { recursivelyParseGradientsXlink } from './recursivelyParseGradientsXlink';

/**
 * 渐变标签数组
 */
const tagArray = [
  'linearGradient',
  'radialGradient',
  'svg:linearGradient',
  'svg:radialGradient',
];

/**
 * 解析 SVG 文档，返回其中找到的所有渐变声明
 *
 * Parses an SVG document, returning all of the gradient declarations found in it
 * @param doc 要解析的 SVG 文档
 * @param {SVGDocument} doc SVG document to parse
 * @returns 渐变定义；键对应元素 id，值对应渐变定义元素
 * @return {Object} Gradient definitions; key corresponds to element id, value -- to gradient definition element
 */
export function getGradientDefs(
  doc: Document,
): Record<string, SVGGradientElement> {
  /**
   * 元素列表
   */
  const elList = getMultipleNodes(doc, tagArray);
  /**
   * 渐变定义对象
   */
  const gradientDefs: Record<string, SVGGradientElement> = {};
  let j = elList.length;
  while (j--) {
    /**
     * 当前元素
     */
    const el = elList[j];
    if (el.getAttribute('xlink:href')) {
      recursivelyParseGradientsXlink(doc, el);
    }
    /**
     * 元素 ID
     */
    const id = el.getAttribute('id');
    if (id) {
      gradientDefs[id] = el as SVGGradientElement;
    }
  }
  return gradientDefs;
}
