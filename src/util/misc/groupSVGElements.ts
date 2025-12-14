import type { GroupProps } from '../../shapes/Group';
import { Group } from '../../shapes/Group';
import type { FabricObject } from '../../shapes/Object/FabricObject';

/**
 * TODO 尝试不同的布局管理器和 svg 结果（固定适应内容）
 * 对 SVG 元素进行分组（通常是从 SVG 文档中检索到的那些）
 *
 * TODO experiment with different layout manager and svg results ( fixed fit content )
 * Groups SVG elements (usually those retrieved from SVG document)
 * @param elements 从 svg 解析的 FabricObject(s)，用于分组
 * @param options 选项
 * @returns FabricObject 或 Group
 *
 * @param {FabricObject[]} elements FabricObject(s) parsed from svg, to group
 * @return {FabricObject | Group}
 */
export const groupSVGElements = (
  elements: FabricObject[],
  options?: Partial<GroupProps>,
) => {
  if (elements && elements.length === 1) {
    return elements[0];
  }
  return new Group(elements, options);
};
