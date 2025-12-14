import { cache } from '../../cache';
import { config } from '../../config';
import { halfPI, PiBy180 } from '../../constants';
import type { TMat2D, TRadian, TRectBounds } from '../../typedefs';
import { cos } from '../misc/cos';
import { multiplyTransformMatrices, transformPoint } from '../misc/matrix';
import { sin } from '../misc/sin';
import { toFixed } from '../misc/toFixed';
import type {
  TCurveInfo,
  TComplexPathData,
  TParsedAbsoluteCubicCurveCommand,
  TPathSegmentInfo,
  TPointAngle,
  TSimpleParsedCommand,
  TSimplePathData,
  TPathSegmentCommandInfo,
  TComplexParsedCommand,
  TPathSegmentInfoCommon,
  TEndPathInfo,
  TParsedArcCommand,
  TComplexParsedCommandType,
} from './typedefs';
import type { XY } from '../../Point';
import { Point } from '../../Point';
import { reArcCommandPoints, rePathCommand } from './regex';
import { reNum } from '../../parser/constants';

/**
 * 可以重复的命令
 * Commands that may be repeated
 */
const repeatedCommands: Record<string, 'l' | 'L'> = {
  m: 'l',
  M: 'L',
};

/**
 * 将旋转椭圆的弧转换为贝塞尔曲线
 * @param theta1 弧的起始角度
 * @param theta2 弧的结束角度
 * @param cosTh 旋转角度的余弦值
 * @param sinTh 旋转角度的正弦值
 * @param rx X 轴半径（旋转前）
 * @param ry Y 轴半径（旋转前）
 * @param cx1 椭圆中心的 X 坐标
 * @param cy1 椭圆中心的 Y 坐标
 * @param mT
 * @param fromX 弧起点的 X 坐标
 * @param fromY 弧起点的 Y 坐标
 * @returns 解析后的绝对三次贝塞尔曲线命令
 *
 * Convert an arc of a rotated ellipse to a Bezier Curve
 * @param {TRadian} theta1 start of the arc
 * @param {TRadian} theta2 end of the arc
 * @param cosTh cosine of the angle of rotation
 * @param sinTh sine of the angle of rotation
 * @param rx x-axis radius (before rotation)
 * @param ry y-axis radius (before rotation)
 * @param cx1 center x of the ellipse
 * @param cy1 center y of the ellipse
 * @param mT
 * @param fromX starting point of arc x
 * @param fromY starting point of arc y
 */
const segmentToBezier = (
  theta1: TRadian,
  theta2: TRadian,
  cosTh: number,
  sinTh: number,
  rx: number,
  ry: number,
  cx1: number,
  cy1: number,
  mT: number,
  fromX: number,
  fromY: number,
): TParsedAbsoluteCubicCurveCommand => {
  const costh1 = cos(theta1),
    sinth1 = sin(theta1),
    costh2 = cos(theta2),
    sinth2 = sin(theta2),
    toX = cosTh * rx * costh2 - sinTh * ry * sinth2 + cx1,
    toY = sinTh * rx * costh2 + cosTh * ry * sinth2 + cy1,
    cp1X = fromX + mT * (-cosTh * rx * sinth1 - sinTh * ry * costh1),
    cp1Y = fromY + mT * (-sinTh * rx * sinth1 + cosTh * ry * costh1),
    cp2X = toX + mT * (cosTh * rx * sinth2 + sinTh * ry * costh2),
    cp2Y = toY + mT * (sinTh * rx * sinth2 - cosTh * ry * costh2);

  return ['C', cp1X, cp1Y, cp2X, cp2Y, toX, toY];
};

/**
 * 改编自 {@link http://dxr.mozilla.org/mozilla-central/source/dom/svg/SVGPathDataParser.cpp}
 * 作者 Andrea Bogazzi，代码遵循 MPL 协议。如果你没有许可证副本，可以在这里获取
 * http://mozilla.org/MPL/2.0/
 * @param toX 终点 X 坐标
 * @param toY 终点 Y 坐标
 * @param rx X 轴半径
 * @param ry Y 轴半径
 * @param large 0 或 1 标志，决定弧线是大于还是小于 180 度
 * @param sweep 0 或 1 标志，决定弧线是顺时针还是逆时针
 * @param rotateX X 轴旋转角度
 * @returns 解析后的绝对三次贝塞尔曲线命令数组
 *
 * Adapted from {@link http://dxr.mozilla.org/mozilla-central/source/dom/svg/SVGPathDataParser.cpp}
 * by Andrea Bogazzi code is under MPL. if you don't have a copy of the license you can take it here
 * http://mozilla.org/MPL/2.0/
 * @param toX
 * @param toY
 * @param rx
 * @param ry
 * @param {number} large 0 or 1 flag
 * @param {number} sweep 0 or 1 flag
 * @param rotateX
 */
