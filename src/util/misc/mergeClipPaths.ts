import type { FabricObject } from '../../shapes/Object/FabricObject';
import { sendObjectToPlane } from './planeChange';
import { Group } from '../../shapes/Group';
/**
 * 将 2 个剪切路径合并为一个视觉上相等的剪切路径
 *
 * **重要**：\
 * **不** 克隆参数，如果需要，请先克隆它们。
 *
 * 创建一个包装器（组），其中包含一个剪切路径并被另一个剪切路径剪切，以便内容保留在两者重叠的位置。
 * 如果两个剪切路径都可能有自己的嵌套剪切路径，因此无法将一个分配给另一个的剪切路径属性，请使用此方法。
 *
 * 为了处理 \`inverted\` 属性，我们遵循以下情况中描述的逻辑：\
 * **(1)** 两个剪切路径都反转 - 剪切路径将反转属性传递给包装器并自行丢失它。\
 * **(2)** 一个反转而另一个不反转 - 包装器不应反转，反转的剪切路径必须剪切未反转的剪切路径以产生相同的视觉效果。\
 * **(3)** 两个剪切路径都不反转 - 包装器和剪切路径保持不变。
 *
 * Merges 2 clip paths into one visually equal clip path
 *
 * **IMPORTANT**:\
 * Does **NOT** clone the arguments, clone them proir if necessary.
 *
 * Creates a wrapper (group) that contains one clip path and is clipped by the other so content is kept where both overlap.
 * Use this method if both the clip paths may have nested clip paths of their own, so assigning one to the other's clip path property is not possible.
 *
 * In order to handle the `inverted` property we follow logic described in the following cases:\
 * **(1)** both clip paths are inverted - the clip paths pass the inverted prop to the wrapper and loose it themselves.\
 * **(2)** one is inverted and the other isn't - the wrapper shouldn't become inverted and the inverted clip path must clip the non inverted one to produce an identical visual effect.\
 * **(3)** both clip paths are not inverted - wrapper and clip paths remain unchanged.
 *
 * @param {fabric.Object} c1
 * @param {fabric.Object} c2
 * @returns {fabric.Object} merged clip path
 */
export const mergeClipPaths = (c1: FabricObject, c2: FabricObject) => {
  let a = c1,
    b = c2;
  if (a.inverted && !b.inverted) {
    //  case (2)
    a = c2;
    b = c1;
  }
  //  `b` becomes `a`'s clip path so we transform `b` to `a` coordinate plane
  sendObjectToPlane(b, b.group?.calcTransformMatrix(), a.calcTransformMatrix());
  //  assign the `inverted` prop to the wrapping group
  const inverted = a.inverted && b.inverted;
  if (inverted) {
    //  case (1)
    a.inverted = b.inverted = false;
  }
  return new Group([a], { clipPath: b, inverted });
};
