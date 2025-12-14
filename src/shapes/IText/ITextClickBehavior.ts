import type {
  ObjectPointerEvents,
  TPointerEvent,
  TPointerEventInfo,
} from '../../EventTypeDefs';
import { Point } from '../../Point';
import { invertTransform } from '../../util/misc/matrix';
import { DraggableTextDelegate } from './DraggableTextDelegate';
import type { ITextEvents } from './ITextBehavior';
import { ITextKeyBehavior } from './ITextKeyBehavior';
import type { TOptions } from '../../typedefs';
import type { TextProps, SerializedTextProps } from '../Text/Text';
import type { IText } from './IText';
/**
 * 检查事件是否不是左键点击
 * `LEFT_CLICK === 0`
 */
const notALeftClick = (e: Event) => !!(e as MouseEvent).button;

/**
 * IText 点击行为类
 * 提供处理鼠标点击、双击、三击以及拖拽相关的行为
 */
export abstract class ITextClickBehavior<
  Props extends TOptions<TextProps> = Partial<TextProps>,
  SProps extends SerializedTextProps = SerializedTextProps,
  EventSpec extends ITextEvents = ITextEvents,
> extends ITextKeyBehavior<Props, SProps, EventSpec> {
  /**
   * 可拖拽文本代理
   */
  protected draggableTextDelegate: DraggableTextDelegate;

  /**
   * 初始化行为
   * 初始化与光标或选区相关的事件处理程序
   */
  initBehavior() {
    // Initializes event handlers related to cursor or selection
    this.on('mousedown', this._mouseDownHandler);
    this.on('mouseup', this.mouseUpHandler);
    this.on('mousedblclick', this.doubleClickHandler);
    this.on('mousetripleclick', this.tripleClickHandler);

    this.draggableTextDelegate = new DraggableTextDelegate(
      this as unknown as IText,
    );

    super.initBehavior();
  }

  /**
   * 如果此方法返回 true，则文本选区上的鼠标移动操作
   * 将不会阻止允许浏览器开始拖动操作的原生鼠标事件。
   * shouldStartDragging 可以理解为“不要阻止鼠标移动事件的默认行为”
   * 要阻止对象之间的拖放，shouldStartDragging 和 onDragStart 都应返回 false
   *
   * If this method returns true a mouse move operation over a text selection
   * will not prevent the native mouse event allowing the browser to start a drag operation.
   * shouldStartDragging can be read 'do not prevent default for mouse move event'
   * To prevent drag and drop between objects both shouldStartDragging and onDragStart should return false
   * @returns
   */
  shouldStartDragging() {
    return this.draggableTextDelegate.isActive();
  }

  /**
   * @public 重写此方法以控制实例是否应该/不应该成为拖动源，
   * @see also {@link DraggableTextDelegate#isActive}
   * 要阻止对象之间的拖放，shouldStartDragging 和 onDragStart 都应返回 false
   *
   * @public override this method to control whether instance should/shouldn't become a drag source,
   * @see also {@link DraggableTextDelegate#isActive}
   * To prevent drag and drop between objects both shouldStartDragging and onDragStart should return false
   * @returns {boolean} should handle event
   */
  onDragStart(e: DragEvent) {
    return this.draggableTextDelegate.onDragStart(e);
  }

  /**
   * @public 重写此方法以控制实例是否应该/不应该成为放置目标
   *
   * @public override this method to control whether instance should/shouldn't become a drop target
   */
  canDrop(e: DragEvent) {
    return this.draggableTextDelegate.canDrop(e);
  }

  /**
   * 双击的默认处理程序，选择一个单词
   *
   * Default handler for double click, select a word
   */
  doubleClickHandler(options: TPointerEventInfo) {
    if (!this.isEditing) {
      return;
    }
    this.selectWord(this.getSelectionStartFromPointer(options.e));
    this.renderCursorOrSelection();
  }

  /**
   * 三击的默认处理程序，选择一行
   *
   * Default handler for triple click, select a line
   */
  tripleClickHandler(options: TPointerEventInfo) {
    if (!this.isEditing) {
      return;
    }
    this.selectLine(this.getSelectionStartFromPointer(options.e));
    this.renderCursorOrSelection();
  }

  /**
   * _mouseDown 所需的基本功能的默认事件处理程序
   * 可以重写以执行不同的操作。
   * 此实现的范围是：找到点击位置，设置 selectionStart
   * 找到 selectionEnd，初始化光标或选区的绘制
   * 在文本区域上初始化 mousedDown 将取消 fabricjs 对
   * 当前 compositionMode 的了解。它将被设置为 false。
   *
   * Default event handler for the basic functionalities needed on _mouseDown
   * can be overridden to do something different.
   * Scope of this implementation is: find the click position, set selectionStart
   * find selectionEnd, initialize the drawing of either cursor or selection area
   * initializing a mousedDown on a text area will cancel fabricjs knowledge of
   * current compositionMode. It will be set to false.
   */
  _mouseDownHandler({ e, alreadySelected }: ObjectPointerEvents['mousedown']) {
    if (
      !this.canvas ||
      !this.editable ||
      notALeftClick(e) ||
      this.getActiveControl()
    ) {
      return;
    }

    if (this.draggableTextDelegate.start(e)) {
      return;
    }

    this.canvas.textEditingManager.register(this);

    if (alreadySelected) {
      this.inCompositionMode = false;
      this.setCursorByClick(e);
    }

    if (this.isEditing) {
      this.__selectionStartOnMouseDown = this.selectionStart;
      if (this.selectionStart === this.selectionEnd) {
        this.abortCursorAnimation();
      }
      this.renderCursorOrSelection();
    }
    this.selected ||= alreadySelected || this.isEditing;
  }

  /**
   * 鼠标松开的标准处理程序，可重写
   *
   * standard handler for mouse up, overridable
   * @private
   */
  mouseUpHandler({ e, transform }: ObjectPointerEvents['mouseup']) {
    const didDrag = this.draggableTextDelegate.end(e);

    if (this.canvas) {
      this.canvas.textEditingManager.unregister(this);

      const activeObject = this.canvas._activeObject;
      if (activeObject && activeObject !== this) {
        // avoid running this logic when there is an active object
        // this because is possible with shift click and fast clicks,
        // to rapidly deselect and reselect this object and trigger an enterEdit
        return;
      }
    }

    if (
      !this.editable ||
      (this.group && !this.group.interactive) ||
      (transform && transform.actionPerformed) ||
      notALeftClick(e) ||
      didDrag
    ) {
      return;
    }

    if (this.selected && !this.getActiveControl()) {
      this.enterEditing(e);
      if (this.selectionStart === this.selectionEnd) {
        this.initDelayedCursor(true);
      } else {
        this.renderCursorOrSelection();
      }
    }
  }

  /**
   * 根据传递的指针 (x/y) 对象更改文本中的光标位置
   *
   * Changes cursor location in a text depending on passed pointer (x/y) object
   * @param {TPointerEvent} e 事件对象
   */
  setCursorByClick(e: TPointerEvent) {
    const newSelection = this.getSelectionStartFromPointer(e),
      start = this.selectionStart,
      end = this.selectionEnd;
    if (e.shiftKey) {
      this.setSelectionStartEndWithShift(start, end, newSelection);
    } else {
      this.selectionStart = newSelection;
      this.selectionEnd = newSelection;
    }
    if (this.isEditing) {
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  }

  /**
   * 返回对应于单击对象的字符的索引
   *
   * Returns index of a character corresponding to where an object was clicked
   * @param {TPointerEvent} e 事件对象
   * @return {Number} 字符索引
   */
  getSelectionStartFromPointer(e: TPointerEvent): number {
    const mouseOffset = this.canvas!.getScenePoint(e)
      .transform(invertTransform(this.calcTransformMatrix()))
      .add(new Point(-this._getLeftOffset(), -this._getTopOffset()));
    let height = 0,
      charIndex = 0,
      lineIndex = 0;

    for (let i = 0; i < this._textLines.length; i++) {
      if (height <= mouseOffset.y) {
        height += this.getHeightOfLine(i);
        lineIndex = i;
        if (i > 0) {
          charIndex +=
            this._textLines[i - 1].length + this.missingNewlineOffset(i - 1);
        }
      } else {
        break;
      }
    }
    const lineLeftOffset = Math.abs(this._getLineLeftOffset(lineIndex));
    let width = lineLeftOffset;
    const charLength = this._textLines[lineIndex].length;
    const chars = this.__charBounds[lineIndex];
    for (let j = 0; j < charLength; j++) {
      // i removed something about flipX here, check.
      const charWidth = chars[j].kernedWidth;
      const widthAfter = width + charWidth;
      if (mouseOffset.x <= widthAfter) {
        // if the pointer is closer to the end of the char we increment charIndex
        // in order to position the cursor after the char
        if (
          Math.abs(mouseOffset.x - widthAfter) <=
          Math.abs(mouseOffset.x - width)
        ) {
          charIndex++;
        }
        break;
      }
      width = widthAfter;
      charIndex++;
    }

    return Math.min(
      // if object is horizontally flipped, mirror cursor location from the end
      this.flipX ? charLength - charIndex : charIndex,
      this._text.length,
    );
  }
}
