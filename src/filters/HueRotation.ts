import { cos } from '../util/misc/cos';
import { sin } from '../util/misc/sin';
import {
  ColorMatrix,
  type ColorMatrixOwnProps,
  colorMatrixDefaultValues,
} from './ColorMatrix';
import type { TWebGLPipelineState, T2DPipelineState } from './typedefs';
import { classRegistry } from '../ClassRegistry';

/**
 * HueRotation 滤镜的自有属性
 */
export type HueRotationOwnProps = ColorMatrixOwnProps & {
  /**
   * 旋转角度
   */
  rotation: number;
};

/**
 * HueRotation 滤镜的序列化属性
 */
export type HueRotationSerializedProps = {
  /**
   * 旋转角度
   */
  rotation: number;
};

/**
 * HueRotation 滤镜的默认值
 */
export const hueRotationDefaultValues: HueRotationOwnProps = {
  ...colorMatrixDefaultValues,
  /**
   * 默认旋转角度
   */
  rotation: 0,
};

/**
 * 色相旋转滤镜类
 *
 * HueRotation filter class
 * @example
 * const filter = new HueRotation({
 *   rotation: -0.5
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class HueRotation extends ColorMatrix<
  'HueRotation',
  HueRotationOwnProps,
  HueRotationSerializedProps
> {
  /**
   * 色相旋转值，从 -1 到 1。
   *
   * HueRotation value, from -1 to 1.
   */
  declare rotation: HueRotationOwnProps['rotation'];

  static type = 'HueRotation';

  static defaults = hueRotationDefaultValues;

  /**
   * 计算颜色矩阵
   */
  calculateMatrix() {
    const rad = this.rotation * Math.PI,
      cosine = cos(rad),
      sine = sin(rad),
      aThird = 1 / 3,
      aThirdSqtSin = Math.sqrt(aThird) * sine,
      OneMinusCos = 1 - cosine;
    this.matrix = [
      cosine + OneMinusCos / 3,
      aThird * OneMinusCos - aThirdSqtSin,
      aThird * OneMinusCos + aThirdSqtSin,
      0,
      0,
      aThird * OneMinusCos + aThirdSqtSin,
      cosine + aThird * OneMinusCos,
      aThird * OneMinusCos - aThirdSqtSin,
      0,
      0,
      aThird * OneMinusCos - aThirdSqtSin,
      aThird * OneMinusCos + aThirdSqtSin,
      cosine + aThird * OneMinusCos,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ];
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return this.rotation === 0;
  }

  /**
   * 应用滤镜
   * @param {TWebGLPipelineState | T2DPipelineState} options 管道状态
   */
  applyTo(options: TWebGLPipelineState | T2DPipelineState) {
    this.calculateMatrix();
    super.applyTo(options);
  }

  /**
   * 返回实例的对象表示
   * @returns {Object} 实例的对象表示
   */
  toObject() {
    return {
      type: this.type,
      rotation: this.rotation,
    };
  }
}

classRegistry.setClass(HueRotation);
