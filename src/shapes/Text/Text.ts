import { cache } from '../../cache';
import type { NORMAL } from '../../constants';
import { DEFAULT_SVG_FONT_SIZE, FILL, LTR, RTL, STROKE } from '../../constants';
import type { ObjectEvents } from '../../EventTypeDefs';
import type {
  CompleteTextStyleDeclaration,
  TextStyle,
  TextStyleDeclaration,
} from './StyledText';
import { StyledText } from './StyledText';
import { SHARED_ATTRIBUTES } from '../../parser/attributes';
import { parseAttributes } from '../../parser/parseAttributes';
import type {
  Abortable,
  TCacheCanvasDimensions,
  TClassProperties,
  TFiller,
  TOptions,
} from '../../typedefs';
import { classRegistry } from '../../ClassRegistry';
import { graphemeSplit } from '../../util/lang_string';
import { createCanvasElementFor } from '../../util/misc/dom';
import type { TextStyleArray } from '../../util/misc/textStyles';
import {
  hasStyleChanged,
  stylesFromArray,
  stylesToArray,
} from '../../util/misc/textStyles';
import { getPathSegmentsInfo, getPointOnPath } from '../../util/path';
import { cacheProperties } from '../Object/FabricObject';
import type { Path } from '../Path';
import { TextSVGExportMixin } from './TextSVGExportMixin';
import { applyMixins } from '../../util/applyMixins';
import type { FabricObjectProps, SerializedObjectProps } from '../Object/types';
import type { StylePropertiesType } from './constants';
import {
  additionalProps,
  textDefaultValues,
  textLayoutProperties,
  JUSTIFY,
  JUSTIFY_CENTER,
  JUSTIFY_LEFT,
  JUSTIFY_RIGHT,
  TEXT_DECORATION_THICKNESS,
} from './constants';
import { CENTER, LEFT, RIGHT, TOP, BOTTOM } from '../../constants';
import { isFiller } from '../../util/typeAssertions';
import type { Gradient } from '../../gradient/Gradient';
import type { Pattern } from '../../Pattern';
import type { CSSRules } from '../../parser/typedefs';
import { normalizeWs } from '../../util/internals/normalizeWhiteSpace';

/**
 * 共享的画布上下文，用于测量文本宽度和高度。
 * 该上下文创建一次并重用，以避免为每个测量操作创建新画布元素的开销。
 */
let measuringContext: CanvasRenderingContext2D | null;

/**
 * 返回用于测量文本字符串的上下文。
 * 如果已创建，则将其存储以供重用
 *
 * Return a context for measurement of text string.
 * if created it gets stored for reuse
 */
function getMeasuringContext() {
  if (!measuringContext) {
    const canvas = createCanvasElementFor({
      width: 0,
      height: 0,
    });
    measuringContext = canvas.getContext('2d');
  }
  return measuringContext;
}

/**
 * 路径侧边类型
 */
export type TPathSide = 'left' | 'right';

/**
 * 路径对齐类型
 */
export type TPathAlign = 'baseline' | 'center' | 'ascender' | 'descender';

/**
 * 文本行信息接口
 */
export type TextLinesInfo = {
  lines: string[];
  graphemeLines: string[][];
  graphemeText: string[];
  _unwrappedLines: string[][];
};

/**
 * 文本对齐类型
 */
export type TextAlign =
  | typeof LEFT
  | typeof CENTER
  | typeof RIGHT
  | typeof JUSTIFY
  | typeof JUSTIFY_LEFT
  | typeof JUSTIFY_CENTER
  | typeof JUSTIFY_RIGHT;

/**
 * 字体样式类型
 */
export type FontStyle = '' | typeof NORMAL | 'italic' | 'oblique';

/**
 * 测量并返回单个字素的信息。
 * 需要已填充先前字素的信息
 * 覆盖以自定义测量
 *
 * Measure and return the info of a single grapheme.
 * needs the the info of previous graphemes already filled
 * Override to customize measuring
 */
export type GraphemeBBox = {
  width: number;
  height: number;
  kernedWidth: number;
  left: number;
  deltaY: number;
  renderLeft?: number;
  renderTop?: number;
  angle?: number;
};

// @TODO this is not complete
/**
 * 文本独有的属性接口
 */
interface UniqueTextProps {
  /**
   * 字符间距
   */
  charSpacing: number;
  /**
   * 行高
   */
  lineHeight: number;
  /**
   * 字体大小
   */
  fontSize: number;
  /**
   * 字体粗细
   */
  fontWeight: string | number;
  /**
   * 字体族
   */
  fontFamily: string;
  /**
   * 字体样式
   */
  fontStyle: FontStyle;
  /**
   * 路径侧边
   */
  pathSide: TPathSide;
  /**
   * 路径对齐
   */
  pathAlign: TPathAlign;
  /**
   * 下划线
   */
  underline: boolean;
  /**
   * 上划线
   */
  overline: boolean;
  /**
   * 删除线
   */
  linethrough: boolean;
  /**
   * 文本对齐
   */
  textAlign: TextAlign;
  /**
   * 文本方向
   */
  direction: CanvasDirection;
  /**
   * 路径
   */
  path?: Path;
  /**
   * 文本装饰厚度
   */
  textDecorationThickness: number;
}

/**
 * 序列化的文本属性接口
 */
export interface SerializedTextProps
  extends SerializedObjectProps,
    UniqueTextProps {
  /**
   * 样式
   */
  styles: TextStyleArray | TextStyle;
}

/**
 * 文本属性接口
 */
export interface TextProps extends FabricObjectProps, UniqueTextProps {
  /**
   * 样式
   */
  styles: TextStyle;
}

/**
 * 文本类
 * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-2#text}
 *
 * Text class
 * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-2#text}
 */
