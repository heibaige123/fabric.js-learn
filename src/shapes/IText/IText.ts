import { Canvas } from '../../canvas/Canvas';
import type { ITextEvents } from './ITextBehavior';
import { ITextClickBehavior } from './ITextClickBehavior';
import {
  ctrlKeysMapDown,
  ctrlKeysMapUp,
  keysMap,
  keysMapRtl,
} from './constants';
import type { TClassProperties, TFiller, TOptions } from '../../typedefs';
import { classRegistry } from '../../ClassRegistry';
import type { SerializedTextProps, TextProps } from '../Text/Text';
import {
  JUSTIFY,
  JUSTIFY_CENTER,
  JUSTIFY_LEFT,
  JUSTIFY_RIGHT,
} from '../Text/constants';
import { CENTER, FILL, LEFT, RIGHT, RTL } from '../../constants';
import type { ObjectToCanvasElementOptions } from '../Object/Object';
import type { FabricObject } from '../Object/FabricObject';
import { createCanvasElementFor } from '../../util/misc/dom';
import { applyCanvasTransform } from '../../util/internals/applyCanvasTransform';

/**
 * 光标边界接口
 */
export type CursorBoundaries = {
  /**
   * 光标左侧位置
   */
  left: number;
  /**
   * 光标顶部位置
   */
  top: number;
  /**
   * 光标左侧偏移量
   */
  leftOffset: number;
  /**
   * 光标顶部偏移量
   */
  topOffset: number;
};

/**
 * 光标渲染数据接口
 */
export type CursorRenderingData = {
  /**
   * 光标颜色
   */
  color: string;
  /**
   * 光标不透明度
   */
  opacity: number;
  /**
   * 光标左侧位置
   */
  left: number;
  /**
   * 光标顶部位置
   */
  top: number;
  /**
   * 光标宽度
   */
  width: number;
  /**
   * 光标高度
   */
  height: number;
};

// Declare IText protected properties to workaround TS
/**
 * 受保护的默认值
 */
const protectedDefaultValues = {
  /**
   * 选区方向
   */
  _selectionDirection: null,
  /**
   * 正则表达式，用于匹配空格字符
   */
  _reSpace: /\s|\r?\n/,
  /**
   * 是否处于输入法组合模式
   */
  inCompositionMode: false,
};

/**
 * IText 默认值
 */
export const iTextDefaultValues: Partial<TClassProperties<IText>> = {
  /**
   * 选区开始索引
   */
  selectionStart: 0,
  /**
   * 选区结束索引
   */
  selectionEnd: 0,
  /**
   * 选区颜色
   */
  selectionColor: 'rgba(17,119,255,0.3)',
  /**
   * 是否正在编辑
   */
  isEditing: false,
  /**
   * 是否可编辑
   */
  editable: true,
  /**
   * 编辑时的边框颜色
   */
  editingBorderColor: 'rgba(102,153,255,0.25)',
  /**
   * 光标宽度
   */
  cursorWidth: 2,
  /**
   * 光标颜色
   */
  cursorColor: '',
  /**
   * 光标闪烁延迟
   */
  cursorDelay: 1000,
  /**
   * 光标闪烁持续时间
   */
  cursorDuration: 600,
  /**
   * 是否缓存
   */
  caching: true,
  /**
   * 隐藏的 textarea 容器
   */
  hiddenTextareaContainer: null,
  /**
   * 按键映射
   */
  keysMap,
  /**
   * RTL 按键映射
   */
  keysMapRtl,
  /**
   * 按下 Ctrl 键时的映射
   */
  ctrlKeysMapDown,
  /**
   * 松开 Ctrl 键时的映射
   */
  ctrlKeysMapUp,
  ...protectedDefaultValues,
};

// @TODO this is not complete
/**
 * IText 独有的属性接口
 */
interface UniqueITextProps {
  /**
   * 文本选区开始的索引（如果没有选区，则为光标位置）
   */
  selectionStart: number;
  /**
   * 文本选区结束的索引
   */
  selectionEnd: number;
}

/**
 * 序列化的 IText 属性接口
 */
