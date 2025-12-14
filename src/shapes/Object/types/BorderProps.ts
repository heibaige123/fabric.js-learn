/**
 * 边框属性接口
 */
export interface BorderProps {
  /**
   * 对象控制边框的颜色（当它处于活动状态时）
   *
   * Color of controlling borders of an object (when it's active)
   * @type String
   * @default rgb(178,204,255)
   */
  borderColor: string;

  /**
   * 指定对象边框虚线模式的数组（hasBorder 必须为 true）
   *
   * Array specifying dash pattern of an object's borders (hasBorder must be true)
   * @since 1.6.2
   * @type Array | null
   * default null;
   */
  borderDashArray: number[] | null;

  /**
   * 当设置为 `false` 时，不渲染对象的控制边框
   *
   * When set to `false`, object's controlling borders are not rendered
   * @type Boolean
   */
  hasBorders: boolean;

  /**
   * 当对象处于活动状态并移动时，对象控制边框的不透明度
   *
   * Opacity of object's controlling borders when object is active and moving
   * @type Number
   * @default 0.4
   */
  borderOpacityWhenMoving: number;

  /**
   * 对象边框（选择框和控件描边）的缩放因子。
   * 更大的数字将使边框更粗
   * 边框默认值为 1，因此此缩放值等于边框和控件 strokeWidth。
   * 如果您需要将边框与控件 strokeWidth 分开
   * 您需要为控件编写自己的渲染函数
   *
   * Scale factor for the border of the objects ( selection box and controls stroke ).
   * Bigger number will make a thicker border
   * border default value is 1, so this scale value is equal to a border and control strokeWidth.
   * If you need to divide border from control strokeWidth
   * you will need to write your own render function for controls
   * @type Number
   * @default 1
   */
  borderScaleFactor: number;
}
