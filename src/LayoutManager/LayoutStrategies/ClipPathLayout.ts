import { Point } from '../../Point';
import type { FabricObject } from '../../shapes/Object/FabricObject';
import { makeBoundingBoxFromPoints } from '../../util/misc/boundingBoxFromPoints';
import { sendPointToPlane } from '../../util/misc/planeChange';
import type { LayoutStrategyResult, StrictLayoutContext } from '../types';
import { LayoutStrategy } from './LayoutStrategy';
import { getObjectBounds } from './utils';
import { classRegistry } from '../../ClassRegistry';

/**
 * 布局将调整边界框以匹配剪切路径的边界框。
 */
export class ClipPathLayout extends LayoutStrategy {
  /**
   * 布局策略类型标识
   */
  static readonly type = 'clip-path';

  /**
   * 确定是否应执行布局计算
   * @param context 布局上下文
   * @returns 如果应执行布局则返回 true
   */
  shouldPerformLayout(context: StrictLayoutContext): boolean {
    return !!context.target.clipPath && super.shouldPerformLayout(context);
  }

  /**
   * 确定是否应布局剪切路径
   * @returns 总是返回 false
   */
  shouldLayoutClipPath() {
    return false;
  }

  /**
   * 计算布局结果
   * @param context 布局上下文
   * @param objects 参与布局的对象数组
   * @returns 布局策略结果或 undefined
   */
  calcLayoutResult(
    context: StrictLayoutContext,
    objects: FabricObject[],
  ): LayoutStrategyResult | undefined {
    const { target } = context;
    const { clipPath, group } = target;
    if (!clipPath || !this.shouldPerformLayout(context)) {
      return;
    }
    // TODO: remove stroke calculation from this case
    const { width, height } = makeBoundingBoxFromPoints(
      getObjectBounds(target, clipPath as FabricObject),
    );
    const size = new Point(width, height);
    if (clipPath.absolutePositioned) {
      //  we want the center point to exist in group's containing plane
      const clipPathCenter = sendPointToPlane(
        clipPath.getRelativeCenterPoint(),
        undefined,
        group ? group.calcTransformMatrix() : undefined,
      );
      return {
        center: clipPathCenter,
        size,
      };
    } else {
      //  we want the center point to exist in group's containing plane, so we send it upwards
      const clipPathCenter = clipPath
        .getRelativeCenterPoint()
        .transform(target.calcOwnMatrix(), true);
      if (this.shouldPerformLayout(context)) {
        // the clip path is positioned relative to the group's center which is affected by the bbox
        // so we first calculate the bbox
        const { center = new Point(), correction = new Point() } =
          this.calcBoundingBox(objects, context) || {};
        return {
          center: center.add(clipPathCenter),
          correction: correction.subtract(clipPathCenter),
          size,
        };
      } else {
        return {
          center: target.getRelativeCenterPoint().add(clipPathCenter),
          size,
        };
      }
    }
  }
}

classRegistry.setClass(ClipPathLayout);
