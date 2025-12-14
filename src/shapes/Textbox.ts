import type { TClassProperties, TOptions } from '../typedefs';
import { IText } from './IText/IText';
import { classRegistry } from '../ClassRegistry';
import { createTextboxDefaultControls } from '../controls/commonControls';
import { JUSTIFY } from './Text/constants';
import type { TextStyleDeclaration } from './Text/StyledText';
import type { SerializedITextProps, ITextProps } from './IText/IText';
import type { ITextEvents } from './IText/ITextBehavior';
import type { TextLinesInfo } from './Text/Text';
import type { Control } from '../controls/Control';

// @TODO: Many things here are configuration related and shouldn't be on the class nor prototype
// regexes, list of properties that are not suppose to change by instances, magic consts.
// this will be a separated effort
/**
 * 文本框默认值
 */
export const textboxDefaultValues: Partial<TClassProperties<Textbox>> = {
  /**
   * 最小宽度
   */
  minWidth: 20,
  /**
   * 动态最小宽度
   */
  dynamicMinWidth: 2,
  /**
   * 锁定缩放翻转
   */
  lockScalingFlip: true,
  /**
   * 不缓存缩放
   */
  noScaleCache: false,
  /**
   * 单词连接符正则
   */
  _wordJoiners: /[ \t\r]/,
  /**
   * 是否按字素分割
   */
  splitByGrapheme: false,
};

/**
 * 字素数据类型
 */
export type GraphemeData = {
  /**
   * 单词数据
   */
  wordsData: {
    /**
     * 单词字符数组
     */
    word: string[];
    /**
     * 单词宽度
     */
    width: number;
  }[][];
  /**
   * 最大单词宽度
   */
  largestWordWidth: number;
};

/**
 * 样式映射类型
 */
export type StyleMap = Record<string, { line: number; offset: number }>;

// @TODO this is not complete
/**
 * 文本框独有的属性接口
 */
interface UniqueTextboxProps {
  /**
   * 最小宽度
   */
  minWidth: number;
  /**
   * 是否按字素分割
   */
  splitByGrapheme: boolean;
  /**
   * 动态最小宽度
   */
  dynamicMinWidth: number;
  /**
   * 单词连接符正则
   */
  _wordJoiners: RegExp;
}

/**
 * 序列化文本框属性接口
 */
export interface SerializedTextboxProps
  extends SerializedITextProps,
    Pick<UniqueTextboxProps, 'minWidth' | 'splitByGrapheme'> {}

/**
 * 文本框属性接口
 */
export interface TextboxProps extends ITextProps, UniqueTextboxProps {}

/**
 * 文本框类，基于 IText，允许用户调整文本矩形的大小并自动换行。
 * 文本框的 Y 轴缩放被锁定，用户只能更改宽度。
 * 高度根据行的换行自动调整。
 *
 * Textbox class, based on IText, allows the user to resize the text rectangle
 * and wraps lines automatically. Textboxes have their Y scaling locked, the
 * user can only change width. Height is adjusted automatically based on the
 * wrapping of lines.
 */
