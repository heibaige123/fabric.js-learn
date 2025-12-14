import { config } from './config';
import type { TRectBounds } from './typedefs';

/**
 * 字符宽度缓存类型
 * Map<字符, 宽度>
 */
type TextCouplesCache = Map</** char */ string, /** width */ number>;

/**
 * 字体样式缓存类型
 * Map<字体样式键, 字符宽度缓存>
 */
type FamilyCache = Map</** fontStyleCacheKey */ string, TextCouplesCache>;

/**
 * 缓存类
 */
export class Cache {
  /**
   * 文本渲染中字符宽度的缓存。
   *
   * Cache of widths of chars in text rendering.
   */
  declare charWidthsCache: Map</** fontFamily */ string, FamilyCache>;

  constructor() {
    this.charWidthsCache = new Map();
  }

  /**
   * 获取字体缓存
   * @param {Object} options 字体选项
   * @param {string} options.fontFamily 字体系列
   * @param {string} options.fontStyle 字体样式
   * @param {string | number} options.fontWeight 字体粗细
   * @return {Object} 缓存引用
   *
   * @return {Object} reference to cache
   */
  getFontCache({
    fontFamily,
    fontStyle,
    fontWeight,
  }: {
    fontFamily: string;
    fontStyle: string;
    fontWeight: string | number;
  }): TextCouplesCache {
    fontFamily = fontFamily.toLowerCase();
    const cache = this.charWidthsCache;
    if (!cache.has(fontFamily)) {
      cache.set(fontFamily, new Map<string, TextCouplesCache>());
    }
    const fontCache = cache.get(fontFamily)!;
    const cacheKey = `${fontStyle.toLowerCase()}_${(
      fontWeight + ''
    ).toLowerCase()}`;
    if (!fontCache.has(cacheKey)) {
      fontCache.set(cacheKey, new Map<string, number>());
    }
    return fontCache.get(cacheKey)!;
  }

  /**
   * 清除给定字体系列的字符宽度缓存，如果未指定 fontFamily，则清除所有缓存。
   * 如果您知道正在以延迟方式加载字体，并且在向画布添加文本对象时不等待自定义字体正确加载，请使用它。
   * 如果在添加文本对象时尚未加载其自己的字体，您将获得错误的测量结果，从而导致错误的边界框。
   * 清除字体缓存后，更改 textObject 文本内容或调用 initDimensions() 以触发重新计算。
   * @param {String} [fontFamily] 要清除的字体系列
   *
   * Clear char widths cache for the given font family or all the cache if no
   * fontFamily is specified.
   * Use it if you know you are loading fonts in a lazy way and you are not waiting
   * for custom fonts to load properly when adding text objects to the canvas.
   * If a text object is added when its own font is not loaded yet, you will get wrong
   * measurement and so wrong bounding boxes.
   * After the font cache is cleared, either change the textObject text content or call
   * initDimensions() to trigger a recalculation
   * @param {String} [fontFamily] font family to clear
   */
  clearFontCache(fontFamily?: string) {
    if (!fontFamily) {
      this.charWidthsCache = new Map();
    } else {
      this.charWidthsCache.delete((fontFamily || '').toLowerCase());
    }
  }

  /**
   * 给定当前纵横比，确定可以遵守缓存总允许面积的最大宽度和高度。
   * @param {number} ar 纵横比
   * @return {number[]} 限制后的尺寸 X 和 Y
   *
   * Given current aspect ratio, determines the max width and height that can
   * respect the total allowed area for the cache.
   * @param {number} ar aspect ratio
   * @return {number[]} Limited dimensions X and Y
   */
  limitDimsByArea(ar: number) {
    const { perfLimitSizeTotal } = config;
    const roughWidth = Math.sqrt(perfLimitSizeTotal * ar);
    // we are not returning a point on purpose, to avoid circular dependencies
    // this is an internal utility
    return [
      Math.floor(roughWidth),
      Math.floor(perfLimitSizeTotal / roughWidth),
    ];
  }

  /**
   * 此对象保存 boundsOfCurve 计算的结果，该结果由计算所需的连接参数映射。
   * 如果您总是解析并添加相同的路径，它确实会加快计算速度，但在大量使用自由绘图的情况下，
   * 您不会获得任何速度优势，并且会在内存中获得一个大对象。
   * 该对象以前是一个私有变量，现在附加到库中，以便您可以访问它并最终清除它。
   * 它是一个内部变量，自 2.3.4 版本起可访问
   *
   * This object keeps the results of the boundsOfCurve calculation mapped by the joined arguments necessary to calculate it.
   * It does speed up calculation, if you parse and add always the same paths, but in case of heavy usage of freedrawing
   * you do not get any speed benefit and you get a big object in memory.
   * The object was a private variable before, while now is appended to the lib so that you have access to it and you
   * can eventually clear it.
   * It was an internal variable, is accessible since version 2.3.4
   */
  boundsOfCurveCache: Record<string, TRectBounds> = {};
}

/**
 * 全局缓存实例
 */
export const cache = new Cache();
