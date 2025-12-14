/**
 * 接收一个样式对象，并将其解析为一个仅包含已定义值且属性名小写的对象
 *
 * Takes a style object and parses it in one that has only defined values
 * and lowercases properties
 * @param style 原始样式对象
 * @param style
 * @param oStyle 目标样式对象，解析后的值将存入其中
 * @param oStyle
 */
export function parseStyleObject(
  style: Record<string, any>,
  oStyle: Record<string, any>,
): void {
  Object.entries(style).forEach(([prop, value]) => {
    if (value === undefined) {
      return;
    }
    oStyle[prop.toLowerCase()] = value;
  });
}