const arcToSegments = (
  toX: number,
  toY: number,
  rx: number,
  ry: number,
  large: number,
  sweep: number,
  rotateX: TRadian,
): TParsedAbsoluteCubicCurveCommand[] => {
  if (rx === 0 || ry === 0) {
    return [];
  }
  let fromX = 0,
    fromY = 0,
    root = 0;
  const PI = Math.PI,
    theta = rotateX * PiBy180,
    sinTheta = sin(theta),
    cosTh = cos(theta),
    px = 0.5 * (-cosTh * toX - sinTheta * toY),
    py = 0.5 * (-cosTh * toY + sinTheta * toX),
    rx2 = rx ** 2,
    ry2 = ry ** 2,
    py2 = py ** 2,
    px2 = px ** 2,
    pl = rx2 * ry2 - rx2 * py2 - ry2 * px2;
  let _rx = Math.abs(rx);
  let _ry = Math.abs(ry);

  if (pl < 0) {
    const s = Math.sqrt(1 - pl / (rx2 * ry2));
    _rx *= s;
    _ry *= s;
  } else {
    root =
      (large === sweep ? -1.0 : 1.0) * Math.sqrt(pl / (rx2 * py2 + ry2 * px2));
  }

  const cx = (root * _rx * py) / _ry,
    cy = (-root * _ry * px) / _rx,
    cx1 = cosTh * cx - sinTheta * cy + toX * 0.5,
    cy1 = sinTheta * cx + cosTh * cy + toY * 0.5;
  let mTheta = calcVectorAngle(1, 0, (px - cx) / _rx, (py - cy) / _ry);
  let dtheta = calcVectorAngle(
    (px - cx) / _rx,
    (py - cy) / _ry,
    (-px - cx) / _rx,
    (-py - cy) / _ry,
  );

  if (sweep === 0 && dtheta > 0) {
    dtheta -= 2 * PI;
  } else if (sweep === 1 && dtheta < 0) {
    dtheta += 2 * PI;
  }

  // Convert into cubic bezier segments <= 90deg
  const segments = Math.ceil(Math.abs((dtheta / PI) * 2)),
    result = [],
    mDelta = dtheta / segments,
    mT =
      ((8 / 3) * Math.sin(mDelta / 4) * Math.sin(mDelta / 4)) /
      Math.sin(mDelta / 2);
  let th3 = mTheta + mDelta;

  for (let i = 0; i < segments; i++) {
    result[i] = segmentToBezier(
      mTheta,
      th3,
      cosTh,
      sinTheta,
      _rx,
      _ry,
      cx1,
      cy1,
      mT,
      fromX,
      fromY,
    );
    fromX = result[i][5];
    fromY = result[i][6];
    mTheta = th3;
    th3 += mDelta;
  }
  return result;
};

/**
 * @private
 * 计算两个向量之间的角度
 * @param ux u 端点 x
 * @param uy u 端点 y
 * @param vx v 端点 x
 * @param vy v 端点 y
 * @returns 角度（弧度）
 *
 * @private
 * Calculate the angle between two vectors
 * @param ux u endpoint x
 * @param uy u endpoint y
 * @param vx v endpoint x
 * @param vy v endpoint y
 */
const calcVectorAngle = (
  ux: number,
  uy: number,
  vx: number,
  vy: number,
): TRadian => {
  const ta = Math.atan2(uy, ux),
    tb = Math.atan2(vy, vx);
  if (tb >= ta) {
    return tb - ta;
  } else {
    return 2 * Math.PI - (ta - tb);
  }
};

// functions for the Cubic beizer
// taken from: https://github.com/konvajs/konva/blob/7.0.5/src/shapes/Path.ts#L350
/**
 * 三次贝塞尔曲线基函数 1: t^3
 */
const CB1 = (t: number) => t ** 3;
/**
 * 三次贝塞尔曲线基函数 2: 3t^2(1-t)
 */
const CB2 = (t: number) => 3 * t ** 2 * (1 - t);
/**
 * 三次贝塞尔曲线基函数 3: 3t(1-t)^2
 */
const CB3 = (t: number) => 3 * t * (1 - t) ** 2;
/**
 * 三次贝塞尔曲线基函数 4: (1-t)^3
 */
const CB4 = (t: number) => (1 - t) ** 3;

/**
 * 计算三次贝塞尔曲线的边界框
 * 取自 http://jsbin.com/ivomiq/56/edit (无可用信用)
 * TODO: 我们能否将其标准化，将起点设置为 0，然后平移 bbox？
 * @param begx 起点 x
 * @param begy 起点 y
 * @param cp1x 第一控制点 x
 * @param cp1y 第一控制点 y
 * @param cp2x 第二控制点 x
 * @param cp2y 第二控制点 y
 * @param endx 贝塞尔曲线终点 x
 * @param endy 贝塞尔曲线终点 y
 * @returns 矩形边界
 *
 * Calculate bounding box of a cubic Bezier curve
 * Taken from http://jsbin.com/ivomiq/56/edit (no credits available)
 * TODO: can we normalize this with the starting points set at 0 and then translated the bbox?
 * @return {TRectBounds} the rectangular bounds
 */
