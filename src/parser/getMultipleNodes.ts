/**
 * 获取文档中指定名称的多个节点
 * @param doc 文档对象
 * @param nodeNames 节点名称数组
 * @returns 元素数组
 */
export function getMultipleNodes(
  doc: Document,
  nodeNames: string[],
): Element[] {
  /**
   * 当前节点名称
   */
  let nodeName,
    /**
     * 节点数组
     */
    nodeArray: Element[] = [],
    /**
     * 节点列表
     */
    nodeList,
    /**
     * 循环索引
     */
    i,
    /**
     * 节点名称数组长度
     */
    len;
  for (i = 0, len = nodeNames.length; i < len; i++) {
    nodeName = nodeNames[i];
    nodeList = doc.getElementsByTagNameNS(
      'http://www.w3.org/2000/svg',
      nodeName,
    );
    nodeArray = nodeArray.concat(Array.from(nodeList));
  }
  return nodeArray;
}