export class FabricText<
    Props extends TOptions<TextProps> = Partial<TextProps>,
    SProps extends SerializedTextProps = SerializedTextProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  >
  extends StyledText<Props, SProps, EventSpec>
  implements UniqueTextProps
{
  /**
   * 更改时需要重新计算文本布局的属性
   *
   * Properties that requires a text layout recalculation when changed
   * @type string[]
   * @protected
   */
  static textLayoutProperties: string[] = textLayoutProperties;

  /**
   * @private
   */
  declare _reNewline: RegExp;

  /**
   * 使用此正则表达式过滤非换行符的空格。
   * 主要用于文本“两端对齐”时。
   *
   * Use this regular expression to filter for whitespaces that is not a new line.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  declare _reSpacesAndTabs: RegExp;

  /**
   * 使用此正则表达式过滤非换行符的空格。
   * 主要用于文本“两端对齐”时。
   *
   * Use this regular expression to filter for whitespace that is not a new line.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  declare _reSpaceAndTab: RegExp;

  /**
   * 使用此正则表达式过滤连续的非空格组。
   * 主要用于文本“两端对齐”时。
   *
   * Use this regular expression to filter consecutive groups of non spaces.
   * Mostly used when text is 'justify' aligned.
   * @private
   */
  declare _reWords: RegExp;

  /**
   * 文本内容
   */
  declare text: string;

  /**
   * 字体大小（以像素为单位）
   *
   * Font size (in pixels)
   * @type Number
   */
  declare fontSize: number;

  /**
   * 字体粗细（例如 bold, normal, 400, 600, 800）
   *
   * Font weight (e.g. bold, normal, 400, 600, 800)
   * @type {(Number|String)}
   */
  declare fontWeight: string | number;

  /**
   * 字体族
   *
   * Font family
   * @type String
   */
  declare fontFamily: string;

  /**
   * 文本装饰下划线。
   *
   * Text decoration underline.
   * @type Boolean
   */
  declare underline: boolean;

  /**
   * 文本装饰上划线。
   *
   * Text decoration overline.
   * @type Boolean
   */
  declare overline: boolean;

  /**
   * 文本装饰删除线。
   *
   * Text decoration linethrough.
   * @type Boolean
   */
  declare linethrough: boolean;

  /**
   * 文本对齐方式。可能的值："left", "center", "right", "justify",
   * "justify-left", "justify-center" 或 "justify-right"。
   *
   * Text alignment. Possible values: "left", "center", "right", "justify",
   * "justify-left", "justify-center" or "justify-right".
   * @type TextAlign
   */
  declare textAlign: TextAlign;

  /**
   * 字体样式。可能的值："", "normal", "italic" 或 "oblique"。
   *
   * Font style . Possible values: "", "normal", "italic" or "oblique".
   * @type FontStyle
   */
  declare fontStyle: FontStyle;

  /**
   * 行高
   *
   * Line height
   * @type Number
   */
  declare lineHeight: number;

  /**
   * 上标模式对象（最小重叠）
   *
   * Superscript schema object (minimum overlap)
   */
  declare superscript: {
    /**
     * 字体大小因子
     *
     * fontSize factor
     * @default 0.6
     */
    size: number;
    /**
     * 基线偏移因子（向上）
     *
     * baseline-shift factor (upwards)
     * @default -0.35
     */
    baseline: number;
  };

  /**
   * 下标模式对象（最小重叠）
   *
   * Subscript schema object (minimum overlap)
   */
  declare subscript: {
    /**
     * 字体大小因子
     *
     * fontSize factor
     * @default 0.6
     */
    size: number;
    /**
     * 基线偏移因子（向下）
     *
     * baseline-shift factor (downwards)
     * @default 0.11
     */
    baseline: number;
  };

  /**
   * 文本行的背景颜色
   *
   * Background color of text lines
   * @type String
   */
  declare textBackgroundColor: string;

  /**
   * 样式
   */
  declare styles: TextStyle;

  /**
   * 文本应遵循的路径。
   * 自 4.6.0 起，路径将自动绘制。
   * 如果你想让路径可见，给它一个 stroke 和 strokeWidth 或 fill 值
   * 如果你想让它隐藏，将 visible = false 分配给路径。
   * 此功能处于 BETA 阶段，尚不支持 SVG 导入/导出。
   *
   * Path that the text should follow.
   * since 4.6.0 the path will be drawn automatically.
   * if you want to make the path visible, give it a stroke and strokeWidth or fill value
   * if you want it to be hidden, assign visible = false to the path.
   * This feature is in BETA, and SVG import/export is not yet supported.
   * @type Path
   * @example
   * const textPath = new Text('Text on a path', {
   *     top: 150,
   *     left: 150,
   *     textAlign: 'center',
   *     charSpacing: -50,
   *     path: new Path('M 0 0 C 50 -100 150 -100 200 0', {
   *         strokeWidth: 1,
   *         visible: false
   *     }),
   *     pathSide: 'left',
   *     pathStartOffset: 0
   * });
   */
  declare path?: Path;

  /**
   * 下划线、上划线和删除线的文本装饰厚度
   * 厚度以 fontSize 的千分比 (em) 表示。
   * 原始值为 1/15，转换为 66.6667 千分比。
   * 选择度量单位是为了与 charSpacing 对齐。
   * 您可以毫无问题地减小厚度，而较大的下划线或上划线可能会超出文本的边界框。
   * 为了解决这个问题，需要对代码进行更大的重构，目前超出了范围。
   * 如果您需要在第一行文本上使用如此大的上划线或在最后一行文本上使用大的下划线，请考虑禁用缓存作为解决方法
   *
   * The text decoration tickness for underline, overline and strikethrough
   * The tickness is expressed in thousandths of fontSize ( em ).
   * The original value was 1/15 that translates to 66.6667 thousandths.
   * The choice of unit of measure is to align with charSpacing.
   * You can slim the tickness without issues, while large underline or overline may end up
   * outside the bounding box of the text. In order to fix that a bigger refactor of the code
   * is needed and is out of scope for now. If you need such large overline on the first line
   * of text or large underline on the last line of text, consider disabling caching as a
   * workaround
   * @default 66.667
   */
  declare textDecorationThickness: number;

  /**
   * 文本路径起始位置的偏移量
   * 仅当文本具有路径时使用
   *
   * Offset amount for text path starting position
   * Only used when text has a path
   */
  declare pathStartOffset: number;

  /**
   * 文本应绘制在路径的哪一侧。
   * 仅当文本具有路径时使用
   *
   * Which side of the path the text should be drawn on.
   * Only used when text has a path
   * @type {TPathSide} 'left|right'
   */
  declare pathSide: TPathSide;

  /**
   * 文本如何与路径对齐。此属性确定每个字符相对于路径的垂直位置。
   * （"baseline", "center", "ascender", "descender" 之一）
   * 此功能处于 BETA 阶段，其行为可能会更改
   *
   * How text is aligned to the path. This property determines
   * the perpendicular position of each character relative to the path.
   * (one of "baseline", "center", "ascender", "descender")
   * This feature is in BETA, and its behavior may change
   * @type TPathAlign
   */
  declare pathAlign: TPathAlign;

  /**
   * @private
   */
  declare _fontSizeFraction: number;

  /**
   * @private
   */
  declare offsets: { underline: number; linethrough: number; overline: number };

  /**
   * 文本行与字体大小的比例（以像素为单位）
   *
   * Text Line proportion to font Size (in pixels)
   * @type Number
   */
  declare _fontSizeMult: number;

  /**
   * 字符之间的额外空间
   * 以千分之 em 单位表示
   *
   * additional space between characters
   * expressed in thousands of em unit
   * @type Number
   */
  declare charSpacing: number;

  /**
   * 基线偏移，仅样式，对于主文本对象保持为 0
   *
   * Baseline shift, styles only, keep at 0 for the main text object
   * @type {Number}
   */
  declare deltaY: number;

  /**
   * 警告：实验性。尚未支持
   * 确定文本的方向。
   * 必须与 textAlign 和 originX 一起手动设置以获得正确的体验。
   * 一些有趣的未来链接
   * https://www.w3.org/International/questions/qa-bidi-unicode-controls
   *
   * WARNING: EXPERIMENTAL. NOT SUPPORTED YET
   * determine the direction of the text.
   * This has to be set manually together with textAlign and originX for proper
   * experience.
   * some interesting link for the future
   * https://www.w3.org/International/questions/qa-bidi-unicode-controls
   * @since 4.5.0
   * @type {CanvasDirection} 'ltr|rtl'
   */
  declare direction: CanvasDirection;

  /**
   * 包含字符边界框
   * 此变量被认为是受保护的。
   * 但由于目前 mixin 的实现方式，我们不能将其保留为私有
   *
   * contains characters bounding boxes
   * This variable is considered to be protected.
   * But for how mixins are implemented right now, we can't leave it private
   * @protected
   */
  __charBounds: GraphemeBBox[][] = [];

  /**
   * 测量文本时使用此大小。为了避免 IE11 舍入误差
   *
   * use this size when measuring text. To avoid IE11 rounding errors
   * @type {Number}
   * @readonly
   * @private
   */
  declare CACHE_FONT_SIZE: number;

  /**
   * 包含最小文本宽度以避免获得 0
   *
   * contains the min text width to avoid getting 0
   * @type {Number}
   */
  declare MIN_TEXT_WIDTH: number;

  /**
   * 包含对象的文本，按屏幕上显示的行划分。
   * 换行将独立于换行符划分文本
   *
   * contains the the text of the object, divided in lines as they are displayed
   * on screen. Wrapping will divide the text independently of line breaks
   * @type {string[]}
   */
  declare textLines: string[];

  /**
   * 与 textLines 相同，但每行是由 splitByGrapheme 分割的字素数组
   *
   * same as textlines, but each line is an array of graphemes as split by splitByGrapheme
   * @type {string[]}
   */
  declare _textLines: string[][];

  /**
   * 未换行的文本行
   */
  declare _unwrappedTextLines: string[][];
  /**
   * 文本数组
   */
  declare _text: string[];
  /**
   * 光标宽度
   */
  declare cursorWidth: number;
  /**
   * 行高数组
   */
  declare __lineHeights: number[];
  /**
   * 行宽数组
   */
  declare __lineWidths: number[];
  /**
   * 是否已初始化
   */
  declare initialized?: true;

  /**
   * 缓存属性
   */
  static cacheProperties = [...cacheProperties, ...additionalProps];

  /**
   * 自身默认值
   */
  static ownDefaults = textDefaultValues;

  /**
   * 类型
   */
  static type = 'Text';

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return { ...super.getDefaults(), ...FabricText.ownDefaults };
  }

  /**
   * 构造函数
   * @param text 文本内容
   * @param options 选项
   */
  constructor(text: string, options?: Props) {
    super();
    Object.assign(this, FabricText.ownDefaults);
    this.setOptions(options);
    if (!this.styles) {
      this.styles = {};
    }
    this.text = text;
    this.initialized = true;
    if (this.path) {
      this.setPathInfo();
    }
    this.initDimensions();
    this.setCoords();
  }

  /**
   * 如果文本有路径，它将添加路径和文本计算所需的额外信息
   *
   * If text has a path, it will add the extra information needed
   * for path and text calculations
   */
  setPathInfo() {
    const path = this.path;
    if (path) {
      path.segmentsInfo = getPathSegmentsInfo(path.path);
    }
  }

  /**
   * 将文本分割为文本行和字素行。
   * @private
   *
   * @private
   * Divides text into lines of text and lines of graphemes.
   */
  _splitText(): TextLinesInfo {
    const newLines = this._splitTextIntoLines(this.text);
    this.textLines = newLines.lines;
    this._textLines = newLines.graphemeLines;
    this._unwrappedTextLines = newLines._unwrappedLines;
    this._text = newLines.graphemeText;
    return newLines;
  }

  /**
   * 初始化或更新文本尺寸。
   * 使用适当的值更新 this.width and this.height。
   * 不返回尺寸。
   *
   * Initialize or update text dimensions.
   * Updates this.width and this.height with the proper values.
   * Does not return dimensions.
   */
  initDimensions() {
    this._splitText();
    this._clearCache();
    this.dirty = true;
    if (this.path) {
      this.width = this.path.width;
      this.height = this.path.height;
    } else {
      this.width =
        this.calcTextWidth() || this.cursorWidth || this.MIN_TEXT_WIDTH;
      this.height = this.calcTextHeight();
    }
    if (this.textAlign.includes(JUSTIFY)) {
      // once text is measured we need to make space fatter to make justified text.
      this.enlargeSpaces();
    }
  }

  /**
   * 扩大空格框并移动其他框
   *
   * Enlarge space boxes and shift the others
   */
  enlargeSpaces() {
    let diffSpace,
      currentLineWidth,
      numberOfSpaces,
      accumulatedSpace,
      line,
      charBound,
      spaces;
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      if (
        this.textAlign !== JUSTIFY &&
        (i === len - 1 || this.isEndOfWrapping(i))
      ) {
        continue;
      }
      accumulatedSpace = 0;
      line = this._textLines[i];
      currentLineWidth = this.getLineWidth(i);
      if (
        currentLineWidth < this.width &&
        (spaces = this.textLines[i].match(this._reSpacesAndTabs))
      ) {
        numberOfSpaces = spaces.length;
        diffSpace = (this.width - currentLineWidth) / numberOfSpaces;
        for (let j = 0; j <= line.length; j++) {
          charBound = this.__charBounds[i][j];
          if (this._reSpaceAndTab.test(line[j])) {
            charBound.width += diffSpace;
            charBound.kernedWidth += diffSpace;
            charBound.left += accumulatedSpace;
            accumulatedSpace += diffSpace;
          } else {
            charBound.left += accumulatedSpace;
          }
        }
      }
    }
  }

  /**
   * 检测文本行是否以硬换行符结束
   * text 和 itext 没有换行，返回 false
   * @param lineIndex 行索引
   * @returns 是否为换行结束
   *
   * Detect if the text line is ended with an hard break
   * text and itext do not have wrapping, return false
   * @return {Boolean}
   */
  isEndOfWrapping(lineIndex: number): boolean {
    return lineIndex === this._textLines.length - 1;
  }

  /**
   * 检测一行是否有换行符，因此我们在移动和计算样式时需要考虑它。
   * 对于 text 和 Itext，它总是返回 1。Textbox 有自己的实现
   * @param lineIndex 行索引
   * @param skipWrapping 是否跳过换行
   * @returns 换行符偏移量
   *
   * Detect if a line has a linebreak and so we need to account for it when moving
   * and counting style.
   * It return always 1 for text and Itext. Textbox has its own implementation
   * @return Number
   */
  missingNewlineOffset(lineIndex: number, skipWrapping?: boolean): 0 | 1;
  missingNewlineOffset(_lineIndex: number): 1 {
    return 1;
  }

  /**
   * 返回光标的 2d 表示（lineIndex 和 charIndex）
   *
   * Returns 2d representation (lineIndex and charIndex) of cursor
   * @param {Number} selectionStart 选区开始位置
   * @param {Boolean} [skipWrapping] 考虑未换行行的位置。用于管理样式。
   */
  get2DCursorLocation(selectionStart: number, skipWrapping?: boolean) {
    const lines = skipWrapping ? this._unwrappedTextLines : this._textLines;
    let i: number;
    for (i = 0; i < lines.length; i++) {
      if (selectionStart <= lines[i].length) {
        return {
          lineIndex: i,
          charIndex: selectionStart,
        };
      }
      selectionStart -=
        lines[i].length + this.missingNewlineOffset(i, skipWrapping);
    }
    return {
      lineIndex: i - 1,
      charIndex:
        lines[i - 1].length < selectionStart
          ? lines[i - 1].length
          : selectionStart,
    };
  }

  /**
   * 返回实例的字符串表示形式
   * @returns 文本对象的字符串表示形式
   *
   * Returns string representation of an instance
   * @return {String} String representation of text object
   */
  toString(): string {
    return `#<Text (${this.complexity()}): { "text": "${
      this.text
    }", "fontFamily": "${this.fontFamily}" }>`;
  }

  /**
   * 返回创建足够大以容纳要缓存的对象的缓存画布所需的尺寸和缩放级别。
   * @private
   * @returns 缓存画布尺寸
   *
   * Return the dimension and the zoom level needed to create a cache canvas
   * big enough to host the object to be cached.
   * @private
   * @param {Object} dim.x width of object to be cached
   * @param {Object} dim.y height of object to be cached
   * @return {Object}.width width of canvas
   * @return {Object}.height height of canvas
   * @return {Object}.zoomX zoomX zoom value to unscale the canvas before drawing cache
   * @return {Object}.zoomY zoomY zoom value to unscale the canvas before drawing cache
   */
  _getCacheCanvasDimensions(): TCacheCanvasDimensions {
    const dims = super._getCacheCanvasDimensions();
    const fontSize = this.fontSize;
    dims.width += fontSize * dims.zoomX;
    dims.height += fontSize * dims.zoomY;
    return dims;
  }

  /**
   * 渲染
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _render(ctx: CanvasRenderingContext2D) {
    const path = this.path;
    path && !path.isNotVisible() && path._render(ctx);
    this._setTextStyles(ctx);
    this._renderTextLinesBackground(ctx);
    this._renderTextDecoration(ctx, 'underline');
    this._renderText(ctx);
    this._renderTextDecoration(ctx, 'overline');
    this._renderTextDecoration(ctx, 'linethrough');
  }

  /**
   * 渲染文本
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderText(ctx: CanvasRenderingContext2D) {
    if (this.paintFirst === STROKE) {
      this._renderTextStroke(ctx);
      this._renderTextFill(ctx);
    } else {
      this._renderTextFill(ctx);
      this._renderTextStroke(ctx);
    }
  }

  /**
   * 使用对象属性或 charStyle 设置上下文的字体参数
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {Object} [charStyle] 具有字体样式属性的对象
   * @param {Boolean} [forMeasuring] 是否用于测量
   *
   * Set the font parameter of the context with the object properties or with charStyle
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Object} [charStyle] object with font style properties
   * @param {String} [charStyle.fontFamily] Font Family
   * @param {Number} [charStyle.fontSize] Font size in pixels. ( without px suffix )
   * @param {String} [charStyle.fontWeight] Font weight
   * @param {String} [charStyle.fontStyle] Font style (italic|normal)
   */
  _setTextStyles(
    ctx: CanvasRenderingContext2D,
    charStyle?: any,
    forMeasuring?: boolean,
  ) {
    ctx.textBaseline = 'alphabetic';
    if (this.path) {
      switch (this.pathAlign) {
        case CENTER:
          ctx.textBaseline = 'middle';
          break;
        case 'ascender':
          ctx.textBaseline = TOP;
          break;
        case 'descender':
          ctx.textBaseline = BOTTOM;
          break;
      }
    }
    ctx.font = this._getFontDeclaration(charStyle, forMeasuring);
  }

  /**
   * 计算并返回测量每行的文本宽度。
   * @private
   * @returns 文本对象的最大宽度
   *
   * calculate and return the text Width measuring each line.
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @return {Number} Maximum width of Text object
   */
  calcTextWidth(): number {
    let maxWidth = this.getLineWidth(0);

    for (let i = 1, len = this._textLines.length; i < len; i++) {
      const currentLineWidth = this.getLineWidth(i);
      if (currentLineWidth > maxWidth) {
        maxWidth = currentLineWidth;
      }
    }
    return maxWidth;
  }

  /**
   * 渲染文本行
   * @private
   * @param {String} method 方法名称 ("fillText" 或 "strokeText")
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {String} line 要渲染的文本
   * @param {Number} left 文本的左侧位置
   * @param {Number} top 文本的顶部位置
   * @param {Number} lineIndex 文本中行的索引
   *
   * @private
   * @param {String} method Method name ("fillText" or "strokeText")
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} line Text to render
   * @param {Number} left Left position of text
   * @param {Number} top Top position of text
   * @param {Number} lineIndex Index of a line in a text
   */
  _renderTextLine(
    method: 'fillText' | 'strokeText',
    ctx: CanvasRenderingContext2D,
    line: string[],
    left: number,
    top: number,
    lineIndex: number,
  ) {
    this._renderChars(method, ctx, line, left, top, lineIndex);
  }

  /**
   * 渲染行的文本背景，注意样式
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   *
   * Renders the text background for lines, taking care of style
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextLinesBackground(ctx: CanvasRenderingContext2D) {
    if (!this.textBackgroundColor && !this.styleHas('textBackgroundColor')) {
      return;
    }
    const originalFill = ctx.fillStyle,
      leftOffset = this._getLeftOffset();
    let lineTopOffset = this._getTopOffset();

    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      if (
        !this.textBackgroundColor &&
        !this.styleHas('textBackgroundColor', i)
      ) {
        lineTopOffset += heightOfLine;
        continue;
      }
      const jlen = this._textLines[i].length;
      const lineLeftOffset = this._getLineLeftOffset(i);
      let boxWidth = 0;
      let boxStart = 0;
      let drawStart;
      let currentColor;
      let lastColor = this.getValueOfPropertyAt(i, 0, 'textBackgroundColor');
      const bgHeight = this.getHeightOfLineImpl(i);
      for (let j = 0; j < jlen; j++) {
        // at this point charbox are either standard or full with pathInfo if there is a path.
        const charBox = this.__charBounds[i][j] as Required<GraphemeBBox>;
        currentColor = this.getValueOfPropertyAt(i, j, 'textBackgroundColor');
        if (this.path) {
          ctx.save();
          ctx.translate(charBox.renderLeft, charBox.renderTop);
          ctx.rotate(charBox.angle);
          ctx.fillStyle = currentColor;
          currentColor &&
            ctx.fillRect(
              -charBox.width / 2,
              -bgHeight * (1 - this._fontSizeFraction),
              charBox.width,
              bgHeight,
            );
          ctx.restore();
        } else if (currentColor !== lastColor) {
          drawStart = leftOffset + lineLeftOffset + boxStart;
          if (this.direction === RTL) {
            drawStart = this.width - drawStart - boxWidth;
          }
          ctx.fillStyle = lastColor;
          lastColor &&
            ctx.fillRect(drawStart, lineTopOffset, boxWidth, bgHeight);
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastColor = currentColor;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      if (currentColor && !this.path) {
        drawStart = leftOffset + lineLeftOffset + boxStart;
        if (this.direction === RTL) {
          drawStart = this.width - drawStart - boxWidth;
        }
        ctx.fillStyle = currentColor;
        ctx.fillRect(drawStart, lineTopOffset, boxWidth, bgHeight);
      }
      lineTopOffset += heightOfLine;
    }
    ctx.fillStyle = originalFill;
    // if there is text background color no
    // other shadows should be casted
    this._removeShadow(ctx);
  }

  /**
   * 测量并返回单个字符的宽度。
   * 可能被覆盖以适应不同的测量逻辑或挂钩一些外部库进行字符测量
   * @private
   * @param {String} _char 要测量的字符
   * @param {Object} charStyle 要测量的字符的样式
   * @param {String} [previousChar] 上一个字符
   * @param {Object} [prevCharStyle] 上一个字符的样式
   *
   * measure and return the width of a single character.
   * possibly overridden to accommodate different measure logic or
   * to hook some external lib for character measurement
   * @private
   * @param {String} _char, char to be measured
   * @param {Object} charStyle style of char to be measured
   * @param {String} [previousChar] previous char
   * @param {Object} [prevCharStyle] style of previous char
   */
  _measureChar(
    _char: string,
    charStyle: CompleteTextStyleDeclaration,
    previousChar: string | undefined,
    prevCharStyle: CompleteTextStyleDeclaration | Record<string, never>,
  ) {
    const fontCache = cache.getFontCache(charStyle),
      fontDeclaration = this._getFontDeclaration(charStyle),
      couple = previousChar ? previousChar + _char : _char,
      stylesAreEqual =
        previousChar &&
        fontDeclaration === this._getFontDeclaration(prevCharStyle),
      fontMultiplier = charStyle.fontSize / this.CACHE_FONT_SIZE;
    let width: number | undefined,
      coupleWidth: number | undefined,
      previousWidth: number | undefined,
      kernedWidth: number | undefined;

    if (previousChar && fontCache.has(previousChar)) {
      previousWidth = fontCache.get(previousChar);
    }
    if (fontCache.has(_char)) {
      kernedWidth = width = fontCache.get(_char);
    }
    if (stylesAreEqual && fontCache.has(couple)) {
      coupleWidth = fontCache.get(couple)!;
      kernedWidth = coupleWidth - previousWidth!;
    }
    if (
      width === undefined ||
      previousWidth === undefined ||
      coupleWidth === undefined
    ) {
      const ctx = getMeasuringContext()!;
      // send a TRUE to specify measuring font size CACHE_FONT_SIZE
      this._setTextStyles(ctx, charStyle, true);
      if (width === undefined) {
        kernedWidth = width = ctx.measureText(_char).width;
        fontCache.set(_char, width);
      }
      if (previousWidth === undefined && stylesAreEqual && previousChar) {
        previousWidth = ctx.measureText(previousChar).width;
        fontCache.set(previousChar, previousWidth);
      }
      if (stylesAreEqual && coupleWidth === undefined) {
        // we can measure the kerning couple and subtract the width of the previous character
        coupleWidth = ctx.measureText(couple).width;
        fontCache.set(couple, coupleWidth);
        // safe to use the non-null since if undefined we defined it before.
        kernedWidth = coupleWidth - previousWidth!;
      }
    }
    return {
      width: width * fontMultiplier,
      kernedWidth: kernedWidth! * fontMultiplier,
    };
  }

  /**
   * 计算给定位置字符的高度
   * @param {Number} line 行索引号
   * @param {Number} _char 字符索引号
   * @returns {Number} 字符的 fontSize
   *
   * Computes height of character at given position
   * @param {Number} line the line index number
   * @param {Number} _char the character index number
   * @return {Number} fontSize of the character
   */
  getHeightOfChar(line: number, _char: number): number {
    return this.getValueOfPropertyAt(line, _char, 'fontSize');
  }

  /**
   * 测量文本行，测量所有字符。
   * @param {Number} lineIndex 行号
   *
   * measure a text line measuring all characters.
   * @param {Number} lineIndex line number
   */
  measureLine(lineIndex: number) {
    const lineInfo = this._measureLine(lineIndex);
    if (this.charSpacing !== 0) {
      lineInfo.width -= this._getWidthOfCharSpacing();
    }
    if (lineInfo.width < 0) {
      lineInfo.width = 0;
    }
    return lineInfo;
  }

  /**
   * 测量一行的每个字素，填充 __charBounds
   * @param {Number} lineIndex 行索引
   * @returns {Object} object.width 字符总宽度
   * @returns {Object} object.numOfSpaces 匹配 this._reSpacesAndTabs 的字符长度
   *
   * measure every grapheme of a line, populating __charBounds
   * @param {Number} lineIndex
   * @return {Object} object.width total width of characters
   * @return {Object} object.numOfSpaces length of chars that match this._reSpacesAndTabs
   */
  _measureLine(lineIndex: number) {
    let width = 0,
      prevGrapheme: string | undefined,
      graphemeInfo: GraphemeBBox | undefined;

    const reverse = this.pathSide === RIGHT,
      path = this.path,
      line = this._textLines[lineIndex],
      llength = line.length,
      lineBounds = new Array<GraphemeBBox>(llength);

    this.__charBounds[lineIndex] = lineBounds;
    for (let i = 0; i < llength; i++) {
      const grapheme = line[i];
      graphemeInfo = this._getGraphemeBox(grapheme, lineIndex, i, prevGrapheme);
      lineBounds[i] = graphemeInfo;
      width += graphemeInfo.kernedWidth;
      prevGrapheme = grapheme;
    }
    // this latest bound box represent the last character of the line
    // to simplify cursor handling in interactive mode.
    lineBounds[llength] = {
      left: graphemeInfo ? graphemeInfo.left + graphemeInfo.width : 0,
      width: 0,
      kernedWidth: 0,
      height: this.fontSize,
      deltaY: 0,
    } as GraphemeBBox;
    if (path && path.segmentsInfo) {
      let positionInPath = 0;
      const totalPathLength =
        path.segmentsInfo[path.segmentsInfo.length - 1].length;
      switch (this.textAlign) {
        case LEFT:
          positionInPath = reverse ? totalPathLength - width : 0;
          break;
        case CENTER:
          positionInPath = (totalPathLength - width) / 2;
          break;
        case RIGHT:
          positionInPath = reverse ? 0 : totalPathLength - width;
          break;
        //todo - add support for justify
      }
      positionInPath += this.pathStartOffset * (reverse ? -1 : 1);
      for (
        let i = reverse ? llength - 1 : 0;
        reverse ? i >= 0 : i < llength;
        reverse ? i-- : i++
      ) {
        graphemeInfo = lineBounds[i];
        if (positionInPath > totalPathLength) {
          positionInPath %= totalPathLength;
        } else if (positionInPath < 0) {
          positionInPath += totalPathLength;
        }
        // it would probably much faster to send all the grapheme position for a line
        // and calculate path position/angle at once.
        this._setGraphemeOnPath(positionInPath, graphemeInfo);
        positionInPath += graphemeInfo.kernedWidth;
      }
    }
    return { width: width, numOfSpaces: 0 };
  }

  /**
   * 计算跟随路径的字符的角度和左、上位置。
   * 它将其附加到 graphemeInfo 以便稍后在渲染时重用
   * @private
   * @param {Number} positionInPath 要测量的路径位置
   * @param {GraphemeBBox} graphemeInfo 当前字素框信息
   *
   * Calculate the angle  and the left,top position of the char that follow a path.
   * It appends it to graphemeInfo to be reused later at rendering
   * @private
   * @param {Number} positionInPath to be measured
   * @param {GraphemeBBox} graphemeInfo current grapheme box information
   * @param {Object} startingPoint position of the point
   */
  _setGraphemeOnPath(positionInPath: number, graphemeInfo: GraphemeBBox) {
    const centerPosition = positionInPath + graphemeInfo.kernedWidth / 2,
      path = this.path!;

    // we are at currentPositionOnPath. we want to know what point on the path is.
    const info = getPointOnPath(path.path, centerPosition, path.segmentsInfo)!;
    graphemeInfo.renderLeft = info.x - path.pathOffset.x;
    graphemeInfo.renderTop = info.y - path.pathOffset.y;
    graphemeInfo.angle = info.angle + (this.pathSide === RIGHT ? Math.PI : 0);
  }

  /**
   * 获取字素框
   * @param {String} grapheme 要测量的字素
   * @param {Number} lineIndex 字符所在行的索引
   * @param {Number} charIndex 行中的位置
   * @param {String} [prevGrapheme] 待测量字符之前的字符
   * @param {Boolean} [skipLeft] 是否跳过左侧计算
   * @returns {GraphemeBBox} 字素边界框
   *
   * @param {String} grapheme to be measured
   * @param {Number} lineIndex index of the line where the char is
   * @param {Number} charIndex position in the line
   * @param {String} [prevGrapheme] character preceding the one to be measured
   * @returns {GraphemeBBox} grapheme bbox
   */
  _getGraphemeBox(
    grapheme: string,
    lineIndex: number,
    charIndex: number,
    prevGrapheme?: string,
    skipLeft?: boolean,
  ): GraphemeBBox {
    const style = this.getCompleteStyleDeclaration(lineIndex, charIndex),
      prevStyle = prevGrapheme
        ? this.getCompleteStyleDeclaration(lineIndex, charIndex - 1)
        : {},
      info = this._measureChar(grapheme, style, prevGrapheme, prevStyle);
    let kernedWidth = info.kernedWidth,
      width = info.width,
      charSpacing;

    if (this.charSpacing !== 0) {
      charSpacing = this._getWidthOfCharSpacing();
      width += charSpacing;
      kernedWidth += charSpacing;
    }

    const box: GraphemeBBox = {
      width,
      left: 0,
      height: style.fontSize,
      kernedWidth,
      deltaY: style.deltaY,
    };
    if (charIndex > 0 && !skipLeft) {
      const previousBox = this.__charBounds[lineIndex][charIndex - 1];
      box.left =
        previousBox.left + previousBox.width + info.kernedWidth - info.width;
    }
    return box;
  }

  /**
   * 计算 'lineIndex' 处的行高，
   * 不带 lineHeigth 乘法因子
   * @private
   * @param {Number} lineIndex 要计算的行索引
   * @returns {Number} 行高
   *
   * Calculate height of line at 'lineIndex',
   * without the lineHeigth multiplication factor
   * @private
   * @param {Number} lineIndex index of line to calculate
   * @return {Number}
   */
  private getHeightOfLineImpl(lineIndex: number): number {
    const lh = this.__lineHeights;
    if (lh[lineIndex]) {
      return lh[lineIndex];
    }

    // char 0 is measured before the line cycle because it needs to char
    // emptylines
    let maxHeight = this.getHeightOfChar(lineIndex, 0);
    for (let i = 1, len = this._textLines[lineIndex].length; i < len; i++) {
      maxHeight = Math.max(this.getHeightOfChar(lineIndex, i), maxHeight);
    }

    return (lh[lineIndex] = maxHeight * this._fontSizeMult);
  }

  /**
   * 计算 'lineIndex' 处的行高
   * @param {Number} lineIndex 要计算的行索引
   * @returns {Number} 行高
   *
   * Calculate height of line at 'lineIndex'
   * @param {Number} lineIndex index of line to calculate
   * @return {Number}
   */
  getHeightOfLine(lineIndex: number): number {
    return this.getHeightOfLineImpl(lineIndex) * this.lineHeight;
  }

  /**
   * 计算文本框高度
   *
   * Calculate text box height
   */
  calcTextHeight() {
    let height = 0;
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      height +=
        i === len - 1 ? this.getHeightOfLineImpl(i) : this.getHeightOfLine(i);
    }
    return height;
  }

  /**
   * 获取左侧偏移量
   * @private
   * @returns {Number} 左侧偏移量
   *
   * @private
   * @return {Number} Left offset
   */
  _getLeftOffset(): number {
    return this.direction === LTR ? -this.width / 2 : this.width / 2;
  }

  /**
   * 获取顶部偏移量
   * @private
   * @returns {Number} 顶部偏移量
   *
   * @private
   * @return {Number} Top offset
   */
  _getTopOffset(): number {
    return -this.height / 2;
  }

  /**
   * 渲染文本通用方法
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {String} method 方法名称 ("fillText" 或 "strokeText")
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {String} method Method name ("fillText" or "strokeText")
   */
  _renderTextCommon(
    ctx: CanvasRenderingContext2D,
    method: 'fillText' | 'strokeText',
  ) {
    ctx.save();
    let lineHeights = 0;
    const left = this._getLeftOffset(),
      top = this._getTopOffset();
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      this._renderTextLine(
        method,
        ctx,
        this._textLines[i],
        left + this._getLineLeftOffset(i),
        top + lineHeights + this.getHeightOfLineImpl(i),
        i,
      );
      lineHeights += this.getHeightOfLine(i);
    }
    ctx.restore();
  }

  /**
   * 渲染文本填充
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextFill(ctx: CanvasRenderingContext2D) {
    if (!this.fill && !this.styleHas(FILL)) {
      return;
    }

    this._renderTextCommon(ctx, 'fillText');
  }

  /**
   * 渲染文本描边
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextStroke(ctx: CanvasRenderingContext2D) {
    if ((!this.stroke || this.strokeWidth === 0) && this.isEmptyStyles()) {
      return;
    }

    if (this.shadow && !this.shadow.affectStroke) {
      this._removeShadow(ctx);
    }

    ctx.save();
    this._setLineDash(ctx, this.strokeDashArray);
    ctx.beginPath();
    this._renderTextCommon(ctx, 'strokeText');
    ctx.closePath();
    ctx.restore();
  }

  /**
   * 渲染字符
   * @private
   * @param {String} method fillText 或 strokeText。
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {Array} line 行内容，按字素分割为数组
   * @param {Number} left 左侧位置
   * @param {Number} top 顶部位置
   * @param {Number} lineIndex 行索引
   *
   * @private
   * @param {String} method fillText or strokeText.
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Array} line Content of the line, splitted in an array by grapheme
   * @param {Number} left
   * @param {Number} top
   * @param {Number} lineIndex
   */
  _renderChars(
    method: 'fillText' | 'strokeText',
    ctx: CanvasRenderingContext2D,
    line: Array<any>,
    left: number,
    top: number,
    lineIndex: number,
  ) {
    const isJustify = this.textAlign.includes(JUSTIFY),
      path = this.path,
      shortCut =
        !isJustify &&
        this.charSpacing === 0 &&
        this.isEmptyStyles(lineIndex) &&
        !path,
      isLtr = this.direction === LTR,
      sign = this.direction === LTR ? 1 : -1,
      // this was changed in the PR #7674
      // currentDirection = ctx.canvas.getAttribute('dir');
      currentDirection = ctx.direction;

    let actualStyle,
      nextStyle,
      charsToRender = '',
      charBox,
      boxWidth = 0,
      timeToRender,
      drawingLeft;

    ctx.save();
    if (currentDirection !== this.direction) {
      ctx.canvas.setAttribute('dir', isLtr ? LTR : RTL);
      ctx.direction = isLtr ? LTR : RTL;
      ctx.textAlign = isLtr ? LEFT : RIGHT;
    }
    top -= this.getHeightOfLineImpl(lineIndex) * this._fontSizeFraction;
    if (shortCut) {
      // render all the line in one pass without checking
      // drawingLeft = isLtr ? left : left - this.getLineWidth(lineIndex);
      this._renderChar(method, ctx, lineIndex, 0, line.join(''), left, top);
      ctx.restore();
      return;
    }
    for (let i = 0, len = line.length - 1; i <= len; i++) {
      timeToRender = i === len || this.charSpacing || path;
      charsToRender += line[i];
      charBox = this.__charBounds[lineIndex][i] as Required<GraphemeBBox>;
      if (boxWidth === 0) {
        left += sign * (charBox.kernedWidth - charBox.width);
        boxWidth += charBox.width;
      } else {
        boxWidth += charBox.kernedWidth;
      }
      if (isJustify && !timeToRender) {
        if (this._reSpaceAndTab.test(line[i])) {
          timeToRender = true;
        }
      }
      if (!timeToRender) {
        // if we have charSpacing, we render char by char
        actualStyle =
          actualStyle || this.getCompleteStyleDeclaration(lineIndex, i);
        nextStyle = this.getCompleteStyleDeclaration(lineIndex, i + 1);
        timeToRender = hasStyleChanged(actualStyle, nextStyle, false);
      }
      if (timeToRender) {
        if (path) {
          ctx.save();
          ctx.translate(charBox.renderLeft, charBox.renderTop);
          ctx.rotate(charBox.angle);
          this._renderChar(
            method,
            ctx,
            lineIndex,
            i,
            charsToRender,
            -boxWidth / 2,
            0,
          );
          ctx.restore();
        } else {
          drawingLeft = left;
          this._renderChar(
            method,
            ctx,
            lineIndex,
            i,
            charsToRender,
            drawingLeft,
            top,
          );
        }
        charsToRender = '';
        actualStyle = nextStyle;
        left += sign * boxWidth;
        boxWidth = 0;
      }
    }
    ctx.restore();
  }

  /**
   * 此函数尝试修补 canvas 渐变上缺失的 gradientTransform。
   * 转换上下文以转换渐变，也会转换描边。
   * 我们想要转换渐变但不转换描边操作，所以我们在模式上创建一个转换后的渐变，然后使用模式代替渐变。
   * 此方法有缺点：速度慢，分辨率低，当尺寸受限时需要补丁。
   * @private
   * @param {TFiller} filler fabric 渐变实例
   * @returns {CanvasPattern} 用作填充/描边样式的模式
   *
   * This function try to patch the missing gradientTransform on canvas gradients.
   * transforming a context to transform the gradient, is going to transform the stroke too.
   * we want to transform the gradient but not the stroke operation, so we create
   * a transformed gradient on a pattern and then we use the pattern instead of the gradient.
   * this method has drawbacks: is slow, is in low resolution, needs a patch for when the size
   * is limited.
   * @private
   * @param {TFiller} filler a fabric gradient instance
   * @return {CanvasPattern} a pattern to use as fill/stroke style
   */
  _applyPatternGradientTransformText(filler: TFiller) {
    // TODO: verify compatibility with strokeUniform
    const width = this.width + this.strokeWidth,
      height = this.height + this.strokeWidth,
      pCanvas = createCanvasElementFor({
        width,
        height,
      }),
      pCtx = pCanvas.getContext('2d')!;
    pCanvas.width = width;
    pCanvas.height = height;
    pCtx.beginPath();
    pCtx.moveTo(0, 0);
    pCtx.lineTo(width, 0);
    pCtx.lineTo(width, height);
    pCtx.lineTo(0, height);
    pCtx.closePath();
    pCtx.translate(width / 2, height / 2);
    pCtx.fillStyle = filler.toLive(pCtx)!;
    this._applyPatternGradientTransform(pCtx, filler);
    pCtx.fill();
    return pCtx.createPattern(pCanvas, 'no-repeat')!;
  }

  /**
   * 处理填充器
   * @param ctx 渲染上下文
   * @param property 属性名称
   * @param filler 填充器
   * @returns 偏移量
   */
  handleFiller<T extends 'fill' | 'stroke'>(
    ctx: CanvasRenderingContext2D,
    property: `${T}Style`,
    filler: TFiller | string,
  ): { offsetX: number; offsetY: number } {
    let offsetX: number, offsetY: number;
    if (isFiller(filler)) {
      if (
        (filler as Gradient<'linear'>).gradientUnits === 'percentage' ||
        (filler as Gradient<'linear'>).gradientTransform ||
        (filler as Pattern).patternTransform
      ) {
        // need to transform gradient in a pattern.
        // this is a slow process. If you are hitting this codepath, and the object
        // is not using caching, you should consider switching it on.
        // we need a canvas as big as the current object caching canvas.
        offsetX = -this.width / 2;
        offsetY = -this.height / 2;
        ctx.translate(offsetX, offsetY);
        ctx[property] = this._applyPatternGradientTransformText(filler);
        return { offsetX, offsetY };
      } else {
        // is a simple gradient or pattern
        ctx[property] = filler.toLive(ctx)!;
        return this._applyPatternGradientTransform(ctx, filler);
      }
    } else {
      // is a color
      ctx[property] = filler;
    }
    return { offsetX: 0, offsetY: 0 };
  }

  /**
   * 此函数为描边样式准备画布，描边和描边宽度需要按定义传入
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {CompleteTextStyleDeclaration} style 具有描边和描边宽度的样式
   * @returns 偏移量
   *
   * This function prepare the canvas for a stroke style, and stroke and strokeWidth
   * need to be sent in as defined
   * @param {CanvasRenderingContext2D} ctx
   * @param {CompleteTextStyleDeclaration} style with stroke and strokeWidth defined
   * @returns
   */
  _setStrokeStyles(
    ctx: CanvasRenderingContext2D,
    {
      stroke,
      strokeWidth,
    }: Pick<CompleteTextStyleDeclaration, 'stroke' | 'strokeWidth'>,
  ) {
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = this.strokeLineCap;
    ctx.lineDashOffset = this.strokeDashOffset;
    ctx.lineJoin = this.strokeLineJoin;
    ctx.miterLimit = this.strokeMiterLimit;
    return this.handleFiller(ctx, 'strokeStyle', stroke!);
  }

  /**
   * 此函数为填充样式准备画布，填充需要按定义传入
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {CompleteTextStyleDeclaration} style 具有填充定义的样式
   * @returns 偏移量
   *
   * This function prepare the canvas for a ill style, and fill
   * need to be sent in as defined
   * @param {CanvasRenderingContext2D} ctx
   * @param {CompleteTextStyleDeclaration} style with ill defined
   * @returns
   */
  _setFillStyles(ctx: CanvasRenderingContext2D, { fill }: Pick<this, 'fill'>) {
    return this.handleFiller(ctx, 'fillStyle', fill!);
  }

  /**
   * 渲染字符
   * @private
   * @param {String} method fillText 或 strokeText
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {Number} lineIndex 行索引
   * @param {Number} charIndex 字符索引
   * @param {String} _char 字符
   * @param {Number} left 左坐标
   * @param {Number} top 顶坐标
   *
   * @private
   * @param {String} method
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @param {String} _char
   * @param {Number} left Left coordinate
   * @param {Number} top Top coordinate
   * @param {Number} lineHeight Height of the line
   */
  _renderChar(
    method: 'fillText' | 'strokeText',
    ctx: CanvasRenderingContext2D,
    lineIndex: number,
    charIndex: number,
    _char: string,
    left: number,
    top: number,
  ) {
    const decl = this._getStyleDeclaration(lineIndex, charIndex),
      fullDecl = this.getCompleteStyleDeclaration(lineIndex, charIndex),
      shouldFill = method === 'fillText' && fullDecl.fill,
      shouldStroke =
        method === 'strokeText' && fullDecl.stroke && fullDecl.strokeWidth;

    if (!shouldStroke && !shouldFill) {
      return;
    }
    ctx.save();

    ctx.font = this._getFontDeclaration(fullDecl);

    if (decl.textBackgroundColor) {
      this._removeShadow(ctx);
    }
    if (decl.deltaY) {
      top += decl.deltaY;
    }

    if (shouldFill) {
      const fillOffsets = this._setFillStyles(ctx, fullDecl);
      ctx.fillText(
        _char,
        left - fillOffsets.offsetX,
        top - fillOffsets.offsetY,
      );
    }

    if (shouldStroke) {
      const strokeOffsets = this._setStrokeStyles(ctx, fullDecl);
      ctx.strokeText(
        _char,
        left - strokeOffsets.offsetX,
        top - strokeOffsets.offsetY,
      );
    }

    ctx.restore();
  }

  /**
   * 将字符转换为“上标”
   * @param {Number} start 选区开始
   * @param {Number} end 选区结束
   *
   * Turns the character into a 'superior figure' (i.e. 'superscript')
   * @param {Number} start selection start
   * @param {Number} end selection end
   */
  setSuperscript(start: number, end: number) {
    this._setScript(start, end, this.superscript);
  }

  /**
   * 将字符转换为“下标”
   * @param {Number} start 选区开始
   * @param {Number} end 选区结束
   *
   * Turns the character into an 'inferior figure' (i.e. 'subscript')
   * @param {Number} start selection start
   * @param {Number} end selection end
   */
  setSubscript(start: number, end: number) {
    this._setScript(start, end, this.subscript);
  }

  /**
   * 在给定位置应用“schema”
   * @private
   * @param {Number} start 选区开始
   * @param {Number} end 选区结束
   * @param {Number} schema 模式
   *
   * Applies 'schema' at given position
   * @private
   * @param {Number} start selection start
   * @param {Number} end selection end
   * @param {Number} schema
   */
  protected _setScript(
    start: number,
    end: number,
    schema: {
      size: number;
      baseline: number;
    },
  ) {
    const loc = this.get2DCursorLocation(start, true),
      fontSize = this.getValueOfPropertyAt(
        loc.lineIndex,
        loc.charIndex,
        'fontSize',
      ),
      dy = this.getValueOfPropertyAt(loc.lineIndex, loc.charIndex, 'deltaY'),
      style = {
        fontSize: fontSize * schema.size,
        deltaY: dy + fontSize * schema.baseline,
      };
    this.setSelectionStyles(style, start, end);
  }

  /**
   * 获取行左侧偏移量
   * @private
   * @param {Number} lineIndex 文本行索引
   * @returns {Number} 行左侧偏移量
   *
   * @private
   * @param {Number} lineIndex index text line
   * @return {Number} Line left offset
   */
  _getLineLeftOffset(lineIndex: number): number {
    const lineWidth = this.getLineWidth(lineIndex),
      lineDiff = this.width - lineWidth,
      textAlign = this.textAlign,
      direction = this.direction,
      isEndOfWrapping = this.isEndOfWrapping(lineIndex);
    let leftOffset = 0;
    if (
      textAlign === JUSTIFY ||
      (textAlign === JUSTIFY_CENTER && !isEndOfWrapping) ||
      (textAlign === JUSTIFY_RIGHT && !isEndOfWrapping) ||
      (textAlign === JUSTIFY_LEFT && !isEndOfWrapping)
    ) {
      return 0;
    }
    if (textAlign === CENTER) {
      leftOffset = lineDiff / 2;
    }
    if (textAlign === RIGHT) {
      leftOffset = lineDiff;
    }
    if (textAlign === JUSTIFY_CENTER) {
      leftOffset = lineDiff / 2;
    }
    if (textAlign === JUSTIFY_RIGHT) {
      leftOffset = lineDiff;
    }
    if (direction === RTL) {
      if (textAlign === RIGHT || textAlign === JUSTIFY_RIGHT) {
        leftOffset = 0;
      } else if (textAlign === LEFT || textAlign === JUSTIFY_LEFT) {
        leftOffset = -lineDiff;
      } else if (textAlign === CENTER || textAlign === JUSTIFY_CENTER) {
        leftOffset = -lineDiff / 2;
      }
    }
    return leftOffset;
  }

  /**
   * 清除缓存
   * @private
   *
   * @private
   */
  _clearCache() {
    this._forceClearCache = false;
    this.__lineWidths = [];
    this.__lineHeights = [];
    this.__charBounds = [];
  }

  /**
   * 测量给定索引的单行。用于计算初始文本边界框。
   * 值被计算并存储在 __lineWidths 缓存中。
   * @private
   * @param {Number} lineIndex 行号
   * @returns {Number} 行宽
   *
   * Measure a single line given its index. Used to calculate the initial
   * text bounding box. The values are calculated and stored in __lineWidths cache.
   * @private
   * @param {Number} lineIndex line number
   * @return {Number} Line width
   */
  getLineWidth(lineIndex: number): number {
    if (this.__lineWidths[lineIndex] !== undefined) {
      return this.__lineWidths[lineIndex];
    }

    const { width } = this.measureLine(lineIndex);
    this.__lineWidths[lineIndex] = width;
    return width;
  }

  /**
   * 获取字符间距的宽度
   * @returns 字符间距宽度
   */
  _getWidthOfCharSpacing() {
    if (this.charSpacing !== 0) {
      return (this.fontSize * this.charSpacing) / 1000;
    }
    return 0;
  }

  /**
   * 检索给定字符位置的属性值
   * @param {Number} lineIndex 行号
   * @param {Number} charIndex 字符号
   * @param {String} property 属性名
   * @returns 'property' 的值
   *
   * Retrieves the value of property at given character position
   * @param {Number} lineIndex the line number
   * @param {Number} charIndex the character number
   * @param {String} property the property name
   * @returns the value of 'property'
   */
  getValueOfPropertyAt<T extends StylePropertiesType>(
    lineIndex: number,
    charIndex: number,
    property: T,
  ): this[T] {
    const charStyle = this._getStyleDeclaration(lineIndex, charIndex);
    return (charStyle[property] ?? this[property]) as this[T];
  }

  /**
   * 渲染文本装饰
   * @private
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   * @param {String} type 装饰类型 ('underline' | 'linethrough' | 'overline')
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _renderTextDecoration(
    ctx: CanvasRenderingContext2D,
    type: 'underline' | 'linethrough' | 'overline',
  ) {
    if (!this[type] && !this.styleHas(type)) {
      return;
    }
    let topOffset = this._getTopOffset();
    const leftOffset = this._getLeftOffset(),
      path = this.path,
      charSpacing = this._getWidthOfCharSpacing(),
      offsetAligner =
        type === 'linethrough' ? 0.5 : type === 'overline' ? 1 : 0,
      offsetY = this.offsets[type];
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      if (!this[type] && !this.styleHas(type, i)) {
        topOffset += heightOfLine;
        continue;
      }
      const line = this._textLines[i];
      const maxHeight = heightOfLine / this.lineHeight;
      const lineLeftOffset = this._getLineLeftOffset(i);
      let boxStart = 0;
      let boxWidth = 0;
      let lastDecoration = this.getValueOfPropertyAt(i, 0, type);
      let lastFill = this.getValueOfPropertyAt(i, 0, FILL);
      let lastTickness = this.getValueOfPropertyAt(
        i,
        0,
        TEXT_DECORATION_THICKNESS,
      );
      let currentDecoration = lastDecoration;
      let currentFill = lastFill;
      let currentTickness = lastTickness;
      const top = topOffset + maxHeight * (1 - this._fontSizeFraction);
      let size = this.getHeightOfChar(i, 0);
      let dy = this.getValueOfPropertyAt(i, 0, 'deltaY');
      for (let j = 0, jlen = line.length; j < jlen; j++) {
        const charBox = this.__charBounds[i][j] as Required<GraphemeBBox>;
        currentDecoration = this.getValueOfPropertyAt(i, j, type);
        currentFill = this.getValueOfPropertyAt(i, j, FILL);
        currentTickness = this.getValueOfPropertyAt(
          i,
          j,
          TEXT_DECORATION_THICKNESS,
        );
        const currentSize = this.getHeightOfChar(i, j);
        const currentDy = this.getValueOfPropertyAt(i, j, 'deltaY');
        if (path && currentDecoration && currentFill) {
          const finalTickness = (this.fontSize * currentTickness) / 1000;
          ctx.save();
          // bug? verify lastFill is a valid fill here.
          ctx.fillStyle = lastFill as string;
          ctx.translate(charBox.renderLeft, charBox.renderTop);
          ctx.rotate(charBox.angle);
          ctx.fillRect(
            -charBox.kernedWidth / 2,
            offsetY * currentSize + currentDy - offsetAligner * finalTickness,
            charBox.kernedWidth,
            finalTickness,
          );
          ctx.restore();
        } else if (
          (currentDecoration !== lastDecoration ||
            currentFill !== lastFill ||
            currentSize !== size ||
            currentTickness !== lastTickness ||
            currentDy !== dy) &&
          boxWidth > 0
        ) {
          const finalTickness = (this.fontSize * lastTickness) / 1000;
          let drawStart = leftOffset + lineLeftOffset + boxStart;
          if (this.direction === RTL) {
            drawStart = this.width - drawStart - boxWidth;
          }
          if (lastDecoration && lastFill && lastTickness) {
            // bug? verify lastFill is a valid fill here.
            ctx.fillStyle = lastFill as string;
            ctx.fillRect(
              drawStart,
              top + offsetY * size + dy - offsetAligner * finalTickness,
              boxWidth,
              finalTickness,
            );
          }
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastDecoration = currentDecoration;
          lastTickness = currentTickness;
          lastFill = currentFill;
          size = currentSize;
          dy = currentDy;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      let drawStart = leftOffset + lineLeftOffset + boxStart;
      if (this.direction === RTL) {
        drawStart = this.width - drawStart - boxWidth;
      }
      ctx.fillStyle = currentFill as string;
      const finalTickness = (this.fontSize * currentTickness) / 1000;
      currentDecoration &&
        currentFill &&
        currentTickness &&
        ctx.fillRect(
          drawStart,
          top + offsetY * size + dy - offsetAligner * finalTickness,
          boxWidth - charSpacing,
          finalTickness,
        );
      topOffset += heightOfLine;
    }
    // if there is text background color no
    // other shadows should be casted
    this._removeShadow(ctx);
  }

  /**
   * 返回 canvas 上下文的字体声明字符串
   * @param {Object} [styleObject] 样式对象
   * @returns {String} 格式化为 canvas 上下文的字体声明
   *
   * return font declaration string for canvas context
   * @param {Object} [styleObject] object
   * @returns {String} font declaration formatted for canvas context.
   */
  _getFontDeclaration(
    {
      fontFamily = this.fontFamily,
      fontStyle = this.fontStyle,
      fontWeight = this.fontWeight,
      fontSize = this.fontSize,
    }: Partial<
      Pick<
        TextStyleDeclaration,
        'fontFamily' | 'fontStyle' | 'fontWeight' | 'fontSize'
      >
    > = {},
    forMeasuring?: boolean,
  ): string {
    const parsedFontFamily =
      fontFamily.includes("'") ||
      fontFamily.includes('"') ||
      fontFamily.includes(',') ||
      FabricText.genericFonts.includes(fontFamily.toLowerCase())
        ? fontFamily
        : `"${fontFamily}"`;
    return [
      fontStyle,
      fontWeight,
      `${forMeasuring ? this.CACHE_FONT_SIZE : fontSize}px`,
      parsedFontFamily,
    ].join(' ');
  }

  /**
   * 在指定上下文中渲染文本实例
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   *
   * Renders text instance on a specified context
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  render(ctx: CanvasRenderingContext2D) {
    if (!this.visible) {
      return;
    }
    if (
      this.canvas &&
      this.canvas.skipOffscreen &&
      !this.group &&
      !this.isOnScreen()
    ) {
      return;
    }
    if (this._forceClearCache) {
      this.initDimensions();
    }
    super.render(ctx);
  }

  /**
   * 重写此方法以自定义字素分割
   * @todo `graphemeSplit` 工具需要以某种方式注入。
   * 注入正确的工具比在原型链中间重写文本更舒适
   * @param {string} value
   * @returns {string[]} 字素数组
   *
   * Override this method to customize grapheme splitting
   * @todo the util `graphemeSplit` needs to be injectable in some way.
   * is more comfortable to inject the correct util rather than having to override text
   * in the middle of the prototype chain
   * @param {string} value
   * @returns {string[]} array of graphemes
   */
  graphemeSplit(value: string): string[] {
    return graphemeSplit(value);
  }

  /**
   * 将文本作为行数组返回。
   * @param {String} text 要分割的文本
   * @returns 文本中的行
   *
   * Returns the text as an array of lines.
   * @param {String} text text to split
   * @returns  Lines in the text
   */
  _splitTextIntoLines(text: string): TextLinesInfo {
    const lines = text.split(this._reNewline),
      newLines = new Array<string[]>(lines.length),
      newLine = ['\n'];
    let newText: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      newLines[i] = this.graphemeSplit(lines[i]);
      newText = newText.concat(newLines[i], newLine);
    }
    newText.pop();
    return {
      _unwrappedLines: newLines,
      lines: lines,
      graphemeText: newText,
      graphemeLines: newLines,
    };
  }

  /**
   * 返回实例的对象表示
   * @param {Array} [propertiesToInclude] 您可能希望在输出中额外包含的任何属性
   * @return {Object} 实例的对象表示
   *
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} Object representation of an instance
   */
  toObject<
    T extends Omit<Props & TClassProperties<this>, keyof SProps>,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SProps {
    return {
      ...super.toObject([...additionalProps, ...propertiesToInclude] as K[]),
      styles: stylesToArray(this.styles, this.text),
      ...(this.path ? { path: this.path.toObject() } : {}),
    };
  }
  /**
   * 设置属性值
   * @param key 属性名称或属性对象
   * @param value 属性值
   * @returns
   */
  set(key: string | any, value?: any) {
    const { textLayoutProperties } = this.constructor as typeof FabricText;
    super.set(key, value);
    let needsDims = false;
    let isAddingPath = false;
    if (typeof key === 'object') {
      for (const _key in key) {
        if (_key === 'path') {
          this.setPathInfo();
        }
        needsDims = needsDims || textLayoutProperties.includes(_key);
        isAddingPath = isAddingPath || _key === 'path';
      }
    } else {
      needsDims = textLayoutProperties.includes(key);
      isAddingPath = key === 'path';
    }
    if (isAddingPath) {
      this.setPathInfo();
    }
    if (needsDims && this.initialized) {
      this.initDimensions();
      this.setCoords();
    }
    return this;
  }

  /**
   * 返回实例的复杂度
   * @return {Number} 复杂度
   *
   * Returns complexity of an instance
   * @return {Number} complexity
   */
  complexity(): number {
    return 1;
  }

  /**
   * 通用字体系列列表
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font-family#generic-name
   *
   * List of generic font families
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/font-family#generic-name
   */
  static genericFonts = [
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-serif',
    'ui-sans-serif',
    'ui-monospace',
    'ui-rounded',
    'math',
    'emoji',
    'fangsong',
  ];

  /* _FROM_SVG_START_ */

  /**
   * 解析 SVG 元素时要考虑的属性名称列表（由 {@link FabricText.fromElement} 使用）
   * @see: http://www.w3.org/TR/SVG/text.html#TextElement
   *
   * List of attribute names to account for when parsing SVG element (used by {@link FabricText.fromElement})
   * @see: http://www.w3.org/TR/SVG/text.html#TextElement
   */
  static ATTRIBUTE_NAMES = SHARED_ATTRIBUTES.concat(
    'x',
    'y',
    'dx',
    'dy',
    'font-family',
    'font-style',
    'font-weight',
    'font-size',
    'letter-spacing',
    'text-decoration',
    'text-anchor',
  );

  /**
   * 从 SVG 元素返回 FabricText 实例（<b>尚未实现</b>）
   * @param {HTMLElement} element 要解析的元素
   * @param {Object} [options] 选项对象
   *
   * Returns FabricText instance from an SVG element (<b>not yet implemented</b>)
   * @param {HTMLElement} element Element to parse
   * @param {Object} [options] Options object
   */
  static async fromElement(
    element: HTMLElement | SVGElement,
    options?: Abortable,
    cssRules?: CSSRules,
  ) {
    const parsedAttributes = parseAttributes(
      element,
      FabricText.ATTRIBUTE_NAMES,
      cssRules,
    );

    const {
      textAnchor = LEFT as typeof LEFT | typeof CENTER | typeof RIGHT,
      textDecoration = '',
      dx = 0,
      dy = 0,
      top = 0,
      left = 0,
      fontSize = DEFAULT_SVG_FONT_SIZE,
      strokeWidth = 1,
      ...restOfOptions
    } = { ...options, ...parsedAttributes };

    const textContent = normalizeWs(element.textContent || '').trim();

    // this code here is probably the usual issue for SVG center find
    // this can later looked at again and probably removed.

    const text = new this(textContent, {
        left: left + dx,
        top: top + dy,
        underline: textDecoration.includes('underline'),
        overline: textDecoration.includes('overline'),
        linethrough: textDecoration.includes('line-through'),
        // we initialize this as 0
        strokeWidth: 0,
        fontSize,
        ...restOfOptions,
      }),
      textHeightScaleFactor = text.getScaledHeight() / text.height,
      lineHeightDiff =
        (text.height + text.strokeWidth) * text.lineHeight - text.height,
      scaledDiff = lineHeightDiff * textHeightScaleFactor,
      textHeight = text.getScaledHeight() + scaledDiff;

    let offX = 0;
    /*
      Adjust positioning:
        x/y attributes in SVG correspond to the bottom-left corner of text bounding box
        fabric output by default at top, left.
    */
    if (textAnchor === CENTER) {
      offX = text.getScaledWidth() / 2;
    }
    if (textAnchor === RIGHT) {
      offX = text.getScaledWidth();
    }
    text.set({
      left: text.left - offX,
      top:
        text.top -
        (textHeight - text.fontSize * (0.07 + text._fontSizeFraction)) /
          text.lineHeight,
      strokeWidth,
    });
    return text;
  }

  /* _FROM_SVG_END_ */

  /**
   * 从对象表示返回 FabricText 实例
   * @param {Object} object 用于创建实例的普通 js 对象
   * @returns {Promise<FabricText>}
   *
   * Returns FabricText instance from an object representation
   * @param {Object} object plain js Object to create an instance from
   * @returns {Promise<FabricText>}
   */
  static fromObject<
    T extends TOptions<SerializedTextProps>,
    S extends FabricText,
  >(object: T) {
    return this._fromObject<S>(
      {
        ...object,
        styles: stylesFromArray(object.styles || {}, object.text),
      },
      {
        extraParam: 'text',
      },
    );
  }
}

applyMixins(FabricText, [TextSVGExportMixin]);
classRegistry.setClass(FabricText);
classRegistry.setSVGClass(FabricText);
