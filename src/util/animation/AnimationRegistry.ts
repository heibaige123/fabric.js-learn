import type { StaticCanvas } from '../../canvas/StaticCanvas';
import type { FabricObject } from '../../shapes/Object/FabricObject';
import type { AnimationBase } from './AnimationBase';

/**
 * 保存所有正在运行的动画的数组
 *
 * Array holding all running animations
 */
class AnimationRegistry extends Array<AnimationBase> {
  /**
   * 使用动画上下文移除单个动画
   * @param context 动画上下文
   *
   * Remove a single animation using an animation context
   * @param {AnimationBase} context
   */
  remove(context: AnimationBase) {
    const index = this.indexOf(context);
    index > -1 && this.splice(index, 1);
  }

  /**
   * 在下一帧取消所有正在运行的动画
   * @returns 被取消的动画数组
   *
   * Cancel all running animations on the next frame
   */
  cancelAll() {
    const animations = this.splice(0);
    animations.forEach((animation) => animation.abort());
    return animations;
  }

  /**
   * 在下一帧取消附加到画布的所有正在运行的动画
   * @param canvas 画布实例
   * @returns 被取消的动画数组
   *
   * Cancel all running animations attached to a canvas on the next frame
   * @param {StaticCanvas} canvas
   */
  cancelByCanvas(canvas: StaticCanvas) {
    if (!canvas) {
      return [];
    }
    const animations = this.filter(
      (animation) =>
        animation.target === canvas ||
        (typeof animation.target === 'object' &&
          (animation.target as FabricObject)?.canvas === canvas),
    );
    animations.forEach((animation) => animation.abort());
    return animations;
  }

  /**
   * 在下一帧取消目标的所有正在运行的动画
   * @param target 动画目标
   * @returns 被取消的动画数组
   *
   * Cancel all running animations for target on the next frame
   * @param target
   */
  cancelByTarget(target: AnimationBase['target']) {
    if (!target) {
      return [];
    }
    const animations = this.filter((animation) => animation.target === target);
    animations.forEach((animation) => animation.abort());
    return animations;
  }
}

/**
 * 正在运行的动画注册表实例
 */
export const runningAnimations = new AnimationRegistry();
