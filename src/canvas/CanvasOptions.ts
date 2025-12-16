import type { ModifierKey, TOptionalModifierKey } from '../EventTypeDefs';
import type { TOptions } from '../typedefs';
import type { StaticCanvasOptions } from './StaticCanvasOptions';

/**
 * Canvas 变换选项接口
 */
export interface CanvasTransformOptions {
  /**
   * 当为 true 时，对象可以通过拖动通常不会进行单边变换的角来进行单边（不成比例）变换。
   *
   * When true, objects can be transformed by one side (unproportionately)
   * when dragged on the corners that normally would not do that.
   * @type Boolean
   * @since fabric 4.0 // changed name and default value
   */
  uniformScaling: boolean;

  /**
   * 指示哪个键切换统一缩放。
   * 值为：'altKey', 'shiftKey', 'ctrlKey'。
   * 如果为 `null` 或 'none' 或任何其他非修饰键的字符串，则禁用该功能。
   * 命名完全错误。这听起来像 `uniform scaling`。
   * 如果 Canvas.uniformScaling 为 true，按下此键将其设置为 false，反之亦然。
   *
   * Indicates which key switches uniform scaling.
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled.
   * totally wrong named. this sounds like `uniform scaling`
   * if Canvas.uniformScaling is true, pressing this will set it to false
   * and viceversa.
   * @since 1.6.2
   * @type ModifierKey
   */
  uniScaleKey: TOptionalModifierKey;

  /**
   * 当为 true 时，对象使用中心点作为缩放变换的原点。
   * <b>向后不兼容说明：</b> 此属性替换了 "centerTransform" (Boolean)。
   *
   * When true, objects use center point as the origin of scale transformation.
   * <b>Backwards incompatibility note:</b> This property replaces "centerTransform" (Boolean).
   * @since 1.3.4
   * @type Boolean
   */
  centeredScaling: boolean;

  /**
   * 当为 true 时，对象使用中心点作为旋转变换的原点。
   * <b>向后不兼容说明：</b> 此属性替换了 "centerTransform" (Boolean)。
   *
   * When true, objects use center point as the origin of rotate transformation.
   * <b>Backwards incompatibility note:</b> This property replaces "centerTransform" (Boolean).
   * @since 1.3.4
   * @type Boolean
   */
  centeredRotation: boolean;

  /**
   * 指示哪个键启用中心变换。
   * 值为：'altKey', 'shiftKey', 'ctrlKey'。
   * 如果为 `null` 或 'none' 或任何其他非修饰键的字符串，则禁用该功能。
   *
   * Indicates which key enable centered Transform
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled feature disabled.
   * @since 1.6.2
   * @type ModifierKey
   */
  centeredKey: TOptionalModifierKey;

  /**
   * 指示哪个键启用角上的替代操作。
   * 值为：'altKey', 'shiftKey', 'ctrlKey'。
   * 如果为 `null` 或 'none' 或任何其他非修饰键的字符串，则禁用该功能。
   *
   * Indicates which key enable alternate action on corner
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled feature disabled.
   * @since 1.6.2
   * @type ModifierKey
   */
  altActionKey: TOptionalModifierKey;
}

/**
 * Canvas 选择选项接口
 */
export interface CanvasSelectionOptions {
  /**
   * 指示是否应启用组选择
   *
   * Indicates whether group selection should be enabled
   * @type Boolean
   */
  selection: boolean;

  /**
   * 指示哪个键或哪些键启用多选点击。
   * 传递字符串或字符串数组作为值。
   * 值为：'altKey', 'shiftKey', 'ctrlKey'。
   * 如果为 `null` 或空或包含任何其他非修饰键的字符串，则禁用该功能。
   *
   * Indicates which key or keys enable multiple click selection
   * Pass value as a string or array of strings
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * If `null` or empty or containing any other string that is not a modifier key
   * feature is disabled.
   * @since 1.6.2
   * @type ModifierKey|ModifierKey[]
   */
  selectionKey: TOptionalModifierKey | ModifierKey[];

