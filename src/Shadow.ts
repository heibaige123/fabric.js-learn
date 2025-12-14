import { classRegistry } from './ClassRegistry';
import { Color } from './color/Color';
import { config } from './config';
import { reNum } from './parser/constants';
import { Point } from './Point';
import type { FabricObject } from './shapes/Object/FabricObject';
import type { TClassProperties } from './typedefs';
import { uid } from './util/internals/uid';
import { pickBy } from './util/misc/pick';
import { degreesToRadians } from './util/misc/radiansDegreesConversion';
import { toFixed } from './util/misc/toFixed';
import { rotateVector } from './util/misc/vectors';

/**
 * 匹配阴影 offsetX, offsetY 和 blur 的正则表达式 (例如: "2px 2px 10px rgba(0,0,0,0.2)", "rgb(0,255,0) 2px 2px")
 *
   * Regex matching shadow offsetX, offsetY and blur (ex: "2px 2px 10px rgba(0,0,0,0.2)", "rgb(0,255,0) 2px 2px")
   * - (?:\s|^): This part captures either a whitespace character (\s) or the beginning of a line (^). It's non-capturing (due to (?:...)), meaning it doesn't create a capturing group.
   * - (-?\d+(?:\.\d*)?(?:px)?(?:\s?|$))?: This captures the first component of the shadow, which is the horizontal offset. Breaking it down:
   *   - (-?\d+): Captures an optional minus sign followed by one or more digits (integer part of the number).
   *   - (?:\.\d*)?: Optionally captures a decimal point followed by zero or more digits (decimal part of the number).
   *   - (?:px)?: Optionally captures the "px" unit.
   *   - (?:\s?|$): Captures either an optional whitespace or the end of the line. This whole part is wrapped in a non-capturing group and marked as optional with ?.
   * - (-?\d+(?:\.\d*)?(?:px)?(?:\s?|$))?: Similar to the previous step, this captures the vertical offset.

(\d+(?:\.\d*)?(?:px)?)?: This captures the blur radius. It's similar to the horizontal offset but without the optional minus sign.

(?:\s+(-?\d+(?:\.\d*)?(?:px)?(?:\s?|$))?){0,1}: This captures an optional part for the color. It allows for whitespace followed by a component with an optional minus sign, digits, decimal point, and "px" unit.

(?:$|\s): This captures either the end of the line or a whitespace character. It ensures that the match ends either at the end of the string or with a whitespace character.
   */
// eslint-disable-next-line max-len

const shadowOffsetRegex = '(-?\\d+(?:\\.\\d*)?(?:px)?(?:\\s?|$))?';

const reOffsetsAndBlur = new RegExp(
  '(?:\\s|^)' +
    shadowOffsetRegex +
    shadowOffsetRegex +
    '(' +
    reNum +
    '?(?:px)?)?(?:\\s?|$)(?:$|\\s)',
);

/**
 * 阴影默认值
 */
export const shadowDefaultValues: Partial<TClassProperties<Shadow>> = {
  color: 'rgb(0,0,0)',
  blur: 0,
  offsetX: 0,
  offsetY: 0,
  affectStroke: false,
  includeDefaultValues: true,
  nonScaling: false,
};

/**
 * 序列化后的阴影选项
 */
export type SerializedShadowOptions = {
  /**
   * 阴影颜色
   */
  color: string;
  /**
   * 阴影模糊半径
   */
  blur: number;
  /**
   * 阴影水平偏移
   */
  offsetX: number;
  /**
   * 阴影垂直偏移
   */
  offsetY: number;
  /**
   * 阴影是否影响描边
   */
  affectStroke: boolean;
  /**
   * 阴影是否不随对象缩放
   */
  nonScaling: boolean;
  /**
   * 类型
   */
  type: string;
};

/**
 * 阴影类
 */
export class Shadow {
  /**
   * 阴影颜色
   *
   * Shadow color
   * @type String
   */
  declare color: string;

  /**
   * 阴影模糊半径
   *
   * Shadow blur
   * @type Number
   */
  declare blur: number;

  /**
   * 阴影水平偏移
   *
   * Shadow horizontal offset
   * @type Number
   */
  declare offsetX: number;

  /**
   * 阴影垂直偏移
   *
   * Shadow vertical offset
   * @type Number
   */
  declare offsetY: number;

  /**
   * 阴影是否应影响描边操作
   *
   * Whether the shadow should affect stroke operations
   * @type Boolean
   */
  declare affectStroke: boolean;

  /**
   * 指示 toObject 是否应包含默认值
   *
   * Indicates whether toObject should include default values
   * @type Boolean
   */
  declare includeDefaultValues: boolean;

  /**
   * 当为 `false` 时，阴影将随对象缩放。
   * 当为 `true` 时，阴影的 offsetX、offsetY 和 blur 将不受对象缩放的影响。
   * 默认为 false
   *
   * When `false`, the shadow will scale with the object.
   * When `true`, the shadow's offsetX, offsetY, and blur will not be affected by the object's scale.
   * default to false
   * @type Boolean
   */
  declare nonScaling: boolean;

  /**
   * 唯一标识符
   */
  declare id: number;

  /**
   * 自身默认值
   */
  static ownDefaults = shadowDefaultValues;

