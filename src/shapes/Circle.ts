import type { ObjectEvents } from '../EventTypeDefs';
import { SHARED_ATTRIBUTES } from '../parser/attributes';
import { parseAttributes } from '../parser/parseAttributes';
import { cos } from '../util/misc/cos';
import { degreesToRadians } from '../util/misc/radiansDegreesConversion';
import { sin } from '../util/misc/sin';
import { classRegistry } from '../ClassRegistry';
import { FabricObject, cacheProperties } from './Object/FabricObject';
import type { Abortable, TClassProperties, TOptions } from '../typedefs';
import type { FabricObjectProps, SerializedObjectProps } from './Object/types';
import type { CSSRules } from '../parser/typedefs';
import { SCALE_X, SCALE_Y } from '../constants';

/**
 * 圆形特有的属性接口
 */
interface UniqueCircleProps {
  /**
   * 圆的半径
   *
   * Radius of this circle
   * @type Number
   * @default 0
   */
  radius: number;

  /**
   * 圆的起始角度，以度为单位。
   *
   * Angle for the start of the circle, in degrees.
   * @type TDegree 0 - 359
   * @default 0
   */
  startAngle: number;

  /**
   * 圆的结束角度，以度为单位
   *
   * Angle for the end of the circle, in degrees
   * @type TDegree 1 - 360
   * @default 360
   */
  endAngle: number;

  /**
   * 圆的方向。
   * 设置为 true 将使圆弧从 startAngle 到 endAngle 逆时针绘制。
   * 注意：这只会改变圆的绘制方式，不会影响旋转变换。
   *
   * Orientation for the direction of the circle.
   * Setting to true will switch the arc of the circle to traverse from startAngle to endAngle in a counter-clockwise direction.
   * Note: this will only change how the circle is drawn, and does not affect rotational transformation.
   * @default false
   */
  counterClockwise: boolean;
}

/**
 * 序列化后的圆形属性接口
 */
export interface SerializedCircleProps
  extends SerializedObjectProps,
    UniqueCircleProps {}

/**
 * 圆形属性接口
 */
export interface CircleProps extends FabricObjectProps, UniqueCircleProps {}

/**
 * 圆形属性列表
 */
const CIRCLE_PROPS = [
  'radius',
  'startAngle',
  'endAngle',
  'counterClockwise',
] as const;

/**
 * 圆形的默认值
 */
export const circleDefaultValues: Partial<TClassProperties<Circle>> = {
  radius: 0,
  startAngle: 0,
  endAngle: 360,
  counterClockwise: false,
};

/**
 * 圆形类
 */
