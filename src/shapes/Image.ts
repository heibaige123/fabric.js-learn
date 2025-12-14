import { getFabricDocument, getEnv } from '../env';
import type { BaseFilter } from '../filters/BaseFilter';
import { getFilterBackend } from '../filters/FilterBackend';
import { SHARED_ATTRIBUTES } from '../parser/attributes';
import { parseAttributes } from '../parser/parseAttributes';
import type {
  TClassProperties,
  TCrossOrigin,
  TSize,
  Abortable,
  TOptions,
} from '../typedefs';
import { uid } from '../util/internals/uid';
import { createCanvasElementFor } from '../util/misc/dom';
import { findScaleToCover, findScaleToFit } from '../util/misc/findScaleTo';
import type { LoadImageOptions } from '../util/misc/objectEnlive';
import {
  enlivenObjectEnlivables,
  enlivenObjects,
  loadImage,
} from '../util/misc/objectEnlive';
import { parsePreserveAspectRatioAttribute } from '../util/misc/svgParsing';
import { classRegistry } from '../ClassRegistry';
import { FabricObject, cacheProperties } from './Object/FabricObject';
import type { FabricObjectProps, SerializedObjectProps } from './Object/types';
import type { ObjectEvents } from '../EventTypeDefs';
import { WebGLFilterBackend } from '../filters/WebGLFilterBackend';
import { FILL, NONE } from '../constants';
import { getDocumentFromElement } from '../util/dom_misc';
import type { CSSRules } from '../parser/typedefs';
import type { Resize, ResizeSerializedProps } from '../filters/Resize';
import type { TCachedFabricObject } from './Object/Object';
import { log } from '../util/internals/console';

// @todo Would be nice to have filtering code not imported directly.

/**
 * 图片源类型
 */
export type ImageSource =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement;

/**
 * 解析后的保持纵横比偏移量
 */
export type ParsedPAROffsets = {
  /**
   * 宽度
   */
  width: number;
  /**
   * 高度
   */
  height: number;
  /**
   * X轴缩放
   */
  scaleX: number;
  /**
   * Y轴缩放
   */
  scaleY: number;
  /**
   * 左侧偏移
   */
  offsetLeft: number;
  /**
   * 顶部偏移
   */
  offsetTop: number;
  /**
   * X轴裁剪
   */
  cropX: number;
  /**
   * Y轴裁剪
   */
  cropY: number;
};

/**
 * 图片独有的属性接口
 */
interface UniqueImageProps {
  /**
   * 是否从属性中获取 src
   */
  srcFromAttribute: boolean;
  /**
   * 最小缩放触发器
   */
  minimumScaleTrigger: number;
  /**
   * X轴裁剪
   */
  cropX: number;
  /**
   * Y轴裁剪
   */
  cropY: number;
  /**
   * 图片平滑处理
   */
  imageSmoothing: boolean;
  /**
   * 滤镜列表
   */
  filters: BaseFilter<string, Record<string, any>>[];
  /**
   * 调整大小滤镜
   */
  resizeFilter?: Resize;
}

/**
 * 图片默认值
 */
export const imageDefaultValues: Partial<TClassProperties<FabricImage>> = {
  /**
   * 描边宽度
   */
  strokeWidth: 0,
  /**
   * 是否从属性中获取 src
   */
  srcFromAttribute: false,
  /**
   * 最小缩放触发器
   */
  minimumScaleTrigger: 0.5,
  /**
   * X轴裁剪
   */
  cropX: 0,
  /**
   * Y轴裁剪
   */
  cropY: 0,
  /**
   * 图片平滑处理
   */
  imageSmoothing: true,
};

/**
 * 序列化图片属性接口
 */
export interface SerializedImageProps extends SerializedObjectProps {
  /**
   * 图片源地址
   */
  src: string;
  /**
   * 跨域设置
   */
  crossOrigin: TCrossOrigin;
  /**
   * 滤镜列表
   */
  filters: any[];
  /**
   * 调整大小滤镜
   */
  resizeFilter?: ResizeSerializedProps;
  /**
   * X轴裁剪
   */
  cropX: number;
  /**
   * Y轴裁剪
   */
  cropY: number;
}

