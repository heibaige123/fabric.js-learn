import { Color } from '../../color/Color';
import type { TRGBAColorSource } from '../../color/typedefs';
import { halfPI } from '../../constants';
import { capValue } from '../misc/capValue';
import { AnimationBase } from './AnimationBase';
import type {
  ColorAnimationOptions,
  TEasingFunction,
  TOnAnimationChangeCallback,
} from './types';

/**
 * 默认的颜色缓动函数
 * @param timeElapsed 经过的时间
 * @param startValue 起始值
 * @param byValue 变化量
 * @param duration 持续时间
 * @returns 当前值
 */
const defaultColorEasing: TEasingFunction = (
  timeElapsed,
  startValue,
  byValue,
  duration,
) => {
  const durationProgress = 1 - Math.cos((timeElapsed / duration) * halfPI);
  return startValue + byValue * durationProgress;
};

/**
 * 包装颜色回调函数，将 RGBA 数组转换为 RGBA 字符串
 * @param callback 原始回调函数
 * @returns 包装后的回调函数
 */
const wrapColorCallback = <R>(
  callback?: TOnAnimationChangeCallback<string, R>,
) =>
  callback &&
  ((rgba: TRGBAColorSource, valueProgress: number, durationProgress: number) =>
    callback(new Color(rgba).toRgba(), valueProgress, durationProgress));

/**
 * 颜色动画类
 */
export class ColorAnimation extends AnimationBase<TRGBAColorSource> {
  /**
   * 构造函数
   * @param options 颜色动画选项
   */
  constructor({
    startValue,
    endValue,
    easing = defaultColorEasing,
    onChange,
    onComplete,
    abort,
    ...options
  }: ColorAnimationOptions) {
    const startColor = new Color(startValue).getSource();
    const endColor = new Color(endValue).getSource();
    super({
      ...options,
      startValue: startColor,
      byValue: endColor.map(
        (value, i) => value - startColor[i],
      ) as TRGBAColorSource,
      easing,
      onChange: wrapColorCallback(onChange),
      onComplete: wrapColorCallback(onComplete),
      abort: wrapColorCallback(abort),
    });
  }

  /**
   * 计算当前时间点的颜色值
   * @param timeElapsed 经过的时间（毫秒）
   * @returns 包含当前颜色值和进度的对象
   */
  protected calculate(timeElapsed: number) {
    const [r, g, b, a] = this.startValue.map((value, i) =>
      this.easing(timeElapsed, value, this.byValue[i], this.duration, i),
    ) as TRGBAColorSource;
    const value = [
      ...[r, g, b].map(Math.round),
      capValue(0, a, 1),
    ] as TRGBAColorSource;
    return {
      value,
      valueProgress:
        // to correctly calculate the change ratio we must find a changed value
        value
          .map((p, i) =>
            this.byValue[i] !== 0
              ? Math.abs((p - this.startValue[i]) / this.byValue[i])
              : 0,
          )
          .find((p) => p !== 0) || 0,
    };
  }
}