export function getBoundsOfCurve(
  begx: number,
  begy: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  endx: number,
  endy: number,
): TRectBounds {
  let argsString: string;
  if (config.cachesBoundsOfCurve) {
    // eslint-disable-next-line
    argsString = [...arguments].join();
    if (cache.boundsOfCurveCache[argsString]) {
      return cache.boundsOfCurveCache[argsString];
    }
  }

  const sqrt = Math.sqrt,
    abs = Math.abs,
    tvalues = [],
    bounds: [[x: number, y: number], [x: number, y: number]] = [
      [0, 0],
      [0, 0],
    ];

  let b = 6 * begx - 12 * cp1x + 6 * cp2x;
  let a = -3 * begx + 9 * cp1x - 9 * cp2x + 3 * endx;
  let c = 3 * cp1x - 3 * begx;

  for (let i = 0; i < 2; ++i) {
    if (i > 0) {
      b = 6 * begy - 12 * cp1y + 6 * cp2y;
      a = -3 * begy + 9 * cp1y - 9 * cp2y + 3 * endy;
      c = 3 * cp1y - 3 * begy;
    }

    if (abs(a) < 1e-12) {
      if (abs(b) < 1e-12) {
        continue;
      }
      const t = -c / b;
      if (0 < t && t < 1) {
        tvalues.push(t);
      }
      continue;
    }
    const b2ac = b * b - 4 * c * a;
    if (b2ac < 0) {
      continue;
    }
    const sqrtb2ac = sqrt(b2ac);
    const t1 = (-b + sqrtb2ac) / (2 * a);
    if (0 < t1 && t1 < 1) {
      tvalues.push(t1);
    }
    const t2 = (-b - sqrtb2ac) / (2 * a);
    if (0 < t2 && t2 < 1) {
      tvalues.push(t2);
    }
  }

  let j = tvalues.length;
  const jlen = j;
  const iterator = getPointOnCubicBezierIterator(
    begx,
    begy,
    cp1x,
    cp1y,
    cp2x,
    cp2y,
    endx,
    endy,
  );
  while (j--) {
    const { x, y } = iterator(tvalues[j]);
    bounds[0][j] = x;
    bounds[1][j] = y;
  }

  bounds[0][jlen] = begx;
  bounds[1][jlen] = begy;
  bounds[0][jlen + 1] = endx;
  bounds[1][jlen + 1] = endy;
  const result: TRectBounds = [
    new Point(Math.min(...bounds[0]), Math.min(...bounds[1])),
    new Point(Math.max(...bounds[0]), Math.max(...bounds[1])),
  ];
  if (config.cachesBoundsOfCurve) {
    cache.boundsOfCurveCache[argsString!] = result;
  }
  return result;
}

/**
 * 将弧线转换为一系列三次贝塞尔曲线
 * @param fx 起点 x
 * @param fy 起点 y
 * @param coords 弧线命令
 * @returns 解析后的绝对三次贝塞尔曲线命令数组
 *
 * Converts arc to a bunch of cubic Bezier curves
 * @param {number} fx starting point x
 * @param {number} fy starting point y
 * @param {TParsedArcCommand} coords Arc command
 */
export const fromArcToBeziers = (
  fx: number,
  fy: number,
  [_, rx, ry, rot, large, sweep, tx, ty]: TParsedArcCommand,
): TParsedAbsoluteCubicCurveCommand[] => {
  const segsNorm = arcToSegments(tx - fx, ty - fy, rx, ry, large, sweep, rot);

  for (let i = 0, len = segsNorm.length; i < len; i++) {
    segsNorm[i][1] += fx;
    segsNorm[i][2] += fy;
    segsNorm[i][3] += fx;
    segsNorm[i][4] += fy;
    segsNorm[i][5] += fx;
    segsNorm[i][6] += fy;
  }
  return segsNorm;
};

/**
 * 此函数接收解析后的 SVG 路径并将其简化以供 fabricJS 逻辑使用。
 * 简化包括：
 * - 所有命令转换为绝对坐标（小写转大写）
 * - S 转换为 C
 * - T 转换为 Q
 * - A 转换为 C
 * @param path 解析后的 SVG 路径命令数组
 * @returns 简化的 SVG 路径命令数组
 * TODO: 找出一种优雅的方式来移除类型断言
 *
 * This function takes a parsed SVG path and makes it simpler for fabricJS logic.
 * Simplification consist of:
 * - All commands converted to absolute (lowercase to uppercase)
 * - S converted to C
 * - T converted to Q
 * - A converted to C
 * @param {TComplexPathData} path the array of commands of a parsed SVG path for `Path`
 * @return {TSimplePathData} the simplified array of commands of a parsed SVG path for `Path`
 * TODO: figure out how to remove the type assertions in a nice way
 */
