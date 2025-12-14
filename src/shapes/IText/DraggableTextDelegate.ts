import type {
  DragEventData,
  DropEventData,
  TPointerEvent,
} from '../../EventTypeDefs';
import { Point } from '../../Point';
import type { IText } from './IText';
import { setStyle } from '../../util/internals/dom_style';
import { cloneStyles } from '../../util/internals/cloneStyles';
import type { TextStyleDeclaration } from '../Text/StyledText';
import { getDocumentFromElement } from '../../util/dom_misc';
import { CHANGED, NONE } from '../../constants';

/**
 * #### IText/Textbox 拖拽生命周期
 * - {@link start} 从 `mousedown` {@link IText#_mouseDownHandler} 调用，并通过测试 {@link isPointerOverSelection} 确定是否应开始拖拽
 * - 如果为 true，则阻止 `mousedown` {@link IText#_mouseDownHandler} 以保持选择
 * - 如果指针移动，画布会触发大量 mousemove {@link Canvas#_onMouseMove}，我们确保**不**阻止这些事件（{@link IText#shouldStartDragging}），以便窗口开始拖拽会话
 * - 一旦/如果会话开始，画布会在活动对象上调用 {@link onDragStart} 以确定是否应发生拖拽
 * - 画布触发相关的拖拽事件，这些事件由在此范围内定义的处理程序处理
 * - {@link end} 从 `mouseup` {@link IText#mouseUpHandler} 调用，阻止 IText 默认点击行为
 * - 如果拖拽会话没有发生，{@link end} 处理点击，因为在 `mousedown` 期间阻止了执行此操作的逻辑
 *
 * #### Dragging IText/Textbox Lifecycle
 * - {@link start} is called from `mousedown` {@link IText#_mouseDownHandler} and determines if dragging should start by testing {@link isPointerOverSelection}
 * - if true `mousedown` {@link IText#_mouseDownHandler} is blocked to keep selection
 * - if the pointer moves, canvas fires numerous mousemove {@link Canvas#_onMouseMove} that we make sure **aren't** prevented ({@link IText#shouldStartDragging}) in order for the window to start a drag session
 * - once/if the session starts canvas calls {@link onDragStart} on the active object to determine if dragging should occur
 * - canvas fires relevant drag events that are handled by the handlers defined in this scope
 * - {@link end} is called from `mouseup` {@link IText#mouseUpHandler}, blocking IText default click behavior
 * - in case the drag session didn't occur, {@link end} handles a click, since logic to do so was blocked during `mousedown`
 */
export class DraggableTextDelegate {
  /**
   * 目标 IText 对象
   */
  readonly target: IText;
  /**
   * 指针是否在选区上方
   */
  private __mouseDownInPlace = false;
  /***
   * 拖拽是否已启动
   */
  private __dragStartFired = false;
  /**
   * 指针是否在拖拽上方
   */
  private __isDraggingOver = false;
  /**
   * 拖拽开始时的选区
   */
  private __dragStartSelection?: {
    /**
     * 选区开始索引
     */
    selectionStart: number;
    /**
     * 选区结束索引
     */
    selectionEnd: number;
  };
  /**
   * 拖拽图像清理器
   */
  private __dragImageDisposer?: VoidFunction;
  /**
   * 释放资源
   */
  private _dispose?: () => void;

  constructor(target: IText) {
    this.target = target;
    const disposers = [
      this.target.on('dragenter', this.dragEnterHandler.bind(this)),
      this.target.on('dragover', this.dragOverHandler.bind(this)),
      this.target.on('dragleave', this.dragLeaveHandler.bind(this)),
      this.target.on('dragend', this.dragEndHandler.bind(this)),
      this.target.on('drop', this.dropHandler.bind(this)),
    ];
    this._dispose = () => {
      disposers.forEach((d) => d());
      this._dispose = undefined;
    };
  }

  /**
   * 检查指针是否在选区上方
   * @param e 指针事件
   * @returns 如果指针在选区上方则为 true
   */
  isPointerOverSelection(e: TPointerEvent) {
    const target = this.target;
    const newSelection = target.getSelectionStartFromPointer(e);
    return (
      target.isEditing &&
      newSelection >= target.selectionStart &&
      newSelection <= target.selectionEnd &&
      target.selectionStart < target.selectionEnd
    );
  }

