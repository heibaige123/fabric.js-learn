/**
 * 获取元素的标签名称，移除 'svg:' 前缀
 * @param node 元素节点
 * @returns 处理后的标签名称
 */
export const getTagName = (node: Element) => node.tagName.replace('svg:', '');