/**
 * 图片属性接口
 */
export interface ImageProps extends FabricObjectProps, UniqueImageProps {}

/**
 * 图片属性列表
 */
const IMAGE_PROPS = ['cropX', 'cropY'] as const;

/**
 * 图片类
 * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-1#images}
 */
export class FabricImage<
    Props extends TOptions<ImageProps> = Partial<ImageProps>,
    SProps extends SerializedImageProps = SerializedImageProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  >
  extends FabricObject<Props, SProps, EventSpec>
  implements ImageProps
{
  /**
   * 当调用 {@link FabricImage.getSrc} 时，从元素 src 返回值 `element.getAttribute('src')`。
   * 这允许将相对 url 用作图像 src。
   *
   * When calling {@link FabricImage.getSrc}, return value from element src with `element.getAttribute('src')`.
   * This allows for relative urls as image src.
   * @since 2.7.0
   * @type Boolean
   * @default false
   */
  declare srcFromAttribute: boolean;

  /**
   * 私有
   * 包含 scaleX 的最后一个值，用于检测
   * 图像是否在上次渲染后调整了大小
   *
   * private
   * contains last value of scaleX to detect
   * if the Image got resized after the last Render
   * @type Number
   */
  protected _lastScaleX = 1;

  /**
   * 私有
   * 包含 scaleY 的最后一个值，用于检测
   * 图像是否在上次渲染后调整了大小
   *
   * private
   * contains last value of scaleY to detect
   * if the Image got resized after the last Render
   * @type Number
   */
  protected _lastScaleY = 1;

  /**
   * 私有
   * 包含应用过滤器链应用的缩放的最后一个值
   *
   * private
   * contains last value of scaling applied by the apply filter chain
   * @type Number
   */
  protected _filterScalingX = 1;

  /**
   * 私有
   * 包含应用过滤器链应用的缩放的最后一个值
   *
   * private
   * contains last value of scaling applied by the apply filter chain
   * @type Number
   */
  protected _filterScalingY = 1;

  /**
   * 最小缩放因子，在该因子下触发任何 resizeFilter 以调整图像大小
   * 0 将禁用自动调整大小。1 将始终自动触发。
   * 大于 1 的数字尚未实现。
   *
   * minimum scale factor under which any resizeFilter is triggered to resize the image
   * 0 will disable the automatic resize. 1 will trigger automatically always.
   * number bigger than 1 are not implemented yet.
   * @type Number
   */
  declare minimumScaleTrigger: number;

  /**
   * 用于检索表示此图像的纹理的键
   *
   * key used to retrieve the texture representing this image
   * @since 2.0.0
   * @type String
   */
  declare cacheKey: string;

  /**
   * 图像裁剪（以像素为单位），相对于原始图像大小。
   *
   * Image crop in pixels from original image size.
   * @since 2.0.0
   * @type Number
   */
  declare cropX: number;

  /**
   * 图像裁剪（以像素为单位），相对于原始图像大小。
   *
   * Image crop in pixels from original image size.
   * @since 2.0.0
   * @type Number
   */
  declare cropY: number;

  /**
   * 指示此画布在绘制此图像时是否使用图像平滑。
   * 还会影响此图像的 cacheCanvas 是否使用 imageSmoothing
   *
   * Indicates whether this canvas will use image smoothing when painting this image.
   * Also influence if the cacheCanvas for this image uses imageSmoothing
   * @since 4.0.0-beta.11
   * @type Boolean
   */
  declare imageSmoothing: boolean;

  /**
   * 保持纵横比
   */
  declare preserveAspectRatio: string;

  /**
   * 图片源地址
   */
  declare protected src: string;

  /**
   * 滤镜列表
   */
  declare filters: BaseFilter<string, Record<string, any>>[];
  /**
   * 调整大小滤镜
   */
  declare resizeFilter: Resize;

  /**
   * 图片元素
   */
  declare _element: ImageSource;
  /**
   * 过滤后的元素
   */
  declare _filteredEl?: HTMLCanvasElement;
  /**
   * 原始元素
   */
  declare _originalElement: ImageSource;

  /**
   * 类型
   */
  static type = 'Image';

  /**
   * 缓存属性
   */
  static cacheProperties = [...cacheProperties, ...IMAGE_PROPS];

  /**
   * 自身默认值
   */
  static ownDefaults = imageDefaultValues;

  /**
   * 获取默认值
   * @returns 默认值对象
   */
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...FabricImage.ownDefaults,
    };
  }
  /**
   * 构造函数
   * 图像可以使用任何画布可绘制对象或字符串进行初始化。
   * 字符串应该是一个 url，并将作为图像加载。
   * Canvas 和 Image 元素开箱即用，而视频需要额外的代码才能工作。
   * 请检查视频元素事件以进行搜索。
   *
   * Constructor
   * Image can be initialized with any canvas drawable or a string.
   * The string should be a url and will be loaded as an image.
   * Canvas and Image element work out of the box, while videos require extra code to work.
   * Please check video element events for seeking.
   * @param {ImageSource | string} element Image element
   * @param {Object} [options] Options object
   */
  constructor(elementId: string, options?: Props);
  constructor(element: ImageSource, options?: Props);
  constructor(arg0: ImageSource | string, options?: Props) {
    super();
    this.filters = [];
    Object.assign(this, FabricImage.ownDefaults);
    this.setOptions(options);
    this.cacheKey = `texture${uid()}`;
    this.setElement(
      typeof arg0 === 'string'
        ? ((
            (this.canvas && getDocumentFromElement(this.canvas.getElement())) ||
            getFabricDocument()
          ).getElementById(arg0) as ImageSource)
        : arg0,
      options,
    );
  }

  /**
   * 返回此实例基于的图像元素
   *
   * Returns image element which this instance if based on
   */
  getElement() {
    return this._element;
  }

  /**
   * 将此实例的图像元素设置为指定的元素。
   * 如果定义了过滤器，它们将应用于新图像。
   * 替换后，您可能需要调用 `canvas.renderAll` 和 `object.setCoords`，以渲染新图像并更新控件区域。
   *
   * Sets image element for this instance to a specified one.
   * If filters defined they are applied to new image.
   * You might need to call `canvas.renderAll` and `object.setCoords` after replacing, to render new image and update controls area.
   * @param {HTMLImageElement} element
   * @param {Partial<TSize>} [size] Options object
   */
  setElement(element: ImageSource, size: Partial<TSize> = {}) {
    this.removeTexture(this.cacheKey);
    this.removeTexture(`${this.cacheKey}_filtered`);
    this._element = element;
    this._originalElement = element;
    this._setWidthHeight(size);
    if (this.filters.length !== 0) {
      this.applyFilters();
    }
    // resizeFilters work on the already filtered copy.
    // we need to apply resizeFilters AFTER normal filters.
    // applyResizeFilters is run more often than normal filters
    // and is triggered by user interactions rather than dev code
    if (this.resizeFilter) {
      this.applyResizeFilters();
    }
  }

  /**
   * 如果处于 webgl 模式，则删除单个纹理
   *
   * Delete a single texture if in webgl mode
   */
  removeTexture(key: string) {
    const backend = getFilterBackend(false);
    if (backend instanceof WebGLFilterBackend) {
      backend.evictCachesForKey(key);
    }
  }

  /**
   * 删除纹理、对元素的引用以及最终的 JSDOM 清理
   *
   * Delete textures, reference to elements and eventually JSDOM cleanup
   */
  dispose() {
    super.dispose();
    this.removeTexture(this.cacheKey);
    this.removeTexture(`${this.cacheKey}_filtered`);
    this._cacheContext = null;
    (
      ['_originalElement', '_element', '_filteredEl', '_cacheCanvas'] as const
    ).forEach((elementKey) => {
      const el = this[elementKey];
      el && getEnv().dispose(el);
      // @ts-expect-error disposing
      this[elementKey] = undefined;
    });
  }

  /**
   * 获取 crossOrigin 值（对应图像元素的）
   *
   * Get the crossOrigin value (of the corresponding image element)
   */
  getCrossOrigin(): string | null {
    return (
      this._originalElement &&
      ((this._originalElement as any).crossOrigin || null)
    );
  }

  /**
   * 返回图像的原始大小
   *
   * Returns original size of an image
   */
  getOriginalSize() {
    const element = this.getElement() as any;
    if (!element) {
      return {
        width: 0,
        height: 0,
      };
    }
    return {
      width: element.naturalWidth || element.width,
      height: element.naturalHeight || element.height,
    };
  }

  /**
   * 描边图像的边框
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _stroke(ctx: CanvasRenderingContext2D) {
    if (!this.stroke || this.strokeWidth === 0) {
      return;
    }
    const w = this.width / 2,
      h = this.height / 2;
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(w, -h);
    ctx.lineTo(w, h);
    ctx.lineTo(-w, h);
    ctx.lineTo(-w, -h);
    ctx.closePath();
  }

  /**
   * 返回实例的对象表示
   *
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} Object representation of an instance
   */
  toObject<
    T extends Omit<Props & TClassProperties<this>, keyof SProps>,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SProps {
    const filters: Record<string, any>[] = [];
    this.filters.forEach((filterObj) => {
      filterObj && filters.push(filterObj.toObject());
    });
    return {
      ...super.toObject([...IMAGE_PROPS, ...propertiesToInclude]),
      src: this.getSrc(),
      crossOrigin: this.getCrossOrigin(),
      filters,
      ...(this.resizeFilter
        ? { resizeFilter: this.resizeFilter.toObject() }
        : {}),
    };
  }

  /**
   * 如果图像应用了裁剪，则返回 true，检查 cropX、cropY、width、height 的值。
   *
   * Returns true if an image has crop applied, inspecting values of cropX,cropY,width,height.
   * @return {Boolean}
   */
  hasCrop() {
    return (
      !!this.cropX ||
      !!this.cropY ||
      this.width < this._element.width ||
      this.height < this._element.height
    );
  }

  /**
   * 返回实例的 svg 表示
   *
   * Returns svg representation of an instance
   * @return {string[]} an array of strings with the specific svg representation
   * of the instance
   */
  _toSVG() {
    const imageMarkup: string[] = [],
      element = this._element,
      x = -this.width / 2,
      y = -this.height / 2;
    let svgString: string[] = [],
      strokeSvg: string[] = [],
      clipPath = '',
      imageRendering = '';
    if (!element) {
      return [];
    }
    if (this.hasCrop()) {
      const clipPathId = uid();
      svgString.push(
        '<clipPath id="imageCrop_' + clipPathId + '">\n',
        '\t<rect x="' +
          x +
          '" y="' +
          y +
          '" width="' +
          this.width +
          '" height="' +
          this.height +
          '" />\n',
        '</clipPath>\n',
      );
      clipPath = ' clip-path="url(#imageCrop_' + clipPathId + ')" ';
    }
    if (!this.imageSmoothing) {
      imageRendering = ' image-rendering="optimizeSpeed"';
    }
    imageMarkup.push(
      '\t<image ',
      'COMMON_PARTS',
      `xlink:href="${this.getSvgSrc(true)}" x="${x - this.cropX}" y="${
        y - this.cropY
        // we're essentially moving origin of transformation from top/left corner to the center of the shape
        // by wrapping it in container <g> element with actual transformation, then offsetting object to the top/left
        // so that object's center aligns with container's left/top
      }" width="${
        element.width || (element as HTMLImageElement).naturalWidth
      }" height="${
        element.height || (element as HTMLImageElement).naturalHeight
      }"${imageRendering}${clipPath}></image>\n`,
    );

    if (this.stroke || this.strokeDashArray) {
      const origFill = this.fill;
      this.fill = null;
      strokeSvg = [
        `\t<rect x="${x}" y="${y}" width="${this.width}" height="${
          this.height
        }" style="${this.getSvgStyles()}" />\n`,
      ];
      this.fill = origFill;
    }
    if (this.paintFirst !== FILL) {
      svgString = svgString.concat(strokeSvg, imageMarkup);
    } else {
      svgString = svgString.concat(imageMarkup, strokeSvg);
    }
    return svgString;
  }

  /**
   * 返回图像的源
   *
   * Returns source of an image
   * @param {Boolean} filtered indicates if the src is needed for svg
   * @return {String} Source of an image
   */
  getSrc(filtered?: boolean): string {
    const element = filtered ? this._element : this._originalElement;
    if (element) {
      if ((element as HTMLCanvasElement).toDataURL) {
        return (element as HTMLCanvasElement).toDataURL();
      }

      if (this.srcFromAttribute) {
        return element.getAttribute('src') || '';
      } else {
        return (element as HTMLImageElement).src;
      }
    } else {
      return this.src || '';
    }
  }

  /**
   * getSrc 的别名
   *
   * Alias for getSrc
   * @param filtered
   * @deprecated
   */
  getSvgSrc(filtered?: boolean) {
    return this.getSrc(filtered);
  }

  /**
   * 加载并设置图像的源
   * **重要**：建议在调用此方法之前中止加载任务，以防止竞争条件和不必要的网络
   *
   * Loads and sets source of an image\
   * **IMPORTANT**: It is recommended to abort loading tasks before calling this method to prevent race conditions and unnecessary networking
   * @param {String} src Source string (URL)
   * @param {LoadImageOptions} [options] Options object
   */
  setSrc(src: string, { crossOrigin, signal }: LoadImageOptions = {}) {
    return loadImage(src, { crossOrigin, signal }).then((img) => {
      typeof crossOrigin !== 'undefined' && this.set({ crossOrigin });
      this.setElement(img);
    });
  }

  /**
   * 返回实例的字符串表示
   *
   * Returns string representation of an instance
   * @return {String} String representation of an instance
   */
  toString() {
    return `#<Image: { src: "${this.getSrc()}" }>`;
  }

  /**
   * 应用调整大小滤镜
   */
  applyResizeFilters() {
    const filter = this.resizeFilter,
      minimumScale = this.minimumScaleTrigger,
      objectScale = this.getTotalObjectScaling(),
      scaleX = objectScale.x,
      scaleY = objectScale.y,
      elementToFilter = this._filteredEl || this._originalElement;
    if (this.group) {
      this.set('dirty', true);
    }
    if (!filter || (scaleX > minimumScale && scaleY > minimumScale)) {
      this._element = elementToFilter;
      this._filterScalingX = 1;
      this._filterScalingY = 1;
      this._lastScaleX = scaleX;
      this._lastScaleY = scaleY;
      return;
    }
    const canvasEl = createCanvasElementFor(elementToFilter),
      { width, height } = elementToFilter;
    this._element = canvasEl;
    this._lastScaleX = filter.scaleX = scaleX;
    this._lastScaleY = filter.scaleY = scaleY;
    getFilterBackend().applyFilters(
      [filter],
      elementToFilter,
      width,
      height,
      this._element,
    );
    this._filterScalingX = canvasEl.width / this._originalElement.width;
    this._filterScalingY = canvasEl.height / this._originalElement.height;
  }

  /**
   * 应用分配给此图像的过滤器（来自“filters”数组）或来自过滤器参数
   *
   * Applies filters assigned to this image (from "filters" array) or from filter param
   * @param {Array} filters to be applied
   * @param {Boolean} forResizing specify if the filter operation is a resize operation
   */
  applyFilters(
    filters: BaseFilter<string, Record<string, any>>[] = this.filters || [],
  ) {
    filters = filters.filter((filter) => filter && !filter.isNeutralState());
    this.set('dirty', true);

    // needs to clear out or WEBGL will not resize correctly
    this.removeTexture(`${this.cacheKey}_filtered`);

    if (filters.length === 0) {
      this._element = this._originalElement;
      // this is unsafe and needs to be rethinkend
      this._filteredEl = undefined;
      this._filterScalingX = 1;
      this._filterScalingY = 1;
      return;
    }

    const imgElement = this._originalElement,
      sourceWidth =
        (imgElement as HTMLImageElement).naturalWidth || imgElement.width,
      sourceHeight =
        (imgElement as HTMLImageElement).naturalHeight || imgElement.height;

    if (this._element === this._originalElement) {
      // if the _element a reference to _originalElement
      // we need to create a new element to host the filtered pixels
      const canvasEl = createCanvasElementFor({
        width: sourceWidth,
        height: sourceHeight,
      });
      this._element = canvasEl;
      this._filteredEl = canvasEl;
    } else if (this._filteredEl) {
      // if the _element is it own element,
      // and we also have a _filteredEl, then we clean up _filteredEl
      // and we assign it to _element.
      // in this way we invalidate the eventual old resize filtered element
      this._element = this._filteredEl;
      this._filteredEl
        .getContext('2d')!
        .clearRect(0, 0, sourceWidth, sourceHeight);
      // we also need to resize again at next renderAll, so remove saved _lastScaleX/Y
      this._lastScaleX = 1;
      this._lastScaleY = 1;
    }
    getFilterBackend().applyFilters(
      filters,
      this._originalElement,
      sourceWidth,
      sourceHeight,
      this._element as HTMLCanvasElement,
      this.cacheKey,
    );
    if (
      this._originalElement.width !== this._element.width ||
      this._originalElement.height !== this._element.height
    ) {
      this._filterScalingX = this._element.width / this._originalElement.width;
      this._filterScalingY =
        this._element.height / this._originalElement.height;
    }
  }

  /**
   * 描边并按顺序渲染
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  _render(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = this.imageSmoothing;
    if (this.isMoving !== true && this.resizeFilter && this._needsResize()) {
      this.applyResizeFilters();
    }
    this._stroke(ctx);
    this._renderPaintInOrder(ctx);
  }

  /**
   * 在目标上下文上绘制对象的缓存副本。
   * 它将为绘制操作设置 imageSmoothing
   *
   * Paint the cached copy of the object on the target context.
   * it will set the imageSmoothing for the draw operation
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  drawCacheOnCanvas(
    this: TCachedFabricObject<FabricImage>,
    ctx: CanvasRenderingContext2D,
  ) {
    ctx.imageSmoothingEnabled = this.imageSmoothing;
    super.drawCacheOnCanvas(ctx);
  }

  /**
   * 决定 FabricImage 是否应该缓存。创建自己的缓存级别
   * needsItsOwnCache 应该在对象绘制方法需要缓存步骤时使用。
   * 通常，您不会缓存组中的对象，因为外部组已被缓存。
   * 这是特殊的 Image 版本，我们希望尽可能避免缓存。
   * 本质上，图像不会从缓存中受益。它们可能需要缓存，在这种情况下我们会这样做。
   * 此外，缓存图像通常会导致细节丢失。
   * 应该进行全面的性能审计。
   *
   * Decide if the FabricImage should cache or not. Create its own cache level
   * needsItsOwnCache should be used when the object drawing method requires
   * a cache step.
   * Generally you do not cache objects in groups because the group outside is cached.
   * This is the special Image version where we would like to avoid caching where possible.
   * Essentially images do not benefit from caching. They may require caching, and in that
   * case we do it. Also caching an image usually ends in a loss of details.
   * A full performance audit should be done.
   * @return {Boolean}
   */
  shouldCache() {
    return this.needsItsOwnCache();
  }

  /**
   * 渲染填充
   * @param ctx 渲染上下文
   */
  _renderFill(ctx: CanvasRenderingContext2D) {
    const elementToDraw = this._element;
    if (!elementToDraw) {
      return;
    }
    const scaleX = this._filterScalingX,
      scaleY = this._filterScalingY,
      w = this.width,
      h = this.height,
      // crop values cannot be lesser than 0.
      cropX = Math.max(this.cropX, 0),
      cropY = Math.max(this.cropY, 0),
      elWidth =
        (elementToDraw as HTMLImageElement).naturalWidth || elementToDraw.width,
      elHeight =
        (elementToDraw as HTMLImageElement).naturalHeight ||
        elementToDraw.height,
      sX = cropX * scaleX,
      sY = cropY * scaleY,
      // the width height cannot exceed element width/height, starting from the crop offset.
      sW = Math.min(w * scaleX, elWidth - sX),
      sH = Math.min(h * scaleY, elHeight - sY),
      x = -w / 2,
      y = -h / 2,
      maxDestW = Math.min(w, elWidth / scaleX - cropX),
      maxDestH = Math.min(h, elHeight / scaleY - cropY);

    elementToDraw &&
      ctx.drawImage(elementToDraw, sX, sY, sW, sH, x, y, maxDestW, maxDestH);
  }

  /**
   * 需要检查图像是否需要调整大小
   *
   * needed to check if image needs resize
   * @private
   */
  _needsResize() {
    const scale = this.getTotalObjectScaling();
    return scale.x !== this._lastScaleX || scale.y !== this._lastScaleY;
  }

  /**
   * 重置宽度和高度为原始图像大小
   *
   * @private
   * @deprecated unused
   */
  _resetWidthHeight() {
    this.set(this.getOriginalSize());
  }

  /**
   * 设置图像对象的宽度和高度，使用元素或选项
   *
   * @private
   * Set the width and the height of the image object, using the element or the
   * options.
   */
  _setWidthHeight({ width, height }: Partial<TSize> = {}) {
    const size = this.getOriginalSize();
    this.width = width || size.width;
    this.height = height || size.height;
  }

  /**
   * 计算中心的偏移量和图像的缩放因子，以遵守 preserveAspectRatio 属性
   *
   * Calculate offset for center and scale factor for the image in order to respect
   * the preserveAspectRatio attribute
   * @private
   */
  parsePreserveAspectRatioAttribute(): ParsedPAROffsets {
    const pAR = parsePreserveAspectRatioAttribute(
        this.preserveAspectRatio || '',
      ),
      pWidth = this.width,
      pHeight = this.height,
      parsedAttributes = { width: pWidth, height: pHeight };
    let rWidth = this._element.width,
      rHeight = this._element.height,
      scaleX = 1,
      scaleY = 1,
      offsetLeft = 0,
      offsetTop = 0,
      cropX = 0,
      cropY = 0,
      offset;

    if (pAR && (pAR.alignX !== NONE || pAR.alignY !== NONE)) {
      if (pAR.meetOrSlice === 'meet') {
        scaleX = scaleY = findScaleToFit(this._element, parsedAttributes);
        offset = (pWidth - rWidth * scaleX) / 2;
        if (pAR.alignX === 'Min') {
          offsetLeft = -offset;
        }
        if (pAR.alignX === 'Max') {
          offsetLeft = offset;
        }
        offset = (pHeight - rHeight * scaleY) / 2;
        if (pAR.alignY === 'Min') {
          offsetTop = -offset;
        }
        if (pAR.alignY === 'Max') {
          offsetTop = offset;
        }
      }
      if (pAR.meetOrSlice === 'slice') {
        scaleX = scaleY = findScaleToCover(this._element, parsedAttributes);
        offset = rWidth - pWidth / scaleX;
        if (pAR.alignX === 'Mid') {
          cropX = offset / 2;
        }
        if (pAR.alignX === 'Max') {
          cropX = offset;
        }
        offset = rHeight - pHeight / scaleY;
        if (pAR.alignY === 'Mid') {
          cropY = offset / 2;
        }
        if (pAR.alignY === 'Max') {
          cropY = offset;
        }
        rWidth = pWidth / scaleX;
        rHeight = pHeight / scaleY;
      }
    } else {
      scaleX = pWidth / rWidth;
      scaleY = pHeight / rHeight;
    }
    return {
      width: rWidth,
      height: rHeight,
      scaleX,
      scaleY,
      offsetLeft,
      offsetTop,
      cropX,
      cropY,
    };
  }

  /**
   * 解析 SVG 元素时要考虑的属性名称列表（由 {@link FabricImage.fromElement} 使用）
   *
   * List of attribute names to account for when parsing SVG element (used by {@link FabricImage.fromElement})
   * @see {@link http://www.w3.org/TR/SVG/struct.html#ImageElement}
   */
  static ATTRIBUTE_NAMES = [
    ...SHARED_ATTRIBUTES,
    'x',
    'y',
    'width',
    'height',
    'preserveAspectRatio',
    'xlink:href',
    'href',
    'crossOrigin',
    'image-rendering',
  ];

  /**
   * 从其对象表示创建 FabricImage 实例
   *
   * Creates an instance of FabricImage from its object representation
   * @param {Object} object Object to create an instance from
   * @param {object} [options] Options object
   * @param {AbortSignal} [options.signal] handle aborting, see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
   * @returns {Promise<FabricImage>}
   */
  static fromObject<T extends TOptions<SerializedImageProps>>(
    { filters: f, resizeFilter: rf, src, crossOrigin, type, ...object }: T,
    options?: Abortable,
  ) {
    return Promise.all([
      loadImage(src!, { ...options, crossOrigin }),
      f && enlivenObjects<BaseFilter<string>>(f, options),
      // redundant - handled by enlivenObjectEnlivables, but nicely explicit
      rf ? enlivenObjects<Resize>([rf], options) : [],
      enlivenObjectEnlivables(object, options),
    ]).then(([el, filters = [], [resizeFilter], hydratedProps = {}]) => {
      return new this(el, {
        ...object,
        // TODO: passing src creates a difference between image creation and restoring from JSON
        src,
        filters,
        resizeFilter,
        ...hydratedProps,
      });
    });
  }

  /**
   * 从 URL 字符串创建 Image 实例
   *
   * Creates an instance of Image from an URL string
   * @param {String} url URL to create an image from
   * @param {LoadImageOptions} [options] Options object
   * @returns {Promise<FabricImage>}
   */
  static fromURL<T extends TOptions<ImageProps>>(
    url: string,
    { crossOrigin = null, signal }: LoadImageOptions = {},
    imageOptions?: T,
  ): Promise<FabricImage> {
    return loadImage(url, { crossOrigin, signal }).then(
      (img) => new this(img, imageOptions),
    );
  }

  /**
   * 从 SVG 元素返回 {@link FabricImage} 实例
   *
   * Returns {@link FabricImage} instance from an SVG element
   * @param {HTMLElement} element Element to parse
   * @param {Object} [options] Options object
   * @param {AbortSignal} [options.signal] handle aborting, see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
   * @param {Function} callback Callback to execute when Image object is created
   */
  static async fromElement(
    element: HTMLElement,
    options: Abortable = {},
    cssRules?: CSSRules,
  ) {
    const parsedAttributes = parseAttributes(
      element,
      this.ATTRIBUTE_NAMES,
      cssRules,
    );
    return this.fromURL(
      parsedAttributes['xlink:href'] || parsedAttributes['href'],
      options,
      parsedAttributes,
    ).catch((err) => {
      log('log', 'Unable to parse Image', err);
      return null;
    });
  }
}

classRegistry.setClass(FabricImage);
classRegistry.setSVGClass(FabricImage);
