import { classRegistry } from '../ClassRegistry';
import { FabricObject } from './Object/FabricObject';
import type { FabricObjectProps, SerializedObjectProps } from './Object/types';
import type { TClassProperties, TOptions } from '../typedefs';
import type { ObjectEvents } from '../EventTypeDefs';

/**
 * 三角形默认值
 */
export const triangleDefaultValues: Partial<TClassProperties<Triangle>> = {
  /**
   * 宽度
   */
  width: 100,
  /**
   * 高度
   */
  height: 100,
};

/**
 * 三角形类
 */
export class Triangle<
    Props extends TOptions<FabricObjectProps> = Partial<FabricObjectProps>,
    SProps extends SerializedObjectProps = SerializedObjectProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  >
  extends FabricObject<Props, SProps, EventSpec>
  implements FabricObjectProps
{
  /**
   * 类型
   */
  static type = 'Triangle';

  /**
   * 自身默认值
   */
  static ownDefaults = triangleDefaultValues;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return { ...super.getDefaults(), ...Triangle.ownDefaults };
  }

  /**
   * 构造函数
   *
   * Constructor
   * @param {Object} [options] 选项对象
   * @param {Object} [options] Options object
   */
  constructor(options?: Props) {
    super();
    Object.assign(this, Triangle.ownDefaults);
    this.setOptions(options);
  }

  /**
   * 按顺序渲染
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _render(ctx: CanvasRenderingContext2D) {
    const widthBy2 = this.width / 2,
      heightBy2 = this.height / 2;

    ctx.beginPath();
    ctx.moveTo(-widthBy2, heightBy2);
    ctx.lineTo(0, -heightBy2);
    ctx.lineTo(widthBy2, heightBy2);
    ctx.closePath();

    this._renderPaintInOrder(ctx);
  }

  /**
   * 返回实例的 svg 表示
   * @return {Array} 包含实例的具体 svg 表示的字符串数组
   *
   * Returns svg representation of an instance
   * @return {Array} an array of strings with the specific svg representation
   * of the instance
   */
  _toSVG() {
    const widthBy2 = this.width / 2,
      heightBy2 = this.height / 2,
      points = `${-widthBy2} ${heightBy2},0 ${-heightBy2},${widthBy2} ${heightBy2}`;
    return ['<polygon ', 'COMMON_PARTS', 'points="', points, '" />'];
  }
}

classRegistry.setClass(Triangle);
classRegistry.setSVGClass(Triangle);
