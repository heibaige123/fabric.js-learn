import { ValueAnimation } from './ValueAnimation';
import { ArrayAnimation } from './ArrayAnimation';
import { ColorAnimation } from './ColorAnimation';
import type {
  ValueAnimationOptions,
  ArrayAnimationOptions,
  ColorAnimationOptions,
} from './types';
import type { TColorArg } from '../../color/typedefs';

/**
 * 动画类型定义
 * 根据泛型 T 的类型返回对应的动画类
 */
export type TAnimation<T extends number | number[] | TColorArg> =
  T extends TColorArg
    ? ColorAnimation
    : T extends number[]
      ? ArrayAnimation
      : ValueAnimation;

/**
 * 检查是否为数组动画选项
 * @param options 动画选项
 * @returns 如果是数组动画选项则返回 true，否则返回 false
 */
const isArrayAnimation = (
  options: ArrayAnimationOptions | ValueAnimationOptions,
): options is ArrayAnimationOptions => {
  return Array.isArray(options.startValue) || Array.isArray(options.endValue);
};

/**
 * 在一定时间内将值从 startValue 更改为 endValue，
 * 并在值更改时调用回调函数。
 *
 * Changes value(s) from startValue to endValue within a certain period of time,
 * invoking callbacks as the value(s) change.
 *
 * @example
 * animate({
 *   startValue: 1,
 *   endValue: 0,
 *   onChange: (v) => {
 *     obj.set('opacity', v);
 *     // since we are running in a requested frame we should call `renderAll` and not `requestRenderAll`
 *     canvas.renderAll();
 *   }
 * });
 *
 * @example Using lists:
 * animate({
 *   startValue: [1, 2, 3],
 *   endValue: [2, 4, 6],
 *   onChange: ([x, y, zoom]) => {
 *     canvas.zoomToPoint(new Point(x, y), zoom);
 *     canvas.renderAll();
 *   }
 * });
 *
 * @param options 动画选项
 * @returns 动画实例
 */
export function animate(options: ArrayAnimationOptions): ArrayAnimation;
export function animate(options: ValueAnimationOptions): ValueAnimation;
export function animate<
  T extends ValueAnimationOptions | ArrayAnimationOptions,
>(
  options: T,
): T extends ArrayAnimationOptions ? ArrayAnimation : ValueAnimation;
export function animate<
  T extends ValueAnimationOptions | ArrayAnimationOptions,
  R extends T extends ArrayAnimationOptions ? ArrayAnimation : ValueAnimation,
>(options: T): R {
  const animation = (
    isArrayAnimation(options)
      ? new ArrayAnimation(options)
      : new ValueAnimation(options)
  ) as R;
  animation.start();
  return animation;
}

/**
 * 执行颜色动画
 * @param options 颜色动画选项
 * @returns 颜色动画实例
 */
export function animateColor(options: ColorAnimationOptions) {
  const animation = new ColorAnimation(options);
  animation.start();
  return animation;
}