  /**
   * 类型
   */
  static type = 'shadow';

  /**
   * 构造函数
   * @see {@link http://fabric5.fabricjs.com/shadows|Shadow demo}
   * @param {Object|String} [options] 包含 color, blur, offsetX, offsetY 属性的选项对象或字符串 (例如 "rgba(0,0,0,0.2) 2px 2px 10px")
   * @param {Object|String} [options] Options object with any of color, blur, offsetX, offsetY properties or string (e.g. "rgba(0,0,0,0.2) 2px 2px 10px")
   */
  constructor(options?: Partial<TClassProperties<Shadow>>);
  constructor(svgAttribute: string);
  constructor(arg0: string | Partial<TClassProperties<Shadow>> = {}) {
    const options: Partial<TClassProperties<Shadow>> =
      typeof arg0 === 'string' ? Shadow.parseShadow(arg0) : arg0;
    Object.assign(this, Shadow.ownDefaults, options);
    this.id = uid();
  }

  /**
   * 解析阴影字符串
   * @param {String} value 要解析的阴影值
   * @return {Object} 包含 color, offsetX, offsetY 和 blur 的阴影对象
   * @param {String} value Shadow value to parse
   * @return {Object} Shadow object with color, offsetX, offsetY and blur
   */
  static parseShadow(value: string) {
    const shadowStr = value.trim(),
      [, offsetX = 0, offsetY = 0, blur = 0] = (
        reOffsetsAndBlur.exec(shadowStr) || []
      ).map((value) => parseFloat(value) || 0),
      color = (shadowStr.replace(reOffsetsAndBlur, '') || 'rgb(0,0,0)').trim();

    return {
      color,
      offsetX,
      offsetY,
      blur,
    };
  }

  /**
   * 返回实例的字符串表示形式
   *
   * Returns a string representation of an instance
   * @see http://www.w3.org/TR/css-text-decor-3/#text-shadow
   * @return {String} Returns CSS3 text-shadow declaration
   */
  toString() {
    return [this.offsetX, this.offsetY, this.blur, this.color].join('px ');
  }

  /**
   * 返回阴影的 SVG 表示形式
   *
   * Returns SVG representation of a shadow
   * @param {FabricObject} object
   * @return {String} SVG representation of a shadow
   */
  toSVG(object: FabricObject) {
    const offset = rotateVector(
        new Point(this.offsetX, this.offsetY),
        degreesToRadians(-object.angle),
      ),
      BLUR_BOX = 20,
      color = new Color(this.color);
    let fBoxX = 40,
      fBoxY = 40;

    if (object.width && object.height) {
      //http://www.w3.org/TR/SVG/filters.html#FilterEffectsRegion
      // we add some extra space to filter box to contain the blur ( 20 )
      fBoxX =
        toFixed(
          (Math.abs(offset.x) + this.blur) / object.width,
          config.NUM_FRACTION_DIGITS,
        ) *
          100 +
        BLUR_BOX;
      fBoxY =
        toFixed(
          (Math.abs(offset.y) + this.blur) / object.height,
          config.NUM_FRACTION_DIGITS,
        ) *
          100 +
        BLUR_BOX;
    }
    if (object.flipX) {
      offset.x *= -1;
    }
    if (object.flipY) {
      offset.y *= -1;
    }

    return `<filter id="SVGID_${this.id}" y="-${fBoxY}%" height="${
      100 + 2 * fBoxY
    }%" x="-${fBoxX}%" width="${
      100 + 2 * fBoxX
    }%" >\n\t<feGaussianBlur in="SourceAlpha" stdDeviation="${toFixed(
      this.blur ? this.blur / 2 : 0,
      config.NUM_FRACTION_DIGITS,
    )}"></feGaussianBlur>\n\t<feOffset dx="${toFixed(
      offset.x,
      config.NUM_FRACTION_DIGITS,
    )}" dy="${toFixed(
      offset.y,
      config.NUM_FRACTION_DIGITS,
    )}" result="oBlur" ></feOffset>\n\t<feFlood flood-color="${color.toRgb()}" flood-opacity="${color.getAlpha()}"/>\n\t<feComposite in2="oBlur" operator="in" />\n\t<feMerge>\n\t\t<feMergeNode></feMergeNode>\n\t\t<feMergeNode in="SourceGraphic"></feMergeNode>\n\t</feMerge>\n</filter>\n`;
  }

  /**
   * 返回阴影的对象表示形式
   *
   * Returns object representation of a shadow
   * @return {Object} Object representation of a shadow instance
   */
  toObject() {
    const data: SerializedShadowOptions = {
      color: this.color,
      blur: this.blur,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      affectStroke: this.affectStroke,
      nonScaling: this.nonScaling,
      type: (this.constructor as typeof Shadow).type,
    };
    const defaults = Shadow.ownDefaults as SerializedShadowOptions;
    return !this.includeDefaultValues
      ? pickBy(data, (value, key) => value !== defaults[key])
      : data;
  }

  /**
   * 从对象创建阴影实例
   * @param {Partial<TClassProperties<Shadow>>} options 选项
   */
  static async fromObject(options: Partial<TClassProperties<Shadow>>) {
    return new this(options);
  }
}

classRegistry.setClass(Shadow, 'shadow');
