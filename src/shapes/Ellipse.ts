import { SCALE_X, SCALE_Y, twoMathPi } from '../constants';
import { SHARED_ATTRIBUTES } from '../parser/attributes';
import { parseAttributes } from '../parser/parseAttributes';
import type { Abortable, TClassProperties, TOptions } from '../typedefs';
import { classRegistry } from '../ClassRegistry';
import { FabricObject, cacheProperties } from './Object/FabricObject';
import type { FabricObjectProps, SerializedObjectProps } from './Object/types';
import type { ObjectEvents } from '../EventTypeDefs';
import type { CSSRules } from '../parser/typedefs';

/**
 * 椭圆的默认值
 */
export const ellipseDefaultValues: Partial<TClassProperties<Ellipse>> = {
  rx: 0,
  ry: 0,
};

/**
 * 椭圆特有的属性接口
 */
interface UniqueEllipseProps {
  /**
   * 水平半径
   */
  rx: number;
  /**
   * 垂直半径
   */
  ry: number;
}

/**
 * 序列化后的椭圆属性接口
 */
export interface SerializedEllipseProps
  extends SerializedObjectProps,
    UniqueEllipseProps {}

/**
 * 椭圆属性接口
 */
export interface EllipseProps extends FabricObjectProps, UniqueEllipseProps {}

/**
 * 椭圆属性列表
 */
const ELLIPSE_PROPS = ['rx', 'ry'] as const;

/**
 * 椭圆类
 */
export class Ellipse<
    Props extends TOptions<EllipseProps> = Partial<EllipseProps>,
    SProps extends SerializedEllipseProps = SerializedEllipseProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  >
  extends FabricObject<Props, SProps, EventSpec>
  implements EllipseProps
{
  /**
   * 水平半径
   *
   * Horizontal radius
   * @type Number
   */
  declare rx: number;

  /**
   * 垂直半径
   *
   * Vertical radius
   * @type Number
   */
  declare ry: number;

  /**
   * 类型标识
   */
  static type = 'Ellipse';

  /**
   * 缓存属性列表
   */
  static cacheProperties = [...cacheProperties, ...ELLIPSE_PROPS];

  /**
   * 自身默认值
   */
  static ownDefaults = ellipseDefaultValues;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Ellipse.ownDefaults,
    };
  }

  /**
   * 构造函数
   * @param options 选项对象
   *
   * Constructor
   * @param {Object} [options] Options object
   */
  constructor(options?: Props) {
    super();
    Object.assign(this, Ellipse.ownDefaults);
    this.setOptions(options);
  }

  /**
   * 设置属性
   * @param key 属性键
   * @param value 属性值
   * @returns 当前实例
   *
   * @private
   * @param {String} key
   * @param {*} value
   * @return {Ellipse} thisArg
   */
  _set(key: string, value: any) {
    super._set(key, value);
    switch (key) {
      case 'rx':
        this.rx = value;
        this.set('width', value * 2);
        break;

      case 'ry':
        this.ry = value;
        this.set('height', value * 2);
        break;
    }
    return this;
  }

  /**
   * 获取对象的水平半径（根据对象的缩放比例）
   * @returns 水平半径
   *
   * Returns horizontal radius of an object (according to how an object is scaled)
   * @return {Number}
   */
  getRx() {
    return this.get('rx') * this.get(SCALE_X);
  }

  /**
   * 获取对象的垂直半径（根据对象的缩放比例）
   * @returns 垂直半径
   *
   * Returns Vertical radius of an object (according to how an object is scaled)
   * @return {Number}
   */
  getRy() {
    return this.get('ry') * this.get(SCALE_Y);
  }

  /**
   * 返回实例的对象表示
   * @param propertiesToInclude 您可能希望在输出中额外包含的任何属性
   * @returns 实例的对象表示
   *
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toObject<
    T extends Omit<Props & TClassProperties<this>, keyof SProps>,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SProps {
    return super.toObject([...ELLIPSE_PROPS, ...propertiesToInclude]);
  }

  /**
   * 返回实例的 svg 表示
   * @returns 包含实例的具体 svg 表示的字符串数组
   *
   * Returns svg representation of an instance
   * @return {Array} an array of strings with the specific svg representation
   * of the instance
   */
  _toSVG(): string[] {
    return [
      '<ellipse ',
      'COMMON_PARTS',
      `cx="0" cy="0" rx="${this.rx}" ry="${this.ry}" />\n`,
    ];
  }

  /**
   * 渲染函数
   * @param ctx 渲染上下文
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx context to render on
   */
  _render(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.save();
    ctx.transform(1, 0, 0, this.ry / this.rx, 0, 0);
    ctx.arc(0, 0, this.rx, 0, twoMathPi, false);
    ctx.restore();
    this._renderPaintInOrder(ctx);
  }

  /* _FROM_SVG_START_ */

  /**
   * 解析 SVG 元素时要考虑的属性名称列表（由 {@link Ellipse.fromElement} 使用）
   * @see http://www.w3.org/TR/SVG/shapes.html#EllipseElement
   *
   * List of attribute names to account for when parsing SVG element (used by {@link Ellipse.fromElement})
   * @see http://www.w3.org/TR/SVG/shapes.html#EllipseElement
   */
  static ATTRIBUTE_NAMES = [...SHARED_ATTRIBUTES, 'cx', 'cy', 'rx', 'ry'];

  /**
   * 从 SVG 元素返回 {@link Ellipse} 实例
   * @param element 要解析的元素
   * @param options 选项对象
   * @param cssRules CSS 规则
   * @returns Ellipse 实例
   *
   * Returns {@link Ellipse} instance from an SVG element
   * @param {HTMLElement} element Element to parse
   * @return {Ellipse}
   */
  static async fromElement(
    element: HTMLElement,
    options?: Abortable,
    cssRules?: CSSRules,
  ) {
    const parsedAttributes = parseAttributes(
      element,
      this.ATTRIBUTE_NAMES,
      cssRules,
    );

    parsedAttributes.left = (parsedAttributes.left || 0) - parsedAttributes.rx;
    parsedAttributes.top = (parsedAttributes.top || 0) - parsedAttributes.ry;
    return new this(parsedAttributes);
  }

  /* _FROM_SVG_END_ */
}

classRegistry.setClass(Ellipse);
classRegistry.setSVGClass(Ellipse);
