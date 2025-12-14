import { config } from '../config';
import type { Abortable, TCrossOrigin, TMat2D, TSize } from '../typedefs';
import { ifNaN } from '../util/internals/ifNaN';
import { uid } from '../util/internals/uid';
import { loadImage } from '../util/misc/objectEnlive';
import { pick } from '../util/misc/pick';
import { toFixed } from '../util/misc/toFixed';
import { classRegistry } from '../ClassRegistry';
import type {
  PatternRepeat,
  PatternOptions,
  SerializedPatternOptions,
} from './types';
import { log } from '../util/internals/console';

/**
 * 图案类
 *
 * @see {@link http://fabric5.fabricjs.com/patterns demo}
 * @see {@link http://fabric5.fabricjs.com/dynamic-patterns demo}
 */
export class Pattern {
  static type = 'Pattern';

  /**
   * 类的旧标识符。建议使用 this.constructor.type 'Pattern'
   * 或 isPattern 等工具，或 instanceof 来识别代码中的图案。
   * 将在未来版本中删除
   *
   * Legacy identifier of the class. Prefer using this.constructor.type 'Pattern'
   * or utils like isPattern, or instance of to indentify a pattern in your code.
   * Will be removed in future versiones
   * @TODO add sustainable warning message
   * @type string
   * @deprecated
   */
  get type() {
    return 'pattern';
  }

  set type(value) {
    log('warn', 'Setting type has no effect', value);
  }

  /**
   * 图案重复方式
   *
   * @type PatternRepeat
   * @defaults
   */
  repeat: PatternRepeat = 'repeat';

  /**
   * 图案相对于对象左/上角的水平偏移量
   *
   * Pattern horizontal offset from object's left/top corner
   * @type Number
   */
  offsetX = 0;

  /**
   * 图案相对于对象左/上角的垂直偏移量
   *
   * Pattern vertical offset from object's left/top corner
   * @type Number
   */
  offsetY = 0;

  /**
   * 跨域设置
   *
   * @type TCrossOrigin
   */
  crossOrigin: TCrossOrigin = '';

  /**
   * 用于更改图案的变换矩阵，从 svg 导入。
   *
   * transform matrix to change the pattern, imported from svgs.
   * @todo verify if using the identity matrix as default makes the rest of the code more easy
   * @type Array
   */
  declare patternTransform?: TMat2D;

  /**
   * 图案的实际像素源
   *
   * The actual pixel source of the pattern
   */
  declare source: CanvasImageSource;

  /**
   * 如果为 true，则在画布序列化期间不会导出此对象
   *
   * If true, this object will not be exported during the serialization of a canvas
   * @type boolean
   */
  declare excludeFromExport?: boolean;

  /**
   * 用于 SVG 导出功能的 ID
   *
   * ID used for SVG export functionalities
   * @type number
   */
  declare readonly id: number;

  /**
   * 构造函数
   * @param options 选项对象
   *
   * Constructor
   * @param {Object} [options] Options object
   * @param {option.source} [source] the pattern source, eventually empty or a drawable
   */
  constructor(options: PatternOptions) {
    this.id = uid();
    Object.assign(this, options);
  }

  /**
   * 检查源是否为 <img> 元素
   * @returns 如果 {@link source} 是 <img> 元素则返回 true
   *
   * @returns true if {@link source} is an <img> element
   */
  isImageSource(): this is { source: HTMLImageElement } {
    return (
      !!this.source && typeof (this.source as HTMLImageElement).src === 'string'
    );
  }

  /**
   * 检查源是否为 <canvas> 元素
   * @returns 如果 {@link source} 是 <canvas> 元素则返回 true
   *
   * @returns true if {@link source} is a <canvas> element
   */
  isCanvasSource(): this is { source: HTMLCanvasElement } {
    return !!this.source && !!(this.source as HTMLCanvasElement).toDataURL;
  }