export interface SerializedITextProps
  extends SerializedTextProps,
    UniqueITextProps {}

/**
 * IText 属性接口
 */
export interface ITextProps extends TextProps, UniqueITextProps {}

/**
 * @fires changed
 * @fires selection:changed
 * @fires editing:entered
 * @fires editing:exited
 * @fires dragstart
 * @fires drag drag event firing on the drag source
 * @fires dragend
 * @fires copy
 * @fires cut
 * @fires paste
 *
 * #### 支持的组合键
 * ```
 *   移动光标:                       left, right, up, down
 *   选择字符:                       shift + left, shift + right
 *   垂直选择文本:                   shift + up, shift + down
 *   按单词移动光标:                 alt + left, alt + right
 *   选择单词:                       shift + alt + left, shift + alt + right
 *   移动光标到行首/行尾:            cmd + left, cmd + right 或 home, end
 *   选择直到行首/行尾:              cmd + shift + left, cmd + shift + right 或 shift + home, shift + end
 *   跳转到文本开头/结尾:            cmd + up, cmd + down
 *   选择直到文本开头/结尾:          cmd + shift + up, cmd + shift + down 或 shift + pgUp, shift + pgDown
 *   删除字符:                       backspace
 *   删除单词:                       alt + backspace
 *   删除行:                         cmd + backspace
 *   向后删除:                       delete
 *   复制文本:                       ctrl/cmd + c
 *   粘贴文本:                       ctrl/cmd + v
 *   剪切文本:                       ctrl/cmd + x
 *   全选文本:                       ctrl/cmd + a
 *   退出编辑                        tab 或 esc
 * ```
 *
 * #### 支持的鼠标/触摸组合
 * ```
 *   定位光标:                       click/touch
 *   创建选区:                       click/touch & drag
 *   创建选区:                       click & shift + click
 *   选择单词:                       double click
 *   选择行:                         triple click
 * ```
 *
 * #### Supported key combinations
 * ```
 *   Move cursor:                    left, right, up, down
 *   Select character:               shift + left, shift + right
 *   Select text vertically:         shift + up, shift + down
 *   Move cursor by word:            alt + left, alt + right
 *   Select words:                   shift + alt + left, shift + alt + right
 *   Move cursor to line start/end:  cmd + left, cmd + right or home, end
 *   Select till start/end of line:  cmd + shift + left, cmd + shift + right or shift + home, shift + end
 *   Jump to start/end of text:      cmd + up, cmd + down
 *   Select till start/end of text:  cmd + shift + up, cmd + shift + down or shift + pgUp, shift + pgDown
 *   Delete character:               backspace
 *   Delete word:                    alt + backspace
 *   Delete line:                    cmd + backspace
 *   Forward delete:                 delete
 *   Copy text:                      ctrl/cmd + c
 *   Paste text:                     ctrl/cmd + v
 *   Cut text:                       ctrl/cmd + x
 *   Select entire text:             ctrl/cmd + a
 *   Quit editing                    tab or esc
 * ```
 *
 * #### Supported mouse/touch combination
 * ```
 *   Position cursor:                click/touch
 *   Create selection:               click/touch & drag
 *   Create selection:               click & shift + click
 *   Select word:                    double click
 *   Select line:                    triple click
 * ```
 */
