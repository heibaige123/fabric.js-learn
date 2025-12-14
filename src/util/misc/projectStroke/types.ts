import type { Point } from '../../../Point';
import type { TDegree, TRadian } from '../../../typedefs';

/**
 * 在点上投影描边的选项
 */
export type TProjectStrokeOnPointsOptions = {
  /**
   * 描边宽度
   */
  strokeWidth: number;
  /**
   * 描边线帽样式
   */
  strokeLineCap: CanvasLineCap;
  /**
   * 描边连接样式
   */
  strokeLineJoin: CanvasLineJoin;
  /**
   * 描边斜接限制
   *
   * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-miterlimit
   */
  strokeMiterLimit: number;
  /**
   * 是否均匀描边
   */
  strokeUniform: boolean;
  /**
   * X 轴缩放
   */
  scaleX: number;
  /**
   * Y 轴缩放
   */
  scaleY: number;
  /**
   * X 轴倾斜
   */
  skewX: TDegree;
  /**
   * Y 轴倾斜
   */
  skewY: TDegree;
};

/**
 * 投影结果
 */
export type TProjection = {
  /**
   * 投影点
   */
  projectedPoint: Point;
  /**
   * 原始点
   */
  originPoint: Point;
  /**
   * 角度
   */
  angle?: TRadian;
  /**
   * 角平分线
   */
  bisector?: Point;
};