export class Circle<
    Props extends TOptions<CircleProps> = Partial<CircleProps>,
    SProps extends SerializedCircleProps = SerializedCircleProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  >
  extends FabricObject<Props, SProps, EventSpec>
  implements UniqueCircleProps
{
  /**
   * 半径
   */
  declare radius: number;
  /**
   * 起始角度
   */
  declare startAngle: number;
  /**
   * 结束角度
   */
  declare endAngle: number;
  /**
   * 是否逆时针
   */
  declare counterClockwise: boolean;

  /**
   * 类型标识
   */
  static type = 'Circle';

  /**
   * 缓存属性列表
   */
  static cacheProperties = [...cacheProperties, ...CIRCLE_PROPS];

  /**
   * 自身默认值
   */
  static ownDefaults = circleDefaultValues;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Circle.ownDefaults,
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
    Object.assign(this, Circle.ownDefaults);
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
   */
  _set(key: string, value: any) {
    super._set(key, value);

    if (key === 'radius') {
      this.setRadius(value);
    }

    return this;
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
    ctx.arc(
      0,
      0,
      this.radius,
      degreesToRadians(this.startAngle),
      degreesToRadians(this.endAngle),
      this.counterClockwise,
    );
    this._renderPaintInOrder(ctx);
  }

  /**
   * 获取对象的水平半径（根据对象的缩放比例）
   * @returns 水平半径
   *
   * Returns horizontal radius of an object (according to how an object is scaled)
   * @return {Number}
   */
  getRadiusX(): number {
    return this.get('radius') * this.get(SCALE_X);
  }

  /**
   * 获取对象的垂直半径（根据对象的缩放比例）
   * @returns 垂直半径
   *
   * Returns vertical radius of an object (according to how an object is scaled)
   * @return {Number}
   */
  getRadiusY(): number {
    return this.get('radius') * this.get(SCALE_Y);
  }

  /**
   * 设置对象的半径（并相应地更新宽度）
   * @param value 半径值
   *
   * Sets radius of an object (and updates width accordingly)
   */
  setRadius(value: number) {
    this.radius = value;
    this.set({ width: value * 2, height: value * 2 });
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
    return super.toObject([...CIRCLE_PROPS, ...propertiesToInclude]);
  }

  /* _TO_SVG_START_ */

  /**
   * 返回实例的 svg 表示
   * @returns 包含实例的具体 svg 表示的字符串数组
   *
   * Returns svg representation of an instance
   * @return {Array} an array of strings with the specific svg representation
   * of the instance
   */
  _toSVG(): string[] {
    const angle = (this.endAngle - this.startAngle) % 360;

    if (angle === 0) {
      return [
        '<circle ',
        'COMMON_PARTS',
        'cx="0" cy="0" ',
        'r="',
        `${this.radius}`,
        '" />\n',
      ];
    } else {
      const { radius } = this;
      const start = degreesToRadians(this.startAngle),
        end = degreesToRadians(this.endAngle),
        startX = cos(start) * radius,
        startY = sin(start) * radius,
        endX = cos(end) * radius,
        endY = sin(end) * radius,
        largeFlag = angle > 180 ? 1 : 0,
        sweepFlag = this.counterClockwise ? 0 : 1;
      return [
        `<path d="M ${startX} ${startY} A ${radius} ${radius} 0 ${largeFlag} ${sweepFlag} ${endX} ${endY}" `,
        'COMMON_PARTS',
        ' />\n',
      ];
    }
  }
  /* _TO_SVG_END_ */

  /* _FROM_SVG_START_ */
  /**
   * 解析 SVG 元素时要考虑的属性名称列表（由 {@link Circle.fromElement} 使用）
   * @see: http://www.w3.org/TR/SVG/shapes.html#CircleElement
   *
   * List of attribute names to account for when parsing SVG element (used by {@link Circle.fromElement})
   * @see: http://www.w3.org/TR/SVG/shapes.html#CircleElement
   */
  static ATTRIBUTE_NAMES = ['cx', 'cy', 'r', ...SHARED_ATTRIBUTES];

  /**
   * 从 SVG 元素返回 {@link Circle} 实例
   * @param element 要解析的元素
   * @param options 部分 Circle 对象，用于默认元素上缺少的属性。
   * @param cssRules CSS 规则
   * @returns Circle 实例的 Promise
   * @throws {Error} 如果 `r` 属性的值丢失或无效
   *
   * Returns {@link Circle} instance from an SVG element
   * @param {HTMLElement} element Element to parse
   * @param {Object} [options] Partial Circle object to default missing properties on the element.
   * @throws {Error} If value of `r` attribute is missing or invalid
   */
  static async fromElement(
    element: HTMLElement,
    options: Abortable,
    cssRules?: CSSRules,
  ): Promise<Circle> {
    const {
      left = 0,
      top = 0,
      radius = 0,
      ...otherParsedAttributes
    } = parseAttributes(
      element,
      this.ATTRIBUTE_NAMES,
      cssRules,
    ) as Partial<CircleProps>;

    // this probably requires to be fixed for default origins not being top/left.

    return new this({
      ...otherParsedAttributes,
      radius,
      left: left - radius,
      top: top - radius,
    });
  }

  /* _FROM_SVG_END_ */

  /**
   * 从对象创建实例
   * @param object 对象
   * @returns 实例
   *
   * @todo how do we declare this??
   */
  static fromObject<T extends TOptions<SerializedCircleProps>>(object: T) {
    return super._fromObject<Circle>(object);
  }
}

classRegistry.setClass(Circle);
classRegistry.setSVGClass(Circle);
