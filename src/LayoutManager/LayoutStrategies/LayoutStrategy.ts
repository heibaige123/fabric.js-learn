import { Point } from '../../Point';
import type { FabricObject } from '../../shapes/Object/FabricObject';
import { makeBoundingBoxFromPoints } from '../../util/misc/boundingBoxFromPoints';
import {
  LAYOUT_TYPE_INITIALIZATION,
  LAYOUT_TYPE_IMPERATIVE,
} from '../constants';
import type {
  InitializationLayoutContext,
  LayoutStrategyResult,
  StrictLayoutContext,
} from '../types';
import { getObjectBounds } from './utils';

/**
 * 暴露一个主要的公共方法 {@link calcLayoutResult}，供 `LayoutManager` 用于执行布局。
 * 返回 `undefined` 表示 `LayoutManager` 跳过布局。
 *
 * 负责计算传递对象的边界框。
 *
 */
export abstract class LayoutStrategy {
  /**
   * 由子类覆盖以实现持久化（TS 不支持 `static abstract`）
   *
   */
  static type = 'strategy';

  /**
   * 由 `LayoutManager` 用于执行布局
   * @param context 布局上下文
   * @param objects 参与布局的对象数组
   * @returns 布局结果 **或** `undefined` 以跳过布局
   */
  public calcLayoutResult(
    context: StrictLayoutContext,
    objects: FabricObject[],
  ): LayoutStrategyResult | undefined {
    if (this.shouldPerformLayout(context)) {
      return this.calcBoundingBox(objects, context);
    }
  }

  /**
   * 确定是否应执行布局
   * @param context 布局上下文
   * @returns 如果应执行布局则返回 true
   */
  shouldPerformLayout({ type, prevStrategy, strategy }: StrictLayoutContext) {
    return (
      type === LAYOUT_TYPE_INITIALIZATION ||
      type === LAYOUT_TYPE_IMPERATIVE ||
      (!!prevStrategy && strategy !== prevStrategy)
    );
  }

  /**
   * 确定是否应布局剪切路径
   * @param context 布局上下文
   * @returns 如果应布局剪切路径则返回 true
   */
  shouldLayoutClipPath({ type, target: { clipPath } }: StrictLayoutContext) {
    return (
      type !== LAYOUT_TYPE_INITIALIZATION &&
      clipPath &&
      !clipPath.absolutePositioned
    );
  }

  /**
   * 获取初始大小
   * @param context 布局上下文
   * @param result 包含中心点和尺寸的布局结果部分
   * @returns 初始大小的点对象
   */
  getInitialSize(
    context: StrictLayoutContext & InitializationLayoutContext,
    result: Pick<LayoutStrategyResult, 'center' | 'size'>,
  ) {
    return result.size;
  }

  /**
   * 覆盖此方法以自定义布局。
   * @param objects 参与布局的对象数组
   * @param context 布局上下文
   * @returns 布局结果或 undefined
   *
   * Override this method to customize layout.
   */
  calcBoundingBox(
    objects: FabricObject[],
    context: StrictLayoutContext,
  ): LayoutStrategyResult | undefined {
    const { type, target } = context;
    if (type === LAYOUT_TYPE_IMPERATIVE && context.overrides) {
      return context.overrides;
    }
    if (objects.length === 0) {
      return;
    }
    const { left, top, width, height } = makeBoundingBoxFromPoints(
      objects
        .map((object) => getObjectBounds(target, object))
        .reduce<Point[]>((coords, curr) => coords.concat(curr), []),
    );
    const bboxSize = new Point(width, height);
    const bboxLeftTop = new Point(left, top);
    const bboxCenter = bboxLeftTop.add(bboxSize.scalarDivide(2));

    if (type === LAYOUT_TYPE_INITIALIZATION) {
      const actualSize = this.getInitialSize(context, {
        size: bboxSize,
        center: bboxCenter,
      });
      return {
        // in `initialization` we do not account for target's transformation matrix
        center: bboxCenter,
        // TODO: investigate if this is still necessary
        relativeCorrection: new Point(0, 0),
        size: actualSize,
      };
    } else {
      //  we send `relativeCenter` up to group's containing plane
      const center = bboxCenter.transform(target.calcOwnMatrix());
      return {
        center,
        size: bboxSize,
      };
    }
  }
}
