import { AnimationBase } from './AnimationBase';
import type { ArrayAnimationOptions } from './types';

/**
 * 数组动画类，用于对数字数组进行动画处理
 */
export class ArrayAnimation extends AnimationBase<number[]> {
  /**
   * 构造函数
   * @param options 数组动画选项
   */
  constructor({
    startValue = [0],
    endValue = [100],
    ...options
  }: ArrayAnimationOptions) {
    super({
      ...options,
      startValue,
      byValue: endValue.map((value, i) => value - startValue[i]),
    });
  }

  /**
   * 计算当前时间点的动画值
   * @param timeElapsed 经过的时间（毫秒）
   * @returns 包含当前值和进度的对象
   */
  protected calculate(timeElapsed: number) {
    const values = this.startValue.map((value, i) =>
      this.easing(timeElapsed, value, this.byValue[i], this.duration, i),
    );
    return {
      value: values,
      valueProgress: Math.abs(
        (values[0] - this.startValue[0]) / this.byValue[0],
      ),
    };
  }
}