  /**
   * 将源转换为字符串
   * @returns 源的字符串表示
   */
  sourceToString(): string {
    return this.isImageSource()
      ? this.source.src
      : this.isCanvasSource()
        ? this.source.toDataURL()
        : '';
  }

  /**
   * 返回 CanvasPattern 的实例
   * @param ctx 创建图案的上下文
   * @returns CanvasPattern 实例
   *
   * Returns an instance of CanvasPattern
   * @param {CanvasRenderingContext2D} ctx Context to create pattern
   * @return {CanvasPattern}
   */
  toLive(ctx: CanvasRenderingContext2D): CanvasPattern | null {
    if (
      // if the image failed to load, return, and allow rest to continue loading
      !this.source ||
      // if an image
      (this.isImageSource() &&
        (!this.source.complete ||
          this.source.naturalWidth === 0 ||
          this.source.naturalHeight === 0))
    ) {
      return null;
    }

    return ctx.createPattern(this.source, this.repeat)!;
  }

  /**
   * 返回图案的对象表示
   * @param propertiesToInclude 您可能希望在输出中额外包含的任何属性
   * @returns 图案实例的对象表示
   *
   * Returns object representation of a pattern
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {object} Object representation of a pattern instance
   */
  toObject(propertiesToInclude: string[] = []): Record<string, any> {
    const { repeat, crossOrigin } = this;
    return {
      ...pick(this, propertiesToInclude as (keyof this)[]),
      type: 'pattern',
      source: this.sourceToString(),
      repeat,
      crossOrigin,
      offsetX: toFixed(this.offsetX, config.NUM_FRACTION_DIGITS),
      offsetY: toFixed(this.offsetY, config.NUM_FRACTION_DIGITS),
      patternTransform: this.patternTransform
        ? [...this.patternTransform]
        : null,
    };
  }

  /* _TO_SVG_START_ */
  /**
   * 返回图案的 SVG 表示
   * @param object 包含宽度和高度的对象
   * @returns SVG 字符串
   *
   * Returns SVG representation of a pattern
   */
  toSVG({ width, height }: TSize): string {
    const { source: patternSource, repeat, id } = this,
      patternOffsetX = ifNaN(this.offsetX / width, 0),
      patternOffsetY = ifNaN(this.offsetY / height, 0),
      patternWidth =
        repeat === 'repeat-y' || repeat === 'no-repeat'
          ? 1 + Math.abs(patternOffsetX || 0)
          : ifNaN((patternSource as HTMLImageElement).width / width, 0),
      patternHeight =
        repeat === 'repeat-x' || repeat === 'no-repeat'
          ? 1 + Math.abs(patternOffsetY || 0)
          : ifNaN((patternSource as HTMLImageElement).height / height, 0);

    return [
      `<pattern id="SVGID_${id}" x="${patternOffsetX}" y="${patternOffsetY}" width="${patternWidth}" height="${patternHeight}">`,
      `<image x="0" y="0" width="${
        (patternSource as HTMLImageElement).width
      }" height="${
        (patternSource as HTMLImageElement).height
      }" xlink:href="${this.sourceToString()}"></image>`,
      `</pattern>`,
      '',
    ].join('\n');
  }
  /* _TO_SVG_END_ */

  /**
   * 从对象创建图案实例
   * @param object 序列化的图案选项
   * @param options 可中止选项
   * @returns Promise<Pattern>
   */
  static async fromObject(
    {
      type,
      source,
      patternTransform,
      ...otherOptions
    }: SerializedPatternOptions,
    options?: Abortable,
  ): Promise<Pattern> {
    const img = await loadImage(source, {
      ...options,
      crossOrigin: otherOptions.crossOrigin,
    });
    return new this({
      ...otherOptions,
      patternTransform:
        patternTransform && (patternTransform.slice(0) as TMat2D),
      source: img,
    });
  }
}

classRegistry.setClass(Pattern);
// kept for compatibility reason
classRegistry.setClass(Pattern, 'pattern');
