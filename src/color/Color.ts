import { normalizeWs } from '../util/internals/normalizeWhiteSpace';
import { radiansToDegrees } from '../util/misc/radiansDegreesConversion';
import { ColorNameMap } from './color_map';
import { reHSLa, reHex, reRGBa } from './constants';
import type { TRGBAColorSource, TColorArg } from './typedefs';
import {
  hue2rgb,
  hexify,
  rgb2Hsl,
  fromAlphaToFloat,
  greyAverage,
} from './util';

/**
 * 颜色类，提供通用的颜色操作
 *
 * @class Color common color operations
 * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-2#colors colors}
 */
export class Color {
  declare private _source: TRGBAColorSource;
  isUnrecognised = false;

  /**
   * 构造函数
   * @param color 可选的颜色值，可以是 hex、rgb(a)、hsl 格式或已知颜色列表中的名称
   *
   * @param {string} [color] optional in hex or rgb(a) or hsl format or from known color list
   */
  constructor(color?: TColorArg) {
    if (!color) {
      // we default to black as canvas does
      this.setSource([0, 0, 0, 1]);
    } else if (color instanceof Color) {
      this.setSource([...color._source]);
    } else if (Array.isArray(color)) {
      const [r, g, b, a = 1] = color;
      this.setSource([r, g, b, a]);
    } else {
      this.setSource(this._tryParsingColor(color));
    }
  }

  /**
   * 尝试解析颜色值
   * @private
   * @param color 要解析的颜色值
   * @returns 解析后的 RGBA 颜色源
   *
   * @private
   * @param {string} [color] Color value to parse
   * @returns {TRGBAColorSource}
   */
  protected _tryParsingColor(color: string) {
    color = color.toLowerCase();
    if (color in ColorNameMap) {
      color = ColorNameMap[color as keyof typeof ColorNameMap];
    }
    return color === 'transparent'
      ? ([255, 255, 255, 0] as TRGBAColorSource)
      : Color.sourceFromHex(color) ||
          Color.sourceFromRgb(color) ||
          Color.sourceFromHsl(color) ||
          // color is not recognized
          // we default to black as canvas does
          // eslint-disable-next-line no-constant-binary-expression
          ((this.isUnrecognised = true) && ([0, 0, 0, 1] as TRGBAColorSource));
  }

  /**
   * 返回此颜色的源（源是一个数组表示；例如：[200, 200, 100, 1]）
   * @returns 颜色源数组
   *
   * Returns source of this color (where source is an array representation; ex: [200, 200, 100, 1])
   * @return {TRGBAColorSource}
   */
  getSource() {
    return this._source;
  }

  /**
   * 设置此颜色的源（源是一个数组表示；例如：[200, 200, 100, 1]）
   * @param source 颜色源数组
   *
   * Sets source of this color (where source is an array representation; ex: [200, 200, 100, 1])
   * @param {TRGBAColorSource} source
   */
  setSource(source: TRGBAColorSource) {
    this._source = source;
  }

  /**
   * 返回 RGB 格式的颜色表示
   * @returns 例如：rgb(0-255,0-255,0-255)
   *
   * Returns color representation in RGB format
   * @return {String} ex: rgb(0-255,0-255,0-255)
   */
  toRgb() {
    const [r, g, b] = this.getSource();
    return `rgb(${r},${g},${b})`;
  }

  /**
   * 返回 RGBA 格式的颜色表示
   * @returns 例如：rgba(0-255,0-255,0-255,0-1)
   *
   * Returns color representation in RGBA format
   * @return {String} ex: rgba(0-255,0-255,0-255,0-1)
   */
  toRgba() {
    return `rgba(${this.getSource().join(',')})`;
  }

  /**
   * 返回 HSL 格式的颜色表示
   * @returns 例如：hsl(0-360,0%-100%,0%-100%)
   *
   * Returns color representation in HSL format
   * @return {String} ex: hsl(0-360,0%-100%,0%-100%)
   */
  toHsl() {
    const [h, s, l] = rgb2Hsl(...this.getSource());
    return `hsl(${h},${s}%,${l}%)`;
  }

  /**
   * 返回 HSLA 格式的颜色表示
   * @returns 例如：hsla(0-360,0%-100%,0%-100%,0-1)
   *
   * Returns color representation in HSLA format
   * @return {String} ex: hsla(0-360,0%-100%,0%-100%,0-1)
   */
  toHsla() {
    const [h, s, l, a] = rgb2Hsl(...this.getSource());
    return `hsla(${h},${s}%,${l}%,${a})`;
  }

