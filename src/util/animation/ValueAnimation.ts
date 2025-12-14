import { AnimationBase } from './AnimationBase';
import type { ValueAnimationOptions } from './types';

/**
 * 数值动画类
 *
 * Value animation class
 */
export class ValueAnimation extends AnimationBase<number> {
  /**
   * 构造函数
   * @param param0
   * @param param0.startValue 起始值，默认值为 0
   * @param param0.endValue 结束值，默认值为 100
   * @param param0.otherOptions 其他动画选项
   */
  constructor({
    startValue = 0,
    endValue = 100,
    ...otherOptions
  }: ValueAnimationOptions) {
    super({
      ...otherOptions,
      startValue,
      byValue: endValue - startValue,
    });
  }
  /**
   * 计算当前时间点的动画值
   * @param timeElapsed 经过的时间（毫秒）
   * @returns 包含当前值和进度的对象
   */
  protected calculate(timeElapsed: number) {
    const value = this.easing(
      timeElapsed,
      this.startValue,
      this.byValue,
      this.duration,
    );
    return {
      value,
      valueProgress: Math.abs((value - this.startValue) / this.byValue),
    };
  }
}
