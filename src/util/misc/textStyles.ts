import { reNewline } from '../../constants';
import type {
  TextStyle,
  TextStyleDeclaration,
} from '../../shapes/Text/StyledText';
import { cloneStyles } from '../internals/cloneStyles';
import { graphemeSplit } from '../lang_string';

/**
 * 文本样式数组类型
 */
export type TextStyleArray = {
  /**
   * 起始索引
   */
  start: number;
  /**
   * 结束索引
   */
  end: number;
  /**
   * 样式声明
   */
  style: TextStyleDeclaration;
}[];

/**
 * @param prevStyle 要比较的第一个样式
 * @param thisStyle 要比较的第二个样式
 * @param forTextSpans 是否检查上划线、下划线和删除线属性
 * @returns 如果样式已更改，则为 true
 *
 * @param {Object} prevStyle first style to compare
 * @param {Object} thisStyle second style to compare
 * @param {boolean} forTextSpans whether to check overline, underline, and line-through properties
 * @return {boolean} true if the style changed
 */
export const hasStyleChanged = (
  prevStyle: TextStyleDeclaration,
  thisStyle: TextStyleDeclaration,
  forTextSpans = false,
) =>
  prevStyle.fill !== thisStyle.fill ||
  prevStyle.stroke !== thisStyle.stroke ||
  prevStyle.strokeWidth !== thisStyle.strokeWidth ||
  prevStyle.fontSize !== thisStyle.fontSize ||
  prevStyle.fontFamily !== thisStyle.fontFamily ||
  prevStyle.fontWeight !== thisStyle.fontWeight ||
  prevStyle.fontStyle !== thisStyle.fontStyle ||
  prevStyle.textDecorationThickness !== thisStyle.textDecorationThickness ||
  prevStyle.textBackgroundColor !== thisStyle.textBackgroundColor ||
  prevStyle.deltaY !== thisStyle.deltaY ||
  (forTextSpans &&
    (prevStyle.overline !== thisStyle.overline ||
      prevStyle.underline !== thisStyle.underline ||
      prevStyle.linethrough !== thisStyle.linethrough));

/**
 * 返回文本对象内联样式属性的数组形式，样式按范围分组
 * 而不是按字符分组。这种格式不那么冗长，更适合存储
 * 所以它用于序列化（不在运行时）。
 * @param styles 文本对象的每个字符样式
 * @param text 应用样式的文本字符串
 * @returns
 *
 * Returns the array form of a text object's inline styles property with styles grouped in ranges
 * rather than per character. This format is less verbose, and is better suited for storage
 * so it is used in serialization (not during runtime).
 * @param {object} styles per character styles for a text object
 * @param {String} text the text string that the styles are applied to
 * @return {{start: number, end: number, style: object}[]}
 */
export const stylesToArray = (
  styles: TextStyle,
  text: string,
): TextStyleArray => {
  const textLines = text.split('\n'),
    stylesArray = [];
  let charIndex = -1,
    prevStyle = {};
  // clone style structure to prevent mutation
  styles = cloneStyles(styles);

  //loop through each textLine
  for (let i = 0; i < textLines.length; i++) {
    const chars = graphemeSplit(textLines[i]);
    if (!styles[i]) {
      //no styles exist for this line, so add the line's length to the charIndex total and reset prevStyle
      charIndex += chars.length;
      prevStyle = {};
      continue;
    }
    //loop through each character of the current line
    for (let c = 0; c < chars.length; c++) {
      charIndex++;
      const thisStyle = styles[i][c];
      //check if style exists for this character
      if (thisStyle && Object.keys(thisStyle).length > 0) {
        if (hasStyleChanged(prevStyle, thisStyle, true)) {
          stylesArray.push({
            start: charIndex,
            end: charIndex + 1,
            style: thisStyle,
          });
        } else {
          //if style is the same as previous character, increase end index
          stylesArray[stylesArray.length - 1].end++;
        }
      }
      prevStyle = thisStyle || {};
    }
  }
  return stylesArray;
};

/**
 * 返回样式属性的对象形式，其中样式是按字符分配的
 * 而不是按范围分组。这种格式更冗长，并且
 * 仅在运行时使用（不用于序列化/存储）
 * @param styles 文本对象样式的序列化形式
 * @param text 应用样式的文本字符串
 * @returns
 *
 * Returns the object form of the styles property with styles that are assigned per
 * character rather than grouped by range. This format is more verbose, and is
 * only used during runtime (not for serialization/storage)
 * @param {Array} styles the serialized form of a text object's styles
 * @param {String} text the text string that the styles are applied to
 * @return {Object}
 */
export const stylesFromArray = (
  styles: TextStyleArray | TextStyle,
  text: string,
): TextStyle => {
  if (!Array.isArray(styles)) {
    // clone to prevent mutation
    return cloneStyles(styles);
  }
  const textLines = text.split(reNewline),
    stylesObject: TextStyle = {};
  let charIndex = -1,
    styleIndex = 0;
  //loop through each textLine
  for (let i = 0; i < textLines.length; i++) {
    const chars = graphemeSplit(textLines[i]);

    //loop through each character of the current line
    for (let c = 0; c < chars.length; c++) {
      charIndex++;
      //check if there's a style collection that includes the current character
      if (
        styles[styleIndex] &&
        styles[styleIndex].start <= charIndex &&
        charIndex < styles[styleIndex].end
      ) {
        //create object for line index if it doesn't exist
        stylesObject[i] = stylesObject[i] || {};
        //assign a style at this character's index
        stylesObject[i][c] = { ...styles[styleIndex].style };
        //if character is at the end of the current style collection, move to the next
        if (charIndex === styles[styleIndex].end - 1) {
          styleIndex++;
        }
      }
    }
  }
  return stylesObject;
};
