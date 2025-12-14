import { multiplyTransformMatrices } from '../util/misc/matrix';
import { parseUnit } from '../util/misc/svgParsing';
import { parseTransformAttribute } from './parseTransformAttribute';
import { CENTER, LEFT, RIGHT, NONE, FILL, STROKE } from '../constants';
import { TEXT_DECORATION_THICKNESS } from '../shapes/Text/constants';

/**
 * 规范化属性值
 * @param attr 属性名称
 * @param value 属性值
 * @param parentAttributes 父元素属性
 * @param fontSize 字体大小
 * @returns 规范化后的属性值
 */
export function normalizeValue(
  attr: string,
  value: any,
  parentAttributes: Record<string, any>,
  fontSize: number,
): string | null | boolean | number[] | number {
  /**
   * 值是否为数组
   */
  const isArray = Array.isArray(value);
  /**
   * 解析后的数值
   */
  let parsed: number | number[];
  /**
   * 输出值
   */
  let ouputValue: string | null | boolean | number[] | number = value;
  if ((attr === FILL || attr === STROKE) && value === NONE) {
    ouputValue = '';
  } else if (attr === 'strokeUniform') {
    return value === 'non-scaling-stroke';
  } else if (attr === 'strokeDashArray') {
    if (value === NONE) {
      ouputValue = null;
    } else {
      ouputValue = value.replace(/,/g, ' ').split(/\s+/).map(parseFloat);
    }
  } else if (attr === 'transformMatrix') {
    if (parentAttributes && parentAttributes.transformMatrix) {
      ouputValue = multiplyTransformMatrices(
        parentAttributes.transformMatrix,
        parseTransformAttribute(value),
      );
    } else {
      ouputValue = parseTransformAttribute(value);
    }
  } else if (attr === 'visible') {
    ouputValue = value !== NONE && value !== 'hidden';
    // display=none on parent element always takes precedence over child element
    // 父元素上的 display=none 总是优先于子元素
    if (parentAttributes && parentAttributes.visible === false) {
      ouputValue = false;
    }
  } else if (attr === 'opacity') {
    ouputValue = parseFloat(value);
    if (parentAttributes && typeof parentAttributes.opacity !== 'undefined') {
      ouputValue *= parentAttributes.opacity as number;
    }
  } else if (attr === 'textAnchor' /* text-anchor */) {
    ouputValue = value === 'start' ? LEFT : value === 'end' ? RIGHT : CENTER;
  } else if (attr === 'charSpacing' || attr === TEXT_DECORATION_THICKNESS) {
    // parseUnit returns px and we convert it to em
    // parseUnit 返回 px，我们将其转换为 em
    parsed = (parseUnit(value, fontSize) / fontSize) * 1000;
  } else if (attr === 'paintFirst') {
    /**
     * 填充索引
     */
    const fillIndex = value.indexOf(FILL);
    /**
     * 描边索引
     */
    const strokeIndex = value.indexOf(STROKE);
    ouputValue = FILL;
    if (fillIndex > -1 && strokeIndex > -1 && strokeIndex < fillIndex) {
      ouputValue = STROKE;
    } else if (fillIndex === -1 && strokeIndex > -1) {
      ouputValue = STROKE;
    }
  } else if (
    attr === 'href' ||
    attr === 'xlink:href' ||
    attr === 'font' ||
    attr === 'id'
  ) {
    return value;
  } else if (attr === 'imageSmoothing') {
    return value === 'optimizeQuality';
  } else {
    parsed = isArray
      ? (value as string[]).map(parseUnit)
      : parseUnit(value, fontSize);
  }

  return !isArray && isNaN(parsed! as number) ? ouputValue : parsed!;
}
