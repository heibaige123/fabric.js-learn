import { config } from '../../config';
import { getFabricDocument, getEnv } from '../../env';
import { capValue } from '../../util/misc/capValue';
import type { ITextEvents } from './ITextBehavior';
import { ITextBehavior } from './ITextBehavior';
import type { TKeyMapIText } from './constants';
import type { TOptions } from '../../typedefs';
import type { TextProps, SerializedTextProps } from '../Text/Text';
import { getDocumentFromElement } from '../../util/dom_misc';
import { CHANGED, LEFT, RIGHT } from '../../constants';
import type { IText } from './IText';
import type { TextStyleDeclaration } from '../Text/StyledText';

/**
 * IText 键盘行为抽象类
 * 处理键盘事件，如按键按下、抬起、输入、组合输入等
 */
export abstract class ITextKeyBehavior<
  Props extends TOptions<TextProps> = Partial<TextProps>,
  SProps extends SerializedTextProps = SerializedTextProps,
  EventSpec extends ITextEvents = ITextEvents,
> extends ITextBehavior<Props, SProps, EventSpec> {
  /**
   * 用于 keyDown 的功能
   * 将特殊键映射到实例/原型的函数
   * 如果你需要 ESC 或 TAB 或箭头有不同的行为，你必须更改
   * 此映射，设置你在 IText 或你的原型上构建的函数名称。
   * 映射更改将影响所有实例，除非你只需要某些文本实例
   * 在这种情况下，你必须克隆此对象并分配给你的实例。
   * this.keysMap = Object.assign({}, this.keysMap);
   * 该函数必须在 IText.prototype.myFunction 中，并将接收 event 作为 args[0]
   *
   * For functionalities on keyDown
   * Map a special key to a function of the instance/prototype
   * If you need different behavior for ESC or TAB or arrows, you have to change
   * this map setting the name of a function that you build on the IText or
   * your prototype.
   * the map change will affect all Instances unless you need for only some text Instances
   * in that case you have to clone this object and assign your Instance.
   * this.keysMap = Object.assign({}, this.keysMap);
   * The function must be in IText.prototype.myFunction And will receive event as args[0]
   */
  declare keysMap: TKeyMapIText;

  /**
   * 用于 RTL（从右到左）语言的 keyDown 功能映射
   */
  declare keysMapRtl: TKeyMapIText;

  /**
   * 用于 keyUp + ctrl || cmd 的功能
   *
   * For functionalities on keyUp + ctrl || cmd
   */
  declare ctrlKeysMapUp: TKeyMapIText;

  /**
   * 用于 keyDown + ctrl || cmd 的功能
   *
   * For functionalities on keyDown + ctrl || cmd
   */
  declare ctrlKeysMapDown: TKeyMapIText;

  /**
   * 隐藏的 textarea 元素，用于处理输入
   */
  declare hiddenTextarea: HTMLTextAreaElement | null;

  /**
   * 用于追加 hiddenTextarea 的 DOM 容器。
   * 附加到 document.body 的替代方案。
   * 用于减少完整 document.body 树的缓慢重绘，
   * 以及模态事件捕获不让 textarea 获取焦点的情况。
   * @type HTMLElement
   *
   * DOM container to append the hiddenTextarea.
   * An alternative to attaching to the document.body.
   * Useful to reduce laggish redraw of the full document.body tree and
   * also with modals event capturing that won't let the textarea take focus.
   * @type HTMLElement
   */
  declare hiddenTextareaContainer?: HTMLElement | null;

  /**
   * 点击处理程序是否已初始化
   */
  declare private _clickHandlerInitialized: boolean;
  /**
   * 复制操作是否完成
   */
  declare private _copyDone: boolean;
  /**
   * 是否来自粘贴操作
   */
  declare private fromPaste: boolean;

  /**
   * 初始化隐藏的 textarea（需要在 iOS 中调出键盘）
   *
   * Initializes hidden textarea (needed to bring up keyboard in iOS)
   */
  initHiddenTextarea() {
    const doc =
      (this.canvas && getDocumentFromElement(this.canvas.getElement())) ||
      getFabricDocument();
    const textarea = doc.createElement('textarea');
    Object.entries({
      autocapitalize: 'off',
      autocorrect: 'off',
      autocomplete: 'off',
      spellcheck: 'false',
      'data-fabric': 'textarea',
      wrap: 'off',
      name: 'fabricTextarea',
    }).map(([attribute, value]) => textarea.setAttribute(attribute, value));
    const { top, left, fontSize } = this._calcTextareaPosition();
    // line-height: 1px; was removed from the style to fix this:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=870966
    textarea.style.cssText = `position: absolute; top: ${top}; left: ${left}; z-index: -999; opacity: 0; width: 1px; height: 1px; font-size: 1px; padding-top: ${fontSize};`;

    (this.hiddenTextareaContainer || doc.body).appendChild(textarea);

    Object.entries({
      blur: 'blur',
      keydown: 'onKeyDown',
      keyup: 'onKeyUp',
      input: 'onInput',
      copy: 'copy',
      cut: 'copy',
      paste: 'paste',
      compositionstart: 'onCompositionStart',
      compositionupdate: 'onCompositionUpdate',
      compositionend: 'onCompositionEnd',
    } as Record<string, keyof this>).map(([eventName, handler]) =>
      textarea.addEventListener(
        eventName,
        (this[handler] as EventListener).bind(this),
      ),
    );
    this.hiddenTextarea = textarea;
  }

  /**
   * 重写此方法以自定义文本框失去焦点时的光标行为
   *
   * Override this method to customize cursor behavior on textbox blur
   */
  blur() {
    this.abortCursorAnimation();
  }

  /**
   * 处理 keydown 事件
   * 仅用于箭头和修饰键组合。
   *
   * Handles keydown event
   * only used for arrows and combination of modifier keys.
   * @param {KeyboardEvent} e 事件对象
   */
  onKeyDown(e: KeyboardEvent) {
    if (!this.isEditing) {
      return;
    }
    const keyMap = this.direction === 'rtl' ? this.keysMapRtl : this.keysMap;
    if (e.keyCode in keyMap) {
      (this[keyMap[e.keyCode] as keyof this] as (arg: KeyboardEvent) => void)(
        e,
      );
    } else if (e.keyCode in this.ctrlKeysMapDown && (e.ctrlKey || e.metaKey)) {
      (
        this[this.ctrlKeysMapDown[e.keyCode] as keyof this] as (
          arg: KeyboardEvent,
        ) => void
      )(e);
    } else {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.keyCode >= 33 && e.keyCode <= 40) {
      // if i press an arrow key just update selection
      this.inCompositionMode = false;
      this.clearContextTop();
      this.renderCursorOrSelection();
    } else {
      this.canvas && this.canvas.requestRenderAll();
    }
  }

  /**
   * 处理 keyup 事件
   * 我们处理 KeyUp 是因为 ie11 和 edge 在复制/粘贴方面有困难
   * 如果触发了复制/剪切事件，keyup 将被忽略
   *
   * Handles keyup event
   * We handle KeyUp because ie11 and edge have difficulties copy/pasting
   * if a copy/cut event fired, keyup is dismissed
   * @param {KeyboardEvent} e 事件对象
   */
  onKeyUp(e: KeyboardEvent) {
    if (!this.isEditing || this._copyDone || this.inCompositionMode) {
      this._copyDone = false;
      return;
    }
    if (e.keyCode in this.ctrlKeysMapUp && (e.ctrlKey || e.metaKey)) {
      (
        this[this.ctrlKeysMapUp[e.keyCode] as keyof this] as (
          arg: KeyboardEvent,
        ) => void
      )(e);
    } else {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    this.canvas && this.canvas.requestRenderAll();
  }

  /**
   * 处理 onInput 事件
   *
   * Handles onInput event
   * @param {Event} e 事件对象
   */
  onInput(this: this & { hiddenTextarea: HTMLTextAreaElement }, e: Event) {
    const fromPaste = this.fromPaste;
    const { value, selectionStart, selectionEnd } = this.hiddenTextarea;
    this.fromPaste = false;
    e && e.stopPropagation();
    if (!this.isEditing) {
      return;
    }
    const updateAndFire = () => {
      this.updateFromTextArea();
      this.fire(CHANGED);
      if (this.canvas) {
        this.canvas.fire('text:changed', { target: this as unknown as IText });
        this.canvas.requestRenderAll();
      }
    };
    if (this.hiddenTextarea.value === '') {
      this.styles = {};
      updateAndFire();
      return;
    }
    // decisions about style changes.
    const nextText = this._splitTextIntoLines(value).graphemeText,
      charCount = this._text.length,
      nextCharCount = nextText.length,
      _selectionStart = this.selectionStart,
      _selectionEnd = this.selectionEnd,
      selection = _selectionStart !== _selectionEnd;
    let copiedStyle: TextStyleDeclaration[] | undefined,
      removedText,
      charDiff = nextCharCount - charCount,
      removeFrom,
      removeTo;

    const textareaSelection = this.fromStringToGraphemeSelection(
      selectionStart,
      selectionEnd,
      value,
    );
    const backDelete = _selectionStart > textareaSelection.selectionStart;

    if (selection) {
      removedText = this._text.slice(_selectionStart, _selectionEnd);
      charDiff += _selectionEnd - _selectionStart;
    } else if (nextCharCount < charCount) {
      if (backDelete) {
        removedText = this._text.slice(_selectionEnd + charDiff, _selectionEnd);
      } else {
        removedText = this._text.slice(
          _selectionStart,
          _selectionStart - charDiff,
        );
      }
    }
    const insertedText = nextText.slice(
      textareaSelection.selectionEnd - charDiff,
      textareaSelection.selectionEnd,
    );
    if (removedText && removedText.length) {
      if (insertedText.length) {
        // let's copy some style before deleting.
        // we want to copy the style before the cursor OR the style at the cursor if selection
        // is bigger than 0.
        copiedStyle = this.getSelectionStyles(
          _selectionStart,
          _selectionStart + 1,
          false,
        );
        // now duplicate the style one for each inserted text.
        copiedStyle = insertedText.map(
          () =>
            // this return an array of references, but that is fine since we are
            // copying the style later.
            copiedStyle![0],
        );
      }
      if (selection) {
        removeFrom = _selectionStart;
        removeTo = _selectionEnd;
      } else if (backDelete) {
        // detect differences between forwardDelete and backDelete
        removeFrom = _selectionEnd - removedText.length;
        removeTo = _selectionEnd;
      } else {
        removeFrom = _selectionEnd;
        removeTo = _selectionEnd + removedText.length;
      }
      this.removeStyleFromTo(removeFrom, removeTo);
    }
    if (insertedText.length) {
      const { copyPasteData } = getEnv();
      if (
        fromPaste &&
        insertedText.join('') === copyPasteData.copiedText &&
        !config.disableStyleCopyPaste
      ) {
        copiedStyle = copyPasteData.copiedTextStyle;
      }
      this.insertNewStyleBlock(insertedText, _selectionStart, copiedStyle);
    }
    updateAndFire();
  }

  /**
   * 组合输入开始
   *
   * Composition start
   */
  onCompositionStart() {
    this.inCompositionMode = true;
  }

  /**
   * 组合输入结束
   *
   * Composition end
   */
  onCompositionEnd() {
    this.inCompositionMode = false;
  }

  /**
   * 组合输入更新
   * @param {CompositionEvent} e 组合事件
   */
  onCompositionUpdate({ target }: CompositionEvent) {
    const { selectionStart, selectionEnd } = target as HTMLTextAreaElement;
    this.compositionStart = selectionStart;
    this.compositionEnd = selectionEnd;
    this.updateTextareaPosition();
  }

  /**
   * 复制选中的文本
   *
   * Copies selected text
   */
  copy() {
    if (this.selectionStart === this.selectionEnd) {
      //do not cut-copy if no selection
      return;
    }
    const { copyPasteData } = getEnv();
    copyPasteData.copiedText = this.getSelectedText();
    if (!config.disableStyleCopyPaste) {
      copyPasteData.copiedTextStyle = this.getSelectionStyles(
        this.selectionStart,
        this.selectionEnd,
        true,
      );
    } else {
      copyPasteData.copiedTextStyle = undefined;
    }
    this._copyDone = true;
  }

  /**
   * 粘贴文本
   *
   * Pastes text
   */
  paste() {
    this.fromPaste = true;
  }

  /**
   * 查找同一行光标前的像素宽度
   *
   * Finds the width in pixels before the cursor on the same line
   * @private
   * @param {Number} lineIndex 行索引
   * @param {Number} charIndex 字符索引
   * @return {Number} widthBeforeCursor 光标前的宽度
   */
  _getWidthBeforeCursor(lineIndex: number, charIndex: number): number {
    let widthBeforeCursor = this._getLineLeftOffset(lineIndex),
      bound;

    if (charIndex > 0) {
      bound = this.__charBounds[lineIndex][charIndex - 1];
      widthBeforeCursor += bound.left + bound.width;
    }
    return widthBeforeCursor;
  }

  /**
   * 获取选区的开始偏移量
   *
   * Gets start offset of a selection
   * @param {KeyboardEvent} e 事件对象
   * @param {Boolean} isRight 是否向右
   * @return {Number}
   */
  getDownCursorOffset(e: KeyboardEvent, isRight: boolean): number {
    const selectionProp = this._getSelectionForOffset(e, isRight),
      cursorLocation = this.get2DCursorLocation(selectionProp),
      lineIndex = cursorLocation.lineIndex;
    // if on last line, down cursor goes to end of line
    if (
      lineIndex === this._textLines.length - 1 ||
      e.metaKey ||
      e.keyCode === 34
    ) {
      // move to the end of a text
      return this._text.length - selectionProp;
    }
    const charIndex = cursorLocation.charIndex,
      widthBeforeCursor = this._getWidthBeforeCursor(lineIndex, charIndex),
      indexOnOtherLine = this._getIndexOnLine(lineIndex + 1, widthBeforeCursor),
      textAfterCursor = this._textLines[lineIndex].slice(charIndex);
    return (
      textAfterCursor.length +
      indexOnOtherLine +
      1 +
      this.missingNewlineOffset(lineIndex)
    );
  }

  /**
   * 私有方法
   * 帮助查找偏移量应该从 Start 还是 End 计数
   *
   * private
   * Helps finding if the offset should be counted from Start or End
   * @param {KeyboardEvent} e 事件对象
   * @param {Boolean} isRight 是否向右
   * @return {Number}
   */
  _getSelectionForOffset(e: KeyboardEvent, isRight: boolean): number {
    if (e.shiftKey && this.selectionStart !== this.selectionEnd && isRight) {
      return this.selectionEnd;
    } else {
      return this.selectionStart;
    }
  }

  /**
   * 获取向上移动光标的偏移量
   *
   * @param {KeyboardEvent} e 事件对象
   * @param {Boolean} isRight 是否向右
   * @return {Number}
   */
  getUpCursorOffset(e: KeyboardEvent, isRight: boolean): number {
    const selectionProp = this._getSelectionForOffset(e, isRight),
      cursorLocation = this.get2DCursorLocation(selectionProp),
      lineIndex = cursorLocation.lineIndex;
    if (lineIndex === 0 || e.metaKey || e.keyCode === 33) {
      // if on first line, up cursor goes to start of line
      return -selectionProp;
    }
    const charIndex = cursorLocation.charIndex,
      widthBeforeCursor = this._getWidthBeforeCursor(lineIndex, charIndex),
      indexOnOtherLine = this._getIndexOnLine(lineIndex - 1, widthBeforeCursor),
      textBeforeCursor = this._textLines[lineIndex].slice(0, charIndex),
      missingNewlineOffset = this.missingNewlineOffset(lineIndex - 1);
    // return a negative offset
    return (
      -this._textLines[lineIndex - 1].length +
      indexOnOtherLine -
      textBeforeCursor.length +
      (1 - missingNewlineOffset)
    );
  }

  /**
   * 对于给定的宽度，找到匹配的字符。
   *
   * for a given width it founds the matching character.
   * @private
   */
  _getIndexOnLine(lineIndex: number, width: number) {
    const line = this._textLines[lineIndex],
      lineLeftOffset = this._getLineLeftOffset(lineIndex);
    let widthOfCharsOnLine = lineLeftOffset,
      indexOnLine = 0,
      charWidth,
      foundMatch;

    for (let j = 0, jlen = line.length; j < jlen; j++) {
      charWidth = this.__charBounds[lineIndex][j].width;
      widthOfCharsOnLine += charWidth;
      if (widthOfCharsOnLine > width) {
        foundMatch = true;
        const leftEdge = widthOfCharsOnLine - charWidth,
          rightEdge = widthOfCharsOnLine,
          offsetFromLeftEdge = Math.abs(leftEdge - width),
          offsetFromRightEdge = Math.abs(rightEdge - width);

        indexOnLine = offsetFromRightEdge < offsetFromLeftEdge ? j : j - 1;
        break;
      }
    }

    // reached end
    if (!foundMatch) {
      indexOnLine = line.length - 1;
    }

    return indexOnLine;
  }

  /**
   * 向下移动光标
   *
   * Moves cursor down
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorDown(e: KeyboardEvent) {
    if (
      this.selectionStart >= this._text.length &&
      this.selectionEnd >= this._text.length
    ) {
      return;
    }
    this._moveCursorUpOrDown('Down', e);
  }

  /**
   * 向上移动光标
   *
   * Moves cursor up
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorUp(e: KeyboardEvent) {
    if (this.selectionStart === 0 && this.selectionEnd === 0) {
      return;
    }
    this._moveCursorUpOrDown('Up', e);
  }

  /**
   * 向上或向下移动光标，触发事件
   *
   * Moves cursor up or down, fires the events
   * @param {String} direction 'Up' 或 'Down'
   * @param {KeyboardEvent} e 事件对象
   */
  _moveCursorUpOrDown(direction: 'Up' | 'Down', e: KeyboardEvent) {
    const offset = this[`get${direction}CursorOffset`](
      e,
      this._selectionDirection === RIGHT,
    );
    if (e.shiftKey) {
      this.moveCursorWithShift(offset);
    } else {
      this.moveCursorWithoutShift(offset);
    }
    if (offset !== 0) {
      const max = this.text.length;
      this.selectionStart = capValue(0, this.selectionStart, max);
      this.selectionEnd = capValue(0, this.selectionEnd, max);
      // TODO fix: abort and init should be an alternative depending
      // on selectionStart/End being equal or different
      this.abortCursorAnimation();
      this.initDelayedCursor();
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  }

  /**
   * 带有 shift 键的光标移动
   *
   * Moves cursor with shift
   * @param {Number} offset 偏移量
   */
  moveCursorWithShift(offset: number) {
    const newSelection =
      this._selectionDirection === LEFT
        ? this.selectionStart + offset
        : this.selectionEnd + offset;
    this.setSelectionStartEndWithShift(
      this.selectionStart,
      this.selectionEnd,
      newSelection,
    );
    return offset !== 0;
  }

  /**
   * 不带 shift 键的光标移动
   *
   * Moves cursor up without shift
   * @param {Number} offset 偏移量
   */
  moveCursorWithoutShift(offset: number) {
    if (offset < 0) {
      this.selectionStart += offset;
      this.selectionEnd = this.selectionStart;
    } else {
      this.selectionEnd += offset;
      this.selectionStart = this.selectionEnd;
    }
    return offset !== 0;
  }

  /**
   * 向左移动光标
   *
   * Moves cursor left
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorLeft(e: KeyboardEvent) {
    if (this.selectionStart === 0 && this.selectionEnd === 0) {
      return;
    }
    this._moveCursorLeftOrRight('Left', e);
  }

  /**
   * @private
   * @return {Boolean} 如果发生更改则为 true
   *
   * @todo refactor not to use method name composition
   */
  _move(
    e: KeyboardEvent,
    prop: 'selectionStart' | 'selectionEnd',
    direction: 'Left' | 'Right',
  ): boolean {
    let newValue: number | undefined;
    if (e.altKey) {
      newValue = this[`findWordBoundary${direction}`](this[prop]);
    } else if (e.metaKey || e.keyCode === 35 || e.keyCode === 36) {
      newValue = this[`findLineBoundary${direction}`](this[prop]);
    } else {
      this[prop] += direction === 'Left' ? -1 : 1;
      return true;
    }
    if (typeof newValue !== 'undefined' && this[prop] !== newValue) {
      this[prop] = newValue;
      return true;
    }
    return false;
  }

  /**
   * @private
   */
  _moveLeft(e: KeyboardEvent, prop: 'selectionStart' | 'selectionEnd') {
    return this._move(e, prop, 'Left');
  }

  /**
   * @private
   */
  _moveRight(e: KeyboardEvent, prop: 'selectionStart' | 'selectionEnd') {
    return this._move(e, prop, 'Right');
  }

  /**
   * 向左移动光标而不保留选区
   *
   * Moves cursor left without keeping selection
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorLeftWithoutShift(e: KeyboardEvent) {
    let change = true;
    this._selectionDirection = LEFT;

    // only move cursor when there is no selection,
    // otherwise we discard it, and leave cursor on same place
    if (
      this.selectionEnd === this.selectionStart &&
      this.selectionStart !== 0
    ) {
      change = this._moveLeft(e, 'selectionStart');
    }
    this.selectionEnd = this.selectionStart;
    return change;
  }

  /**
   * 向左移动光标并保留选区
   *
   * Moves cursor left while keeping selection
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorLeftWithShift(e: KeyboardEvent) {
    if (
      this._selectionDirection === RIGHT &&
      this.selectionStart !== this.selectionEnd
    ) {
      return this._moveLeft(e, 'selectionEnd');
    } else if (this.selectionStart !== 0) {
      this._selectionDirection = LEFT;
      return this._moveLeft(e, 'selectionStart');
    }
  }

  /**
   * 向右移动光标
   *
   * Moves cursor right
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorRight(e: KeyboardEvent) {
    if (
      this.selectionStart >= this._text.length &&
      this.selectionEnd >= this._text.length
    ) {
      return;
    }
    this._moveCursorLeftOrRight('Right', e);
  }

  /**
   * 向左或向右移动光标，触发事件
   *
   * Moves cursor right or Left, fires event
   * @param {String} direction 'Left', 'Right'
   * @param {KeyboardEvent} e 事件对象
   */
  _moveCursorLeftOrRight(direction: 'Left' | 'Right', e: KeyboardEvent) {
    const actionName = `moveCursor${direction}${
      e.shiftKey ? 'WithShift' : 'WithoutShift'
    }` as const;
    this._currentCursorOpacity = 1;
    if (this[actionName](e)) {
      // TODO fix: abort and init should be an alternative depending
      // on selectionStart/End being equal or different
      this.abortCursorAnimation();
      this.initDelayedCursor();
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  }

  /**
   * 向右移动光标并保留选区
   *
   * Moves cursor right while keeping selection
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorRightWithShift(e: KeyboardEvent) {
    if (
      this._selectionDirection === LEFT &&
      this.selectionStart !== this.selectionEnd
    ) {
      return this._moveRight(e, 'selectionStart');
    } else if (this.selectionEnd !== this._text.length) {
      this._selectionDirection = RIGHT;
      return this._moveRight(e, 'selectionEnd');
    }
  }

  /**
   * 向右移动光标而不保留选区
   *
   * Moves cursor right without keeping selection
   * @param {KeyboardEvent} e 事件对象
   */
  moveCursorRightWithoutShift(e: KeyboardEvent) {
    let changed = true;
    this._selectionDirection = RIGHT;

    if (this.selectionStart === this.selectionEnd) {
      changed = this._moveRight(e, 'selectionStart');
      this.selectionEnd = this.selectionStart;
    } else {
      this.selectionStart = this.selectionEnd;
    }
    return changed;
  }
}
