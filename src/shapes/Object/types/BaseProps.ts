import type { TDegree, TOriginX, TOriginY } from '../../../typedefs';

/**
 * 基础属性接口
 */
export interface BaseProps {
  /**
   * 对象的左侧位置。
   * 请注意，默认情况下它是相对于对象左侧的。
   * 您可以通过设置 originX 来更改此设置。
   *
   * Left position of an object.
   * Note that by default it's relative to object left.
   * You can change this by setting originX
   * @type Number
   * @default 0
   */
  left: number;

  /**
   * 对象的顶部位置。
   * 请注意，默认情况下它是相对于对象顶部的。
   * 您可以通过设置 originY 来更改此设置。
   *
   * Top position of an object.
   * Note that by default it's relative to object top.
   * You can change this by setting originY
   * @type Number
   * @default 0
   */
  top: number;

  /**
   * 对象宽度
   *
   * Object width
   * @type Number
   */
  width: number;

  /**
   * 对象高度
   *
   * Object height
   * @type Number
   */
  height: number;

  /**
   * 对象的水平变换原点（`left`、`center`、`right` 或 `[0, 1]`）
   * 参见 http://jsfiddle.net/1ow02gea/244/ 了解 originX/originY 如何影响组中的对象
   *
   * Horizontal origin of transformation of an object (`left`, `center`, `right`  or `[0, 1]`)
   * See http://jsfiddle.net/1ow02gea/244/ on how originX/originY affect objects in groups
   * @type String
   * @deprecated please set your default to 'center' in new projects and don't use it to build logic
   * The reason is explained here: https://github.com/fabricjs/fabric.js/discussions/9736
   * To set the default value to 'center' import BaseFabricObject and set the static BaseFabricObject.ownDefaults.originX = 'center'
   * @default 'left'
   */
  originX: TOriginX;

  /**
   * 对象的垂直变换原点（`top`、`center`、`bottom` 或 `[0, 1]`）
   * 参见 http://jsfiddle.net/1ow02gea/244/ 了解 originX/originY 如何影响组中的对象
   *
   * Vertical origin of transformation of an object (`top`, `center`, `bottom` or `[0, 1]`)
   * See http://jsfiddle.net/1ow02gea/244/ on how originX/originY affect objects in groups
   * @type String
   * @deprecated please set your default to 'center' in new projects and don't use it to build logic
   * The reason is explained here: https://github.com/fabricjs/fabric.js/discussions/9736
   * To set the default value to 'center' import BaseFabricObject and set the static BaseFabricObject.ownDefaults.originY = 'center'
   * @default 'top'
   */
  originY: TOriginY;

  /**
   * 对象的旋转角度（以度为单位）
   *
   * Angle of rotation of an object (in degrees)
   * @type Number
   * @default 0
   */
  angle: TDegree;

  /**
   * 如果为 true，则对象呈现为水平翻转
   *
   * When true, an object is rendered as flipped horizontally
   * @type Boolean
   * @default false
   */
  flipX: boolean;

  /**
   * 如果为 true，则对象呈现为垂直翻转
   *
   * When true, an object is rendered as flipped vertically
   * @type Boolean
   * @default false
   */
  flipY: boolean;

  /**
   * 对象缩放因子（水平）
   *
   * Object scale factor (horizontal)
   * @type Number
   * @default 1
   */
  scaleX: number;

  /**
   * 对象缩放因子（垂直）
   *
   * Object scale factor (vertical)
   * @type Number
   * @default 1
   */
  scaleY: number;

  /**
   * 对象 x 轴上的倾斜角度（以度为单位）
   *
   * Angle of skew on x axes of an object (in degrees)
   * @type Number
   * @default 0
   */
  skewX: TDegree;

  /**
   * 对象 y 轴上的倾斜角度（以度为单位）
   *
   * Angle of skew on y axes of an object (in degrees)
   * @type Number
   * @default 0
   */
  skewY: TDegree;
}
