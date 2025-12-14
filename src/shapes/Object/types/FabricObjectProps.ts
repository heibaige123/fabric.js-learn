import type { BorderProps } from './BorderProps';
import type { ControlProps } from './ControlProps';
import type { LockInteractionProps } from './LockInteractionProps';
import type { ObjectProps } from './ObjectProps';

/**
 * Fabric 对象属性接口
 */
export interface FabricObjectProps
  extends ObjectProps,
    ControlProps,
    BorderProps,
    LockInteractionProps {
  /**
   * 当为 `true` 时，缩放期间不会更新缓存。如果缩放过多，图片会变得块状，
   * 并在缩放结束时以正确的细节重新绘制。
   * 此设置取决于性能和应用程序。
   * 默认为 true
   *
   * When `true`, cache does not get updated during scaling. The picture will get blocky if scaled
   * too much and will be redrawn with correct details at the end of scaling.
   * this setting is performance and application dependant.
   * default to true
   * since 1.7.0
   * @type Boolean
   * @default true
   */
  noScaleCache?: boolean;

  /**
   * 悬停在此对象上时使用的默认光标值
   *
   * Default cursor value used when hovering over this object on canvas
   * @type CSSStyleDeclaration['cursor'] | null
   * @default null
   */
  hoverCursor: CSSStyleDeclaration['cursor'] | null;

  /**
   * 在画布上移动此对象时使用的默认光标值
   *
   * Default cursor value used when moving this object on canvas
   * @type CSSStyleDeclaration['cursor'] | null
   * @default null
   */
  moveCursor: CSSStyleDeclaration['cursor'] | null;

  /**
   * 对象的选择背景颜色。当对象处于活动状态时，对象后面的彩色层。
   * 与 globalCompositeOperation 方法混合效果不佳。
   *
   * Selection Background color of an object. colored layer behind the object when it is active.
   * does not mix good with globalCompositeOperation methods.
   * @type String
   * @deprecated
   */
  selectionBackgroundColor: string;

  /**
   * 当设置为 `true` 时，对象在画布上是基于每个像素而不是根据边界框“找到”的
   *
   * When set to `true`, objects are "found" on canvas on per-pixel basis rather than according to bounding box
   * @type Boolean
   */
  perPixelTargetFind: boolean;

  /**
   * 当设置为 `false` 时，无法选择对象进行修改（使用基于点击或基于组的选择）。
   * 但事件仍然会在其上触发。
   *
   * When set to `false`, an object can not be selected for modification (using either point-click-based or group-based selection).
   * But events still fire on it.
   * @type Boolean
   */
  selectable: boolean;

  /**
   * 当设置为 `false` 时，对象不能成为事件的目标。所有事件都会通过它传播。在 v1.3.4 中引入
   *
   * When set to `false`, an object can not be a target of events. All events propagate through it. Introduced in v1.3.4
   * @type Boolean
   */
  evented: boolean;

  /**
   * 当为 'down' 时，对象在 mousedown/touchstart 时设置为活动状态
   * 当为 'up' 时，对象在 mouseup/touchend 时设置为活动状态
   * 实验性。在正式支持之前，让我们看看这是否会破坏任何东西
   *
   * When 'down', object is set to active on mousedown/touchstart
   * When 'up', object is set to active on mouseup/touchend
   * Experimental. Let's see if this breaks anything before supporting officially
   * @private
   * since 4.4.0
   * @type String
   * @default 'down'
   */
  activeOn: 'down' | 'up';
}
