import { BaseFilter } from './BaseFilter';
import type {
  T2DPipelineState,
  TMatColorMatrix,
  TWebGLUniformLocationMap,
} from './typedefs';
import { classRegistry } from '../ClassRegistry';
import { fragmentSource } from './shaders/colorMatrix';

/**
 * ColorMatrix 滤镜的自有属性
 */
export type ColorMatrixOwnProps = {
  /**
   * 颜色矩阵
   */
  matrix: TMatColorMatrix;
  /**
   * 是否仅处理颜色
   */
  colorsOnly: boolean;
};

/**
 * ColorMatrix 滤镜的默认值
 */
export const colorMatrixDefaultValues: ColorMatrixOwnProps = {
  matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  colorsOnly: true,
};

/**
   * 颜色矩阵滤镜类
   *
   * Color Matrix filter class
   * @see {@link http://fabric5.fabricjs.com/image-filters|ImageFilters demo}
   * @see {@link http://phoboslab.org/log/2013/11/fast-image-filters-with-webgl demo}
   * @example <caption>Kodachrome filter</caption>
   * const filter = new ColorMatrix({
   *  matrix: [
       1.1285582396593525, -0.3967382283601348, -0.03992559172921793, 0, 63.72958762196502,
       -0.16404339962244616, 1.0835251566291304, -0.05498805115633132, 0, 24.732407896706203,
       -0.16786010706155763, -0.5603416277695248, 1.6014850761964943, 0, 35.62982807460946,
       0, 0, 0, 1, 0
      ]
   * });
   * object.filters.push(filter);
   * object.applyFilters();
   */
export class ColorMatrix<
  Name extends string = 'ColorMatrix',
  OwnProps extends object = ColorMatrixOwnProps,
  SerializedProps extends object = ColorMatrixOwnProps,
> extends BaseFilter<Name, OwnProps, SerializedProps> {
  /**
   * 像素的颜色矩阵。
   * 20 个浮点数的数组。位置 4, 9, 14, 19 的数字在 -1, 1 范围之外失去意义。
   * 0.0039215686 是 1 的一部分，在 2d 中转换为 1
   *
   * Colormatrix for pixels.
   * array of 20 floats. Numbers in positions 4, 9, 14, 19 loose meaning
   * outside the -1, 1 range.
   * 0.0039215686 is the part of 1 that get translated to 1 in 2d
   * @param {Array} matrix array of 20 numbers.
   */
  declare matrix: ColorMatrixOwnProps['matrix'];

  /**
   * 将颜色矩阵锁定在颜色部分，跳过 alpha，主要用于非 webgl 场景以节省一些计算
   *
   * Lock the colormatrix on the color part, skipping alpha, mainly for non webgl scenario
   * to save some calculation
   * @type Boolean
   * @default true
   */
  declare colorsOnly: ColorMatrixOwnProps['colorsOnly'];

  static type = 'ColorMatrix';

  static defaults = colorMatrixDefaultValues;

  static uniformLocations = ['uColorMatrix', 'uConstants'];

  /**
   * 获取片段着色器源码
   * @returns {string} 片段着色器源码
   */
  getFragmentSource(): string {
    return fragmentSource;
  }

  /**
   * 将 ColorMatrix 操作应用于表示图像像素的 Uint8Array。
   *
   * Apply the ColorMatrix operation to a Uint8Array representing the pixels of an image.
   *
   * @param {Object} options 选项对象
   * @param {ImageData} options.imageData The Uint8Array to be filtered. 要过滤的 Uint8Array。
   */
  applyTo2d(options: T2DPipelineState) {
    const imageData = options.imageData,
      data = imageData.data,
      m = this.matrix,
      colorsOnly = this.colorsOnly;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = r * m[0] + g * m[1] + b * m[2] + m[4] * 255;
      data[i + 1] = r * m[5] + g * m[6] + b * m[7] + m[9] * 255;
      data[i + 2] = r * m[10] + g * m[11] + b * m[12] + m[14] * 255;
      if (!colorsOnly) {
        const a = data[i + 3];
        data[i] += a * m[3];
        data[i + 1] += a * m[8];
        data[i + 2] += a * m[13];
        data[i + 3] =
          r * m[15] + g * m[16] + b * m[17] + a * m[18] + m[19] * 255;
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
    const m = this.matrix,
      matrix = [
        m[0],
        m[1],
        m[2],
        m[3],
        m[5],
        m[6],
        m[7],
        m[8],
        m[10],
        m[11],
        m[12],
        m[13],
        m[15],
        m[16],
        m[17],
        m[18],
      ],
      constants = [m[4], m[9], m[14], m[19]];
    gl.uniformMatrix4fv(uniformLocations.uColorMatrix, false, matrix);
    gl.uniform4fv(uniformLocations.uConstants, constants);
  }

  /**
   * 返回实例的对象表示
   * @returns {Object} 实例的对象表示
   */
  toObject(): { type: Name } & SerializedProps {
    return {
      ...super.toObject(),
      matrix: [...this.matrix] as TMatColorMatrix,
    };
  }
}

classRegistry.setClass(ColorMatrix);
