import { LayoutManager } from './LayoutManager';
import type { RegistrationContext, StrictLayoutContext } from './types';
import type { Group } from '../shapes/Group';

/**
 * 目前 LayoutManager 类还负责订阅事件处理程序，以便在组是交互式的并且对子对象应用变换时更新组布局。
 * ActiveSelection 永远不是交互式的，但它可能包含来自交互式组的对象。
 * 标准 LayoutManager 会订阅 ActiveSelection 的子对象以对 ActiveSelection 本身执行布局更改，
 * 而我们需要的是，应用于 ActiveSelection 的变换将触发子对象的原始组（在 parent 属性下引用的组）的更改。
 * LayoutManager 的这个子类只有一个职责，就是填补这个差异。
 *
 * Today the LayoutManager class also takes care of subscribing event handlers
 * to update the group layout when the group is interactive and a transform is applied
 * to a child object.
 * The ActiveSelection is never interactive, but it could contain objects from
 * groups that are.
 * The standard LayoutManager would subscribe the children of the activeSelection to
 * perform layout changes to the active selection itself, what we need instead is that
 * the transformation applied to the active selection will trigger changes to the
 * original group of the children ( the one referenced under the parent property )
 * This subclass of the LayoutManager has a single duty to fill the gap of this difference.`
 */
export class ActiveSelectionLayoutManager extends LayoutManager {
  /**
   * 订阅目标对象
   * @param context 注册上下文
   */
  subscribeTargets(
    context: RegistrationContext & Partial<StrictLayoutContext>,
  ): void {
    const activeSelection = context.target;
    const parents = context.targets.reduce((parents, target) => {
      target.parent && parents.add(target.parent);
      return parents;
    }, new Set<Group>());
    parents.forEach((parent) => {
      parent.layoutManager.subscribeTargets({
        target: parent,
        targets: [activeSelection],
      });
    });
  }

  /**
   * 仅当所有子对象都被取消选择时，才从父对象取消订阅
   * @param context 注册上下文
   */
  unsubscribeTargets(
    context: RegistrationContext & Partial<StrictLayoutContext>,
  ): void {
    const activeSelection = context.target;
    const selectedObjects = activeSelection.getObjects();
    const parents = context.targets.reduce((parents, target) => {
      target.parent && parents.add(target.parent);
      return parents;
    }, new Set<Group>());
    parents.forEach((parent) => {
      !selectedObjects.some((object) => object.parent === parent) &&
        parent.layoutManager.unsubscribeTargets({
          target: parent,
          targets: [activeSelection],
        });
    });
  }
}
