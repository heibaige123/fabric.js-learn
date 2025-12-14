import type { FabricObject } from '../shapes/Object/FabricObject';

/**
 * SVG 解析输出接口
 */
export type SVGParsingOutput = {
  /**
   * 解析出的 Fabric 对象数组
   */
  objects: (FabricObject | null)[];
  /**
   * 解析选项
   */
  options: Record<string, any>;
  /**
   * SVG 元素数组
   */
  elements: Element[];
  /**
   * 所有 SVG 元素数组
   */
  allElements: Element[];
};

/**
 * SVG reviver 回调函数类型
 * @param element 原始 SVG 元素
 * @param fabricObject 生成的 Fabric 对象
 */
export type TSvgReviverCallback = (
  element: Element,
  fabricObject: FabricObject,
) => void;

/**
 * CSS 规则类型
 */
export type CSSRules = Record<string, Record<string, string>>;
