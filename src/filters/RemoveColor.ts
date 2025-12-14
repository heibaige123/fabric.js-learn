import { classRegistry } from '../ClassRegistry';
import { Color } from '../color/Color';
import { BaseFilter } from './BaseFilter';
import { fragmentShader } from './shaders/removeColor';
import type { T2DPipelineState, TWebGLUniformLocationMap } from './typedefs';

/**
 * RemoveColor 滤镜的自有属性
 */
export type RemoveColorOwnProps = {
  /**
   * 要移除的颜色
   */
  color: string;
  /**
   * 距离
   */
  distance: number;
  /**
   * 是否使用 Alpha 通道
   */
  useAlpha: boolean;
};

/**
 * RemoveColor 滤镜的默认值
 */
export const removeColorDefaultValues: RemoveColorOwnProps = {
  /**
   * 默认移除白色
   */
  color: '#FFFFFF',
  /**
   * 默认距离
   */
  distance: 0.02,
  /**
   * 默认不使用 Alpha 通道
   */
  useAlpha: false,
};

/**
 * 移除颜色滤镜类
 *
 * Remove white filter class
 * @example
 * const filter = new RemoveColor({
 *   threshold: 0.2,
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 * canvas.renderAll();
 */
export class RemoveColor extends BaseFilter<
  'RemoveColor',
  RemoveColorOwnProps
> {
  /**
   * 要移除的颜色，格式为 {@link Color} 理解的任何格式。
   *
   * Color to remove, in any format understood by {@link Color}.
   */
  declare color: RemoveColorOwnProps['color'];

  /**
   * 到实际颜色的距离，作为每个 r,g,b 上下波动的值
   * 在 0 和 1 之间
   *
   * distance to actual color, as value up or down from each r,g,b
   * between 0 and 1
   **/
  declare distance: RemoveColorOwnProps['distance'];

  /**
   * 对于距离内要移除的颜色，使用 alpha 通道进行更平滑的删除
   * 尚未实现
   *
   * For color to remove inside distance, use alpha channel for a smoother deletion
   * NOT IMPLEMENTED YET
   **/
  declare useAlpha: RemoveColorOwnProps['useAlpha'];

  static type = 'RemoveColor';

  static defaults = removeColorDefaultValues;

  static uniformLocations = ['uLow', 'uHigh'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource() {
    return fragmentShader;
  }

  /**
   * 将滤镜应用于 canvas 元素
   *
   * Applies filter to canvas element
   * @param {Object} canvasEl Canvas element to apply filter to 画布元素
   */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const distance = this.distance * 255,
      source = new Color(this.color).getSource(),
      lowC = [source[0] - distance, source[1] - distance, source[2] - distance],
      highC = [
        source[0] + distance,
        source[1] + distance,
        source[2] + distance,
      ];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (
        r > lowC[0] &&
        g > lowC[1] &&
        b > lowC[2] &&
        r < highC[0] &&
        g < highC[1] &&
        b < highC[2]
      ) {
        data[i + 3] = 0;
      }
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
    const source = new Color(this.color).getSource(),
      distance = this.distance,
      lowC = [
        0 + source[0] / 255 - distance,
        0 + source[1] / 255 - distance,
        0 + source[2] / 255 - distance,
        1,
      ],
      highC = [
        source[0] / 255 + distance,
        source[1] / 255 + distance,
        source[2] / 255 + distance,
        1,
      ];
    gl.uniform4fv(uniformLocations.uLow, lowC);
    gl.uniform4fv(uniformLocations.uHigh, highC);
  }
}

classRegistry.setClass(RemoveColor);
