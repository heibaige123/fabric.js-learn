import type { TRadian } from '../../typedefs';
import type { XY, Point } from '../../Point';

/**
 * 路径段通用信息
 */
export type TPathSegmentInfoCommon<C extends string> = {
  x: number;
  y: number;
  command?: C;
  length: number;
};

/**
 * 曲线信息
 */
export type TCurveInfo<C extends string> = TPathSegmentInfoCommon<C> & {
  /**
   * 获取曲线上一定百分比距离的点
   * @param pct
   *
   * Get the Point a certain percent distance along the curve
   * @param pct
   */
  iterator: (pct: number) => Point;
  /**
   * 获取百分比对应的角度
   * @param pct
   *
   * Get the angle to a percent
   * @param pct
   */
  angleFinder: (pct: number) => number;
  /**
   * 曲线的总长度
   *
   * Total length of the curve
   */
  length: number;
};

/**
 * 路径结束信息
 */
export type TEndPathInfo = TPathSegmentInfoCommon<'Z'> & {
  destX: number;
  destY: number;
};

/**
 * 计算简化解析路径中每种命令类型的路径长度/点所需的相关信息
 *
 * Relevant info to calculate path length/points on path
 * for each command type in a simplified parsed path
 */
export type TPathSegmentCommandInfo = {
  M: TPathSegmentInfoCommon<'M'>;
  L: TPathSegmentInfoCommon<'L'>;
  C: TCurveInfo<'C'>;
  Q: TCurveInfo<'Q'>;
  Z: TEndPathInfo;
};

/**
 * 路径段信息
 */
export type TPathSegmentInfo =
  TPathSegmentCommandInfo[keyof TPathSegmentCommandInfo];

/**
 * 任意长度的解析命令（即使是不可能的命令）
 *
 * A parsed command of any length (even impossible ones)
 */
export type TParsedCommand =
  | [command: string]
  | [command: string, arg1: number]
  | [command: string, arg1: number, arg2: number]
  | [command: string, arg1: number, arg2: number, arg3: number]
  | [command: string, arg1: number, arg2: number, arg3: number, arg4: number]
  | [
      command: string,
      arg1: number,
      arg2: number,
      arg3: number,
      arg4: number,
      arg5: number,
    ]
  | [
      command: string,
      arg1: number,
      arg2: number,
      arg3: number,
      arg4: number,
      arg5: number,
      arg6: number,
    ]
  | [
      command: string,
      arg1: number,
      arg2: number,
      arg3: number,
      arg4: number,
      arg5: number,
      arg6: number,
      arg7: number,
    ];

/**
 * 任意长度的命令字符串
 *
 * Command strings of any length
 */
type TCommand1<T extends TParsedCommand> = `${T[0]}`;
type TCommand2<T extends TParsedCommand> = `${T[0]} ${T[1]}`;
type TCommand3<T extends TParsedCommand> = `${T[0]} ${T[1]} ${T[2]}`;
type TCommand5<T extends TParsedCommand> =
  `${T[0]} ${T[1]} ${T[2]} ${T[3]} ${T[4]}`;
type TCommand7<T extends TParsedCommand> =
  `${T[0]} ${T[1]} ${T[2]} ${T[3]} ${T[4]} ${T[5]} ${T[6]}`;
type TCommand8<T extends TParsedCommand> =
  `${T[0]} ${T[1]} ${T[2]} ${T[3]} ${T[4]} ${T[5]} ${T[6]} ${T[7]}`;

/**
 * 开始解析 SVG 路径命令
 * 在 {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths|MDN} 阅读有关命令的信息
 *
 * Begin parsed SVG path commands
 * Read about commands at {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths|MDN}
 */
export type TParsedAbsoluteMoveToCommand = [command: 'M', x: number, y: number];
/**
 * 解析后的相对移动命令
 */
export type TParsedRelativeMoveToCommand = [
  command: 'm',
  dx: number,
  dy: number,
];
/**
 * 解析后的移动命令（绝对或相对）
 */
export type TParsedMoveToCommand =
  | TParsedAbsoluteMoveToCommand
  | TParsedRelativeMoveToCommand;

/**
 * 移动命令字符串
 */
export type TMoveToCommand = TCommand3<TParsedMoveToCommand>;

/**
 * 解析后的绝对直线命令
 */
export type TParsedAbsoluteLineCommand = [command: 'L', x: number, y: number];
/**
 * 解析后的相对直线命令
 */
export type TParsedRelativeLineCommand = [command: 'l', dx: number, dy: number];
/**
 * 解析后的直线命令（绝对或相对）
 */
export type TParsedLineCommand =
  | TParsedAbsoluteLineCommand
  | TParsedRelativeLineCommand;

