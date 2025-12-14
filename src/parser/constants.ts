import { getSvgRegex } from './getSvgRegex';
import { LEFT, TOP } from '../constants';
import { TEXT_DECORATION_THICKNESS } from '../shapes/Text/constants';

// matches, e.g.: +14.56e-12, etc.
/**
 * 匹配数字的正则表达式字符串
 *
 * matches, e.g.: +14.56e-12, etc.
 */
export const reNum = String.raw`[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?`;
/**
 * 视口分隔符的正则表达式字符串
 */
export const viewportSeparator = String.raw`(?:\s*,?\s+|\s*,\s*)`;

/**
 * SVG 命名空间
 */
export const svgNS = 'http://www.w3.org/2000/svg';

/**
 * 匹配字体声明的正则表达式
 */
export const reFontDeclaration = new RegExp(
  '(normal|italic)?\\s*(normal|small-caps)?\\s*' +
    '(normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900)?\\s*(' +
    reNum +
    '(?:px|cm|mm|em|pt|pc|in)*)(?:\\/(normal|' +
    reNum +
    '))?\\s+(.*)',
);

/**
 * 有效的 SVG 标签名称列表
 */
export const svgValidTagNames = [
    'path',
    'circle',
    'polygon',
    'polyline',
    'ellipse',
    'rect',
    'line',
    'image',
    'text',
  ],
  /**
   * 具有 viewBox 属性的 SVG 元素列表
   */
  svgViewBoxElements = ['symbol', 'image', 'marker', 'pattern', 'view', 'svg'],
  /**
   * 无效的 SVG 祖先元素列表
   */
  svgInvalidAncestors = [
    'pattern',
    'defs',
    'symbol',
    'metadata',
    'clipPath',
    'mask',
    'desc',
  ],
  /**
   * 有效的 SVG 父元素列表
   */
  svgValidParents = ['symbol', 'g', 'a', 'svg', 'clipPath', 'defs'],
  /**
   * SVG 属性到 Fabric.js 属性的映射
   */
  attributesMap = {
    cx: LEFT,
    x: LEFT,
    r: 'radius',
    cy: TOP,
    y: TOP,
    display: 'visible',
    visibility: 'visible',
    transform: 'transformMatrix',
    'fill-opacity': 'fillOpacity',
    'fill-rule': 'fillRule',
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-style': 'fontStyle',
    'font-weight': 'fontWeight',
    'letter-spacing': 'charSpacing',
    'paint-order': 'paintFirst',
    'stroke-dasharray': 'strokeDashArray',
    'stroke-dashoffset': 'strokeDashOffset',
    'stroke-linecap': 'strokeLineCap',
    'stroke-linejoin': 'strokeLineJoin',
    'stroke-miterlimit': 'strokeMiterLimit',
    'stroke-opacity': 'strokeOpacity',
    'stroke-width': 'strokeWidth',
    'text-decoration': 'textDecoration',
    'text-anchor': 'textAnchor',
    opacity: 'opacity',
    'clip-path': 'clipPath',
    'clip-rule': 'clipRule',
    'vector-effect': 'strokeUniform',
    'image-rendering': 'imageSmoothing',
    'text-decoration-thickness': TEXT_DECORATION_THICKNESS,
  },
  /**
   * 字体大小属性名
   */
  fSize = 'font-size',
  /**
   * 剪切路径属性名
   */
  cPath = 'clip-path';

/**
 * 匹配有效 SVG 标签名称的正则表达式
 */
export const svgValidTagNamesRegEx = getSvgRegex(svgValidTagNames);

/**
 * 匹配具有 viewBox 属性的 SVG 元素的正则表达式
 */
export const svgViewBoxElementsRegEx = getSvgRegex(svgViewBoxElements);

/**
 * 匹配有效 SVG 父元素的正则表达式
 */
export const svgValidParentsRegEx = getSvgRegex(svgValidParents);

// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute

/**
 * 匹配 viewBox 属性值的正则表达式
 *
 * http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
 */
export const reViewBoxAttrValue = new RegExp(
  String.raw`^\s*(${reNum})${viewportSeparator}(${reNum})${viewportSeparator}(${reNum})${viewportSeparator}(${reNum})\s*$`,
);