  /**
   * 返回 HEX 格式的颜色表示
   * @returns 例如：FF5555
   *
   * Returns color representation in HEX format
   * @return {String} ex: FF5555
   */
  toHex() {
    const fullHex = this.toHexa();
    return fullHex.slice(0, 6);
  }

  /**
   * 返回 HEXA 格式的颜色表示
   * @returns 例如：FF5555CC
   *
   * Returns color representation in HEXA format
   * @return {String} ex: FF5555CC
   */
  toHexa() {
    const [r, g, b, a] = this.getSource();
    return `${hexify(r)}${hexify(g)}${hexify(b)}${hexify(Math.round(a * 255))}`;
  }

  /**
   * 获取此颜色的 alpha 通道值
   * @returns 0-1 之间的数值
   *
   * Gets value of alpha channel for this color
   * @return {Number} 0-1
   */
  getAlpha() {
    return this.getSource()[3];
  }

  /**
   * 设置此颜色的 alpha 通道值
   * @param alpha Alpha 值 0-1
   * @returns 当前颜色实例
   *
   * Sets value of alpha channel for this color
   * @param {Number} alpha Alpha value 0-1
   * @return {Color} thisArg
   */
  setAlpha(alpha: number) {
    this._source[3] = alpha;
    return this;
  }

  /**
   * 将颜色转换为灰度表示
   * @returns 当前颜色实例
   *
   * Transforms color to its grayscale representation
   * @return {Color} thisArg
   */
  toGrayscale() {
    this.setSource(greyAverage(this.getSource()));
    return this;
  }

  /**
   * 将颜色转换为黑白表示
   * @param threshold 阈值
   * @returns 当前颜色实例
   *
   * Transforms color to its black and white representation
   * @param {Number} threshold
   * @return {Color} thisArg
   */
  toBlackWhite(threshold: number) {
    const [average, , , a] = greyAverage(this.getSource()),
      bOrW = average < (threshold || 127) ? 0 : 255;
    this.setSource([bOrW, bOrW, bOrW, a]);
    return this;
  }

  /**
   * 将颜色与另一种颜色叠加
   * @param otherColor 另一种颜色
   * @returns 当前颜色实例
   *
   * Overlays color with another color
   * @param {String|Color} otherColor
   * @return {Color} thisArg
   */
  overlayWith(otherColor: string | Color) {
    if (!(otherColor instanceof Color)) {
      otherColor = new Color(otherColor);
    }

    const source = this.getSource(),
      otherAlpha = 0.5,
      otherSource = otherColor.getSource(),
      [R, G, B] = source.map((value, index) =>
        Math.round(value * (1 - otherAlpha) + otherSource[index] * otherAlpha),
      );

    this.setSource([R, G, B, source[3]]);
    return this;
  }

  /**
   * 给定 RGB 格式的颜色，返回新的颜色对象
   * @param color 颜色值 例如：rgb(0-255,0-255,0-255)
   * @returns 颜色对象
   *
   * Returns new color object, when given a color in RGB format
   * @param {String} color Color value ex: rgb(0-255,0-255,0-255)
   * @return {Color}
   */
  static fromRgb(color: string): Color {
    return Color.fromRgba(color);
  }

  /**
   * 给定 RGBA 格式的颜色，返回新的颜色对象
   * @param color 颜色值
   * @returns 颜色对象
   *
   * Returns new color object, when given a color in RGBA format
   * @param {String} color
   * @return {Color}
   */
  static fromRgba(color: string): Color {
    return new Color(Color.sourceFromRgb(color));
  }

  /**
   * 返回 RGB 或 RGBA 格式颜色的数组表示（例如：[100, 100, 200, 1]）
   * @param color 颜色值 例如：rgb(0-255,0-255,0-255), rgb(0%-100%,0%-100%,0%-100%)
   * @returns 颜色源数组
   *
   * Returns array representation (ex: [100, 100, 200, 1]) of a color that's in RGB or RGBA format
   * @param {String} color Color value ex: rgb(0-255,0-255,0-255), rgb(0%-100%,0%-100%,0%-100%)
   * @return {TRGBAColorSource | undefined} source
   */
  static sourceFromRgb(color: string): TRGBAColorSource | undefined {
    const match = normalizeWs(color).match(reRGBa());
    if (match) {
      const [r, g, b] = match.slice(1, 4).map((value) => {
        const parsedValue = parseFloat(value);
        return value.endsWith('%')
          ? Math.round(parsedValue * 2.55)
          : parsedValue;
      });
      return [r, g, b, fromAlphaToFloat(match[4])];
    }
  }

