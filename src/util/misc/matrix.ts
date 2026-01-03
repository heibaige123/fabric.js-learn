import { iMatrix } from '../../constants';
import type { XY } from '../../Point';
import { Point } from '../../Point';
import type { TDegree, TRadian, TMat2D } from '../../typedefs';
import { cos } from './cos';
import { degreesToRadians, radiansToDegrees } from './radiansDegreesConversion';
import { sin } from './sin';

/**
 * 旋转矩阵参数
 */
export type TRotateMatrixArgs = {
  /**
   * 旋转角度
   */
  angle?: TDegree;
};

/**
 * 平移矩阵参数
 */
export type TTranslateMatrixArgs = {
  /**
   * X 轴平移
   */
  translateX?: number;
  /**
   * Y 轴平移
   */
  translateY?: number;
};

/**
 * 缩放矩阵参数
 */
export type TScaleMatrixArgs = {
  /**
   * X 轴缩放
   */
  scaleX?: number;
  /**
   * Y 轴缩放
   */
  scaleY?: number;
  /**
   * 是否水平翻转
   */
  flipX?: boolean;
  /**
   * 是否垂直翻转
   */
  flipY?: boolean;
  /**
   * X 轴倾斜
   */
  skewX?: TDegree;
  /**
   * Y 轴倾斜
   */
  skewY?: TDegree;
};

/**
 * 组合矩阵参数
 */
export type TComposeMatrixArgs = TTranslateMatrixArgs &
  TRotateMatrixArgs &
  TScaleMatrixArgs;

/**
 * QR 分解输出
 */
export type TQrDecomposeOut = Required<
  Omit<TComposeMatrixArgs, 'flipX' | 'flipY'>
>;

/**
 * 检查是否为单位矩阵
 * @param mat 矩阵
 * @returns 如果是单位矩阵则返回 true
 */
export const isIdentityMatrix = (mat: TMat2D) =>
  mat.every((value, index) => value === iMatrix[index]);

/**
 * 将变换 t 应用于点 p
 * @deprecated 使用 {@link Point#transform}
 *
 * @param p 要变换的点
 * @param t 变换矩阵
 * @param ignoreOffset 指示不应应用偏移量
 * @returns 变换后的点
 */
export const transformPoint = (
  p: XY,
  t: TMat2D,
  ignoreOffset?: boolean,
): Point => new Point(p).transform(t, ignoreOffset);

/**
 * 反转变换 t
 *
 * @param t 变换矩阵
 * @returns 反转后的变换矩阵
 *
 */
export const invertTransform = (t: TMat2D): TMat2D => {
  const a = 1 / (t[0] * t[3] - t[1] * t[2]),
    r = [a * t[3], -a * t[1], -a * t[2], a * t[0], 0, 0] as TMat2D,
    { x, y } = new Point(t[4], t[5]).transform(r, true);
  r[4] = -x;
  r[5] = -y;
  return r;
};

/**
 * 将矩阵 A 乘以矩阵 B 以嵌套变换
 *
 * Multiply matrix A by matrix B to nest transformations
 * @param a 第一个变换矩阵
 * @param b 第二个变换矩阵
 * @param is2x2 标记是否作为 2x2 矩阵相乘
 * @returns 两个变换矩阵的乘积
 *
 */
export const multiplyTransformMatrices = (
  a: TMat2D,
  b: TMat2D,
  is2x2?: boolean,
): TMat2D =>
  [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    is2x2 ? 0 : a[0] * b[4] + a[2] * b[5] + a[4],
    is2x2 ? 0 : a[1] * b[4] + a[3] * b[5] + a[5],
  ] as TMat2D;

/**
 * 乘矩阵数组，使得一个矩阵定义其**后面**其余矩阵的平面
 *
 * `multiplyTransformMatrixArray([A, B, C, D])` 等同于 `A(B(C(D)))`
 *
 * Multiplies the matrices array such that a matrix defines the plane for the rest of the matrices **after** it
 *
 * `multiplyTransformMatrixArray([A, B, C, D])` is equivalent to `A(B(C(D)))`
 *
 * @param matrices 矩阵数组
 * @param is2x2 标记是否作为 2x2 矩阵相乘
 * @returns 乘积
 *
 * @param matrices an array of matrices
 * @param [is2x2] flag to multiply matrices as 2x2 matrices
 * @returns the multiplication product
 */
export const multiplyTransformMatrixArray = (
  matrices: (TMat2D | undefined | null | false)[],
  is2x2?: boolean,
) =>
  matrices.reduceRight(
    (product: TMat2D, curr) =>
      curr && product
        ? multiplyTransformMatrices(curr, product, is2x2)
        : curr || product,
    undefined as unknown as TMat2D,
  ) || iMatrix.concat();

/**
 * 计算平面旋转
 * @param param0 矩阵的前两个元素
 * @returns 旋转角度（弧度）
 */
export const calcPlaneRotation = ([a, b]: TMat2D) =>
  Math.atan2(b, a) as TRadian;

