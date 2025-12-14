import type { Shadow } from '../../../Shadow';
import type { BaseProps } from './BaseProps';
import type { FillStrokeProps } from './FillStrokeProps';

/**
 * 序列化对象属性接口
 */
export interface SerializedObjectProps extends BaseProps, FillStrokeProps {
  /**
   * 对象的不透明度
   *
   * Opacity of an object
   * @type Number
   * @default 1
   */
  opacity: number;

  /**
   * 用于画布 globalCompositeOperation 的复合规则
   *
   * Composite rule used for canvas globalCompositeOperation
   * @type String
   */
  globalCompositeOperation: GlobalCompositeOperation;

  /**
   * 对象的背景颜色。
   * 接受 css 颜色 https://www.w3.org/TR/css-color-3/
   *
   * Background color of an object.
   * takes css colors https://www.w3.org/TR/css-color-3/
   * @type String
   */
  backgroundColor: string;

  /**
   * 代表此形状阴影的阴影对象
   *
   * Shadow object representing shadow of this shape
   * @type Shadow
   * @default null
   */
  shadow: ReturnType<Shadow['toObject']> | null;

  /**
   * 当设置为 `false` 时，对象不会在画布上渲染
   *
   * When set to `false`, an object is not rendered on canvas
   * @type Boolean
   */
  visible: boolean;

  /**
   * 一个 fabricObject，如果没有描边，则用其形状定义剪切区域。填充为黑色
   * 当对象渲染时使用 clipPath 对象，并且上下文放置在对象 cacheCanvas 的中心。
   * 如果您希望 clipPath 的 0,0 与对象中心对齐，请使用 clipPath.originX/Y 为 'center'
   *
   * a fabricObject that, without stroke define a clipping area with their shape. filled in black
   * the clipPath object gets used when the object has rendered, and the context is placed in the center
   * of the object cacheCanvas.
   * If you want 0,0 of a clipPath to align with an object center, use clipPath.originX/Y to 'center'
   * @type FabricObject
   */
  clipPath?: Partial<SerializedObjectProps & ClipPathProps>;
}

/**
 * 剪切路径属性接口
 */
export interface ClipPathProps {
  /**
   * 仅当对象用作 clipPath 时才有意义。
   * 如果为 true，clipPath 将使对象剪切到 clipPath 的外部
   * 自 2.4.0 起
   *
   * Meaningful ONLY when the object is used as clipPath.
   * if true, the clipPath will make the object clip to the outside of the clipPath
   * since 2.4.0
   * @type boolean
   * @default false
   */
  inverted: boolean;

  /**
   * 仅当对象用作 clipPath 时才有意义。
   * 如果为 true，clipPath 的 top 和 left 将相对于画布，并且不会受到对象变换的影响。
   * 这将使 clipPath 相对于画布，但仅剪切特定对象。
   * 警告：这是测试版，此功能可能会更改或重命名。
   * 自 2.4.0 起
   *
   * Meaningful ONLY when the object is used as clipPath.
   * if true, the clipPath will have its top and left relative to canvas, and will
   * not be influenced by the object transform. This will make the clipPath relative
   * to the canvas, but clipping just a particular object.
   * WARNING this is beta, this feature may change or be renamed.
   * since 2.4.0
   * @type boolean
   * @default false
   */
  absolutePositioned: boolean;
}