  /**
   * 覆盖此方法以禁用拖拽并默认为 mousedown 逻辑
   *
   * @public override this method to disable dragging and default to mousedown logic
   * @param e 指针事件
   */
  start(e: TPointerEvent) {
    return (this.__mouseDownInPlace = this.isPointerOverSelection(e));
  }

  /**
   * 覆盖此方法以禁用拖拽而不丢弃选区
   *
   * @public override this method to disable dragging without discarding selection
   */
  isActive() {
    return this.__mouseDownInPlace;
  }

  /**
   * 结束交互并在点击的情况下设置光标
   *
   * Ends interaction and sets cursor in case of a click
   * @returns true if was active
   * @param e 指针事件
   */
  end(e: TPointerEvent) {
    const active = this.isActive();
    if (active && !this.__dragStartFired) {
      // mousedown has been blocked since `active` is true => cursor has not been set.
      // `__dragStartFired` is false => dragging didn't occur, pointer didn't move and is over selection.
      // meaning this is actually a click, `active` is a false positive.
      this.target.setCursorByClick(e);
      this.target.initDelayedCursor(true);
    }
    this.__mouseDownInPlace = false;
    this.__dragStartFired = false;
    this.__isDraggingOver = false;
    return active;
  }

  /**
   * 获取拖拽开始时的选区
   * @returns 拖拽开始时的选区
   */
  getDragStartSelection() {
    return this.__dragStartSelection;
  }

  /**
   * 覆盖以自定义拖拽图像
   * https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/setDragImage
   *
   * Override to customize the drag image
   * https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/setDragImage
   * @param e 拖拽事件
   * @param selection 选区范围
   */
  setDragImage(
    e: DragEvent,
    {
      selectionStart,
      selectionEnd,
    }: {
      selectionStart: number;
      selectionEnd: number;
    },
  ) {
    const target = this.target;
    const canvas = target.canvas!;
    const flipFactor = new Point(target.flipX ? -1 : 1, target.flipY ? -1 : 1);
    const boundaries = target._getCursorBoundaries(selectionStart);
    const selectionPosition = new Point(
      boundaries.left + boundaries.leftOffset,
      boundaries.top + boundaries.topOffset,
    ).multiply(flipFactor);
    const pos = selectionPosition.transform(target.calcTransformMatrix());
    const pointer = canvas.getScenePoint(e);
    const diff = pointer.subtract(pos);
    const retinaScaling = target.getCanvasRetinaScaling();
    const bbox = target.getBoundingRect();
    const correction = pos.subtract(new Point(bbox.left, bbox.top));
    const vpt = canvas.viewportTransform;
    const offset = correction.add(diff).transform(vpt, true);
    //  prepare instance for drag image snapshot by making all non selected text invisible
    const bgc = target.backgroundColor;
    const styles = cloneStyles(target.styles);
    target.backgroundColor = '';
    const styleOverride = {
      stroke: 'transparent',
      fill: 'transparent',
      textBackgroundColor: 'transparent',
    };
    target.setSelectionStyles(styleOverride, 0, selectionStart);
    target.setSelectionStyles(styleOverride, selectionEnd, target.text.length);
    target.dirty = true;
    const dragImage = target.toCanvasElement({
      enableRetinaScaling: canvas.enableRetinaScaling,
      viewportTransform: true,
    });
    // restore values
    target.backgroundColor = bgc;
    target.styles = styles;
    target.dirty = true;
    //  position drag image offscreen
    setStyle(dragImage, {
      position: 'fixed',
      left: `${-dragImage.width}px`,
      border: NONE,
      width: `${dragImage.width / retinaScaling}px`,
      height: `${dragImage.height / retinaScaling}px`,
    });
    this.__dragImageDisposer && this.__dragImageDisposer();
    this.__dragImageDisposer = () => {
      dragImage.remove();
    };
    getDocumentFromElement(
      (e.target || this.target.hiddenTextarea)! as HTMLElement,
    ).body.appendChild(dragImage);
    e.dataTransfer?.setDragImage(dragImage, offset.x, offset.y);
  }

