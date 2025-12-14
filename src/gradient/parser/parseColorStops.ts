import { Color } from '../../color/Color';
import { parsePercent } from '../../parser/percent';
import { ifNaN } from '../../util/internals/ifNaN';
import type { ColorStop } from '../typedefs';

/**
 * 用于分割样式字符串中的键值对的正则表达式
 */
const RE_KEY_VALUE_PAIRS = /\s*;\s*/;

/**
 * 用于分割键和值的正则表达式
 */
const RE_KEY_VALUE = /\s*:\s*/;

/**
 * 解析单个 SVG 渐变停止点 (stop) 元素
 * @param el SVG stop 元素
 * @param opacityMultiplier 不透明度乘数
 * @returns 包含偏移量和颜色的对象
 */
function parseColorStop(el: SVGStopElement, opacityMultiplier: number) {
  let colorValue, opacityValue;
  const style = el.getAttribute('style');
  if (style) {
    const keyValuePairs = style.split(RE_KEY_VALUE_PAIRS);

    if (keyValuePairs[keyValuePairs.length - 1] === '') {
      keyValuePairs.pop();
    }

    for (let i = keyValuePairs.length; i--; ) {
      const [key, value] = keyValuePairs[i]
        .split(RE_KEY_VALUE)
        .map((s) => s.trim());
      if (key === 'stop-color') {
        colorValue = value;
      } else if (key === 'stop-opacity') {
        opacityValue = value;
      }
    }
  }

  colorValue = colorValue || el.getAttribute('stop-color') || 'rgb(0,0,0)';
  opacityValue = ifNaN(
    parseFloat(opacityValue || el.getAttribute('stop-opacity') || ''),
    1,
  );

  const color = new Color(colorValue);

  color.setAlpha(color.getAlpha() * opacityValue * opacityMultiplier);

  return {
    offset: parsePercent(el.getAttribute('offset'), 0),
    color: color.toRgba(),
  };
}

/**
 * 解析 SVG 渐变元素中的所有颜色停止点
 * @param el SVG 渐变元素
 * @param opacityAttr 不透明度属性值
 * @returns 颜色停止点数组
 */
export function parseColorStops(
  el: SVGGradientElement,
  opacityAttr: string | null,
) {
  const colorStops: ColorStop[] = [],
    colorStopEls = el.getElementsByTagName('stop'),
    multiplier = parsePercent(opacityAttr, 1);
  for (let i = colorStopEls.length; i--; ) {
    colorStops.push(parseColorStop(colorStopEls[i], multiplier));
  }
  return colorStops;
}