export const makePathSimpler = (path: TComplexPathData): TSimplePathData => {
  // x and y represent the last point of the path, AKA the previous command point.
  // we add them to each relative command to make it an absolute comment.
  // we also swap the v V h H with L, because are easier to transform.
  let x = 0,
    y = 0;
  // x1 and y1 represent the last point of the subpath. the subpath is started with
  // m or M command. When a z or Z command is drawn, x and y need to be resetted to
  // the last x1 and y1.
  let x1 = 0,
    y1 = 0;
  // previous will host the letter of the previous command, to handle S and T.
  // controlX and controlY will host the previous reflected control point
  const destinationPath: TSimplePathData = [];
  let previous,
    // placeholders
    controlX = 0,
    controlY = 0;
  for (const parsedCommand of path) {
    const current: TComplexParsedCommand = [...parsedCommand];
    let converted: TSimpleParsedCommand | undefined;
    switch (
      current[0] // first letter
    ) {
      case 'l': // lineto, relative
        current[1] += x;
        current[2] += y;
      // falls through
      case 'L':
        x = current[1];
        y = current[2];
        converted = ['L', x, y];
        break;
      case 'h': // horizontal lineto, relative
        current[1] += x;
      // falls through
      case 'H':
        x = current[1];
        converted = ['L', x, y];
        break;
      case 'v': // vertical lineto, relative
        current[1] += y;
      // falls through
      case 'V':
        y = current[1];
        converted = ['L', x, y];
        break;
      case 'm': // moveTo, relative
        current[1] += x;
        current[2] += y;
      // falls through
      case 'M':
        x = current[1];
        y = current[2];
        x1 = current[1];
        y1 = current[2];
        converted = ['M', x, y];
        break;
      case 'c': // bezierCurveTo, relative
        current[1] += x;
        current[2] += y;
        current[3] += x;
        current[4] += y;
        current[5] += x;
        current[6] += y;
      // falls through
      case 'C':
        controlX = current[3];
        controlY = current[4];
        x = current[5];
        y = current[6];
        converted = ['C', current[1], current[2], controlX, controlY, x, y];
        break;
      case 's': // shorthand cubic bezierCurveTo, relative
        current[1] += x;
        current[2] += y;
        current[3] += x;
        current[4] += y;
      // falls through
      case 'S':
        // would be sScC but since we are swapping sSc for C, we check just that.
        if (previous === 'C') {
          // calculate reflection of previous control points
          controlX = 2 * x - controlX;
          controlY = 2 * y - controlY;
        } else {
          // If there is no previous command or if the previous command was not a C, c, S, or s,
          // the control point is coincident with the current point
          controlX = x;
          controlY = y;
        }
        x = current[3];
        y = current[4];
        converted = ['C', controlX, controlY, current[1], current[2], x, y];
        // converted[3] and converted[4] are NOW the second control point.
        // we keep it for the next reflection.
        controlX = converted[3];
        controlY = converted[4];
        break;
      case 'q': // quadraticCurveTo, relative
        current[1] += x;
        current[2] += y;
        current[3] += x;
        current[4] += y;
      // falls through
      case 'Q':
        controlX = current[1];
        controlY = current[2];
        x = current[3];
        y = current[4];
        converted = ['Q', controlX, controlY, x, y];
        break;
      case 't': // shorthand quadraticCurveTo, relative
        current[1] += x;
        current[2] += y;
      // falls through
      case 'T':
        if (previous === 'Q') {
          // calculate reflection of previous control point
          controlX = 2 * x - controlX;
          controlY = 2 * y - controlY;
        } else {
          // If there is no previous command or if the previous command was not a Q, q, T or t,
          // assume the control point is coincident with the current point
          controlX = x;
          controlY = y;
        }
        x = current[1];
        y = current[2];
        converted = ['Q', controlX, controlY, x, y];
        break;
      case 'a':
        current[6] += x;
        current[7] += y;
      // falls through
      case 'A':
        fromArcToBeziers(x, y, current).forEach((b) => destinationPath.push(b));
        x = current[6];
        y = current[7];
        break;
      case 'z':
      case 'Z':
        x = x1;
        y = y1;
        converted = ['Z'];
        break;
      default:
    }
    if (converted) {
      destinationPath.push(converted);
      previous = converted[0];
    } else {
      previous = '';
    }
  }
  return destinationPath;
};

// todo verify if we can just use the point class here
/**
 * 计算从点 x1,y1 到 x2,y2 的长度
 * @param x1 起点 x
 * @param y1 起点 y
 * @param x2 终点 x
 * @param y2 终点 y
 * @returns 线段长度
 *
 * Calc length from point x1,y1 to x2,y2
 * @param {number} x1 starting point x
 * @param {number} y1 starting point y
 * @param {number} x2 starting point x
 * @param {number} y2 starting point y
 * @return {number} length of segment
 */
