/**
 * 渐变属性列表
 */
const gradientsAttrs = [
  'gradientTransform',
  'x1',
  'x2',
  'y1',
  'y2',
  'gradientUnits',
  'cx',
  'cy',
  'r',
  'fx',
  'fy',
];
/**
 * xlink:href 属性名
 */
const xlinkAttr = 'xlink:href';

/**
 * 递归解析渐变的 xlink 引用，将引用的属性和子节点复制到当前渐变元素中
 * @param doc SVG 文档对象
 * @param gradient 当前渐变元素
 * @returns void
 */
export function recursivelyParseGradientsXlink(
  doc: Document,
  gradient: Element,
) {
  const xLink = gradient.getAttribute(xlinkAttr)?.slice(1) || '',
    referencedGradient = doc.getElementById(xLink);
  if (referencedGradient && referencedGradient.getAttribute(xlinkAttr)) {
    recursivelyParseGradientsXlink(doc, referencedGradient as Element);
  }
  if (referencedGradient) {
    gradientsAttrs.forEach((attr) => {
      const value = referencedGradient.getAttribute(attr);
      if (!gradient.hasAttribute(attr) && value) {
        gradient.setAttribute(attr, value);
      }
    });
    if (!gradient.children.length) {
      const referenceClone = referencedGradient.cloneNode(true);
      while (referenceClone.firstChild) {
        gradient.appendChild(referenceClone.firstChild);
      }
    }
  }
  gradient.removeAttribute(xlinkAttr);
}