/**
 * 将标准 2x3 矩阵分解为变换分量
 *
 * Decomposes standard 2x3 matrix into transform components
 * @param a 变换矩阵
 * @returns 变换分量对象
 *
 * @param  {TMat2D} a transformMatrix
 * @return {Object} Components of transform
 */
export const qrDecompose = (a: TMat2D): TQrDecomposeOut => {
  const angle = calcPlaneRotation(a),
    denom = Math.pow(a[0], 2) + Math.pow(a[1], 2),
    scaleX = Math.sqrt(denom),
    scaleY = (a[0] * a[3] - a[2] * a[1]) / scaleX,
    skewX = Math.atan2(a[0] * a[2] + a[1] * a[3], denom);
  return {
    angle: radiansToDegrees(angle),
    scaleX,
    scaleY,
    skewX: radiansToDegrees(skewX),
    skewY: 0 as TDegree,
    translateX: a[4] || 0,
    translateY: a[5] || 0,
  };
};

/**
 * 生成平移矩阵
 *
 * 形式为以下的矩阵：
 * [ 1 0 x ]
 * [ 0 1 y ]
 * [ 0 0 1 ]
 *
 * 更多详情请参见 {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#translate}
 *
 * Generate a translation matrix
 *
 * A translation matrix in the form of
 * [ 1 0 x ]
 * [ 0 1 y ]
 * [ 0 0 1 ]
 *
 * See {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#translate} for more details
 *
 * @param x X 轴平移
 * @param y Y 轴平移
 * @returns 矩阵
 *
 * @param {number} x translation on X axis
 * @param {number} [y] translation on Y axis
 * @returns {TMat2D} matrix
 */
export const createTranslateMatrix = (x: number, y = 0): TMat2D => [
  1,
  0,
  0,
  1,
  x,
  y,
];

/**
 * 生成围绕点 (x,y) 的旋转矩阵，默认为 (0,0)
 *
 * 形式为以下的矩阵：
 * [cos(a) -sin(a) -x*cos(a)+y*sin(a)+x]
 * [sin(a)  cos(a) -x*sin(a)-y*cos(a)+y]
 * [0       0      1                 ]
 *
 * Generate a rotation matrix around around a point (x,y), defaulting to (0,0)
 *
 * A matrix in the form of
 * [cos(a) -sin(a) -x*cos(a)+y*sin(a)+x]
 * [sin(a)  cos(a) -x*sin(a)-y*cos(a)+y]
 * [0       0      1                 ]
 *
 *
 * @param angle 旋转角度（度）
 * @param pivotPoint 旋转中心点
 * @returns 矩阵
 *
 * @param {TDegree} angle rotation in degrees
 * @param {XY} [pivotPoint] pivot point to rotate around
 * @returns {TMat2D} matrix
 */
export function createRotateMatrix(
  { angle = 0 }: TRotateMatrixArgs = {},
  { x = 0, y = 0 }: Partial<XY> = {},
): TMat2D {
  const angleRadiant = degreesToRadians(angle),
    cosValue = cos(angleRadiant),
    sinValue = sin(angleRadiant);
  return [
    cosValue,
    sinValue,
    -sinValue,
    cosValue,
    x ? x - (cosValue * x - sinValue * y) : 0,
    y ? y - (sinValue * x + cosValue * y) : 0,
  ];
}

/**
 * 生成围绕点 (0,0) 的缩放矩阵
 *
 * 形式为以下的矩阵：
 * [x 0 0]
 * [0 y 0]
 * [0 0 1]
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#scale}
 *
 * Generate a scale matrix around the point (0,0)
 *
 * A matrix in the form of
 * [x 0 0]
 * [0 y 0]
 * [0 0 1]
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#scale}
 *
 * @param x X 轴缩放
 * @param y Y 轴缩放
 * @returns 矩阵
 *
 * @param {number} x scale on X axis
 * @param {number} [y] scale on Y axis
 * @returns {TMat2D} matrix
 */
export const createScaleMatrix = (x: number, y: number = x): TMat2D => [
  x,
  0,
  0,
  y,
  0,
  0,
];

/**
 * 将角度转换为倾斜值
 * @param angle 角度（度）
 * @returns 倾斜值
 *
 * Returns the skew value in degrees for a given angle
 * @param {TDegree} angle
 * @returns {number}
 */
export const angleToSkew = (angle: TDegree) =>
  Math.tan(degreesToRadians(angle));

/**
 * 将倾斜值转换为角度
 * @param value 倾斜值
 * @returns 角度（度）
 *
 * Returns the angle in degrees for a given skew value
 * @param {TRadian} value
 * @returns {number}
 */
export const skewToAngle = (value: TRadian) =>
  radiansToDegrees(Math.atan(value));

/**
 * 生成 X 轴的倾斜矩阵
 *
 * 形式为以下的矩阵：
 * [1 x 0]
 * [0 1 0]
 * [0 0 1]
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#skewx}
 *
 * Generate a skew matrix for the X axis
 *
 * A matrix in the form of
 * [1 x 0]
 * [0 1 0]
 * [0 0 1]
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#skewx}
 *
 * @param skewValue X 轴倾斜角度
 * @returns 矩阵
 *
 * @param {TDegree} skewValue translation on X axis
 * @returns {TMat2D} matrix
 */