const calcLineLength = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/**
 * 获取一个迭代器，该迭代器接收百分比并返回一个点
 * @param begx 起点 x
 * @param begy 起点 y
 * @param cp1x 第一控制点 x
 * @param cp1y 第一控制点 y
 * @param cp2x 第二控制点 x
 * @param cp2y 第二控制点 y
 * @param endx 终点 x
 * @param endy 终点 y
 * @returns 迭代器函数
 *
 * Get an iterator that takes a percentage and returns a point
 */
const getPointOnCubicBezierIterator =
  (
    begx: number,
    begy: number,
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    endx: number,
    endy: number,
  ) =>
  (pct: number) => {
    const c1 = CB1(pct),
      c2 = CB2(pct),
      c3 = CB3(pct),
      c4 = CB4(pct);
    return new Point(
      endx * c1 + cp2x * c2 + cp1x * c3 + begx * c4,
      endy * c1 + cp2y * c2 + cp1y * c3 + begy * c4,
    );
  };

/**
 * 二次贝塞尔曲线基函数 1: t^2
 */
const QB1 = (t: number) => t ** 2;
/**
 * 二次贝塞尔曲线基函数 2: 2t(1-t)
 */
const QB2 = (t: number) => 2 * t * (1 - t);
/**
 * 二次贝塞尔曲线基函数 3: (1-t)^2
 */
const QB3 = (t: number) => (1 - t) ** 2;

/**
 * 获取三次贝塞尔曲线切线的迭代器
 * @param p1x 起点 x
 * @param p1y 起点 y
 * @param p2x 第一控制点 x
 * @param p2y 第一控制点 y
 * @param p3x 第二控制点 x
 * @param p3y 第二控制点 y
 * @param p4x 终点 x
 * @param p4y 终点 y
 * @returns 切线角度迭代器
 */
const getTangentCubicIterator =
  (
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
    p4x: number,
    p4y: number,
  ) =>
  (pct: number) => {
    const qb1 = QB1(pct),
      qb2 = QB2(pct),
      qb3 = QB3(pct),
      tangentX =
        3 * (qb3 * (p2x - p1x) + qb2 * (p3x - p2x) + qb1 * (p4x - p3x)),
      tangentY =
        3 * (qb3 * (p2y - p1y) + qb2 * (p3y - p2y) + qb1 * (p4y - p3y));
    return Math.atan2(tangentY, tangentX);
  };

/**
 * 获取二次贝塞尔曲线上的点的迭代器
 * @param p1x 起点 x
 * @param p1y 起点 y
 * @param p2x 控制点 x
 * @param p2y 控制点 y
 * @param p3x 终点 x
 * @param p3y 终点 y
 * @returns 点迭代器
 */
const getPointOnQuadraticBezierIterator =
  (
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
  ) =>
  (pct: number) => {
    const c1 = QB1(pct),
      c2 = QB2(pct),
      c3 = QB3(pct);
    return new Point(
      p3x * c1 + p2x * c2 + p1x * c3,
      p3y * c1 + p2y * c2 + p1y * c3,
    );
  };

/**
 * 获取二次贝塞尔曲线切线的迭代器
 * @param p1x 起点 x
 * @param p1y 起点 y
 * @param p2x 控制点 x
 * @param p2y 控制点 y
 * @param p3x 终点 x
 * @param p3y 终点 y
 * @returns 切线角度迭代器
 */
const getTangentQuadraticIterator =
  (
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
  ) =>
  (pct: number) => {
    const invT = 1 - pct,
      tangentX = 2 * (invT * (p2x - p1x) + pct * (p3x - p2x)),
      tangentY = 2 * (invT * (p2y - p1y) + pct * (p3y - p2y));
    return Math.atan2(tangentY, tangentX);
  };

// this will run over a path segment (a cubic or quadratic segment) and approximate it
// with 100 segments. This will good enough to calculate the length of the curve
/**
 * 路径迭代器
 * 这将遍历路径段（三次或二次段）并用 100 个段对其进行近似。这足以计算曲线的长度。
 * @param iterator 点迭代器
 * @param x1 起点 x
 * @param y1 起点 y
 * @returns 路径长度
 */
const pathIterator = (
  iterator: (pct: number) => Point,
  x1: number,
  y1: number,
) => {
  let tempP = new Point(x1, y1),
    tmpLen = 0;
  for (let perc = 1; perc <= 100; perc += 1) {
    const p = iterator(perc / 100);
    tmpLen += calcLineLength(tempP.x, tempP.y, p.x, p.y);
    tempP = p;
  }
  return tmpLen;
};

/**
 * 给定 pathInfo 和以像素为单位的距离，找到从 0 到 1 的百分比
 * 对应于该像素在路径上的运行。
 * 然后将使用该百分比在画布上找到路径的正确点。
 * @param segInfo fabricJS 解析路径信息的集合
 * @param distance 距起点的距离，以像素为单位。
 * @returns 包含 x 和 y（画布上的点）以及角度（该点上的切线）的信息对象；
 *
 * Given a pathInfo, and a distance in pixels, find the percentage from 0 to 1
 * that correspond to that pixels run over the path.
 * The percentage will be then used to find the correct point on the canvas for the path.
 * @param {Array} segInfo fabricJS collection of information on a parsed path
 * @param {number} distance from starting point, in pixels.
 * @return {TPointAngle} info object with x and y ( the point on canvas ) and angle, the tangent on that point;
 */
