import type { Percent, TMat2D } from '../typedefs';

/**
 * 渐变单位类型
 */
export type GradientUnits = 'pixels' | 'percentage';

/**
 * 渐变类型
 */
export type GradientType = 'linear' | 'radial';

/**
 * 渐变坐标值类型
 */
export type GradientCoordValue = number | Percent | string;

/**
 * 颜色停止点
 */
export type ColorStop = {
  color: string;
  offset: number;
};

/**
 * 线性渐变坐标
 */
export type LinearGradientCoords<T extends GradientCoordValue> = {
  /**
   * 第一个点的 X 坐标
   *
   * X coordiante of the first point
   */
  x1: T;
  /**
   * 第一个点的 Y 坐标
   *
   * Y coordiante of the first point
   */
  y1: T;
  /**
   * 第二个点的 X 坐标
   *
   * X coordiante of the second point
   */
  x2: T;
  /**
   * 第二个点的 Y 坐标
   *
   * Y coordiante of the second point
   */
  y2: T;
};

/**
 * 径向渐变坐标
 */
export type RadialGradientCoords<T extends GradientCoordValue> = {
  /**
   * 第一个焦点的 X 坐标
   *
   * X coordinate of the first focal point
   */
  x1: T;
  /**
   * 第一个焦点的 Y 坐标
   *
   * Y coordiante of the first focal point
   */
  y1: T;
  /**
   * 第二个焦点的 X 坐标
   *
   * X coordiante of the second focal point
   */
  x2: T;
  /**
   * 第二个焦点的 Y 坐标
   *
   * Y coordiante of the second focal point
   */
  y2: T;
  /**
   * 内圆半径
   *
   * radius of the inner circle
   */
  r1: T;
  /**
   * 外圆半径
   *
   * radius of the outer circle
   */
  r2: T;
};

/**
 * 渐变坐标类型
 */
export type GradientCoords<T extends GradientType> = T extends 'linear'
  ? LinearGradientCoords<number>
  : RadialGradientCoords<number>;

/**
 * 渐变选项
 */
export type GradientOptions<T extends GradientType> = {
  /**
   * 渐变类型
   */
  type?: T;
  /**
   * 渐变单位
   */
  gradientUnits?: GradientUnits;
  /**
   * 颜色停止点数组
   */
  colorStops?: ColorStop[];
  /**
   * 渐变坐标
   */
  coords?: Partial<GradientCoords<T>>;
  /**
   * 渐变变换矩阵
   * @todo rename?
   */
  gradientTransform?: TMat2D;
  /**
   * 标识符
   */
  id?: string;
  /**
   * SVG 导入兼容性
   *
   * SVG import compatibility
   */
  offsetX?: number;
  /**
   * SVG 导入兼容性
   *
   * SVG import compatibility
   */
  offsetY?: number;
};

/**
 * SVG 选项
 */
export type SVGOptions = {
  /**
   * svg 上 viewBox 属性的宽度部分
   *
   * width part of the viewBox attribute on svg
   */
  viewBoxWidth: number;
  /**
   * svg 上 viewBox 属性的高度部分
   *
   * height part of the viewBox attribute on svg
   */
  viewBoxHeight: number;
  /**
   * 如果未指定 viewBox，则为 svg 标签的宽度部分
   *
   * width part of the svg tag if viewBox is not specified
   */
  width: number;
  /**
   * 如果未指定 viewBox，则为 svg 标签的高度部分
   *
   * height part of the svg tag if viewBox is not specified
   */
  height: number;

  /**
   * 透明度属性
   */
  opacity: string | null;
};

/**
 * 序列化的渐变属性
 */
export type SerializedGradientProps<T extends GradientType> = Omit<
  GradientOptions<T>,
  'id'
>;
