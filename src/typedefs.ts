// https://www.typescriptlang.org/docs/handbook/utility-types.html
import type { Gradient } from './gradient/Gradient';
import type { Pattern } from './Pattern';
import type { XY, Point } from './Point';
import type { FabricObject as BaseFabricObject } from './shapes/Object/Object';

/**
 * 标称标签接口
 */
interface NominalTag<T> {
  /**
   * 标称标签
   */
  nominalTag?: T;
}

/**
 * 标称类型定义
 */
type Nominal<Type, Tag> = NominalTag<Tag> & Type;

/**
 * 提取非函数属性名称的类型
 */
type TNonFunctionPropertyNames<T> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

/**
 * 获取类中非函数属性的类型
 */
export type TClassProperties<T> = Pick<T, TNonFunctionPropertyNames<T>>;

// https://github.com/microsoft/TypeScript/issues/32080
/**
 * 构造函数类型
 */
export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * 角度枚举（用于标称类型）
 */
const enum Degree {}
/**
 * 弧度枚举（用于标称类型）
 */
const enum Radian {}

/**
 * 角度类型
 */
export type TDegree = Nominal<number, Degree>;
/**
 * 弧度类型
 */
export type TRadian = Nominal<number, Radian>;

/**
 * 坐标轴类型
 */
export type TAxis = 'x' | 'y';

/**
 * 坐标轴键名类型
 */
export type TAxisKey<T extends string> = `${T}${Capitalize<TAxis>}`;

/**
 * 填充类型（渐变或图案）
 */
export type TFiller = Gradient<'linear'> | Gradient<'radial'> | Pattern;

/**
 * 尺寸类型
 */
export type TSize = {
  /**
   * 宽度
   */
  width: number;
  /**
   * 高度
   */
  height: number;
};

/**
 * 边界框类型
 */
export type TBBox = {
  /**
   * 左侧位置
   */
  left: number;
  /**
   * 顶部位置
   */
  top: number;
} & TSize;

/**
 * 百分比字符串类型
 */
export type Percent = `${number}%`;

/**
 * 图片格式类型
 *
 * In order to support webp on node canvas a workaround is needed and is shared here:
 * https://github.com/Automattic/node-canvas/issues/1258
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * SVG 元素名称类型
 */
export type SVGElementName = 'linearGradient' | 'radialGradient' | 'stop';

/**
 * 支持的 SVG 单位类型
 */
export type SupportedSVGUnit = 'mm' | 'cm' | 'in' | 'pt' | 'pc' | 'em';

/**
 * 2D 变换矩阵类型
 *
 * A transform matrix.
 * Basically a matrix in the form
 * [ a c e ]
 * [ b d f ]
 * [ 0 0 1 ]
 * For more details, see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#matrix}
 */
export type TMat2D = [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

/**
 * 跨域设置类型
 *
 * An invalid keyword and an empty string will be handled as the `anonymous` keyword.
 * @see https://developer.mozilla.org/en-US/docs/HTML/CORS_settings_attributes
 */
export type TCrossOrigin = '' | 'anonymous' | 'use-credentials' | null;

/**
 * X 轴原点类型
 */
export type TOriginX = 'center' | 'left' | 'right' | number;
/**
 * Y 轴原点类型
 */
export type TOriginY = 'center' | 'top' | 'bottom' | number;

/**
 * 角点坐标类型
 */
export type TCornerPoint = {
  /**
   * 左上角
   */
  tl: Point;
  /**
   * 右上角
   */
  tr: Point;
  /**
   * 左下角
   */
  bl: Point;
  /**
   * 右下角
   */
  br: Point;
};

/**
 * SVG 恢复函数类型
 */
export type TSVGReviver = (markup: string) => string;

/**
 * 有效的转换为对象的方法名称类型
 */
export type TValidToObjectMethod = 'toDatalessObject' | 'toObject';

/**
 * 缓存画布尺寸类型
 */
export type TCacheCanvasDimensions = TSize & {
  /* width and height in `TCacheCanvasDimensions` include a small ALIASING_LIMIT of 1 or 2 px.
  /* zoomX X scaling value of the object (including parents and viewport scaling) */
  /**
   * 对象的 X 轴缩放值（包括父级和视口缩放）
   */
  zoomX: number;
  /* zoomY Y scaling value of the object (including parents and viewport scaling) */
  /**
   * 对象的 Y 轴缩放值（包括父级和视口缩放）
   */
  zoomY: number;
  /* Similar to width and height, but they take care of the real size including non scaling stroke */
  /**
   * 真实 X 坐标（包括非缩放描边）
   */
  x: number;
  /**
   * 真实 Y 坐标（包括非缩放描边）
   */
  y: number;
};

/**
 * 矩形边界类型
 */
export type TRectBounds = [min: XY, max: XY];

/**
 * 转换为 Canvas 元素的选项类型
 */
export type TToCanvasElementOptions<
  T extends BaseFabricObject = BaseFabricObject,
> = {
  /**
   * 左侧位置
   */
  left?: number;
  /**
   * 顶部位置
   */
  top?: number;
  /**
   * 宽度
   */
  width?: number;
  /**
   * 高度
   */
  height?: number;
  /**
   * 过滤器函数
   */
  filter?: (object: T) => boolean;
};

/**
 * 转换为 Data URL 的选项类型
 */
export type TDataUrlOptions<T extends BaseFabricObject = BaseFabricObject> =
  TToCanvasElementOptions<T> & {
    /**
     * 乘数（缩放比例）
     */
    multiplier: number;
    /**
     * 图片格式
     */
    format?: ImageFormat;
    /**
     * 图片质量
     */
    quality?: number;
    /**
     * 是否启用视网膜缩放
     */
    enableRetinaScaling?: boolean;
  };

/**
 * 可中止接口
 */
export type Abortable = {
  /**
   * 处理中止
   *
   * handle aborting
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
   */
  signal?: AbortSignal;
};

/**
 * 通用选项类型
 */
export type TOptions<T> = Partial<T> & Record<string, any>;
