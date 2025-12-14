import type { TColorArg } from '../../color/typedefs';

/**
 * 动画状态类型
 */
export type AnimationState = 'pending' | 'running' | 'completed' | 'aborted';

/**
 * 每一帧调用的回调函数
 * @param value 动画的当前值
 * @param valueProgress ∈ [0, 1]，反映在值上的当前动画进度，已归一化。0 是起始值，1 是结束值。
 * @param durationProgress ∈ [0, 1]，归一化为 1 的当前动画持续时间。
 *
 * Callback called every frame
 * @param {number | number[]} value current value of the animation.
 * @param {number} valueProgress ∈ [0, 1], the current animation progress reflected on value, normalized.
 * 0 is the starting value and 1 is the ending value.
 * @param {number} durationProgress ∈ [0, 1], the current animation duration normalized to 1.
 */
export type TOnAnimationChangeCallback<T, R = void> = (
  value: T,
  valueProgress: number,
  durationProgress: number,
) => R;

/**
 * 在每一步调用以确定动画是否应中止
 * @returns 如果动画应中止，则返回真值
 *
 * Called on each step to determine if animation should abort
 * @returns truthy if animation should abort
 */
export type TAbortCallback<T> = TOnAnimationChangeCallback<T, boolean>;

/**
 * 用于计算当前值的缓动函数
 * @see {@link AnimationBase#calculate}
 *
 * @param timeElapsed 自开始以来经过的毫秒数
 * @param startValue 起始值
 * @param byValue 变化量
 * @param duration 持续时间（毫秒）
 * @returns 下一个值
 *
 * An easing function used to calculate the current value
 * @see {@link AnimationBase#calculate}
 *
 * @param timeElapsed ms elapsed since start
 * @param startValue
 * @param byValue
 * @param duration in ms
 * @returns next value
 */
export type TEasingFunction<T = unknown> = T extends number[]
  ? (
      timeElapsed: number,
      startValue: number,
      byValue: number,
      duration: number,
      index: number,
    ) => number
  : (
      timeElapsed: number,
      startValue: number,
      byValue: number,
      duration: number,
    ) => number;

/**
 * 动画基础选项
 */
export type TAnimationBaseOptions<T> = {
  /**
   * 动画持续时间（毫秒）
   * @default 500
   *
   * Duration of the animation in ms
   * @default 500
   */
  duration: number;

  /**
   * 动画开始前的延迟时间（毫秒）
   * @default 0
   *
   * Delay to start the animation in ms
   * @default 0
   */
  delay: number;

  /**
   * 缓动函数
   * @default {defaultEasing}
   *
   * Easing function
   * @default {defaultEasing}
   */
  easing: TEasingFunction<T>;

  /**
   * 执行此动画的对象
   *
   * The object this animation is being performed on
   */
  target: unknown;
};

/**
 * 动画回调函数
 */
export type TAnimationCallbacks<T> = {
  /**
   * 动画开始时调用
   *
   * Called when the animation starts
   */
  onStart: VoidFunction;

  /**
   * 动画每一帧调用
   *
   * Called at each frame of the animation
   */
  onChange: TOnAnimationChangeCallback<T>;

  /**
   * 动画最后一帧后调用
   *
   * Called after the last frame of the animation
   */
  onComplete: TOnAnimationChangeCallback<T>;

  /**
   * 每一帧调用的函数。
   * 如果返回 true，则中止动画
   *
   * Function called at each frame.
   * If it returns true, abort
   */
  abort: TAbortCallback<T>;
};

/**
 * 基础动画选项
 */
export type TBaseAnimationOptions<T, TCallback = T, TEasing = T> = Partial<
  TAnimationBaseOptions<TEasing> & TAnimationCallbacks<TCallback>
> & {
  startValue: T;
  byValue: T;
};

/**
 * 动画选项
 */
export type TAnimationOptions<T, TCallback = T, TEasing = T> = Partial<
  TAnimationBaseOptions<TEasing> &
    TAnimationCallbacks<TCallback> & {
      /**
       * 起始值
       * @default 0
       *
       * Starting value(s)
       * @default 0
       */
      startValue: T;

      /**
       * 结束值
       * @default 100
       *
       * Ending value(s)
       * @default 100
       */
      endValue: T;
    }
>;

/**
 * 数值动画选项
 */
export type ValueAnimationOptions = TAnimationOptions<number>;

/**
 * 数组动画选项
 */
export type ArrayAnimationOptions = TAnimationOptions<number[]>;

/**
 * 颜色动画选项
 */
export type ColorAnimationOptions = TAnimationOptions<
  TColorArg,
  string,
  number[]
>;

/**
 * 动画选项联合类型
 */
export type AnimationOptions<T extends number | number[] | TColorArg> =
  T extends TColorArg
    ? ColorAnimationOptions
    : T extends number[]
      ? ArrayAnimationOptions
      : ValueAnimationOptions;