  /**
   * 指示哪个键启用替代选择。
   * 如果目标与活动对象重叠，并且我们不想丢失活动选择，我们可以按下此修饰键并继续选择当前选定的对象，即使它被另一个或多个有效的选择目标覆盖。
   * 值为：'altKey', 'shiftKey', 'ctrlKey'。
   * 由于一系列原因，这些原因来自于对事物应该如何工作的普遍期望，此功能仅在 preserveObjectStacking 为 true 时有效。
   * 如果为 `null` 或 'none' 或任何其他非修饰键的字符串，则禁用该功能。
   *
   * Indicates which key enable alternative selection
   * in case of a target overlapping with active object and we don't want to loose the
   * active selection, we can press this modifier key and continue selecting the current
   * selected object also when is covered by another or many valid targets for selection.
   * values: 'altKey', 'shiftKey', 'ctrlKey'.
   * For a series of reason that come from the general expectations on how
   * things should work, this feature works only for preserveObjectStacking true.
   * If `null` or 'none' or any other string that is not a modifier key
   * feature is disabled.
   * @since 1.6.5
   * @type null|ModifierKey
   */
  altSelectionKey: TOptionalModifierKey;

  /**
   * 选择的颜色
   *
   * Color of selection
   * @type String
   */
  selectionColor: string;

  /**
   * 默认虚线数组模式。
   * 如果不为空，则选择边框为虚线。
   *
   * Default dash array pattern
   * If not empty the selection border is dashed
   * @type Array
   */
  selectionDashArray: number[];

  /**
   * 选择边框的颜色（通常比选择本身的颜色稍深）
   *
   * Color of the border of selection (usually slightly darker than color of selection itself)
   * @type String
   */
  selectionBorderColor: string;

  /**
   * 用于对象/组选择的线条宽度
   *
   * Width of a line used in object/group selection
   * @type Number
   */
  selectionLineWidth: number;

  /**
   * 仅选择完全包含在拖动选择矩形中的形状。
   *
   * Select only shapes that are fully contained in the dragged selection rectangle.
   * @type Boolean
   */
  selectionFullyContained: boolean;
}

/**
 * Canvas 光标选项接口
 */
export interface CanvasCursorOptions {
  /**
   * 悬停在 canvas 上的对象时使用的默认光标值
   *
   * Default cursor value used when hovering over an object on canvas
   * @type CSSStyleDeclaration['cursor']
   * @default move
   */
  hoverCursor: CSSStyleDeclaration['cursor'];

  /**
   * 在 canvas 上移动对象时使用的默认光标值
   *
   * Default cursor value used when moving an object on canvas
   * @type CSSStyleDeclaration['cursor']
   * @default move
   */
  moveCursor: CSSStyleDeclaration['cursor'];

  /**
   * 整个 canvas 使用的默认光标值
   *
   * Default cursor value used for the entire canvas
   * @type String
   * @default default
   */
  defaultCursor: CSSStyleDeclaration['cursor'];

  /**
   * 自由绘制期间使用的光标值
   *
   * Cursor value used during free drawing
   * @type String
   * @default crosshair
   */
  freeDrawingCursor: CSSStyleDeclaration['cursor'];

  /**
   * 用于禁用元素（具有禁用操作的角）的光标值
   *
   * Cursor value used for disabled elements ( corners with disabled action )
   * @type String
   * @since 2.0.0
   * @default not-allowed
   */
  notAllowedCursor: CSSStyleDeclaration['cursor'];
}

/**
 * 目标查找选项接口
 */
export interface TargetFindOptions {
  /**
   * 当为 true 时，对象检测基于每个像素而不是每个边界框进行
   *
   * When true, object detection happens on per-pixel basis rather than on per-bounding-box
   * @type Boolean
   */
  perPixelTargetFind: boolean;

  /**
   * 对象检测期间容忍的目标像素周围的像素数（视为活动）
   *
   * Number of pixels around target pixel to tolerate (consider active) during object detection
   * @type Number
   */
  targetFindTolerance: number;