  /**
   * 确定 {@link target} 是否应该/不应该成为拖拽源
   *
   * @returns {boolean} determines whether {@link target} should/shouldn't become a drag source
   * @param e 拖拽事件
   */
  onDragStart(e: DragEvent): boolean {
    this.__dragStartFired = true;
    const target = this.target;
    const active = this.isActive();
    if (active && e.dataTransfer) {
      const selection = (this.__dragStartSelection = {
        selectionStart: target.selectionStart,
        selectionEnd: target.selectionEnd,
      });
      const value = target._text
        .slice(selection.selectionStart, selection.selectionEnd)
        .join('');
      const data = { text: target.text, value, ...selection };
      e.dataTransfer.setData('text/plain', value);
      e.dataTransfer.setData(
        'application/fabric',
        JSON.stringify({
          value: value,
          styles: target.getSelectionStyles(
            selection.selectionStart,
            selection.selectionEnd,
            true,
          ),
        }),
      );
      e.dataTransfer.effectAllowed = 'copyMove';
      this.setDragImage(e, data);
    }
    target.abortCursorAnimation();
    return active;
  }

  /**
   * 使用 {@link targetCanDrop} 以尊重覆盖
   *
   * use {@link targetCanDrop} to respect overriding
   * @returns {boolean} determines whether {@link target} should/shouldn't become a drop target
   * @param e 拖拽事件
   */
  canDrop(e: DragEvent): boolean {
    if (
      this.target.editable &&
      !this.target.getActiveControl() &&
      !e.defaultPrevented
    ) {
      if (this.isActive() && this.__dragStartSelection) {
        //  drag source trying to drop over itself
        //  allow dropping only outside of drag start selection
        const index = this.target.getSelectionStartFromPointer(e);
        const dragStartSelection = this.__dragStartSelection;
        return (
          index < dragStartSelection.selectionStart ||
          index > dragStartSelection.selectionEnd
        );
      }
      return true;
    }
    return false;
  }

  /**
   * 为了尊重覆盖 {@link IText#canDrop}，我们调用它而不是直接调用 {@link canDrop}
   *
   * in order to respect overriding {@link IText#canDrop} we call that instead of calling {@link canDrop} directly
   * @param e 拖拽事件
   */
  protected targetCanDrop(e: DragEvent) {
    return this.target.canDrop(e);
  }

  /**
   * 拖拽进入处理程序
   * @param ev 拖拽事件数据
   */
  dragEnterHandler({ e }: DragEventData) {
    const canDrop = this.targetCanDrop(e);
    if (!this.__isDraggingOver && canDrop) {
      this.__isDraggingOver = true;
    }
  }

  /**
   * 拖拽悬停处理程序
   * @param ev 拖拽事件数据
   */
  dragOverHandler(ev: DragEventData) {
    const { e } = ev;
    const canDrop = this.targetCanDrop(e);
    if (!this.__isDraggingOver && canDrop) {
      this.__isDraggingOver = true;
    } else if (this.__isDraggingOver && !canDrop) {
      //  drop state has changed
      this.__isDraggingOver = false;
    }
    if (this.__isDraggingOver) {
      //  can be dropped, inform browser
      e.preventDefault();
      //  inform event subscribers
      ev.canDrop = true;
      ev.dropTarget = this.target;
    }
  }

  /**
   * 拖拽离开处理程序
   */
  dragLeaveHandler() {
    if (this.__isDraggingOver || this.isActive()) {
      this.__isDraggingOver = false;
    }
  }

