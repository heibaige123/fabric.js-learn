import { noop } from '../../constants';
import { requestAnimFrame } from './AnimationFrameProvider';
import { runningAnimations } from './AnimationRegistry';
import { defaultEasing } from './easing';
import type {
  AnimationState,
  TAbortCallback,
  TBaseAnimationOptions,
  TEasingFunction,
  TOnAnimationChangeCallback,
} from './types';

/**
 * 默认的中止回调函数，始终返回 false
 */
const defaultAbort = () => false;

/**
 * 动画基类
 */
export abstract class AnimationBase<
  T extends number | number[] = number | number[],
> {
  /**
   * 动画起始值
   */
  declare readonly startValue: T;
  /**
   * 动画结束值
   */
  declare readonly endValue: T;
  /**
   * 动画持续时间（毫秒）
   */
  declare readonly duration: number;
  /**
   * 动画延迟时间（毫秒）
   */
  declare readonly delay: number;

  /**
   * 值的变化量
   */
  declare protected readonly byValue: T;
  /**
   * 缓动函数
   */
  declare protected readonly easing: TEasingFunction<T>;

  /**
   * 动画开始回调函数
   */
  declare private readonly _onStart: VoidFunction;
  /**
   * 动画变化回调函数
   */
  declare private readonly _onChange: TOnAnimationChangeCallback<T>;
  /**
   * 动画完成回调函数
   */
  declare private readonly _onComplete: TOnAnimationChangeCallback<T>;
  /**
   * 中止回调函数
   */
  declare private readonly _abort: TAbortCallback<T>;

  /**
   * 用于将动画注册到目标对象，以便可以在对象上下文中取消它
   *
   * Used to register the animation to a target object
   * so that it can be cancelled within the object context
   */
  declare readonly target?: unknown;

  /**
   * 动画状态
   */
  private _state: AnimationState = 'pending';
  /**
   * 时间百分比，即 `timeElapsed / duration` 的比率
   * @see tick
   *
   * Time %, or the ratio of `timeElapsed / duration`
   * @see tick
   */
  durationProgress = 0;
  /**
   * 值百分比，即 `(currentValue - startValue) / (endValue - startValue)` 的比率
   *
   * Value %, or the ratio of `(currentValue - startValue) / (endValue - startValue)`
   */
  valueProgress = 0;
  /**
   * 当前值
   *
   * Current value
   */
  declare value: T;
  /**
   * 动画开始时间（毫秒）
   *
   * Animation start time ms
   */
  declare private startTime: number;

  /**
   * 构造函数
   * @param options 动画选项
   * @param options.startValue 动画起始值
   * @param options.byValue 值的变化量
   * @param options.duration 动画持续时间（毫秒），默认值为 500
   * @param options.delay 动画延迟时间（毫秒），默认值为 0
   * @param options.easing 缓动函数，默认值为 `defaultEasing`
   * @param options.onStart 动画开始回调函数，默认值为 `noop`
   * @param options.onChange 动画变化回调函数，默认值为 `noop`
   * @param options.onComplete 动画完成回调函数，默认值为 `noop`
   * @param options.abort 中止回调函数，默认值为始终返回 false 的函数
   * @param options.target 用于将动画注册到目标对象，以便可以在对象上下文中取消它
   *
   * @returns 动画实例
   */
  constructor({
    startValue,
    byValue,
    duration = 500,
    delay = 0,
    easing = defaultEasing,
    onStart = noop,
    onChange = noop,
    onComplete = noop,
    abort = defaultAbort,
    target,
  }: TBaseAnimationOptions<T>) {
    this.tick = this.tick.bind(this);

    this.duration = duration;
    this.delay = delay;
    this.easing = easing;
    this._onStart = onStart;
    this._onChange = onChange;
    this._onComplete = onComplete;
    this._abort = abort;
    this.target = target;

    this.startValue = startValue;
    this.byValue = byValue;
    this.value = this.startValue;
    this.endValue = Object.freeze(this.calculate(this.duration).value);
  }

  /**
   * 获取动画状态
   */
  get state() {
    return this._state;
  }

  /**
   * 检查动画是否完成
   * @returns 如果动画已中止或已完成，则返回 true
   */
  isDone() {
    return this._state === 'aborted' || this._state === 'completed';
  }

  /**
   * 根据缓动参数计算当前值
   * @param timeElapsed 经过的时间（毫秒）
   * @protected
   *
   * Calculate the current value based on the easing parameters
   * @param timeElapsed in ms
   * @protected
   */
  protected abstract calculate(timeElapsed: number): {
    value: T;
    valueProgress: number;
  };

  /**
   * 开始动画
   */
  start() {
    const firstTick: FrameRequestCallback = (timestamp) => {
      if (this._state !== 'pending') return;
      this.startTime = timestamp || +new Date();
      this._state = 'running';
      this._onStart();
      this.tick(this.startTime);
    };

    this.register();

    // setTimeout(cb, 0) will run cb on the next frame, causing a delay
    // we don't want that
    if (this.delay > 0) {
      setTimeout(() => requestAnimFrame(firstTick), this.delay);
    } else {
      requestAnimFrame(firstTick);
    }
  }

  /**
   * 动画的一帧
   * @param t 时间戳
   */
  private tick(t: number) {
    const durationMs = (t || +new Date()) - this.startTime;
    const boundDurationMs = Math.min(durationMs, this.duration);
    this.durationProgress = boundDurationMs / this.duration;
    const { value, valueProgress } = this.calculate(boundDurationMs);
    this.value = Object.freeze(value);
    this.valueProgress = valueProgress;

    if (this._state === 'aborted') {
      return;
    } else if (
      this._abort(this.value, this.valueProgress, this.durationProgress)
    ) {
      this._state = 'aborted';
      this.unregister();
    } else if (durationMs >= this.duration) {
      this.durationProgress = this.valueProgress = 1;
      this._onChange(this.endValue, this.valueProgress, this.durationProgress);
      this._state = 'completed';
      this._onComplete(
        this.endValue,
        this.valueProgress,
        this.durationProgress,
      );
      this.unregister();
    } else {
      this._onChange(this.value, this.valueProgress, this.durationProgress);
      requestAnimFrame(this.tick);
    }
  }

  /**
   * 注册动画
   */
  private register() {
    runningAnimations.push(this as unknown as AnimationBase);
  }

  /**
   * 注销动画
   */
  private unregister() {
    runningAnimations.remove(this as unknown as AnimationBase);
  }

  /**
   * 中止动画
   */
  abort() {
    this._state = 'aborted';
    this.unregister();
  }
}
