import { Color } from '../../color/Color';
import { config } from '../../config';
import { DEFAULT_SVG_FONT_SIZE, FILL, NONE } from '../../constants';
import type { TBBox, SVGElementName, SupportedSVGUnit } from '../../typedefs';
import { toFixed } from './toFixed';

/**
 * 返回 fabric 解析的给定 svg 的属性数组
 * @param type svg 元素类型（例如 'circle'）
 * @returns 支持的属性名称字符串数组
 *
 * Returns array of attributes for given svg that fabric parses
 * @param {SVGElementName} type Type of svg element (eg. 'circle')
 * @return {Array} string names of supported attributes
 */
export const getSvgAttributes = (type: SVGElementName) => {
  const commonAttributes = ['instantiated_by_use', 'style', 'id', 'class'];
  switch (type) {
    case 'linearGradient':
      return commonAttributes.concat([
        'x1',
        'y1',
        'x2',
        'y2',
        'gradientUnits',
        'gradientTransform',
      ]);
    case 'radialGradient':
      return commonAttributes.concat([
        'gradientUnits',
        'gradientTransform',
        'cx',
        'cy',
        'r',
        'fx',
        'fy',
        'fr',
      ]);
    case 'stop':
      return commonAttributes.concat(['offset', 'stop-color', 'stop-opacity']);
  }
  return commonAttributes;
};

/**
 * 如果适用，将属性值转换为像素值。
 * 返回转换后的像素或未转换的原始值。
 * @param value 要操作的数值字符串
 * @param fontSize 字体大小
 * @returns 数值
 *
 * Converts from attribute value to pixel value if applicable.
 * Returns converted pixels or original value not converted.
 * @param {string} value number to operate on
 * @param {number} fontSize
 * @return {number}
 */
export const parseUnit = (value: string, fontSize = DEFAULT_SVG_FONT_SIZE) => {
  const unit = /\D{0,2}$/.exec(value),
    number = parseFloat(value);
  const dpi = config.DPI;
  switch (unit?.[0] as SupportedSVGUnit) {
    case 'mm':
      return (number * dpi) / 25.4;

    case 'cm':
      return (number * dpi) / 2.54;

    case 'in':
      return number * dpi;

    case 'pt':
      return (number * dpi) / 72; // or * 4 / 3

    case 'pc':
      return ((number * dpi) / 72) * 12; // or * 16

    case 'em':
      return number * fontSize;

    default:
      return number;
  }
};

/**
 * 保留宽高比选项
 */
export type MeetOrSlice = 'meet' | 'slice';

/**
 * 对齐选项
 */
export type MinMidMax = 'Min' | 'Mid' | 'Max' | 'none';

/**
 * 解析 preserveAspectRatio 属性的结果类型
 */
export type TPreserveArParsed = {
  /**
   * 保持宽高比选项
   */
  meetOrSlice: MeetOrSlice;
  /**
   * 水平对齐选项
   */
  alignX: MinMidMax;
  /**
   * 垂直对齐选项
   */
  alignY: MinMidMax;
};

// align can be either none or undefined or a combination of mid/max
/**
 * 解析对齐选项
 * @param align 对齐字符串
 * @returns
 */
const parseAlign = (align: string): MinMidMax[] => {
  //divide align in alignX and alignY
  if (align && align !== NONE) {
    return [align.slice(1, 4) as MinMidMax, align.slice(5, 8) as MinMidMax];
  } else if (align === NONE) {
    return [align, align];
  }
  return ['Mid', 'Mid'];
};

/**
 * 从元素解析 preserveAspectRatio 属性
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio
 * @param attribute 要解析的属性
 * @returns 包含 align 和 meetOrSlice 属性的对象
 *
 * Parse preserveAspectRatio attribute from element
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio
 * @param {string} attribute to be parsed
 * @return {Object} an object containing align and meetOrSlice attribute
 */
export const parsePreserveAspectRatioAttribute = (
  attribute: string,
): TPreserveArParsed => {
  const [firstPart, secondPart] = attribute.trim().split(' ') as [
    MinMidMax,
    MeetOrSlice | undefined,
  ];
  const [alignX, alignY] = parseAlign(firstPart);
  return {
    meetOrSlice: secondPart || 'meet',
    alignX,
    alignY,
  };
};

/**
 * Adobe Illustrator (至少 CS5) 无法渲染基于 rgba() 的填充值
 * 我们通过将 alpha 通道“移动”到 opacity 属性并将 fill 的 alpha 设置为 1 来解决此问题
 * @param prop 属性名
 * @param value 属性值
 * @param inlineStyle 默认为内联样式，使用的分隔符是 ":"，另一个是 "="
 * @returns
 *
 * Adobe Illustrator (at least CS5) is unable to render rgba()-based fill values
 * we work around it by "moving" alpha channel into opacity attribute and setting fill's alpha to 1
 * @param prop
 * @param value
 * @param {boolean} inlineStyle The default is inline style, the separator used is ":", The other is "="
 * @returns
 */
export const colorPropToSVG = (
  prop: string,
  value?: any,
  inlineStyle = true,
) => {
  let colorValue;
  let opacityValue;
  if (!value) {
    colorValue = 'none';
  } else if (value.toLive) {
    colorValue = `url(#SVGID_${value.id})`;
  } else {
    const color = new Color(value),
      opacity = color.getAlpha();

    colorValue = color.toRgb();
    if (opacity !== 1) {
      opacityValue = opacity.toString();
    }
  }
  if (inlineStyle) {
    return `${prop}: ${colorValue}; ${
      opacityValue ? `${prop}-opacity: ${opacityValue}; ` : ''
    }`;
  } else {
    return `${prop}="${colorValue}" ${
      opacityValue ? `${prop}-opacity="${opacityValue}" ` : ''
    }`;
  }
};

/**
 * 创建 SVG 矩形
 * @param color 颜色
 * @param bbox 边界框
 * @param precision 精度
 * @returns SVG 矩形字符串
 */
export const createSVGRect = (
  color: string,
  { left, top, width, height }: TBBox,
  precision = config.NUM_FRACTION_DIGITS,
) => {
  const svgColor = colorPropToSVG(FILL, color, false);
  const [x, y, w, h] = [left, top, width, height].map((value) =>
    toFixed(value, precision),
  );
  return `<rect ${svgColor} x="${x}" y="${y}" width="${w}" height="${h}"></rect>`;
};
