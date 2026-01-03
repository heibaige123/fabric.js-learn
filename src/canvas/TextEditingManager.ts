import type { TPointerEvent } from '../EventTypeDefs';
import type { ITextBehavior } from '../shapes/IText/ITextBehavior';
import { removeFromArray } from '../util/internals/removeFromArray';
import type { Canvas } from './Canvas';

/**
 * 负责同步 canvas 的所有交互式文本实例
 *
 */
export class TextEditingManager {
  /**
   * 文本目标数组
   */
  private targets: ITextBehavior[] = [];
  /**
   * 当前活动文本目标
   */
  declare private target?: ITextBehavior;
  /**
   * 销毁函数
   */
  private __disposer: VoidFunction;

  constructor(canvas: Canvas) {
    const cb = () => {
      const { hiddenTextarea } =
        (canvas.getActiveObject() as ITextBehavior) || {};
      hiddenTextarea && hiddenTextarea.focus();
    };
    const el = canvas.upperCanvasEl;
    el.addEventListener('click', cb);
    this.__disposer = () => el.removeEventListener('click', cb);
  }

  /**
   * 退出文本编辑模式
   */
  exitTextEditing() {
    this.target = undefined;
    this.targets.forEach((target) => {
      if (target.isEditing) {
        target.exitEditing();
      }
    });
  }

  /**
   * 添加文本目标
   * @param target 文本目标
   */
  add(target: ITextBehavior) {
    this.targets.push(target);
  }

  /**
   * 移除文本目标
   * @param target 文本目标
   */
  remove(target: ITextBehavior) {
    this.unregister(target);
    removeFromArray(this.targets, target);
  }

  /**
   * 注册文本目标
   * @param target 文本目标
   */
  register(target: ITextBehavior) {
    this.target = target;
  }

  /**
   * 注销文本目标
   * @param target 文本目标
   */
  unregister(target: ITextBehavior) {
    if (target === this.target) {
      this.target = undefined;
    }
  }

  /**
   * 处理鼠标移动事件
   * @param e 指针事件
   */
  onMouseMove(e: TPointerEvent) {
    this.target?.isEditing && this.target.updateSelectionOnMouseMove(e);
  }

  /**
   * 清除所有目标
   */
  clear() {
    this.targets = [];
    this.target = undefined;
  }

  /**
   * 销毁管理器
   */
  dispose() {
    this.clear();
    this.__disposer();
    // @ts-expect-error disposing
    delete this.__disposer;
  }
}
