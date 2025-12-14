/**
 * 控制点属性接口
 */
export interface ControlProps {
  /**
   * 对象控制角的大小（以像素为单位）
   *
   * Size of object's controlling corners (in pixels)
   * @type Number
   * @default 13
   */
  cornerSize: number;

  /**
   * 检测到触摸交互时对象控制角的大小
   *
   * Size of object's controlling corners when touch interaction is detected
   * @type Number
   * @default 24
   */
  touchCornerSize: number;

  /**
   * 如果为 true，则对象的控制角在内部呈现为透明（即描边而不是填充）
   *
   * When true, object's controlling corners are rendered as transparent inside (i.e. stroke instead of fill)
   * @type Boolean
   * @default true
   */
  transparentCorners: boolean;

  /**
   * 对象控制角的颜色（当它处于活动状态时）
   *
   * Color of controlling corners of an object (when it's active)
   * @type String
   * @default rgb(178,204,255)
   */
  cornerColor: string;

  /**
   * 对象控制角的颜色（当它处于活动状态且 transparentCorners 为 false 时）
   *
   * Color of controlling corners of an object (when it's active and transparentCorners false)
   * @since 1.6.2
   * @type String
   * @default ''
   */
  cornerStrokeColor: string;

  /**
   * 指定控件的样式，'rect' 或 'circle'
   * 这已被弃用。将来会有标准的控件渲染
   * 您可以使用控件 api 提出的替代方案之一进行交换
   *
   * Specify style of control, 'rect' or 'circle'
   * This is deprecated. In the future there will be a standard control render
   * And you can swap it with one of the alternative proposed with the control api
   * @since 1.6.2
   * @type 'rect' | 'circle'
   * @default 'rect'
   * @deprecated
   */
  cornerStyle: 'rect' | 'circle';

  /**
   * 指定对象控件虚线模式的数组（hasBorder 必须为 true）
   *
   * Array specifying dash pattern of an object's control (hasBorder must be true)
   * @since 1.6.2
   * @type Array | null
   * @default null
   */
  cornerDashArray: number[] | null;

  /**
   * 对象与其控制边框之间的填充（以像素为单位）
   *
   * Padding between object and its controlling borders (in pixels)
   * @type Number
   * @default 0
   */
  padding: number;

  /**
   * 当设置为 `false` 时，不显示对象的控件，并且不能用于操作对象
   *
   * When set to `false`, object's controls are not displayed and can not be used to manipulate object
   * @type Boolean
   * @default true
   */
  hasControls: boolean;
}
