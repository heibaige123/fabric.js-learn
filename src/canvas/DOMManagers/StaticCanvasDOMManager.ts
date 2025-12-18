import { getEnv, getFabricDocument } from '../../env';
import type { TSize } from '../../typedefs';
import type { CSSDimensions } from './util';
import { setCSSDimensions, getElementOffset } from './util';
import { createCanvasElement, isHTMLCanvas } from '../../util/misc/dom';
import { setCanvasDimensions } from './util';
import { FabricError } from '../../util/internals/console';

/**
 * Canvas 项类型定义，包含 canvas 元素和上下文
 */
export type CanvasItem = {
  /**
   * HTML Canvas 元素
   */
  el: HTMLCanvasElement;
  /**
   * Canvas 2D 渲染上下文
   */
  ctx: CanvasRenderingContext2D;
};

/**
 * 静态 Canvas DOM 管理器类
 */
export class StaticCanvasDOMManager {
  /**
   * 在设置视网膜缩放和其他选项之前保存 canvas 样式的副本，以便在销毁时将其恢复到原始状态
   * @type string
   */
  private _originalCanvasStyle?: string;

  /**
   * 下层 Canvas 项（主要 Canvas）
   */
  lower: CanvasItem;

  /**
   * 构造函数
   * @param arg0 Canvas 元素或其 ID
   */
  constructor(arg0?: string | HTMLCanvasElement) {
    const el = this.createLowerCanvas(arg0);
    this.lower = { el, ctx: el.getContext('2d')! };
  }

  /**
   * 创建或获取下层 Canvas 元素
   * @param arg0 Canvas 元素或其 ID
   * @returns HTMLCanvasElement
   */
  protected createLowerCanvas(arg0?: HTMLCanvasElement | string) {
    // canvasEl === 'HTMLCanvasElement' does not work on jsdom/node
    const el = isHTMLCanvas(arg0)
      ? arg0
      : (arg0 &&
          (getFabricDocument().getElementById(arg0) as HTMLCanvasElement)) ||
        createCanvasElement();
    if (el.hasAttribute('data-fabric')) {
      throw new FabricError(
        'Trying to initialize a canvas that has already been initialized. Did you forget to dispose the canvas?',
      );
    }
    this._originalCanvasStyle = el.style.cssText;
    el.setAttribute('data-fabric', 'main');
    el.classList.add('lower-canvas');
    return el;
  }

  /**
   * 清理 DOM
   * @param size 尺寸对象
   * @param size.width 宽度
   * @param size.height 高度
   */
  cleanupDOM({ width, height }: TSize) {
    const { el } = this.lower;
    // restore canvas style and attributes
    // 恢复 canvas 样式和属性
    el.classList.remove('lower-canvas');
    el.removeAttribute('data-fabric');
    // restore canvas size to original size in case retina scaling was applied
    // 恢复 canvas 尺寸到原始尺寸，以防应用了视网膜缩放
    el.setAttribute('width', `${width}`);
    el.setAttribute('height', `${height}`);
    el.style.cssText = this._originalCanvasStyle || '';
    this._originalCanvasStyle = undefined;
  }

  /**
   * 设置 Canvas 尺寸
   * @param size 尺寸对象
   * @param retinaScaling 视网膜缩放比例
   */
  setDimensions(size: TSize, retinaScaling: number) {
    const { el, ctx } = this.lower;
    setCanvasDimensions(el, ctx, size, retinaScaling);
  }

  /**
   * 设置 CSS 尺寸
   * @param size CSS 尺寸对象
   */
  setCSSDimensions(size: Partial<CSSDimensions>) {
    setCSSDimensions(this.lower.el, size);
  }

  /**
   * 计算 canvas 元素相对于文档的偏移量
   *
   * Calculates canvas element offset relative to the document
   * @returns 偏移量对象
   */
  calcOffset() {
    return getElementOffset(this.lower.el);
  }

  /**
   * 释放资源
   */
  dispose() {
    getEnv().dispose(this.lower.el);
    // @ts-expect-error disposing
    delete this.lower;
  }
}
