/**
 * 锁定交互属性接口
 */
export interface LockInteractionProps {
  /**
   * 当为 `true` 时，对象水平移动被锁定
   *
   * When `true`, object horizontal movement is locked
   * @type Boolean
   */
  lockMovementX: boolean;

  /**
   * 当为 `true` 时，对象垂直移动被锁定
   *
   * When `true`, object vertical movement is locked
   * @type Boolean
   */
  lockMovementY: boolean;

  /**
   * 当为 `true` 时，对象旋转被锁定
   *
   * When `true`, object rotation is locked
   * @type Boolean
   */
  lockRotation: boolean;

  /**
   * 当为 `true` 时，对象水平缩放被锁定
   *
   * When `true`, object horizontal scaling is locked
   * @type Boolean
   */
  lockScalingX: boolean;

  /**
   * 当为 `true` 时，对象垂直缩放被锁定
   *
   * When `true`, object vertical scaling is locked
   * @type Boolean
   */
  lockScalingY: boolean;

  /**
   * 当为 `true` 时，对象水平倾斜被锁定
   *
   * When `true`, object horizontal skewing is locked
   * @type Boolean
   */
  lockSkewingX: boolean;

  /**
   * 当为 `true` 时，对象垂直倾斜被锁定
   *
   * When `true`, object vertical skewing is locked
   * @type Boolean
   */
  lockSkewingY: boolean;

  /**
   * 当为 `true` 时，对象不能通过缩放到负值来翻转
   *
   * When `true`, object cannot be flipped by scaling into negative values
   * @type Boolean
   */
  lockScalingFlip: boolean;
}
