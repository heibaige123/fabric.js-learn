/**
 * 配置类型定义
 */
export type TConfiguration = Partial<BaseConfiguration>;

/**
 * 基础配置类
 */
class BaseConfiguration {
  /**
   * 浏览器特定的常量，用于调整 CanvasRenderingContext2D.shadowBlur 值，
   * 该值是无单位的，并且在不同浏览器中的渲染效果不一致。
   *
   * (截至 2017 年 10 月) 效果较好的值如下：
   * - Chrome: 1.5
   * - Edge: 1.75
   * - Firefox: 0.9
   * - Safari: 0.95
   *
   * @since 2.0.0
   * @type Number
   * @default 1
   */
  browserShadowBlurConstant = 1;

  /**
   * 每英寸像素数 (PPI)，默认值为 96。可以更改以进行更真实的转换。
   */
  DPI = 96;

  /**
   * 设备像素比
   *
   * @see https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/SettingUptheCanvas/SettingUptheCanvas.html
   */
  devicePixelRatio =
    typeof window !== 'undefined' ? window.devicePixelRatio : 1; // eslint-disable-line no-restricted-globals

  /**
   * 缓存画布的像素限制。1Mpx, 4Mpx 应该没问题。
   *
   * @since 1.7.14
   * @type Number
   */
  perfLimitSizeTotal = 2097152;

  /**
   * 缓存画布宽度或高度的像素限制。IE 将最大值固定为 5000。
   *
   * @since 1.7.14
   * @type Number
   */
  maxCacheSideLimit = 4096;

  /**
   * 缓存画布的最低像素限制，设置为 256PX。
   *
   * @since 1.7.14
   * @type Number
   */
  minCacheSideLimit = 256;

  /**
   * 当为 'true' 时，复制/粘贴文本时不保留样式信息，使粘贴的文本使用目标样式。
   * 默认为 'false'。
   *
   * @type Boolean
   * @deprecated
   */
  disableStyleCopyPaste = false;

  /**
   * 启用 WebGL 进行图片过滤（如果可用）。
   * 将初始化过滤后端，这会占用内存和时间，因为将为 gl 上下文创建一个默认的 2048x2048 画布。
   *
   * @since 2.0.0
   * @type Boolean
   */
  enableGLFiltering = true;

  /**
   * 如果启用了 WebGL 并且可用，textureSize 将决定画布后端的大小。
   *
   * 为了支持旧硬件，请设置为 `2048` 以避免内存溢出 (OOM)。
   *
   * @since 2.0.0
   * @type Number
   */
  textureSize = 4096;

  /**
   * 跳过 setupGLContext 的性能测试，并强制使用 putImageData，这似乎是在 Chrome + 旧硬件上效果最好的方法。
   * 如果您的用户在过滤后遇到空白图像，您可以尝试将其强制设置为 true。
   * 必须在实例化过滤后端之前（在过滤第一个图像之前）设置此项。
   *
   * @type Boolean
   * @default false
   */
  forceGLPutImageData = false;

  /**
   * 如果禁用，则不使用 boundsOfCurveCache。对于大量使用铅笔绘图的应用程序，禁用它可能更好。
   * 由于 fabric 的标准行为是将所有曲线转换为绝对命令，并且不从曲线中减去起点，因此很难命中任何缓存。
   * 仅当您知道为什么它有用时才启用。
   * 移除/简化的候选者。
   *
   * With the standard behaviour of fabric to translate all curves in absolute commands and by not subtracting the starting point from
   * the curve is very hard to hit any cache.
   * Enable only if you know why it could be useful.
   * Candidate for removal/simplification
   * @default false
   */
  cachesBoundsOfCurve = false;

  /**
   * 字体文件的映射
   *
   * Map<fontFamily, pathToFile> 字体文件
   */
  fontPaths: Record</** fontFamily */ string, /** pathToFile */ string> = {};

  /**
   * 定义序列化对象值时使用的小数位数。
   * 用于导出方法 (`toObject`, `toJSON`, `toSVG`)。
   * 您可以使用它来增加/减少诸如 left, top, scaleX, scaleY 等值的精度。
   *
   */
  NUM_FRACTION_DIGITS = 4;
}

/**
 * 配置类
 */
export class Configuration extends BaseConfiguration {
  /**
   * 构造函数
   * @param config 配置对象
   */
  constructor(config?: TConfiguration) {
    super();
    this.configure(config);
  }

  /**
   * 配置设置
   * @param config 配置对象
   */
  configure(config: TConfiguration = {}) {
    Object.assign(this, config);
  }

  /**
   * 添加字体文件映射
   *
   * Map<fontFamily, pathToFile> 字体文件
   *
   * @param paths 字体路径映射
   */
  addFonts(
    paths: Record</** fontFamily */ string, /** pathToFile */ string> = {},
  ) {
    this.fontPaths = {
      ...this.fontPaths,
      ...paths,
    };
  }

  /**
   * 移除字体
   * @param fontFamilys 要移除的字体系列数组
   */
  removeFonts(fontFamilys: string[] = []) {
    fontFamilys.forEach((fontFamily) => {
      delete this.fontPaths[fontFamily];
    });
  }

  /**
   * 清除所有字体
   */
  clearFonts() {
    this.fontPaths = {};
  }

  /**
   * 恢复默认设置
   * @param keys 要恢复的键数组
   */
  restoreDefaults<T extends BaseConfiguration>(keys?: (keyof T)[]) {
    const defaults = new BaseConfiguration() as T;
    const config =
      keys?.reduce((acc, key) => {
        acc[key] = defaults[key];
        return acc;
      }, {} as T) || defaults;
    this.configure(config);
  }
}
/**
 * 全局配置实例
 */
export const config = new Configuration();