  /**
   * 当为 true 时，跳过目标检测。目标检测将始终返回 undefined。
   * 点击选择将不再起作用，事件将在没有目标的情况下触发。
   * 如果在设置为 true 之前选择了某些内容，则会在第一次点击时取消选择。
   * 区域选择仍然有效。还要检查 `selection` 属性。
   * 如果您同时停用两者，则应查看 staticCanvas。
   *
   * When true, target detection is skipped. Target detection will return always undefined.
   * click selection won't work anymore, events will fire with no targets.
   * if something is selected before setting it to true, it will be deselected at the first click.
   * area selection will still work. check the `selection` property too.
   * if you deactivate both, you should look into staticCanvas.
   * @type Boolean
   */
  skipTargetFind: boolean;
}

/**
 * Canvas 事件选项接口
 */
export interface CanvasEventsOptions {
  /**
   * 指示 canvas 上的右键单击是否可以输出上下文菜单
   * 默认值在 Fabric 7.0 中从 false 更改为 true
   * @see https://fabricjs.com/docs/upgrading/upgrading-to-fabric-70/
   * @deprecated 从 7.0 开始,  将在 Fabric 8.0 中移除
   * @type Boolean
   * @since 1.6.5
   */
  stopContextMenu: boolean;

  /**
   * 指示 canvas 是否可以触发右键单击事件
   * 默认值在 Fabric 7.0 中从 false 更改为 true
   * @see https://fabricjs.com/docs/upgrading/upgrading-to-fabric-70/
   * @deprecated 从 7.0 开始,  将在 Fabric 8.0 中移除
   * @type Boolean
   * @since 1.6.5
   */
  fireRightClick: boolean;

  /**
   * 指示 canvas 是否可以触发中键单击事件
   * 默认值在 Fabric 7.0 中从 false 更改为 true
   * @see https://fabricjs.com/docs/upgrading/upgrading-to-fabric-70/
   * @deprecated 从 7.0 开始,  将在 Fabric 8.0 中移除
   * @type Boolean
   * @since 1.7.8
   */
  fireMiddleClick: boolean;

  /**
   * 当启用该选项时，使用 PointerEvent 代替 TPointerEvent。
   *
   * When the option is enabled, PointerEvent is used instead of TPointerEvent.
   * @type Boolean
   */
  enablePointerEvents: boolean;
}

/**
 * Canvas 选项接口，继承自 StaticCanvasOptions 和其他选项接口
 */
export interface CanvasOptions
  extends StaticCanvasOptions,
    CanvasTransformOptions,
    CanvasSelectionOptions,
    CanvasCursorOptions,
    TargetFindOptions,
    CanvasEventsOptions {
  /**
   * 赋予 canvas 包装器 (div) 元素的默认元素类
   *
   * Default element class that's given to wrapper (div) element of canvas
   * @type String
   * @deprecated customize {@link CanvasDOMManager} instead or access {@link elements} directly
   */
  containerClass: string;

  /**
   * 指示对象在被选中时是否应保持在当前堆栈位置。
   * 当为 false 时，对象被带到顶部并作为选择组的一部分进行渲染
   *
   * Indicates whether objects should remain in current stack position when selected.
   * When false objects are brought to top and rendered as part of the selection group
   * @type Boolean
   * @default true
   */
  preserveObjectStacking: boolean;
}

/**
 * Canvas 选项类型
 */
export type TCanvasOptions = TOptions<CanvasOptions>;

/**
 * Canvas 默认选项
 */
export const canvasDefaults: TOptions<CanvasOptions> = {
  uniformScaling: true,
  uniScaleKey: 'shiftKey',
  centeredScaling: false,
  centeredRotation: false,
  centeredKey: 'altKey',
  altActionKey: 'shiftKey',

  selection: true,
  selectionKey: 'shiftKey',
  selectionColor: 'rgba(100, 100, 255, 0.3)',
  selectionDashArray: [],
  selectionBorderColor: 'rgba(255, 255, 255, 0.3)',
  selectionLineWidth: 1,
  selectionFullyContained: false,

  hoverCursor: 'move',
  moveCursor: 'move',
  defaultCursor: 'default',
  freeDrawingCursor: 'crosshair',
  notAllowedCursor: 'not-allowed',

  perPixelTargetFind: false,
  targetFindTolerance: 0,
  skipTargetFind: false,

  stopContextMenu: true,
  fireRightClick: true,
  fireMiddleClick: true,
  enablePointerEvents: false,

  containerClass: 'canvas-container',
  preserveObjectStacking: true,
};
