import { iMatrix } from '../constants';
import type { FabricObject } from '../shapes/Object/FabricObject';
import type { TFiller, TMat2D, TOptions } from '../typedefs';

/**
 * Canvas 可绘制对象选项接口
 */
interface CanvasDrawableOptions {
  /**
   * 如果设置为 false，背景图像不受视口变换的影响
   * @since 1.6.3
   * @type Boolean
   * @todo we should really find a different way to do this
   */
  backgroundVpt: boolean;

  /**
   * Canvas 实例的背景颜色。
   */
  backgroundColor: TFiller | string;

  /**
   * Canvas 实例的背景图像。
   * 自 2.4.0 起，在将图像作为背景时，图像缓存处于激活状态
   * 向 canvas 属性添加对其所在的 canvas 的引用。否则图像无法检测缩放值。
   * 或者，您可以禁用图像 objectCaching。
   */
  backgroundImage?: FabricObject;

  /**
   * 如果设置为 false，覆盖图像不受视口变换的影响
   *
   * @since 1.6.3
   * @type Boolean
   * @todo we should really find a different way to do this
   */
  overlayVpt: boolean;

  /**
   * Canvas 实例的覆盖颜色。
   * @since 1.3.9
   * @type {(String|TFiller)}
   */
  overlayColor: TFiller | string;

  /**
   * Canvas 实例的覆盖图像。
   * 自 2.4.0 起，请在将图像作为覆盖时，图像缓存处于激活状态，，
   * 向 canvas 属性添加对其所在的 canvas 的引用。否则图像无法检测缩放值。
   * 或者，您可以禁用图像 objectCaching。
   *
   */
  overlayImage?: FabricObject;
}

/**
 * Canvas 渲染选项接口
 */
interface CanvasRenderingOptions {
  /**
   * 指示 {@link StaticCanvas#add}, {@link StaticCanvas#insertAt} 和 {@link StaticCanvas#remove},
   * {@link StaticCanvas#moveTo}, {@link StaticCanvas#clear} 等方法是否也应重新渲染 canvas。
   * 当一次向 canvas 添加/删除大量对象时，禁用此选项不会提高性能，
   * 因为渲染是排队的，每帧执行一次。
   * 无论如何建议禁用，手动管理应用程序的渲染并不是很大的工作量 ( canvas.requestRenderAll() )
   * 默认保留为 true，以免破坏文档和旧的应用程序、fiddles。
   * @type Boolean
   */
  renderOnAddRemove: boolean;

  /**
   * 基于 vptCoords 和 object.aCoords，跳过不在当前视口中的对象的渲染。
   * 在具有拥挤的 canvas 和使用缩放/平移的应用程序中可能会有很大帮助。
   * 如果对象的边界框的一个角在 canvas 上，则对象会被渲染。
   * @type Boolean
   * @default true
   */
  skipOffscreen: boolean;

  /**
   * 当为 true 时，canvas 按 devicePixelRatio 缩放，以便在视网膜屏幕上更好地渲染
   * @type Boolean
   */
  enableRetinaScaling: boolean;

  /**
   * 指示此 canvas 是否将使用图像平滑，这在浏览器中默认开启
   * @type Boolean
   */
  imageSmoothingEnabled: boolean;

  /**
   * 一个 fabricObject，如果没有描边，则用其形状定义剪切区域。填充为黑色
   * clipPath 对象在 canvas 渲染时使用，上下文放置在 canvas 的左上角。
   * clipPath 将剪切掉控件，如果您不希望发生这种情况，请使用 controlsAboveOverlay = true
   * @type FabricObject
   */
  clipPath?: FabricObject;
}

/**
 * Canvas 导出选项接口
 */
export interface CanvasExportOptions {
  /**
   * 指示 toObject/toDatalessObject 是否应包含默认值
   * 如果设置为 false，则优先于对象值。
   */
  includeDefaultValues: boolean;

  /**
   * 当为 true 时，getSvgTransform() 将把 StaticCanvas.viewportTransform 应用于 SVG 变换。使用缩放后的 canvas 将产出缩放的 SVG。
   */
  svgViewportTransformation: boolean;
}

/**
 * 静态 Canvas 选项接口
 */
export interface StaticCanvasOptions
  extends CanvasDrawableOptions,
    CanvasRenderingOptions,
    CanvasExportOptions {
  /**
   * Canvas 的虚拟/逻辑像素宽度。
   * 如果视网膜缩放处于活动状态，canvas 可以大于宽度
   */
  width: number;

  /**
   * Canvas 的虚拟/逻辑像素高度。
   * 如果视网膜缩放处于活动状态，canvas 可以高于宽度
   */
  height: number;

  /**
   * 指示对象控件（边框/控件）是否渲染在覆盖图像之上
   *
   *
   * @todo move to Canvas
   */
  controlsAboveOverlay: boolean;

  /**
   * 指示在使用触摸屏并在 canvas 上拖动时是否可以滚动浏览器
   * 它优先考虑 DOM 滚动，但这并不总是可能的。
   * 如果为 true，当在 canvas 上使用触摸事件时，如果可以滚动，canvas 将滚动。
   * 如果我们处于绘制模式或正在选择对象，canvas 会 preventDefault，因此不会滚动
   *
   * @todo move to Canvas
   */
  allowTouchScrolling: boolean;

  /**
   * 聚焦视口的变换（Canvas 2D API 变换矩阵）
   *
   * @example <caption>Default transform</caption>
   * canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
   * @example <caption>Scale by 70% and translate toward bottom-right by 50, without skewing</caption>
   * canvas.viewportTransform = [0.7, 0, 0, 0.7, 50, 50];
   */
  viewportTransform: TMat2D;
}

/**
 * 静态 Canvas 默认选项
 */
export const staticCanvasDefaults: TOptions<StaticCanvasOptions> = {
  backgroundVpt: true,
  backgroundColor: '',
  overlayVpt: true,
  overlayColor: '',

  includeDefaultValues: true,
  svgViewportTransformation: true,

  renderOnAddRemove: true,
  skipOffscreen: true,
  enableRetinaScaling: true,
  imageSmoothingEnabled: true,

  /**
   * @todo move to Canvas
   */
  controlsAboveOverlay: false,
  /**
   * @todo move to Canvas
   */
  allowTouchScrolling: false,

  viewportTransform: [...iMatrix],

  /**
   * 图案质量类型定义
   *
   * - fast 使用低质量的缩放算法进行图案渲染
   * - good 使用中等质量的缩放算法进行图案渲染
   * - best 使用高质量的缩放算法进行图案渲染
   * - nearest 使用最近邻插值进行图案渲染
   * - bilinear 使用双线性插值进行图案渲染
   */
  patternQuality: 'best',
};
