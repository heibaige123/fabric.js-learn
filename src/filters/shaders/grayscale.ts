import type { TGrayscaleMode } from '../Grayscale';

/**
 * 灰度滤镜的片元着色器源码集合
 */
export const fragmentSource: Record<TGrayscaleMode, string> = {
  /**
   * 平均值模式
   */
  average: `
    precision highp float;
    uniform sampler2D uTexture;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = texture2D(uTexture, vTexCoord);
      float average = (color.r + color.b + color.g) / 3.0;
      gl_FragColor = vec4(average, average, average, color.a);
    }
    `,
  /**
   * 亮度模式（基于最大值和最小值的平均值）
   */
  lightness: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform int uMode;
    varying vec2 vTexCoord;
    void main() {
      vec4 col = texture2D(uTexture, vTexCoord);
      float average = (max(max(col.r, col.g),col.b) + min(min(col.r, col.g),col.b)) / 2.0;
      gl_FragColor = vec4(average, average, average, col.a);
    }
    `,
  /**
   * 光度模式（基于人眼感知的加权平均值）
   */
  luminosity: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform int uMode;
    varying vec2 vTexCoord;
    void main() {
      vec4 col = texture2D(uTexture, vTexCoord);
      float average = 0.21 * col.r + 0.72 * col.g + 0.07 * col.b;
      gl_FragColor = vec4(average, average, average, col.a);
    }
    `,
};
