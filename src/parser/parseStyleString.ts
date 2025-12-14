/**
 * 接收一个样式字符串，并将其解析为一个仅包含已定义值且属性名小写的对象
 *
 * Takes a style string and parses it in one that has only defined values
 * and lowercases properties
 * @param style 样式字符串
 * @param style
 * @param oStyle 目标样式对象，解析后的值将存入其中
 * @param oStyle
 */
export function parseStyleString(
  style: string,
  oStyle: Record<string, any>,
): void {
  style
    .replace(/;\s*$/, '')
    .split(';')
    .forEach((chunk) => {
      if (!chunk) return;
      const [attr, value] = chunk.split(':');
      oStyle[attr.trim().toLowerCase()] = value.trim();
    });
}