export const createSkewXMatrix = (skewValue: TDegree): TMat2D => [
  1,
  0,
  angleToSkew(skewValue),
  1,
  0,
  0,
];

/**
 * 生成 Y 轴的倾斜矩阵
 *
 * 形式为以下的矩阵：
 * [1 0 0]
 * [y 1 0]
 * [0 0 1]
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#skewy}
 *
 * Generate a skew matrix for the Y axis
 *
 * A matrix in the form of
 * [1 0 0]
 * [y 1 0]
 * [0 0 1]
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#skewy}
 *
 * @param skewValue Y 轴倾斜角度
 * @returns 矩阵
 *
 * @param {TDegree} skewValue translation on Y axis
 * @returns {TMat2D} matrix
 */
export const createSkewYMatrix = (skewValue: TDegree): TMat2D => [
  1,
  angleToSkew(skewValue),
  0,
  1,
  0,
  0,
];

/**
 * 返回一个变换矩阵，该矩阵从与 qrDecompose 返回的对象相同类型的对象开始，
 * 如果你想从一个尚未激活的对象计算一些变换，这也很有用。
 * 称为 DimensionsTransformMatrix，因为这些属性是影响对象结果框大小的属性。
 *
 * Returns a transform matrix starting from an object of the same kind of
 * the one returned from qrDecompose, useful also if you want to calculate some
 * transformations from an object that is not enlived yet.
 * is called DimensionsTransformMatrix because those properties are the one that influence
 * the size of the resulting box of the object.
 * @param options 选项对象
 * @param [options.scaleX] X 轴缩放
 * @param [options.scaleY] Y 轴缩放
 * @param [options.flipX] 是否水平翻转
 * @param [options.flipY] 是否垂直翻转
 * @param [options.skewX] X 轴倾斜
 * @param [options.skewY] Y 轴倾斜
 * @returns 变换矩阵
 *
 * @param  {Object} options
 * @param  {Number} [options.scaleX]
 * @param  {Number} [options.scaleY]
 * @param  {Boolean} [options.flipX]
 * @param  {Boolean} [options.flipY]
 * @param  {Number} [options.skewX]
 * @param  {Number} [options.skewY]
 * @return {Number[]} transform matrix
 */
export const calcDimensionsMatrix = ({
  scaleX = 1,
  scaleY = 1,
  flipX = false,
  flipY = false,
  skewX = 0 as TDegree,
  skewY = 0 as TDegree,
}: TScaleMatrixArgs) => {
  let matrix = createScaleMatrix(
    flipX ? -scaleX : scaleX,
    flipY ? -scaleY : scaleY,
  );
  if (skewX) {
    matrix = multiplyTransformMatrices(matrix, createSkewXMatrix(skewX), true);
  }
  if (skewY) {
    matrix = multiplyTransformMatrices(matrix, createSkewYMatrix(skewY), true);
  }
  return matrix;
};

/**
 * 返回一个变换矩阵，该矩阵从与 qrDecompose 返回的对象相同类型的对象开始，
 * 如果你想从一个尚未激活的对象计算一些变换，这也很有用。
 * 在更改此函数之前，请查看：src/benchmarks/calcTransformMatrix.mjs
 *
 * Returns a transform matrix starting from an object of the same kind of
 * the one returned from qrDecompose, useful also if you want to calculate some
 * transformations from an object that is not enlived yet
 * Before changing this function look at: src/benchmarks/calcTransformMatrix.mjs
 * @param options 选项对象
 * @param [options.angle] 旋转角度
 * @param [options.scaleX] X 轴缩放
 * @param [options.scaleY] Y 轴缩放
 * @param [options.flipX] 是否水平翻转
 * @param [options.flipY] 是否垂直翻转
 * @param [options.skewX] X 轴倾斜
 * @param [options.skewY] Y 轴倾斜
 * @param [options.translateX] X 轴平移
 * @param [options.translateY] Y 轴平移
 * @returns 变换矩阵
 *
 * @param  {Object} options
 * @param  {Number} [options.angle]
 * @param  {Number} [options.scaleX]
 * @param  {Number} [options.scaleY]
 * @param  {Boolean} [options.flipX]
 * @param  {Boolean} [options.flipY]
 * @param  {Number} [options.skewX]
 * @param  {Number} [options.skewY]
 * @param  {Number} [options.translateX]
 * @param  {Number} [options.translateY]
 * @return {Number[]} transform matrix
 */
export const composeMatrix = (options: TComposeMatrixArgs): TMat2D => {
  const { translateX = 0, translateY = 0, angle = 0 as TDegree } = options;
  let matrix = createTranslateMatrix(translateX, translateY);
  if (angle) {
    matrix = multiplyTransformMatrices(matrix, createRotateMatrix({ angle }));
  }
  const scaleMatrix = calcDimensionsMatrix(options);
  if (!isIdentityMatrix(scaleMatrix)) {
    matrix = multiplyTransformMatrices(matrix, scaleMatrix);
  }
  return matrix;
};