  /**
   * 覆盖 {@link DragEvent#dataTransfer} 的 `text/plain | application/fabric` 类型
   * 以便分别更改放置值或自定义样式，通过监听 `drop:before` 事件
   * https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#performing_a_drop
   *
   * Override the `text/plain | application/fabric` types of {@link DragEvent#dataTransfer}
   * in order to change the drop value or to customize styling respectively, by listening to the `drop:before` event
   * https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#performing_a_drop
   * @param ev 放置事件数据
   */
  dropHandler(ev: DropEventData) {
    const { e } = ev;
    const didDrop = e.defaultPrevented;
    this.__isDraggingOver = false;
    // inform browser that the drop has been accepted
    e.preventDefault();
    let insert = e.dataTransfer?.getData('text/plain');
    if (insert && !didDrop) {
      const target = this.target;
      const canvas = target.canvas!;
      let insertAt = target.getSelectionStartFromPointer(e);
      const { styles } = (
        e.dataTransfer!.types.includes('application/fabric')
          ? JSON.parse(e.dataTransfer!.getData('application/fabric'))
          : {}
      ) as { styles: TextStyleDeclaration[] };
      const trailing = insert[Math.max(0, insert.length - 1)];
      const selectionStartOffset = 0;
      //  drag and drop in same instance
      if (this.__dragStartSelection) {
        const selectionStart = this.__dragStartSelection.selectionStart;
        const selectionEnd = this.__dragStartSelection.selectionEnd;
        if (insertAt > selectionStart && insertAt <= selectionEnd) {
          insertAt = selectionStart;
        } else if (insertAt > selectionEnd) {
          insertAt -= selectionEnd - selectionStart;
        }
        target.removeChars(selectionStart, selectionEnd);
        // prevent `dragend` from handling event
        delete this.__dragStartSelection;
      }
      //  remove redundant line break
      if (
        target._reNewline.test(trailing) &&
        (target._reNewline.test(target._text[insertAt]) ||
          insertAt === target._text.length)
      ) {
        insert = insert.trimEnd();
      }
      //  inform subscribers
      ev.didDrop = true;
      ev.dropTarget = target;
      //  finalize
      target.insertChars(insert, styles, insertAt);
      // can this part be moved in an outside event? andrea to check.
      canvas.setActiveObject(target);
      target.enterEditing(e);
      target.selectionStart = Math.min(
        insertAt + selectionStartOffset,
        target._text.length,
      );
      target.selectionEnd = Math.min(
        target.selectionStart + insert.length,
        target._text.length,
      );
      target.hiddenTextarea!.value = target.text;
      target._updateTextarea();
      target.hiddenTextarea!.focus();
      target.fire(CHANGED, {
        index: insertAt + selectionStartOffset,
        action: 'drop',
      });
      canvas.fire('text:changed', { target });
      canvas.contextTopDirty = true;
      canvas.requestRenderAll();
    }
  }

  /**
   * 仅在放置后（如果发生）在拖拽源上触发
   * 处理拖拽源的更改，以防放置在另一个对象上或取消
   * https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#finishing_a_drag
   *
   * fired only on the drag source after drop (if occurred)
   * handle changes to the drag source in case of a drop on another object or a cancellation
   * https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#finishing_a_drag
   * @param ev 拖拽事件数据
   */
  dragEndHandler({ e }: DragEventData) {
    if (this.isActive() && this.__dragStartFired) {
      //  once the drop event finishes we check if we need to change the drag source
      //  if the drag source received the drop we bail out since the drop handler has already handled logic
      if (this.__dragStartSelection) {
        const target = this.target;
        const canvas = this.target.canvas!;
        const { selectionStart, selectionEnd } = this.__dragStartSelection;
        const dropEffect = e.dataTransfer?.dropEffect || NONE;
        if (dropEffect === NONE) {
          // pointer is back over selection
          target.selectionStart = selectionStart;
          target.selectionEnd = selectionEnd;
          target._updateTextarea();
          target.hiddenTextarea!.focus();
        } else {
          target.clearContextTop();
          if (dropEffect === 'move') {
            target.removeChars(selectionStart, selectionEnd);
            target.selectionStart = target.selectionEnd = selectionStart;
            target.hiddenTextarea &&
              (target.hiddenTextarea.value = target.text);
            target._updateTextarea();
            target.fire(CHANGED, {
              index: selectionStart,
              action: 'dragend',
            });
            canvas.fire('text:changed', { target });
            canvas.requestRenderAll();
          }
          target.exitEditing();
        }
      }
    }

    this.__dragImageDisposer && this.__dragImageDisposer();
    delete this.__dragImageDisposer;
    delete this.__dragStartSelection;
    this.__isDraggingOver = false;
  }

  /**
   * 释放资源
   */
  dispose() {
    this._dispose && this._dispose();
  }
}
