/**
 * 颜色混合滤镜的片元着色器源码集合
 */
export const blendColorFragmentSource = {
  /**
   * 正片叠底模式
   */
  multiply: 'gl_FragColor.rgb *= uColor.rgb;\n',
  /**
   * 滤色模式
   */
  screen:
    'gl_FragColor.rgb = 1.0 - (1.0 - gl_FragColor.rgb) * (1.0 - uColor.rgb);\n',
  /**
   * 添加模式
   */
  add: 'gl_FragColor.rgb += uColor.rgb;\n',
  /**
   * 差值模式
   */
  difference: 'gl_FragColor.rgb = abs(gl_FragColor.rgb - uColor.rgb);\n',
  /**
   * 减去模式
   */
  subtract: 'gl_FragColor.rgb -= uColor.rgb;\n',
  /**
   * 变亮模式
   */
  lighten: 'gl_FragColor.rgb = max(gl_FragColor.rgb, uColor.rgb);\n',
  /**
   * 变暗模式
   */
  darken: 'gl_FragColor.rgb = min(gl_FragColor.rgb, uColor.rgb);\n',
  /**
   * 排除模式
   */
  exclusion:
    'gl_FragColor.rgb += uColor.rgb - 2.0 * (uColor.rgb * gl_FragColor.rgb);\n',
  /**
   * 叠加模式
   */
  overlay: `
    if (uColor.r < 0.5) {
      gl_FragColor.r *= 2.0 * uColor.r;
    } else {
      gl_FragColor.r = 1.0 - 2.0 * (1.0 - gl_FragColor.r) * (1.0 - uColor.r);
    }
    if (uColor.g < 0.5) {
      gl_FragColor.g *= 2.0 * uColor.g;
    } else {
      gl_FragColor.g = 1.0 - 2.0 * (1.0 - gl_FragColor.g) * (1.0 - uColor.g);
    }
    if (uColor.b < 0.5) {
      gl_FragColor.b *= 2.0 * uColor.b;
    } else {
      gl_FragColor.b = 1.0 - 2.0 * (1.0 - gl_FragColor.b) * (1.0 - uColor.b);
    }
    `,
  /**
   * 色调模式
   */
  tint: `
    gl_FragColor.rgb *= (1.0 - uColor.a);
    gl_FragColor.rgb += uColor.rgb;
    `,
} as const;