const findPercentageForDistance = (
  segInfo: TCurveInfo<'Q' | 'C'>,
  distance: number,
): TPointAngle => {
  let perc = 0,
    tmpLen = 0,
    tempP: XY = { x: segInfo.x, y: segInfo.y },
    p: XY = { ...tempP },
    nextLen: number,
    nextStep = 0.01,
    lastPerc = 0;
  // nextStep > 0.0001 covers 0.00015625 that 1/64th of 1/100
  // the path
  const iterator = segInfo.iterator,
    angleFinder = segInfo.angleFinder;
  while (tmpLen < distance && nextStep > 0.0001) {
    p = iterator(perc);
    lastPerc = perc;
    nextLen = calcLineLength(tempP.x, tempP.y, p.x, p.y);
    // compare tmpLen each cycle with distance, decide next perc to test.
    if (nextLen + tmpLen > distance) {
      // we discard this step and we make smaller steps.
      perc -= nextStep;
      nextStep /= 2;
    } else {
      tempP = p;
      perc += nextStep;
      tmpLen += nextLen;
    }
  }
  return { ...p, angle: angleFinder(lastPerc) };
};

/**
 * 遍历解析和简化的路径并提取一些信息（每个命令的长度和起点）
 * @param path 解析后的路径命令
 * @returns 路径命令信息
 *
 * Run over a parsed and simplified path and extract some information (length of each command and starting point)
 * @param {TSimplePathData} path parsed path commands
 * @return {TPathSegmentInfo[]} path commands information
 */
export const getPathSegmentsInfo = (
  path: TSimplePathData,
): TPathSegmentInfo[] => {
  let totalLength = 0,
    //x2 and y2 are the coords of segment start
    //x1 and y1 are the coords of the current point
    x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0,
    iterator,
    tempInfo: TPathSegmentInfo;
  const info: TPathSegmentInfo[] = [];
  for (const current of path) {
    const basicInfo: TPathSegmentInfoCommon<keyof TPathSegmentCommandInfo> = {
      x: x1,
      y: y1,
      command: current[0],
      length: 0,
    };
    switch (
      current[0] //first letter
    ) {
      case 'M':
        tempInfo = <TPathSegmentInfoCommon<'M'>>basicInfo;
        tempInfo.x = x2 = x1 = current[1];
        tempInfo.y = y2 = y1 = current[2];
        break;
      case 'L':
        tempInfo = <TPathSegmentInfoCommon<'L'>>basicInfo;
        tempInfo.length = calcLineLength(x1, y1, current[1], current[2]);
        x1 = current[1];
        y1 = current[2];
        break;
      case 'C':
        iterator = getPointOnCubicBezierIterator(
          x1,
          y1,
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6],
        );
        tempInfo = <TCurveInfo<'C'>>basicInfo;
        tempInfo.iterator = iterator;
        tempInfo.angleFinder = getTangentCubicIterator(
          x1,
          y1,
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6],
        );
        tempInfo.length = pathIterator(iterator, x1, y1);

        x1 = current[5];
        y1 = current[6];
        break;
      case 'Q':
        iterator = getPointOnQuadraticBezierIterator(
          x1,
          y1,
          current[1],
          current[2],
          current[3],
          current[4],
        );
        tempInfo = <TCurveInfo<'Q'>>basicInfo;
        tempInfo.iterator = iterator;
        tempInfo.angleFinder = getTangentQuadraticIterator(
          x1,
          y1,
          current[1],
          current[2],
          current[3],
          current[4],
        );
        tempInfo.length = pathIterator(iterator, x1, y1);
        x1 = current[3];
        y1 = current[4];
        break;
      case 'Z':
        // we add those in order to ease calculations later
        tempInfo = <TEndPathInfo>basicInfo;
        tempInfo.destX = x2;
        tempInfo.destY = y2;
        tempInfo.length = calcLineLength(x1, y1, x2, y2);
        x1 = x2;
        y1 = y2;
        break;
    }
    totalLength += tempInfo.length;
    info.push(tempInfo);
  }
  info.push({ length: totalLength, x: x1, y: y1 });
  return info;
};

/**
 * 获取路径上指定距离的点
 * @param path 路径数据
 * @param distance 距离
 * @param infos 路径段信息
 * @returns 点和角度信息
 *
 * Get the point on the path that is distance along the path
 * @param path
 * @param distance
 * @param infos
 */