  /**
   * 给定 HSL 格式的颜色，返回新的颜色对象
   * @param color 颜色值 例如：hsl(0-260,0%-100%,0%-100%)
   * @returns 颜色对象
   *
   * Returns new color object, when given a color in HSL format
   * @param {String} color Color value ex: hsl(0-260,0%-100%,0%-100%)
   * @return {Color}
   */
  static fromHsl(color: string): Color {
    return Color.fromHsla(color);
  }

  /**
   * 给定 HSLA 格式的颜色，返回新的颜色对象
   * @param color 颜色值
   * @returns 颜色对象
   *
   * Returns new color object, when given a color in HSLA format
   * @param {String} color
   * @return {Color}
   */
  static fromHsla(color: string): Color {
    return new Color(Color.sourceFromHsl(color));
  }

  /**
   * 返回 HSL 或 HSLA 格式颜色的数组表示（例如：[100, 100, 200, 1]）。
   * 改编自 <a href="https://rawgithub.com/mjijackson/mjijackson.github.com/master/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript.html">https://github.com/mjijackson</a>
   * @param color 颜色值 例如：hsl(0-360,0%-100%,0%-100%) 或 hsla(0-360,0%-100%,0%-100%, 0-1)
   * @returns 颜色源数组
   *
   * Returns array representation (ex: [100, 100, 200, 1]) of a color that's in HSL or HSLA format.
   * Adapted from <a href="https://rawgithub.com/mjijackson/mjijackson.github.com/master/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript.html">https://github.com/mjijackson</a>
   * @param {String} color Color value ex: hsl(0-360,0%-100%,0%-100%) or hsla(0-360,0%-100%,0%-100%, 0-1)
   * @return {TRGBAColorSource | undefined} source
   * @see http://http://www.w3.org/TR/css3-color/#hsl-color
   */
  static sourceFromHsl(color: string): TRGBAColorSource | undefined {
    const match = normalizeWs(color).match(reHSLa());
    if (!match) {
      return;
    }
    const match1degrees = Color.parseAngletoDegrees(match[1]);

    const h = (((match1degrees % 360) + 360) % 360) / 360,
      s = parseFloat(match[2]) / 100,
      l = parseFloat(match[3]) / 100;
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l <= 0.5 ? l * (s + 1) : l + s - l * s,
        p = l * 2 - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
      fromAlphaToFloat(match[4]),
    ];
  }

  /**
   * 给定 HEX 格式的颜色，返回新的颜色对象
   * @param color 颜色值 例如：FF5555
   * @returns 颜色对象
   *
   * Returns new color object, when given a color in HEX format
   * @param {String} color Color value ex: FF5555
   * @return {Color}
   */
  static fromHex(color: string): Color {
    return new Color(Color.sourceFromHex(color));
  }

  /**
   * 返回 HEX 格式颜色的数组表示（例如：[100, 100, 200, 1]）
   * @param color 例如：FF5555 或 FF5544CC (RGBa)
   * @returns 颜色源数组
   *
   * Returns array representation (ex: [100, 100, 200, 1]) of a color that's in HEX format
   * @param {String} color ex: FF5555 or FF5544CC (RGBa)
   * @return {TRGBAColorSource | undefined} source
   */
  static sourceFromHex(color: string): TRGBAColorSource | undefined {
    if (color.match(reHex())) {
      const value = color.slice(color.indexOf('#') + 1),
        isShortNotation = value.length <= 4;
      let expandedValue: string[];
      if (isShortNotation) {
        expandedValue = value.split('').map((hex) => hex + hex);
      } else {
        expandedValue = value.match(/.{2}/g)!;
      }
      const [r, g, b, a = 255] = expandedValue.map((hexCouple) =>
        parseInt(hexCouple, 16),
      );
      return [r, g, b, a / 255];
    }
  }

  /**
   * 将可能是任何角度表示法（50deg, 0.5turn, 2rad）的字符串转换为不带 'deg' 后缀的度数
   * @param value 例如：0deg, 0.5turn, 2rad
   * @returns 度数，如果输入无效则返回 NaN
   *
   * Converts a string that could be any angle notation (50deg, 0.5turn, 2rad)
   * into degrees without the 'deg' suffix
   * @param {String} value ex: 0deg, 0.5turn, 2rad
   * @return {Number} number in degrees or NaN if inputs are invalid
   */
  static parseAngletoDegrees(value: string): number {
    const lowercase = value.toLowerCase();
    const numeric = parseFloat(lowercase);

    if (lowercase.includes('rad')) {
      return radiansToDegrees(numeric);
    }

    if (lowercase.includes('turn')) {
      return numeric * 360;
    }

    // Value is probably just a number already in degrees eg '50'
    return numeric;
  }
}
