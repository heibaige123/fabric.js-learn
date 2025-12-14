import { noop } from '../constants';
import { FabricObject } from '../shapes/Object/FabricObject';
import { TDegree } from '../typedefs';
import { animate } from '../util/animation/animate';

/**
 * 可拉直的 Fabric 对象接口
 */
export interface StraightenableFabricObject extends FabricObject {
  /**
   * 动画持续时间
   */
  FX_DURATION: number;

  /**
   * 获取拉直所需的角度值
   */
  _getAngleValueForStraighten(): number;

  /**
   * 拉直对象
   */
  straighten(): void;

  /**
   * 带有动画效果的拉直对象
   * @param callbacks 回调函数对象
   */
  fxStraighten(callbacks?: {
    onChange?(value: TDegree): any;
    onComplete?(): any;
  }): () => void;
}

Object.assign(FabricObject.prototype, {
  /**
   * fx* 方法的动画持续时间（以毫秒为单位）
   *
   * Animation duration (in ms) for fx* methods
   * @type Number
   */
  FX_DURATION: 500,

  /**
   * 获取拉直所需的角度值
   * @private
   * @returns 角度值
   *
   * @private
   * @return {Number} angle value
   */
  _getAngleValueForStraighten(this: FabricObject) {
    const angle = this.angle % 360;
    if (angle > 0) {
      return Math.round((angle - 1) / 90) * 90;
    }
    return Math.round(angle / 90) * 90;
  },

  /**
   * 拉直对象（将其从当前角度旋转到 0、90、180、270 等，具体取决于哪个更近）
   *
   * Straightens an object (rotating it from current angle to one of 0, 90, 180, 270, etc. depending on which is closer)
   */
  straighten(this: StraightenableFabricObject) {
    this.rotate(this._getAngleValueForStraighten());
  },

  /**
   * 与 {@link straighten} 相同，但带有动画效果
   * @param callbacks 带有回调函数的对象
   * @param callbacks.onComplete 完成时调用
   * @param callbacks.onChange 动画的每一步调用
   *
   * Same as {@link straighten} but with animation
   * @param {Object} callbacks Object with callback functions
   * @param {Function} [callbacks.onComplete] Invoked on completion
   * @param {Function} [callbacks.onChange] Invoked on every step of animation
   */
  fxStraighten(
    this: StraightenableFabricObject,
    callbacks: {
      onChange?(value: TDegree): any;
      onComplete?(): any;
    } = {},
  ) {
    const onComplete = callbacks.onComplete || noop,
      onChange = callbacks.onChange || noop;

    return animate({
      target: this,
      startValue: this.angle,
      endValue: this._getAngleValueForStraighten(),
      duration: this.FX_DURATION,
      onChange: (value: TDegree) => {
        this.rotate(value);
        onChange(value);
      },
      onComplete: () => {
        this.setCoords();
        onComplete();
      },
    });
  },
});
