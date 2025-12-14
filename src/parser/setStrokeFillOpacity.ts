import { Color } from '../color/Color';
import { toFixed } from '../util/misc/toFixed';
import { FabricObject } from '../shapes/Object/FabricObject';

/**
 * 颜色属性映射，将颜色属性映射到对应的不透明度属性
 */
const colorAttributesMap = {
  stroke: 'strokeOpacity',
  fill: 'fillOpacity',
};

/**
 * 设置描边和填充的不透明度
 *
 * @private
 * @param attributes 要解析的属性对象
 * @param {Object} attributes Array of attributes to parse
 * @returns 处理后的属性对象
 */

export function setStrokeFillOpacity(
  attributes: Record<string, any>,
): Record<string, any> {
  const defaults = FabricObject.getDefaults();
  Object.entries(colorAttributesMap).forEach(([attr, colorAttr]) => {
    if (
      typeof attributes[colorAttr] === 'undefined' ||
      attributes[attr] === ''
    ) {
      return;
    }
    if (typeof attributes[attr] === 'undefined') {
      if (!defaults[attr]) {
        return;
      }
      attributes[attr] = defaults[attr];
    }
    if (attributes[attr].indexOf('url(') === 0) {
      return;
    }
    const color = new Color(attributes[attr]);
    attributes[attr] = color
      .setAlpha(toFixed(color.getAlpha() * attributes[colorAttr], 2))
      .toRgba();
  });
  return attributes;
}
