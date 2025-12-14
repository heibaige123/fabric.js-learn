import type { TextStyle } from '../../shapes/Text/StyledText';

/**
 * 克隆文本样式对象
 * @param style 文本样式对象
 * @returns 克隆后的文本样式对象
 */
export const cloneStyles = (style: TextStyle): TextStyle => {
  const newObj: TextStyle = {};
  Object.keys(style).forEach((key) => {
    newObj[key] = {};
    Object.keys(style[key]).forEach((keyInner) => {
      newObj[key][keyInner] = { ...style[key][keyInner] };
    });
  });
  return newObj;
};