export const getPointOnPath = (
  path: TSimplePathData,
  distance: number,
  infos: TPathSegmentInfo[] = getPathSegmentsInfo(path),
): TPointAngle | undefined => {
  let i = 0;
  while (distance - infos[i].length > 0 && i < infos.length - 2) {
    distance -= infos[i].length;
    i++;
  }
  const segInfo = infos[i],
    segPercent = distance / segInfo.length,
    segment = path[i];

  switch (segInfo.command) {
    case 'M':
      return { x: segInfo.x, y: segInfo.y, angle: 0 };
    case 'Z':
      return {
        ...new Point(segInfo.x, segInfo.y).lerp(
          new Point(segInfo.destX, segInfo.destY),
          segPercent,
        ),
        angle: Math.atan2(segInfo.destY - segInfo.y, segInfo.destX - segInfo.x),
      };
    case 'L':
      return {
        ...new Point(segInfo.x, segInfo.y).lerp(
          new Point(segment[1]!, segment[2]!),
          segPercent,
        ),
        angle: Math.atan2(segment[2]! - segInfo.y, segment[1]! - segInfo.x),
      };
    case 'C':
      return findPercentageForDistance(segInfo, distance);
    case 'Q':
      return findPercentageForDistance(segInfo, distance);
    default:
    // throw Error('Invalid command');
  }
};

/**
 * 匹配所有路径命令的正则表达式
 */
const rePathCmdAll = new RegExp(rePathCommand, 'gi');
/**
 * 匹配圆弧命令点的正则表达式
 */
const regExpArcCommandPoints = new RegExp(reArcCommandPoints, 'g');
/**
 * 匹配数字的正则表达式
 */
const reMyNum = new RegExp(reNum, 'gi');
/**
 * 路径命令的参数长度
 */
const commandLengths = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
} as const;
/**
 * 解析 SVG 路径字符串
 * @param pathString 路径字符串
 * @returns SVG 路径命令数组
 * @example <caption>用法</caption>
 * parsePath('M 3 4 Q 3 5 2 1 4 0 Q 9 12 2 1 4 0') === [
 *   ['M', 3, 4],
 *   ['Q', 3, 5, 2, 1, 4, 0],
 *   ['Q', 9, 12, 2, 1, 4, 0],
 * ];
 *
 * @param {string} pathString
 * @return {TComplexPathData} An array of SVG path commands
 * @example <caption>Usage</caption>
 * parsePath('M 3 4 Q 3 5 2 1 4 0 Q 9 12 2 1 4 0') === [
 *   ['M', 3, 4],
 *   ['Q', 3, 5, 2, 1, 4, 0],
 *   ['Q', 9, 12, 2, 1, 4, 0],
 * ];
 */
export const parsePath = (pathString: string): TComplexPathData => {
  const chain: TComplexPathData = [];
  const all = pathString.match(rePathCmdAll) ?? [];
  for (const matchStr of all) {
    // take match string and save the first letter as the command
    const commandLetter = matchStr[0] as TComplexParsedCommandType;
    // in case of Z we have very little to do
    if (commandLetter === 'z' || commandLetter === 'Z') {
      chain.push([commandLetter]);
      continue;
    }
    const commandLength =
      commandLengths[
        commandLetter.toLowerCase() as keyof typeof commandLengths
      ];

    let paramArr = [];
    if (commandLetter === 'a' || commandLetter === 'A') {
      // the arc command ha some peculariaties that requires a special regex other than numbers
      // it is possible to avoid using a space between the sweep and large arc flags, making them either
      // 00, 01, 10 or 11, making them identical to a plain number for the regex reMyNum
      // reset the regexp
      regExpArcCommandPoints.lastIndex = 0;
      for (let out = null; (out = regExpArcCommandPoints.exec(matchStr)); ) {
        paramArr.push(...out.slice(1));
      }
    } else {
      paramArr = matchStr.match(reMyNum) || [];
    }

    // inspect the length of paramArr, if is longer than commandLength
    // we are dealing with repeated commands
    for (let i = 0; i < paramArr.length; i += commandLength) {
      const newCommand = new Array(commandLength) as TComplexParsedCommand;
      const transformedCommand = repeatedCommands[commandLetter];
      newCommand[0] =
        i > 0 && transformedCommand ? transformedCommand : commandLetter;
      for (let j = 0; j < commandLength; j++) {
        newCommand[j + 1] = parseFloat(paramArr[i + j]);
      }
      chain.push(newCommand);
    }
  }
  return chain;
};

/**
 * 将点转换为平滑的 SVG 路径
 * @param points 点数组
 * @param correction 对路径应用修正（通常我们使用 `width / 1000`）。如果值为 undefined，则使用 0 作为修正值。
 * @returns SVG 路径命令数组
 *
 * Converts points to a smooth SVG path
 * @param {XY[]} points Array of points
 * @param {number} [correction] Apply a correction to the path (usually we use `width / 1000`). If value is undefined 0 is used as the correction value.
 * @return {(string|number)[][]} An array of SVG path commands
 */
