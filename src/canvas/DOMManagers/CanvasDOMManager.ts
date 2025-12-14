import { getEnv, getFabricDocument } from '../../env';
import type { TSize } from '../../typedefs';
import { createCanvasElement } from '../../util/misc/dom';
import { setStyle } from '../../util/internals/dom_style';
import type { CSSDimensions } from './util';
import { makeElementUnselectable, setCSSDimensions } from './util';
import type { CanvasItem } from './StaticCanvasDOMManager';
import { StaticCanvasDOMManager } from './StaticCanvasDOMManager';
import { setCanvasDimensions } from './util';
import { NONE } from '../../constants';

/**
 * Canvas DOM 管理器类，用于管理 Canvas 相关的 DOM 元素
 */
export class CanvasDOMManager extends StaticCanvasDOMManager {
  /**
   * 上层 Canvas 元素及其上下文
   */
  upper: CanvasItem;
  /**
   * 容器元素
   */
  container: HTMLDivElement;

  /**
   * 构造函数
   * @param arg0 Canvas 元素或其 ID
   * @param options 选项对象
   * @param options.allowTouchScrolling 是否允许触摸滚动
   * @param options.containerClass 容器类名（已弃用，仅用于向后兼容）
   */
  constructor(
    arg0?: string | HTMLCanvasElement,
    {
      allowTouchScrolling = false,
      containerClass = '',
    }: {
      allowTouchScrolling?: boolean;
      /**
       * @deprecated here only for backward compatibility
       */
      containerClass?: string;
    } = {},
  ) {
    super(arg0);
    const { el: lowerCanvasEl } = this.lower;
    const upperCanvasEl = this.createUpperCanvas();
    this.upper = { el: upperCanvasEl, ctx: upperCanvasEl.getContext('2d')! };
    this.applyCanvasStyle(lowerCanvasEl, {
      allowTouchScrolling,
    });
    this.applyCanvasStyle(upperCanvasEl, {
      allowTouchScrolling,
      styles: {
        position: 'absolute',
        left: '0',
        top: '0',
      },
    });
    const container = this.createContainerElement();
    container.classList.add(containerClass);
    if (lowerCanvasEl.parentNode) {
      lowerCanvasEl.parentNode.replaceChild(container, lowerCanvasEl);
    }
    container.append(lowerCanvasEl, upperCanvasEl);
    this.container = container;
  }

  /**
   * 创建上层 Canvas 元素
   * @returns 创建的 HTMLCanvasElement
   */
  protected createUpperCanvas() {
    const { el: lowerCanvasEl } = this.lower;
    const el = createCanvasElement();
    // we assign the same classname of the lowerCanvas
    // 我们分配与 lowerCanvas 相同的类名
    el.className = lowerCanvasEl.className;
    // but then we remove the lower-canvas specific className
    // 但是然后我们移除 lower-canvas 特定的类名
    el.classList.remove('lower-canvas');
    // we add the specific upper-canvas class
    // 我们添加特定的 upper-canvas 类
    el.classList.add('upper-canvas');
    el.setAttribute('data-fabric', 'top');
    el.style.cssText = lowerCanvasEl.style.cssText;
    el.setAttribute('draggable', 'true');
    return el;
  }

  /**
   * 创建容器元素
   * @returns 创建的 HTMLDivElement
   */
  protected createContainerElement() {
    const container = getFabricDocument().createElement('div');
    container.setAttribute('data-fabric', 'wrapper');
    setStyle(container, {
      position: 'relative',
    });
    makeElementUnselectable(container);
    return container;
  }

  /**
   * 应用 Canvas 样式
   *
   * @private
   * @param element 要应用样式的 canvas 元素
   * @param {HTMLCanvasElement} element canvas element to apply styles on
   * @param options 样式选项
   * @param options.allowTouchScrolling 是否允许触摸滚动
   * @param options.styles 样式对象
   */
  protected applyCanvasStyle(
    element: HTMLCanvasElement,
    options: {
      allowTouchScrolling?: boolean;
      styles?: Record<string, string>;
    },
  ) {
    const { styles, allowTouchScrolling } = options;
    setStyle(element, {
      ...styles,
      'touch-action': allowTouchScrolling ? 'manipulation' : NONE,
    });
    makeElementUnselectable(element);
  }

  /**
   * 设置 Canvas 尺寸
   * @param size 尺寸对象
   * @param retinaScaling视网膜缩放比例
   */
  setDimensions(size: TSize, retinaScaling: number) {
    super.setDimensions(size, retinaScaling);
    const { el, ctx } = this.upper;
    setCanvasDimensions(el, ctx, size, retinaScaling);
  }

  /**
   * 设置 CSS 尺寸
   * @param size CSS 尺寸对象
   */
  setCSSDimensions(size: Partial<CSSDimensions>): void {
    super.setCSSDimensions(size);
    setCSSDimensions(this.upper.el, size);
    setCSSDimensions(this.container, size);
  }

  /**
   * 清理 DOM
   * @param size 尺寸对象
   */
  cleanupDOM(size: TSize) {
    const container = this.container,
      { el: lowerCanvasEl } = this.lower,
      { el: upperCanvasEl } = this.upper;
    super.cleanupDOM(size);
    container.removeChild(upperCanvasEl);
    container.removeChild(lowerCanvasEl);
    if (container.parentNode) {
      container.parentNode.replaceChild(lowerCanvasEl, container);
    }
  }

  /**
   * 释放资源
   */
  dispose() {
    super.dispose();
    getEnv().dispose(this.upper.el);
    // @ts-expect-error disposing
    delete this.upper;
    // @ts-expect-error disposing
    delete this.container;
  }
}
