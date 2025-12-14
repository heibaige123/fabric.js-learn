import { BaseFilter } from './BaseFilter';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/gamma';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';

const GAMMA = 'Gamma' as const;

/**
 * Gamma 输入类型
 */
export type GammaInput = [number, number, number];

/**
 * Gamma 滤镜的自有属性
 */
export type GammaOwnProps = {
  /**
   * Gamma 值数组
   */
  gamma: GammaInput;
};

/**
 * Gamma 滤镜的默认值
 */
export const gammaDefaultValues: GammaOwnProps = {
  /**
   * 默认 Gamma 值
   */
  gamma: [1, 1, 1],
};

/**
 * Gamma 滤镜类
 *
 * Gamma filter class
 * @example
 * const filter = new Gamma({
 *   gamma: [1, 0.5, 2.1]
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export class Gamma extends BaseFilter<typeof GAMMA, GammaOwnProps> {
  /**
   * Gamma 数组值，从 0.01 到 2.2。
   *
   * Gamma array value, from 0.01 to 2.2.
   * @param {Array} gamma
   */
  declare gamma: GammaOwnProps['gamma'];
  /**
   * RGB 值查找表
   */
  declare rgbValues?: {
    r: Uint8Array;
    g: Uint8Array;
    b: Uint8Array;
  };

  static type = GAMMA;

  static defaults = gammaDefaultValues;

  static uniformLocations = ['uGamma'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentSource;
  }

  /**
   * 构造函数
   * @param options 选项对象
   */
  constructor(options: { gamma?: GammaInput } = {}) {
    super(options);
    this.gamma =
      options.gamma ||
      ((
        this.constructor as typeof Gamma
      ).defaults.gamma.concat() as GammaInput);
  }

  /**
   * 将 Gamma 操作应用于表示图像像素的 Uint8Array。
   *
   * Apply the Gamma operation to a Uint8Array representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8Array to be filtered. 要过滤的 Uint8Array。
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const gamma = this.gamma,
      rInv = 1 / gamma[0],
      gInv = 1 / gamma[1],
      bInv = 1 / gamma[2];

    if (!this.rgbValues) {
      this.rgbValues = {
        r: new Uint8Array(256),
        g: new Uint8Array(256),
        b: new Uint8Array(256),
      };
    }

    // This is an optimization - pre-compute a look-up table for each color channel
    // instead of performing these pow calls for each pixel in the image.
    const rgb = this.rgbValues;
    for (let i = 0; i < 256; i++) {
      rgb.r[i] = Math.pow(i / 255, rInv) * 255;
      rgb.g[i] = Math.pow(i / 255, gInv) * 255;
      rgb.b[i] = Math.pow(i / 255, bInv) * 255;
    }
    for (let i = 0; i < data.length; i += 4) {
      data[i] = rgb.r[data[i]];
      data[i + 1] = rgb.g[data[i + 1]];
      data[i + 2] = rgb.b[data[i + 2]];
    }
  }

  /**
   * 将数据从此滤镜发送到其着色器程序的 uniform。
   *
   * Send data from this filter to its shader program's uniforms.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader. 用于编译此滤镜着色器的 GL 画布上下文。
   * @param {Object} uniformLocations A map of string uniform names to WebGLUniformLocation objects 字符串 uniform 名称到 WebGLUniformLocation 对象的映射
   */
  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: TWebGLUniformLocationMap,
  ) {
    gl.uniform3fv(uniformLocations.uGamma, this.gamma);
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    const { gamma } = this;
    return gamma[0] === 1 && gamma[1] === 1 && gamma[2] === 1;
  }

  /**
   * 返回实例的对象表示
   * @returns {Object} 实例的对象表示
   */
  toObject(): { type: typeof GAMMA; gamma: GammaInput } {
    return {
      type: GAMMA,
      gamma: this.gamma.concat() as GammaInput,
    };
  }
}

classRegistry.setClass(Gamma);
