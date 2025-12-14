import type { TFiller } from '../../../typedefs';

/**
 * 填充和描边属性接口
 */
export interface FillStrokeProps {
  /**
   * 确定是先绘制填充还是先绘制描边（"fill" 或 "stroke" 之一）
   *
   * Determines if the fill or the stroke is drawn first (one of "fill" or "stroke")
   * @type String
   */
  paintFirst: 'fill' | 'stroke';

  /**
   * 对象的填充颜色
   * 接受 css 颜色 https://www.w3.org/TR/css-color-3/
   *
   * Color of object's fill
   * takes css colors https://www.w3.org/TR/css-color-3/
   * @type String
   * @default rgb(0,0,0)
   */
  fill: ReturnType<TFiller['toObject']> | string | null;

  /**
   * 用于填充对象的填充规则
   * 接受的值为 nonzero, evenodd
   * <b>向后不兼容说明：</b> 在 v1.4.12 之前，此属性用于设置 globalCompositeOperation（请改用 `globalCompositeOperation`）
   *
   * Fill rule used to fill an object
   * accepted values are nonzero, evenodd
   * <b>Backwards incompatibility note:</b> This property was used for setting globalCompositeOperation until v1.4.12 (use `globalCompositeOperation` instead)
   * @type String
   * @default nonzero
   */
  fillRule: CanvasFillRule;

  /**
   * 定义时，对象通过描边渲染，此属性指定其颜色
   * 接受 css 颜色 https://www.w3.org/TR/css-color-3/
   *
   * When defined, an object is rendered via stroke and this property specifies its color
   * takes css colors https://www.w3.org/TR/css-color-3/
   * @type String
   * @default null
   */
  stroke: ReturnType<TFiller['toObject']> | string | null;

  /**
   * 用于渲染此对象的描边宽度
   *
   * Width of a stroke used to render this object
   * @type Number
   * @default 1
   */
  strokeWidth: number;

  /**
   * 指定对象描边虚线模式的数组（必须定义 stroke）
   *
   * Array specifying dash pattern of an object's stroke (stroke must be defined)
   * @type Array
   * @default null;
   */
  strokeDashArray: number[] | null;

  /**
   * 对象描边的线偏移量
   *
   * Line offset of an object's stroke
   * @type Number
   * @default 0
   */
  strokeDashOffset: number;

  /**
   * 对象描边的线端点样式（"butt"、"round"、"square" 之一）
   *
   * Line endings style of an object's stroke (one of "butt", "round", "square")
   * @type String
   * @default butt
   */
  strokeLineCap: CanvasLineCap;

  /**
   * 对象描边的角样式（"bevel"、"round"、"miter" 之一）
   *
   * Corner style of an object's stroke (one of "bevel", "round", "miter")
   * @type String
   */
  strokeLineJoin: CanvasLineJoin;

  /**
   * 对象描边的最大斜接长度（用于 strokeLineJoin = "miter"）
   *
   * Maximum miter length (used for strokeLineJoin = "miter") of an object's stroke
   * @type Number
   * @default 4
   */
  strokeMiterLimit: number;

  /**
   * 当为 `false` 时，描边宽度将随对象缩放。
   * 当为 `true` 时，描边将始终匹配为描边宽度输入的精确像素大小。
   * 此属性不适用于 Text 类或使用 strokeText,fillText 方法的绘图调用
   * 默认为 false
   *
   * When `false`, the stoke width will scale with the object.
   * When `true`, the stroke will always match the exact pixel size entered for stroke width.
   * this Property does not work on Text classes or drawing call that uses strokeText,fillText methods
   * default to false
   * @since 2.6.0
   * @type Boolean
   * @default false
   * @type Boolean
   * @default false
   */
  strokeUniform: boolean;
}
