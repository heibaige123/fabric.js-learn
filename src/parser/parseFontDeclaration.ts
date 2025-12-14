import { NORMAL } from '../constants';
import { parseUnit } from '../util/misc/svgParsing';
import { reFontDeclaration } from './constants';

/**
 * 解析简写的字体声明，将其属性添加到样式对象中
 *
 * Parses a short font declaration, building adding its properties to a style object
 * @param value 字体声明字符串
 * @param {String} value font declaration
 * @param oStyle 样式定义对象
 * @param {Object} oStyle definition
 */
export function parseFontDeclaration(
  value: string,
  oStyle: Record<string, any>,
): void {
  /**
   * 匹配结果
   */
  const match = value.match(reFontDeclaration);

  if (!match) {
    return;
  }
  /**
   * 字体样式
   */
  const fontStyle = match[1],
    // font variant is not used
    // 字体变体未使用
    // fontVariant = match[2],
    /**
     * 字体粗细
     */
    fontWeight = match[3],
    /**
     * 字体大小
     */
    fontSize = match[4],
    /**
     * 行高
     */
    lineHeight = match[5],
    /**
     * 字体族
     */
    fontFamily = match[6];

  if (fontStyle) {
    oStyle.fontStyle = fontStyle;
  }
  if (fontWeight) {
    oStyle.fontWeight = isNaN(parseFloat(fontWeight))
      ? fontWeight
      : parseFloat(fontWeight);
  }
  if (fontSize) {
    oStyle.fontSize = parseUnit(fontSize);
  }
  if (fontFamily) {
    oStyle.fontFamily = fontFamily;
  }
  if (lineHeight) {
    oStyle.lineHeight = lineHeight === NORMAL ? 1 : lineHeight;
  }
}
