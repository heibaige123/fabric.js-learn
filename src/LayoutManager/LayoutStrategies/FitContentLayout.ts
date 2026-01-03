import type { StrictLayoutContext } from '../types';
import { LayoutStrategy } from './LayoutStrategy';
import { classRegistry } from '../../ClassRegistry';

/**
 * 布局将调整边界框以适应目标的对象。
 */
export class FitContentLayout extends LayoutStrategy {
  /**
   * 布局策略类型标识
   */
  static readonly type = 'fit-content';

  /**
   * @override 在所有触发器上进行布局
   * 随意覆盖
   * @param context 布局上下文
   * @returns 总是返回 true
   *
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shouldPerformLayout(context: StrictLayoutContext) {
    return true;
  }
}

classRegistry.setClass(FitContentLayout);
