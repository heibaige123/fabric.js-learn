import { Point } from '../../Point';
import type {
  InitializationLayoutContext,
  LayoutStrategyResult,
  StrictLayoutContext,
} from '../types';
import { LayoutStrategy } from './LayoutStrategy';
import { classRegistry } from '../../ClassRegistry';

/**
 * 布局将保持目标的初始大小。
 */
export class FixedLayout extends LayoutStrategy {
  /**
   * 布局策略类型标识
   */
  static readonly type = 'fixed';

  /**
   * 获取初始大小，尊重目标的初始尺寸
   * @param context 包含目标对象的布局上下文
   * @param result 包含中心点和尺寸的布局结果部分
   * @returns 初始大小的点对象
   *
   * @override respect target's initial size
   */
  getInitialSize(
    { target }: StrictLayoutContext & InitializationLayoutContext,
    { size }: Pick<LayoutStrategyResult, 'center' | 'size'>,
  ): Point {
    return new Point(target.width || size.x, target.height || size.y);
  }
}

classRegistry.setClass(FixedLayout);