export const getSmoothPathFromPoints = (
  points: Point[],
  correction = 0,
): TSimplePathData => {
  let p1 = new Point(points[0]),
    p2 = new Point(points[1]),
    multSignX = 1,
    multSignY = 0;
  const path: TSimplePathData = [],
    len = points.length,
    manyPoints = len > 2;

  if (manyPoints) {
    multSignX = points[2].x < p2.x ? -1 : points[2].x === p2.x ? 0 : 1;
    multSignY = points[2].y < p2.y ? -1 : points[2].y === p2.y ? 0 : 1;
  }
  path.push([
    'M',
    p1.x - multSignX * correction,
    p1.y - multSignY * correction,
  ]);
  let i;
  for (i = 1; i < len; i++) {
    if (!p1.eq(p2)) {
      const midPoint = p1.midPointFrom(p2);
      // p1 is our bezier control point
      // midpoint is our endpoint
      // start point is p(i-1) value.
      path.push(['Q', p1.x, p1.y, midPoint.x, midPoint.y]);
    }
    p1 = points[i];
    if (i + 1 < points.length) {
      p2 = points[i + 1];
    }
  }
  if (manyPoints) {
    multSignX = p1.x > points[i - 2].x ? 1 : p1.x === points[i - 2].x ? 0 : -1;
    multSignY = p1.y > points[i - 2].y ? 1 : p1.y === points[i - 2].y ? 0 : -1;
  }
  path.push([
    'L',
    p1.x + multSignX * correction,
    p1.y + multSignY * correction,
  ]);
  return path;
};

/**
 * 通过变换每个段来变换路径。
 * 它必须是简化的路径，否则将无法工作。
 * 警告：这取决于 pathOffset 才能正确操作
 * @param path fabricJS 解析并简化的路径命令
 * @param transform 表示变换的矩阵
 * @param pathOffset `Path.pathOffset`
 * @returns 变换后的路径
 *
 * Transform a path by transforming each segment.
 * it has to be a simplified path or it won't work.
 * WARNING: this depends from pathOffset for correct operation
 * @param {TSimplePathData} path fabricJS parsed and simplified path commands
 * @param {TMat2D} transform matrix that represent the transformation
 * @param {Point} [pathOffset] `Path.pathOffset`
 * @returns {TSimplePathData} the transformed path
 */
export const transformPath = (
  path: TSimplePathData,
  transform: TMat2D,
  pathOffset: Point,
): TSimplePathData => {
  if (pathOffset) {
    transform = multiplyTransformMatrices(transform, [
      1,
      0,
      0,
      1,
      -pathOffset.x,
      -pathOffset.y,
    ]);
  }
  return path.map((pathSegment) => {
    const newSegment: TSimpleParsedCommand = [...pathSegment];
    for (let i = 1; i < pathSegment.length - 1; i += 2) {
      // TODO: is there a way to get around casting to any?
      const { x, y } = transformPoint(
        {
          x: pathSegment[i] as number,
          y: pathSegment[i + 1] as number,
        },
        transform,
      );
      newSegment[i] = x;
      newSegment[i + 1] = y;
    }
    return newSegment;
  });
};

/**
 * 返回创建正多边形的路径命令数组
 * @param numVertexes 顶点数
 * @param radius 半径
 * @returns SVG 路径命令数组
 *
 * Returns an array of path commands to create a regular polygon
 * @param {number} numVertexes
 * @param {number} radius
 * @returns {TSimplePathData} An array of SVG path commands
 */
export const getRegularPolygonPath = (
  numVertexes: number,
  radius: number,
): TSimplePathData => {
  const interiorAngle = (Math.PI * 2) / numVertexes;
  // rotationAdjustment rotates the path by 1/2 the interior angle so that the polygon always has a flat side on the bottom
  // This isn't strictly necessary, but it's how we tend to think of and expect polygons to be drawn
  let rotationAdjustment = -halfPI;
  if (numVertexes % 2 === 0) {
    rotationAdjustment += interiorAngle / 2;
  }
  const d = new Array(numVertexes + 1);
  for (let i = 0; i < numVertexes; i++) {
    const rad = i * interiorAngle + rotationAdjustment;
    const { x, y } = new Point(cos(rad), sin(rad)).scalarMultiply(radius);
    d[i] = [i === 0 ? 'M' : 'L', x, y];
  }
  d[numVertexes] = ['Z'];
  return d;
};

/**
 * 连接路径命令以返回 svg 格式
 * @param pathData fabricJS 解析的路径命令
 * @param fractionDigits 保留的小数位数
 * @return 连接后的路径 'M 0 0 L 20 30'
 *
 * Join path commands to go back to svg format
 * @param {TSimplePathData} pathData fabricJS parsed path commands
 * @param {number} fractionDigits number of fraction digits to "leave"
 * @return {String} joined path 'M 0 0 L 20 30'
 */
export const joinPath = (pathData: TSimplePathData, fractionDigits?: number) =>
  pathData
    .map((segment) => {
      return segment
        .map((arg, i) => {
          if (i === 0) return arg;
          return fractionDigits === undefined
            ? arg
            : toFixed(arg, fractionDigits);
        })
        .join(' ');
    })
    .join(' ');