/**
 * 直线命令字符串
 */
export type TLineCommand = TCommand3<TParsedLineCommand>;

/**
 * 解析后的绝对水平直线命令
 */
export type TParsedAbsoluteHorizontalLineCommand = [command: 'H', x: number];
/**
 * 解析后的相对水平直线命令
 */
export type TParsedRelativeHorizontalLineCommand = [command: 'h', dx: number];
/**
 * 解析后的水平直线命令（绝对或相对）
 */
export type TParsedHorizontalLineCommand =
  | TParsedAbsoluteHorizontalLineCommand
  | TParsedRelativeHorizontalLineCommand;

/**
 * 水平直线命令字符串
 */
export type THorizontalLineCommand = TCommand2<TParsedHorizontalLineCommand>;

/**
 * 解析后的绝对垂直直线命令
 */
export type TParsedAbsoluteVerticalLineCommand = [command: 'V', y: number];
/**
 * 解析后的相对垂直直线命令
 */
export type TParsedRelativeVerticalLineCommand = [command: 'v', dy: number];
/**
 * 解析后的垂直直线命令（绝对或相对）
 */
export type TParsedVerticalLineCommand =
  | TParsedAbsoluteVerticalLineCommand
  | TParsedRelativeVerticalLineCommand;

/**
 * 垂直直线命令字符串
 */
export type TVerticalLineCommand = TCommand2<TParsedVerticalLineCommand>;

/**
 * 解析后的绝对闭合路径命令
 */
export type TParsedAbsoluteClosePathCommand = [command: 'Z'];
/**
 * 解析后的相对闭合路径命令
 */
export type TParsedRelativeClosePathCommand = [command: 'z'];
/**
 * 解析后的闭合路径命令（绝对或相对）
 */
export type TParsedClosePathCommand =
  | TParsedAbsoluteClosePathCommand
  | TParsedRelativeClosePathCommand;

/**
 * 闭合路径命令字符串
 */
export type TClosePathCommand = TCommand1<TParsedClosePathCommand>;

/**
 * 解析后的绝对三次贝塞尔曲线命令
 */
export type TParsedAbsoluteCubicCurveCommand = [
  command: 'C',
  controlPoint1X: number,
  controlPoint1Y: number,
  controlPoint2X: number,
  controlPoint2Y: number,
  endX: number,
  endY: number,
];
/**
 * 解析后的相对三次贝塞尔曲线命令
 */
export type TParsedRelativeCubicCurveCommand = [
  command: 'c',
  controlPoint1DX: number,
  controlPoint1DY: number,
  controlPoint2DX: number,
  controlPoint2DY: number,
  endDX: number,
  endDY: number,
];
/**
 * 解析后的三次贝塞尔曲线命令（绝对或相对）
 */
export type TParsedCubicCurveCommand =
  | TParsedAbsoluteCubicCurveCommand
  | TParsedRelativeCubicCurveCommand;

/**
 * 三次贝塞尔曲线命令字符串
 */
export type TCubicCurveCommand = TCommand7<TParsedCubicCurveCommand>;

/**
 * 解析后的绝对平滑三次贝塞尔曲线命令
 */
export type TParsedAbsoluteCubicCurveShortcutCommand = [
  command: 'S',
  controlPoint2X: number,
  controlPoint2Y: number,
  endX: number,
  endY: number,
];
/**
 * 解析后的相对平滑三次贝塞尔曲线命令
 */
export type TParsedRelativeCubicCurveShortcutCommand = [
  command: 's',
  controlPoint2DX: number,
  controlPoint2DY: number,
  endDX: number,
  endDY: number,
];
/**
 * 解析后的平滑三次贝塞尔曲线命令（绝对或相对）
 */
export type TParsedCubicCurveShortcutCommand =
  | TParsedAbsoluteCubicCurveShortcutCommand
  | TParsedRelativeCubicCurveShortcutCommand;

/**
 * 平滑三次贝塞尔曲线命令字符串
 */
export type TCubicCurveShortcutCommand =
  TCommand5<TParsedCubicCurveShortcutCommand>;

/**
 * 解析后的绝对二次贝塞尔曲线命令
 */
export type TParsedAbsoluteQuadraticCurveCommand = [
  command: 'Q',
  controlPointX: number,
  controlPointY: number,
  endX: number,
  endY: number,
];
/**
 * 解析后的相对二次贝塞尔曲线命令
 */
export type TParsedRelativeQuadraticCurveCommand = [
  command: 'q',
  controlPointDX: number,
  controlPointDY: number,
  endDX: number,
  endDY: number,
];
/**
 * 解析后的二次贝塞尔曲线命令（绝对或相对）
 */
