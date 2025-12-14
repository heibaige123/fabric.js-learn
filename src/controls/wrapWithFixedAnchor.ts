import type { Transform, TransformActionHandler } from '../EventTypeDefs';

/**
 * 包装一个动作处理程序，在变换时保存/恢复对象位置。
 * 这是允许对象在变换时保持其位置的代码。
 *
 * Wrap an action handler with saving/restoring object position on the transform.
 * this is the code that permits to objects to keep their position while transforming.
 * @param {Function} actionHandler the function to wrap
 * @return {Function} a function with an action handler signature
 */
export function wrapWithFixedAnchor<T extends Transform>(
  actionHandler: TransformActionHandler<T>,
) {
  return ((eventData, transform, x, y) => {
    const { target, originX, originY } = transform,
      constraint = target.getPositionByOrigin(originX, originY),
      actionPerformed = actionHandler(eventData, transform, x, y);
    // flipping requires to change the transform origin, so we read from the mutated transform
    // instead of leveraging the one destructured before
    target.setPositionByOrigin(
      constraint,
      transform.originX,
      transform.originY,
    );
    return actionPerformed;
  }) as TransformActionHandler<T>;
}