export class IText<
    Props extends TOptions<ITextProps> = Partial<ITextProps>,
    SProps extends SerializedITextProps = SerializedITextProps,
    EventSpec extends ITextEvents = ITextEvents,
  >
  extends ITextClickBehavior<Props, SProps, EventSpec>
  implements UniqueITextProps
{
  /**
   * 文本选区开始的索引（如果没有选区，则为光标位置）
   * Index where text selection starts (or where cursor is when there is no selection)
   * @type Number
   */
  declare selectionStart: number;

  /**
   * 文本选区结束的索引
   * Index where text selection ends
   * @type Number
   */
  declare selectionEnd: number;

  /**
   * 组合输入开始索引
   */
  declare compositionStart: number;

  /**
   * 组合输入结束索引
   */
  declare compositionEnd: number;

  /**
   * 文本选区的颜色
   * Color of text selection
   * @type String
   */
  declare selectionColor: string;

  /**
   * 指示文本是否处于编辑模式
   * Indicates whether text is in editing mode
   * @type Boolean
   */
  declare isEditing: boolean;

  /**
   * 指示文本是否可编辑
   * Indicates whether a text can be edited
   * @type Boolean
   */
  declare editable: boolean;

  /**
   * 文本对象处于编辑模式时的边框颜色
   * Border color of text object while it's in editing mode
   * @type String
   */
  declare editingBorderColor: string;

  /**
   * 光标宽度（像素）
   * Width of cursor (in px)
   * @type Number
   */
  declare cursorWidth: number;

  /**
   * 编辑模式下的文本光标颜色。
   * 如果未设置（默认），将使用当前位置的文本颜色。
   * 如果设置为 fabric 可以理解的颜色值，它将代替当前位置的文本颜色使用。
   *
   * Color of text cursor color in editing mode.
   * if not set (default) will take color from the text.
   * if set to a color value that fabric can understand, it will
   * be used instead of the color of the text at the current position.
   * @type String
   */
  declare cursorColor: string;

  /**
   * 光标闪烁之间的延迟（毫秒）
   * Delay between cursor blink (in ms)
   * @type Number
   */
  declare cursorDelay: number;

  /**
   * 光标淡入的持续时间（毫秒）
   * Duration of cursor fade in (in ms)
   * @type Number
   */
  declare cursorDuration: number;

  /**
   * 组合输入时的文本颜色
   */
  declare compositionColor: string;

  /**
   * 指示是否可以缓存内部文本字符宽度
   * Indicates whether internal text char widths can be cached
   * @type Boolean
   */
  declare caching: boolean;

  /**
   * IText 自身的默认值
   */
  static ownDefaults = iTextDefaultValues;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return { ...super.getDefaults(), ...IText.ownDefaults };
  }

  /**
   * 对象类型
   */
  static type = 'IText';

  /**
   * 获取对象类型
   * @returns 对象类型字符串
   */
  get type() {
    const type = super.type;
    // backward compatibility
    return type === 'itext' ? 'i-text' : type;
  }

  /**
   * 构造函数
   * Constructor
   * @param {String} text 文本字符串
   * @param {Object} [options] 选项对象
   */
  constructor(text: string, options?: Props) {
    super(text, { ...IText.ownDefaults, ...options } as Props);
    this.initBehavior();
  }

  /**
   * 编辑时处理方式不同
   * While editing handle differently
   * @private
   * @param {string} key 键
   * @param {*} value 值
   */
  _set(key: string, value: any) {
    if (this.isEditing && this._savedProps && key in this._savedProps) {
      // @ts-expect-error irritating TS
      this._savedProps[key] = value;
      return this;
    }
    if (key === 'canvas') {
      this.canvas instanceof Canvas &&
        this.canvas.textEditingManager.remove(this);
      value instanceof Canvas && value.textEditingManager.add(this);
    }
    return super._set(key, value);
  }

  /**
   * 设置选区开始（选区的左边界）
   * Sets selection start (left boundary of a selection)
   * @param {Number} index 设置选区开始的索引
   */
  setSelectionStart(index: number) {
    index = Math.max(index, 0);
    this._updateAndFire('selectionStart', index);
  }

  /**
   * 设置选区结束（选区的右边界）
   * Sets selection end (right boundary of a selection)
   * @param {Number} index 设置选区结束的索引
   */
  setSelectionEnd(index: number) {
    index = Math.min(index, this.text.length);
    this._updateAndFire('selectionEnd', index);
  }

  /**
   * 更新属性并触发事件
   * @private
   * @param {String} property 属性名称 ('selectionStart' or 'selectionEnd')
   * @param {Number} index 属性的新位置
   *
   * @param {String} property 'selectionStart' or 'selectionEnd'
   * @param {Number} index new position of property
   */
  protected _updateAndFire(
    property: 'selectionStart' | 'selectionEnd',
    index: number,
  ) {
    if (this[property] !== index) {
      this._fireSelectionChanged();
      this[property] = index;
    }
    this._updateTextarea();
  }

  /**
   * 触发选区更改事件
   * Fires the even of selection changed
   * @private
   */
  _fireSelectionChanged() {
    this.fire('selection:changed');
    this.canvas && this.canvas.fire('text:selection:changed', { target: this });
  }

  /**
   * 初始化文本尺寸。在给定上下文中渲染所有文本
   * 或在离屏画布上使用 measureText 获取文本宽度。
   * 使用适当的值更新 this.width 和 this.height。
   * 不返回尺寸。
   *
   * Initialize text dimensions. Render all text on given context
   * or on a offscreen canvas to get the text width with measureText.
   * Updates this.width and this.height with the proper values.
   * Does not return dimensions.
   * @private
   */
  initDimensions() {
    this.isEditing && this.initDelayedCursor();
    super.initDimensions();
  }

  /**
   * 获取当前选区/光标（在开始位置）的样式
   * 如果未提供 startIndex 或 endIndex，将使用 selectionStart 或 selectionEnd。
   *
   * Gets style of a current selection/cursor (at the start position)
   * if startIndex or endIndex are not provided, selectionStart or selectionEnd will be used.
   * @param {Number} startIndex 获取样式的起始索引
   * @param {Number} endIndex 获取样式的结束索引，如果未指定则为 selectionEnd 或 startIndex + 1
   * @param {Boolean} [complete] 是否获取完整样式
   * @return {Array} 样式数组，包含一个、零个或多个样式对象
   */
  getSelectionStyles(
    startIndex: number = this.selectionStart || 0,
    endIndex: number = this.selectionEnd,
    complete?: boolean,
  ) {
    return super.getSelectionStyles(startIndex, endIndex, complete);
  }

  /**
   * 设置当前选区的样式，如果不存在选区，则不设置任何内容。
   *
   * Sets style of a current selection, if no selection exist, do not set anything.
   * @param {Object} [styles] 样式对象
   * @param {Number} [startIndex] 获取样式的起始索引
   * @param {Number} [endIndex] 获取样式的结束索引，如果未指定则为 selectionEnd 或 startIndex + 1
   */
  setSelectionStyles(
    styles: object,
    startIndex: number = this.selectionStart || 0,
    endIndex: number = this.selectionEnd,
  ) {
    return super.setSelectionStyles(styles, startIndex, endIndex);
  }

  /**
   * 返回光标（或选区开始）的 2d 表示（lineIndex 和 charIndex）
   *
   * Returns 2d representation (lineIndex and charIndex) of cursor (or selection start)
   * @param {Number} [selectionStart] 可选索引。如果未给出，则使用当前 selectionStart。
   * @param {Boolean} [skipWrapping] 考虑未换行行的位置。用于管理样式。
   */
  get2DCursorLocation(
    selectionStart = this.selectionStart,
    skipWrapping?: boolean,
  ) {
    return super.get2DCursorLocation(selectionStart, skipWrapping);
  }

  /**
   * 渲染
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   */
  render(ctx: CanvasRenderingContext2D) {
    super.render(ctx);
    // clear the cursorOffsetCache, so we ensure to calculate once per renderCursor
    // the correct position but not at every cursor animation.
    this.cursorOffsetCache = {};
    this.renderCursorOrSelection();
  }

  /**
   * 转换为 Canvas 元素
   * @override block cursor/selection logic while rendering the exported canvas
   * @todo this workaround should be replaced with a more robust solution
   * @param {ObjectToCanvasElementOptions} [options] 选项
   * @returns {HTMLCanvasElement} Canvas 元素
   */
  toCanvasElement(options?: ObjectToCanvasElementOptions): HTMLCanvasElement {
    const isEditing = this.isEditing;
    this.isEditing = false;
    const canvas = super.toCanvasElement(options);
    this.isEditing = isEditing;
    return canvas;
  }

  /**
   * 渲染光标或选区（取决于存在什么）
   * 它在 contextTop 上进行。如果 contextTop 不可用，则不执行任何操作。
   *
   * Renders cursor or selection (depending on what exists)
   * it does on the contextTop. If contextTop is not available, do nothing.
   */
  renderCursorOrSelection() {
    if (!this.isEditing || !this.canvas) {
      return;
    }
    const ctx = this.clearContextTop(true);
    if (!ctx) {
      return;
    }
    const boundaries = this._getCursorBoundaries();

    const ancestors = this.findAncestorsWithClipPath();
    const hasAncestorsWithClipping = ancestors.length > 0;
    let drawingCtx: CanvasRenderingContext2D = ctx;
    let drawingCanvas: HTMLCanvasElement | undefined = undefined;
    if (hasAncestorsWithClipping) {
      // we have some clipPath, we need to draw the selection on an intermediate layer.
      drawingCanvas = createCanvasElementFor(ctx.canvas);
      drawingCtx = drawingCanvas.getContext('2d')!;
      applyCanvasTransform(drawingCtx, this.canvas);
      const m = this.calcTransformMatrix();
      drawingCtx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }

    if (this.selectionStart === this.selectionEnd && !this.inCompositionMode) {
      this.renderCursor(drawingCtx, boundaries);
    } else {
      this.renderSelection(drawingCtx, boundaries);
    }

    if (hasAncestorsWithClipping) {
      // we need a neutral context.
      // this won't work for nested clippaths in which a clippath
      // has its own clippath
      for (const ancestor of ancestors) {
        const clipPath = ancestor.clipPath!;
        const clippingCanvas = createCanvasElementFor(ctx.canvas);
        const clippingCtx = clippingCanvas.getContext('2d')!;
        applyCanvasTransform(clippingCtx, this.canvas);
        // position the ctx in the center of the outer ancestor
        if (!clipPath.absolutePositioned) {
          const m = ancestor.calcTransformMatrix();
          clippingCtx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        }
        clipPath.transform(clippingCtx);
        // we assign an empty drawing context, we don't plan to have this working for nested clippaths for now
        clipPath.drawObject(clippingCtx, true, {});
        this.drawClipPathOnCache(drawingCtx, clipPath, clippingCanvas);
      }
    }

    if (hasAncestorsWithClipping) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(drawingCanvas!, 0, 0);
    }

    this.canvas.contextTopDirty = true;
    ctx.restore();
  }

  /**
   * 查找并返回应用于当前 FabricObject 实例的父组的剪切路径数组。
   * 向上遍历对象的层次结构（从当前对象到画布的根），
   * 检查每个父对象是否存在非绝对定位的 `clipPath`。
   *
   * Finds and returns an array of clip paths that are applied to the parent
   * group(s) of the current FabricObject instance. The object's hierarchy is
   * traversed upwards (from the current object towards the root of the canvas),
   * checking each parent object for the presence of a `clipPath` that is not
   * absolutely positioned.
   * @returns {FabricObject[]} 剪切路径数组
   */
  findAncestorsWithClipPath(): FabricObject[] {
    const clipPathAncestors: FabricObject[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let obj: FabricObject | undefined = this;
    while (obj) {
      if (obj.clipPath) {
        clipPathAncestors.push(obj);
      }
      obj = obj.parent;
    }

    return clipPathAncestors;
  }

  /**
   * 返回光标边界（left, top, leftOffset, topOffset）
   * left/top 是整个文本框的 left/top
   * leftOffset/topOffset 是相对于文本框 left/top 点的偏移量
   *
   * Returns cursor boundaries (left, top, leftOffset, topOffset)
   * left/top are left/top of entire text box
   * leftOffset/topOffset are offset from that left/top point of a text box
   * @private
   * @param {number} [index] 起始索引
   * @param {boolean} [skipCaching] 是否跳过缓存
   */
  _getCursorBoundaries(
    index: number = this.selectionStart,
    skipCaching?: boolean,
  ): CursorBoundaries {
    const left = this._getLeftOffset(),
      top = this._getTopOffset(),
      offsets = this._getCursorBoundariesOffsets(index, skipCaching);
    return {
      left: left,
      top: top,
      leftOffset: offsets.left,
      topOffset: offsets.top,
    };
  }

  /**
   * 缓存并返回相对于实例中心点的光标 left/top 偏移量
   *
   * Caches and returns cursor left/top offset relative to instance's center point
   * @private
   * @param {number} index 起始索引
   * @param {boolean} [skipCaching] 是否跳过缓存
   */
  _getCursorBoundariesOffsets(
    index: number,
    skipCaching?: boolean,
  ): { left: number; top: number } {
    if (skipCaching) {
      return this.__getCursorBoundariesOffsets(index);
    }
    if (this.cursorOffsetCache && 'top' in this.cursorOffsetCache) {
      return this.cursorOffsetCache as { left: number; top: number };
    }
    return (this.cursorOffsetCache = this.__getCursorBoundariesOffsets(index));
  }

  /**
   * 计算相对于实例中心点的光标 left/top 偏移量
   *
   * Calculates cursor left/top offset relative to instance's center point
   * @private
   * @param {number} index 起始索引
   */
  __getCursorBoundariesOffsets(index: number) {
    let topOffset = 0,
      leftOffset = 0;
    const { charIndex, lineIndex } = this.get2DCursorLocation(index);
    const { textAlign, direction } = this;
    for (let i = 0; i < lineIndex; i++) {
      topOffset += this.getHeightOfLine(i);
    }
    const lineLeftOffset = this._getLineLeftOffset(lineIndex);
    const bound = this.__charBounds[lineIndex][charIndex];
    bound && (leftOffset = bound.left);
    if (
      this.charSpacing !== 0 &&
      charIndex === this._textLines[lineIndex].length
    ) {
      leftOffset -= this._getWidthOfCharSpacing();
    }
    let left = lineLeftOffset + (leftOffset > 0 ? leftOffset : 0);

    if (direction === RTL) {
      if (
        textAlign === RIGHT ||
        textAlign === JUSTIFY ||
        textAlign === JUSTIFY_RIGHT
      ) {
        left *= -1;
      } else if (textAlign === LEFT || textAlign === JUSTIFY_LEFT) {
        left = lineLeftOffset - (leftOffset > 0 ? leftOffset : 0);
      } else if (textAlign === CENTER || textAlign === JUSTIFY_CENTER) {
        left = lineLeftOffset - (leftOffset > 0 ? leftOffset : 0);
      }
    }
    return {
      top: topOffset,
      left,
    };
  }

  /**
   * 在 context Top 上渲染光标，在动画周期之外，按需渲染
   * 用于拖放效果。
   * 如果 contextTop 不可用，则不执行任何操作。
   *
   * Renders cursor on context Top, outside the animation cycle, on request
   * Used for the drag/drop effect.
   * If contextTop is not available, do nothing.
   * @param {number} selectionStart 选区开始索引
   */
  renderCursorAt(selectionStart: number) {
    this._renderCursor(
      this.canvas!.contextTop,
      this._getCursorBoundaries(selectionStart, true),
      selectionStart,
    );
  }

  /**
   * 渲染光标
   * Renders cursor
   * @param {Object} boundaries 边界对象
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   */
  renderCursor(ctx: CanvasRenderingContext2D, boundaries: CursorBoundaries) {
    this._renderCursor(ctx, boundaries, this.selectionStart);
  }

  /**
   * 返回给定选区开始位置渲染光标所需的数据
   * left, top 是相对于对象的，而 width 和 height 是预缩放的
   * 以便在画布缩放和对象缩放时看起来一致，
   * 所以它们取决于画布和对象缩放
   *
   * Return the data needed to render the cursor for given selection start
   * The left,top are relative to the object, while width and height are prescaled
   * to look think with canvas zoom and object scaling,
   * so they depend on canvas and object scaling
   *
   * Return the data needed to render the cursor for given selection start
   * The left,top are relative to the object, while width and height are prescaled
   * to look think with canvas zoom and object scaling,
   * so they depend on canvas and object scaling
   * @param {number} [selectionStart] 选区开始索引
   * @param {CursorBoundaries} [boundaries] 光标边界
   * @returns {CursorRenderingData} 光标渲染数据
   */
  getCursorRenderingData(
    selectionStart: number = this.selectionStart,
    boundaries: CursorBoundaries = this._getCursorBoundaries(selectionStart),
  ): CursorRenderingData {
    const cursorLocation = this.get2DCursorLocation(selectionStart),
      lineIndex = cursorLocation.lineIndex,
      charIndex =
        cursorLocation.charIndex > 0 ? cursorLocation.charIndex - 1 : 0,
      charHeight = this.getValueOfPropertyAt(lineIndex, charIndex, 'fontSize'),
      multiplier = this.getObjectScaling().x * this.canvas!.getZoom(),
      cursorWidth = this.cursorWidth / multiplier,
      dy = this.getValueOfPropertyAt(lineIndex, charIndex, 'deltaY'),
      topOffset =
        boundaries.topOffset +
        ((1 - this._fontSizeFraction) * this.getHeightOfLine(lineIndex)) /
          this.lineHeight -
        charHeight * (1 - this._fontSizeFraction);

    return {
      color:
        this.cursorColor ||
        (this.getValueOfPropertyAt(lineIndex, charIndex, 'fill') as string),
      opacity: this._currentCursorOpacity,
      left: boundaries.left + boundaries.leftOffset - cursorWidth / 2,
      top: topOffset + boundaries.top + dy,
      width: cursorWidth,
      height: charHeight,
    };
  }

  /**
   * 在给定的 selectionStart 处渲染光标。
   * Render the cursor at the given selectionStart.
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {CursorBoundaries} boundaries 光标边界
   * @param {number} selectionStart 选区开始索引
   */
  _renderCursor(
    ctx: CanvasRenderingContext2D,
    boundaries: CursorBoundaries,
    selectionStart: number,
  ) {
    const { color, opacity, left, top, width, height } =
      this.getCursorRenderingData(selectionStart, boundaries);
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.fillRect(left, top, width, height);
  }

  /**
   * 渲染文本选区
   * Renders text selection
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {Object} boundaries 边界对象，包含 left/top/leftOffset/topOffset
   */
  renderSelection(ctx: CanvasRenderingContext2D, boundaries: CursorBoundaries) {
    const selection = {
      selectionStart: this.inCompositionMode
        ? this.hiddenTextarea!.selectionStart
        : this.selectionStart,
      selectionEnd: this.inCompositionMode
        ? this.hiddenTextarea!.selectionEnd
        : this.selectionEnd,
    };
    this._renderSelection(ctx, selection, boundaries);
  }

  /**
   * 渲染拖拽开始文本选区
   * Renders drag start text selection
   */
  renderDragSourceEffect() {
    const dragStartSelection =
      this.draggableTextDelegate.getDragStartSelection()!;
    this._renderSelection(
      this.canvas!.contextTop,
      dragStartSelection,
      this._getCursorBoundaries(dragStartSelection.selectionStart, true),
    );
  }

  /**
   * 渲染拖放目标效果
   * @param {DragEvent} e 拖拽事件
   */
  renderDropTargetEffect(e: DragEvent) {
    const dragSelection = this.getSelectionStartFromPointer(e);
    this.renderCursorAt(dragSelection);
  }

  /**
   * 渲染文本选区
   * Renders text selection
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {{ selectionStart: number, selectionEnd: number }} selection 选区对象
   * @param {Object} boundaries 边界对象，包含 left/top/leftOffset/topOffset
   */
  _renderSelection(
    ctx: CanvasRenderingContext2D,
    selection: { selectionStart: number; selectionEnd: number },
    boundaries: CursorBoundaries,
  ) {
    const { textAlign, direction } = this;
    const selectionStart = selection.selectionStart,
      selectionEnd = selection.selectionEnd,
      isJustify = textAlign.includes(JUSTIFY),
      start = this.get2DCursorLocation(selectionStart),
      end = this.get2DCursorLocation(selectionEnd),
      startLine = start.lineIndex,
      endLine = end.lineIndex,
      startChar = start.charIndex < 0 ? 0 : start.charIndex,
      endChar = end.charIndex < 0 ? 0 : end.charIndex;

    for (let i = startLine; i <= endLine; i++) {
      const lineOffset = this._getLineLeftOffset(i) || 0;
      let lineHeight = this.getHeightOfLine(i),
        realLineHeight = 0,
        boxStart = 0,
        boxEnd = 0;

      if (i === startLine) {
        boxStart = this.__charBounds[startLine][startChar].left;
      }
      if (i >= startLine && i < endLine) {
        boxEnd =
          isJustify && !this.isEndOfWrapping(i)
            ? this.width
            : this.getLineWidth(i) || 5; // WTF is this 5?
      } else if (i === endLine) {
        if (endChar === 0) {
          boxEnd = this.__charBounds[endLine][endChar].left;
        } else {
          const charSpacing = this._getWidthOfCharSpacing();
          boxEnd =
            this.__charBounds[endLine][endChar - 1].left +
            this.__charBounds[endLine][endChar - 1].width -
            charSpacing;
        }
      }
      realLineHeight = lineHeight;
      if (this.lineHeight < 1 || (i === endLine && this.lineHeight > 1)) {
        lineHeight /= this.lineHeight;
      }
      let drawStart = boundaries.left + lineOffset + boxStart,
        drawHeight = lineHeight,
        extraTop = 0;
      const drawWidth = boxEnd - boxStart;
      if (this.inCompositionMode) {
        ctx.fillStyle = this.compositionColor || 'black';
        drawHeight = 1;
        extraTop = lineHeight;
      } else {
        ctx.fillStyle = this.selectionColor;
      }
      if (direction === RTL) {
        if (
          textAlign === RIGHT ||
          textAlign === JUSTIFY ||
          textAlign === JUSTIFY_RIGHT
        ) {
          drawStart = this.width - drawStart - drawWidth;
        } else if (textAlign === LEFT || textAlign === JUSTIFY_LEFT) {
          drawStart = boundaries.left + lineOffset - boxEnd;
        } else if (textAlign === CENTER || textAlign === JUSTIFY_CENTER) {
          drawStart = boundaries.left + lineOffset - boxEnd;
        }
      }
      ctx.fillRect(
        drawStart,
        boundaries.top + boundaries.topOffset + extraTop,
        drawWidth,
        drawHeight,
      );
      boundaries.topOffset += realLineHeight;
    }
  }

  /**
   * 高级函数，用于了解光标的高度。
   * currentChar 是光标前面的字符
   * 返回当前光标处字符的 fontSize
   * 库未使用，供最终用户使用
   *
   * High level function to know the height of the cursor.
   * the currentChar is the one that precedes the cursor
   * Returns fontSize of char at the current cursor
   * Unused from the library, is for the end user
   * @return {Number} 字符字体大小
   */
  getCurrentCharFontSize(): number {
    const cp = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(cp.l, cp.c, 'fontSize');
  }

  /**
   * 高级函数，用于了解光标的颜色。
   * currentChar 是光标前面的字符
   * 返回当前光标处字符的颜色（填充）
   * 如果文本对象具有用于填充的图案或渐变，它将返回该图案或渐变。
   * 库未使用，供最终用户使用
   *
   * High level function to know the color of the cursor.
   * the currentChar is the one that precedes the cursor
   * Returns color (fill) of char at the current cursor
   * if the text object has a pattern or gradient for filler, it will return that.
   * Unused by the library, is for the end user
   * @return {String | TFiller} 字符颜色（填充）
   */
  getCurrentCharColor(): string | TFiller | null {
    const cp = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(cp.l, cp.c, FILL);
  }

  /**
   * 返回 getCurrent.. 函数的光标位置
   * Returns the cursor position for the getCurrent.. functions
   * @private
   * @returns {{ l: number, c: number }} 光标位置对象（行索引和字符索引）
   */
  _getCurrentCharIndex() {
    const cursorPosition = this.get2DCursorLocation(this.selectionStart, true),
      charIndex =
        cursorPosition.charIndex > 0 ? cursorPosition.charIndex - 1 : 0;
    return { l: cursorPosition.lineIndex, c: charIndex };
  }

  /**
   * 销毁
   */
  dispose() {
    this.exitEditingImpl();
    this.draggableTextDelegate.dispose();
    super.dispose();
  }
}

classRegistry.setClass(IText);
// legacy
classRegistry.setClass(IText, 'i-text');
