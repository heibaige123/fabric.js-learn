/**
 * 高精度浮点数声明
 */
export const highPsourceCode = `precision highp float`;

/**
 * 默认的片元着色器，不做任何修改，直接输出纹理颜色
 */
export const identityFragmentShader = `
    ${highPsourceCode};
    varying vec2 vTexCoord;
    uniform sampler2D uTexture;
    void main() {
      gl_FragColor = texture2D(uTexture, vTexCoord);
    }`;

/**
 * 默认的顶点着色器，处理位置和纹理坐标
 */
export const vertexSource = `
    attribute vec2 aPosition;
    varying vec2 vTexCoord;
    void main() {
      vTexCoord = aPosition;
      gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
    }`;
