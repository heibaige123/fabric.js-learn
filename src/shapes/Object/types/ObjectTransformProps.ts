import type { TDegree } from '../../../typedefs';

/**
 * 对象变换操作属性接口
 */
export interface ObjectTransformActionProps {
  /**
   * 对象旋转时将锁定的角度。
   *
   * The angle that an object will lock to while rotating.
   * @type [TDegree]
   */
  snapAngle?: TDegree;

  /**
   * 应该发生捕捉的当前捕捉角度的角度差。
   * 当未定义时，snapThreshold 将默认为 snapAngle。
   *
   * The angle difference from the current snapped angle in which snapping should occur.
   * When undefined, the snapThreshold will default to the snapAngle.
   * @type [TDegree]
   */
  snapThreshold?: TDegree;

  /**
   * 当为 `true` 时，对象将围绕其中心旋转。
   * 当为 `false` 时，将围绕 originX 和 originY 定义的原点旋转。
   * 如果画布已将 centeredRotation 设置为 `true`，则在变换期间将忽略此属性的值
   * 对象方法 `rotate` 将始终考虑此属性，而从不考虑画布的属性。
   *
   * When `true` the object will rotate on its center.
   * When `false` will rotate around the origin point defined by originX and originY.
   * The value of this property is IGNORED during a transform if the canvas has already
   * centeredRotation set to `true`
   * The object method `rotate` will always consider this property and never the canvas's one.
   * @since 1.3.4
   * @type Boolean
   */
  centeredRotation: boolean;

  /**
   * 当为 true 时，通过控件缩放时，此对象将使用中心点作为变换原点。
   *
   * When true, this object will use center point as the origin of transformation
   * when being scaled via the controls.
   * @since 1.3.4
   * @type Boolean
   */
  centeredScaling: boolean;
}