export type TParsedQuadraticCurveCommand =
  | TParsedAbsoluteQuadraticCurveCommand
  | TParsedRelativeQuadraticCurveCommand;

/**
 * 二次贝塞尔曲线命令字符串
 */
export type TQuadraticCurveCommand = TCommand5<TParsedQuadraticCurveCommand>;

/**
 * 解析后的绝对平滑二次贝塞尔曲线命令
 */
export type TParsedAbsoluteQuadraticCurveShortcutCommand = [
  command: 'T',
  endX: number,
  endY: number,
];
/**
 * 解析后的相对平滑二次贝塞尔曲线命令
 */
export type TParsedRelativeQuadraticCurveShortcutCommand = [
  command: 't',
  endDX: number,
  endDY: number,
];
/**
 * 解析后的平滑二次贝塞尔曲线命令（绝对或相对）
 */
export type TParsedQuadraticCurveShortcutCommand =
  | TParsedAbsoluteQuadraticCurveShortcutCommand
  | TParsedRelativeQuadraticCurveShortcutCommand;

/**
 * 平滑二次贝塞尔曲线命令字符串
 */
export type TQuadraticCurveShortcutCommand =
  TCommand3<TParsedQuadraticCurveShortcutCommand>;

/**
 * 解析后的绝对椭圆弧曲线命令
 */
export type TParsedAbsoluteArcCommand = [
  command: 'A',
  radiusX: number,
  radiusY: number,
  rotation: TRadian,
  largeArc: 0 | 1,
  sweep: 0 | 1,
  endX: number,
  endY: number,
];
/**
 * 解析后的相对椭圆弧曲线命令
 */
export type TParsedRelativeArcCommand = [
  command: 'a',
  radiusX: number,
  radiusY: number,
  rotation: TRadian,
  largeArc: 0 | 1,
  sweep: 0 | 1,
  endDX: number,
  endDY: number,
];

/**
 * 解析后的椭圆弧曲线命令（绝对或相对）
 */
export type TParsedArcCommand =
  | TParsedAbsoluteArcCommand
  | TParsedRelativeArcCommand;

/**
 * 椭圆弧曲线命令字符串（单标志位）
 */
export type TArcCommandSingleFlag<T extends TParsedArcCommand> =
  `${T[0]} ${T[1]} ${T[2]} ${T[3]} ${T[4]}${T[5]} ${T[6]} ${T[7]}`;
/**
 * 椭圆弧曲线命令字符串
 */
export type TArcCommand =
  | TCommand8<TParsedArcCommand>
  | TArcCommandSingleFlag<TParsedArcCommand>;

/**
 * 结束解析路径命令
 *
 * End parsed path commands
 */

/**
 * 任何旧的有效 SVG 路径命令
 *
 * Any old valid SVG path command
 */
export type TComplexParsedCommand =
  | TParsedMoveToCommand
  | TParsedLineCommand
  | TParsedHorizontalLineCommand
  | TParsedVerticalLineCommand
  | TParsedClosePathCommand
  | TParsedCubicCurveCommand
  | TParsedCubicCurveShortcutCommand
  | TParsedQuadraticCurveCommand
  | TParsedQuadraticCurveShortcutCommand
  | TParsedArcCommand;

/**
 * 一系列路径命令
 *
 * A series of path commands
 */
export type TComplexPathData = TComplexParsedCommand[];

/**
 * 所有 Fabric 函数都能理解的任何 SVG 命令
 *
 * Any SVG command that all Fabric functions can understand
 *
 */
export type TSimpleParsedCommand =
  | TParsedAbsoluteMoveToCommand
  | TParsedAbsoluteLineCommand
  | TParsedAbsoluteClosePathCommand
  | TParsedAbsoluteCubicCurveCommand
  | TParsedAbsoluteQuadraticCurveCommand;

/**
 * 简单解析命令类型
 */
export type TSimpleParseCommandType = 'L' | 'M' | 'C' | 'Q' | 'Z';

/**
 * 复杂解析命令类型
 */
export type TComplexParsedCommandType =
  | 'M'
  | 'L'
  | 'C'
  | 'Q'
  | 'Z'
  | 'z'
  | 'm'
  | 'l'
  | 'h'
  | 'v'
  | 'c'
  | 's'
  | 'q'
  | 't'
  | 'a'
  | 'H'
  | 'V'
  | 'S'
  | 'T'
  | 'A';

/**
 * 一系列简单路径
 *
 * A series of simple paths
 */
export type TSimplePathData = TSimpleParsedCommand[];

/**
 * 一个点（向量）以及该向量与 x 轴之间的角度
 *
 * A point (vector) and angle between the vector and x-axis
 */
export type TPointAngle = XY & { angle: TRadian };