export class Textbox<
    Props extends TOptions<TextboxProps> = Partial<TextboxProps>,
    SProps extends SerializedTextboxProps = SerializedTextboxProps,
    EventSpec extends ITextEvents = ITextEvents,
  >
  extends IText<Props, SProps, EventSpec>
  implements UniqueTextboxProps
{
  /**
   * 文本框的最小宽度，以像素为单位。
   * @type Number
   *
   * Minimum width of textbox, in pixels.
   * @type Number
   */
  declare minWidth: number;

  /**
   * 文本框的最小计算宽度，以像素为单位。
   * 固定为 2，以便空文本框不会变为 0，并且在没有文本的情况下仍然可以选择。
   * @type Number
   *
   * Minimum calculated width of a textbox, in pixels.
   * fixed to 2 so that an empty textbox cannot go to 0
   * and is still selectable without text.
   * @type Number
   */
  declare dynamicMinWidth: number;

  /**
   * 使用此布尔属性来分割没有空白概念的字符串。
   * 这是帮助处理中文/日文的一种廉价方法
   * @type Boolean
   * @since 2.6.0
   *
   * Use this boolean property in order to split strings that have no white space concept.
   * this is a cheap way to help with chinese/japanese
   * @type Boolean
   * @since 2.6.0
   */
  declare splitByGrapheme: boolean;

  /**
   * 单词连接符正则
   */
  declare _wordJoiners: RegExp;

  /**
   * 样式映射
   */
  declare _styleMap: StyleMap;

  /**
   * 是否正在换行
   */
  declare isWrapping: boolean;

  /**
   * 类型
   */
  static type = 'Textbox';

  /**
   * 文本布局属性
   */
  static textLayoutProperties = [...IText.textLayoutProperties, 'width'];

  /**
   * 自身默认值
   */
  static ownDefaults = textboxDefaultValues;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...Textbox.ownDefaults,
    };
  }

  /**
   * 构造函数
   * @param {String} text 文本字符串
   * @param {Object} [options] 选项对象
   *
   * Constructor
   * @param {String} text Text string
   * @param {Object} [options] Options object
   */
  constructor(text: string, options?: Props) {
    super(text, { ...Textbox.ownDefaults, ...options } as Props);
  }

  /**
   * 创建默认控件对象。
   * 如果您希望在所有对象之间共享一个控件实例，
   * 请使此函数返回一个空对象，并将控件添加到 ownDefaults 对象中
   *
   * Creates the default control object.
   * If you prefer to have on instance of controls shared among all objects
   * make this function return an empty object and add controls to the ownDefaults object
   */
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createTextboxDefaultControls() };
  }

  /**
   * 与超类的此函数版本不同，Textbox 不会更新其宽度。
   * @private
   * @override
   *
   * Unlike superclass's version of this function, Textbox does not update
   * its width.
   * @private
   * @override
   */
  initDimensions() {
    if (!this.initialized) {
      return;
    }
    this.isEditing && this.initDelayedCursor();
    this._clearCache();
    // clear dynamicMinWidth as it will be different after we re-wrap line
    this.dynamicMinWidth = 0;
    // wrap lines
    this._styleMap = this._generateStyleMap(this._splitText());
    // if after wrapping, the width is smaller than dynamicMinWidth, change the width and re-wrap
    if (this.dynamicMinWidth > this.width) {
      this._set('width', this.dynamicMinWidth);
    }
    if (this.textAlign.includes(JUSTIFY)) {
      // once text is measured we need to make space fatter to make justified text.
      this.enlargeSpaces();
    }
    // clear cache and re-calculate height
    this.height = this.calcTextHeight();
  }

  /**
   * 生成一个转换样式对象的对象，使其按可视行（换行符和自动换行）分解。
   * 原始文本样式对象按实际行（仅换行符）分解，这仅对 Text / IText 足够
   * @private
   *
   * Generate an object that translates the style object so that it is
   * broken up by visual lines (new lines and automatic wrapping).
   * The original text styles object is broken up by actual lines (new lines only),
   * which is only sufficient for Text / IText
   * @private
   */
  _generateStyleMap(textInfo: TextLinesInfo): StyleMap {
    let realLineCount = 0,
      realLineCharCount = 0,
      charCount = 0;
    const map: StyleMap = {};

    for (let i = 0; i < textInfo.graphemeLines.length; i++) {
      if (textInfo.graphemeText[charCount] === '\n' && i > 0) {
        realLineCharCount = 0;
        charCount++;
        realLineCount++;
      } else if (
        !this.splitByGrapheme &&
        this._reSpaceAndTab.test(textInfo.graphemeText[charCount]) &&
        i > 0
      ) {
        // this case deals with space's that are removed from end of lines when wrapping
        realLineCharCount++;
        charCount++;
      }

      map[i] = { line: realLineCount, offset: realLineCharCount };

      charCount += textInfo.graphemeLines[i].length;
      realLineCharCount += textInfo.graphemeLines[i].length;
    }

    return map;
  }

  /**
   * 如果对象具有样式属性或在指定行中具有该属性，则返回 true
   * @param {Number} lineIndex
   * @return {Boolean}
   *
   * Returns true if object has a style property or has it on a specified line
   * @param {Number} lineIndex
   * @return {Boolean}
   */
  styleHas(property: keyof TextStyleDeclaration, lineIndex: number): boolean {
    if (this._styleMap && !this.isWrapping) {
      const map = this._styleMap[lineIndex];
      if (map) {
        lineIndex = map.line;
      }
    }
    return super.styleHas(property, lineIndex);
  }

  /**
   * 如果对象没有样式或行中没有样式，则返回 true
   * @param {Number} lineIndex 行索引，lineIndex 是在换行后的行上。
   * @return {Boolean}
   *
   * Returns true if object has no styling or no styling in a line
   * @param {Number} lineIndex , lineIndex is on wrapped lines.
   * @return {Boolean}
   */
  isEmptyStyles(lineIndex: number): boolean {
    if (!this.styles) {
      return true;
    }
    let offset = 0,
      nextLineIndex = lineIndex + 1,
      nextOffset: number,
      shouldLimit = false;
    const map = this._styleMap[lineIndex],
      mapNextLine = this._styleMap[lineIndex + 1];
    if (map) {
      lineIndex = map.line;
      offset = map.offset;
    }
    if (mapNextLine) {
      nextLineIndex = mapNextLine.line;
      shouldLimit = nextLineIndex === lineIndex;
      nextOffset = mapNextLine.offset;
    }
    const obj =
      typeof lineIndex === 'undefined'
        ? this.styles
        : { line: this.styles[lineIndex] };
    for (const p1 in obj) {
      for (const p2 in obj[p1]) {
        const p2Number = parseInt(p2, 10);
        if (p2Number >= offset && (!shouldLimit || p2Number < nextOffset!)) {
          for (const p3 in obj[p1][p2]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * 获取样式声明
   *
   * @protected
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @return {TextStyleDeclaration} 现有样式对象的引用，或者当未定义时返回新的空对象
   *
   * @return {TextStyleDeclaration} a style object reference to the existing one or a new empty object when undefined
   */
  _getStyleDeclaration(
    lineIndex: number,
    charIndex: number,
  ): TextStyleDeclaration {
    if (this._styleMap && !this.isWrapping) {
      const map = this._styleMap[lineIndex];
      if (!map) {
        return {};
      }
      lineIndex = map.line;
      charIndex = map.offset + charIndex;
    }
    return super._getStyleDeclaration(lineIndex, charIndex);
  }

  /**
   * 设置样式声明
   * @param {Number} lineIndex 行索引
   * @param {Number} charIndex 字符索引
   * @param {Object} style 样式对象
   * @private
   *
   */
  protected _setStyleDeclaration(
    lineIndex: number,
    charIndex: number,
    style: object,
  ) {
    const map = this._styleMap[lineIndex];
    super._setStyleDeclaration(map.line, map.offset + charIndex, style);
  }

  /**
   * 删除样式声明
   * @param {Number} lineIndex 行索引
   * @param {Number} charIndex 字符索引
   * @private
   *
   */
  protected _deleteStyleDeclaration(lineIndex: number, charIndex: number) {
    const map = this._styleMap[lineIndex];
    super._deleteStyleDeclaration(map.line, map.offset + charIndex);
  }

  /**
   * 可能已损坏，需要修复
   * 返回与换行后的 lineIndex 行对应的实际样式行
   * 仅用于验证行是否存在。
   * @param {Number} lineIndex
   * @returns {Boolean} 行是否存在
   * @private
   *
   * probably broken need a fix
   * Returns the real style line that correspond to the wrapped lineIndex line
   * Used just to verify if the line does exist or not.
   */
  protected _getLineStyle(lineIndex: number): boolean {
    const map = this._styleMap[lineIndex];
    return !!this.styles[map.line];
  }

  /**
   * 将行样式设置为空对象以便初始化
   * @param {Number} lineIndex
   * @param {Object} style
   * @private
   *
   * Set the line style to an empty object so that is initialized
   */
  protected _setLineStyle(lineIndex: number) {
    const map = this._styleMap[lineIndex];
    super._setLineStyle(map.line);
  }

  /**
   * 使用 Textbox 的 'width' 属性包装文本。
   * 首先，此函数在换行符处分割文本，因此我们保留用户输入的换行符。
   * 然后，它通过调用 _wrapLine() 使用 Textbox 的宽度包装每一行。
   * @param {Array} lines 分割成行的文本字符串数组
   * @param {Number} desiredWidth 您想要包装到的宽度
   * @returns {Array} 行数组
   *
   * Wraps text using the 'width' property of Textbox. First this function
   * splits text on newlines, so we preserve newlines entered by the user.
   * Then it wraps each line using the width of the Textbox by calling
   * _wrapLine().
   * @param {Array} lines The string array of text that is split into lines
   * @param {Number} desiredWidth width you want to wrap to
   * @returns {Array} Array of lines
   */
  _wrapText(lines: string[], desiredWidth: number): string[][] {
    this.isWrapping = true;
    // extract all thewords and the widths to optimally wrap lines.
    const data = this.getGraphemeDataForRender(lines);
    const wrapped: string[][] = [];
    for (let i = 0; i < data.wordsData.length; i++) {
      wrapped.push(...this._wrapLine(i, desiredWidth, data));
    }
    this.isWrapping = false;
    return wrapped;
  }

  /**
   * 对于由硬换行符终止的每一行文本，
   * 测量每个单词的宽度并提取所有单词中最大的单词。
   * 这里返回的单词是最终将被渲染的单词。
   * @param {string[]} lines 我们需要测量的行
   *
   * For each line of text terminated by an hard line stop,
   * measure each word width and extract the largest word from all.
   * The returned words here are the one that at the end will be rendered.
   * @param {string[]} lines the lines we need to measure
   *
   */
  getGraphemeDataForRender(lines: string[]): GraphemeData {
    const splitByGrapheme = this.splitByGrapheme,
      infix = splitByGrapheme ? '' : ' ';

    let largestWordWidth = 0;

    const data = lines.map((line, lineIndex) => {
      let offset = 0;
      const wordsOrGraphemes = splitByGrapheme
        ? this.graphemeSplit(line)
        : this.wordSplit(line);

      if (wordsOrGraphemes.length === 0) {
        return [{ word: [], width: 0 }];
      }

      return wordsOrGraphemes.map((word: string) => {
        // if using splitByGrapheme words are already in graphemes.
        const graphemeArray = splitByGrapheme
          ? [word]
          : this.graphemeSplit(word);
        const width = this._measureWord(graphemeArray, lineIndex, offset);
        largestWordWidth = Math.max(width, largestWordWidth);
        offset += graphemeArray.length + infix.length;
        return { word: graphemeArray, width };
      });
    });

    return {
      wordsData: data,
      largestWordWidth,
    };
  }

  /**
   * 辅助函数，用于测量文本字符串，给定其 lineIndex 和 charIndex 偏移量
   * 当 charBounds 尚不可用时调用它。
   * 如有必要，请重写
   * 与 {@link Textbox#wordSplit} 一起使用
   *
   * @param {CanvasRenderingContext2D} ctx 上下文
   * @param {String} text 文本
   * @param {number} lineIndex 行索引
   * @param {number} charOffset 字符偏移量
   * @returns {number} 宽度
   *
   * Helper function to measure a string of text, given its lineIndex and charIndex offset
   * It gets called when charBounds are not available yet.
   * Override if necessary
   * Use with {@link Textbox#wordSplit}
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {String} text
   * @param {number} lineIndex
   * @param {number} charOffset
   * @returns {number}
   */
  _measureWord(word: string[], lineIndex: number, charOffset = 0): number {
    let width = 0,
      prevGrapheme;
    const skipLeft = true;
    for (let i = 0, len = word.length; i < len; i++) {
      const box = this._getGraphemeBox(
        word[i],
        lineIndex,
        i + charOffset,
        prevGrapheme,
        skipLeft,
      );
      width += box.kernedWidth;
      prevGrapheme = word[i];
    }
    return width;
  }

  /**
   * 重写此方法以自定义单词分割
   * 与 {@link Textbox#_measureWord} 一起使用
   * @param {string} value 要分割的字符串
   * @returns {string[]} 单词数组
   *
   * Override this method to customize word splitting
   * Use with {@link Textbox#_measureWord}
   * @param {string} value
   * @returns {string[]} array of words
   */
  wordSplit(value: string): string[] {
    return value.split(this._wordJoiners);
  }

  /**
   * 使用 Textbox 的宽度作为 desiredWidth 包装一行文本
   * 并利用 GraphemeData 中已知的单词宽度
   * @private
   * @param {Number} lineIndex
   * @param {Number} desiredWidth 您想要将行包装到的宽度
   * @param {GraphemeData} graphemeData 包含所有行单词宽度的对象。
   * @param {Number} reservedSpace 从包装中移除的空间，用于自定义功能
   * @returns {Array} 给定文本被包装到的行数组
   *
   * Wraps a line of text using the width of the Textbox as desiredWidth
   * and leveraging the known width o words from GraphemeData
   * @private
   * @param {Number} lineIndex
   * @param {Number} desiredWidth width you want to wrap the line to
   * @param {GraphemeData} graphemeData an object containing all the lines' words width.
   * @param {Number} reservedSpace space to remove from wrapping for custom functionalities
   * @returns {Array} Array of line(s) into which the given text is wrapped
   * to.
   */
  _wrapLine(
    lineIndex: number,
    desiredWidth: number,
    { largestWordWidth, wordsData }: GraphemeData,
    reservedSpace = 0,
  ): string[][] {
    const additionalSpace = this._getWidthOfCharSpacing(),
      splitByGrapheme = this.splitByGrapheme,
      graphemeLines = [],
      infix = splitByGrapheme ? '' : ' ';

    let lineWidth = 0,
      line: string[] = [],
      // spaces in different languages?
      offset = 0,
      infixWidth = 0,
      lineJustStarted = true;

    desiredWidth -= reservedSpace;

    const maxWidth = Math.max(
      desiredWidth,
      largestWordWidth,
      this.dynamicMinWidth,
    );
    // layout words
    const data = wordsData[lineIndex];
    offset = 0;
    let i;
    for (i = 0; i < data.length; i++) {
      const { word, width: wordWidth } = data[i];
      offset += word.length;

      lineWidth += infixWidth + wordWidth - additionalSpace;
      if (lineWidth > maxWidth && !lineJustStarted) {
        graphemeLines.push(line);
        line = [];
        lineWidth = wordWidth;
        lineJustStarted = true;
      } else {
        lineWidth += additionalSpace;
      }

      if (!lineJustStarted && !splitByGrapheme) {
        line.push(infix);
      }
      line = line.concat(word);

      infixWidth = splitByGrapheme
        ? 0
        : this._measureWord([infix], lineIndex, offset);
      offset++;
      lineJustStarted = false;
    }

    i && graphemeLines.push(line);

    // TODO: this code is probably not necessary anymore.
    // it can be moved out of this function since largestWordWidth is now
    // known in advance
    if (largestWordWidth + reservedSpace > this.dynamicMinWidth) {
      this.dynamicMinWidth = largestWordWidth - additionalSpace + reservedSpace;
    }
    return graphemeLines;
  }

  /**
   * 检测文本行是否以硬换行符结束
   * text 和 itext 没有换行，返回 false
   * @param {Number} lineIndex 行索引
   * @return {Boolean} 是否以硬换行符结束
   *
   * Detect if the text line is ended with an hard break
   * text and itext do not have wrapping, return false
   * @param {Number} lineIndex text to split
   * @return {Boolean}
   */
  isEndOfWrapping(lineIndex: number): boolean {
    if (!this._styleMap[lineIndex + 1]) {
      // is last line, return true;
      return true;
    }
    if (this._styleMap[lineIndex + 1].line !== this._styleMap[lineIndex].line) {
      // this is last line before a line break, return true;
      return true;
    }
    return false;
  }

  /**
   * 检测行是否有换行符，因此我们在移动和计算样式时需要考虑它。
   * 这仅对于包装结束时的 splitByGrapheme 很重要。
   * 如果我们不包装，偏移量始终为 1
   * @param {Number} lineIndex 行索引
   * @param {Boolean} [skipWrapping] 是否跳过包装检查
   * @return {Number} 偏移量
   *
   * Detect if a line has a linebreak and so we need to account for it when moving
   * and counting style.
   * This is important only for splitByGrapheme at the end of wrapping.
   * If we are not wrapping the offset is always 1
   * @return Number
   */
  missingNewlineOffset(lineIndex: number, skipWrapping?: boolean): 0 | 1 {
    if (this.splitByGrapheme && !skipWrapping) {
      return this.isEndOfWrapping(lineIndex) ? 1 : 0;
    }
    return 1;
  }

  /**
   * Gets lines of text to render in the Textbox. This function calculates
   * text wrapping on the fly every time it is called.
   * @param {String} text text to split
   * @returns {Array} Array of lines in the Textbox.
   * @override
   */
  /**
   * 将文本分割成行
   * @param {String} text 要分割的文本
   * @returns {Object} 包含行信息的对象
   */
  _splitTextIntoLines(text: string) {
    const newText = super._splitTextIntoLines(text),
      graphemeLines = this._wrapText(newText.lines, this.width),
      lines = new Array(graphemeLines.length);
    for (let i = 0; i < graphemeLines.length; i++) {
      lines[i] = graphemeLines[i].join('');
    }
    newText.lines = lines;
    newText.graphemeLines = graphemeLines;
    return newText;
  }

  /**
   * 获取最小宽度
   * @returns {Number} 最小宽度
   */
  getMinWidth() {
    return Math.max(this.minWidth, this.dynamicMinWidth);
  }

  /**
   * 移除多余的样式
   * @private
   */
  _removeExtraneousStyles() {
    const linesToKeep = new Map();
    for (const prop in this._styleMap) {
      const propNumber = parseInt(prop, 10);
      if (this._textLines[propNumber]) {
        const lineIndex = this._styleMap[prop].line;
        linesToKeep.set(`${lineIndex}`, true);
      }
    }
    for (const prop in this.styles) {
      if (!linesToKeep.has(prop)) {
        delete this.styles[prop];
      }
    }
  }

  /**
   * 返回实例的对象表示
   * @param {Array} [propertiesToInclude] 您可能希望在输出中额外包含的任何属性
   * @return {Object} 实例的对象表示
   *
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toObject<
    T extends Omit<Props & TClassProperties<this>, keyof SProps>,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SProps {
    return super.toObject<T, K>([
      'minWidth',
      'splitByGrapheme',
      ...propertiesToInclude,
    ] as K[]);
  }
}

classRegistry.setClass(Textbox);
