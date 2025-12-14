import type {
  TComplexParsedCommand,
  TParsedAbsoluteArcCommand,
  TParsedAbsoluteClosePathCommand,
  TParsedAbsoluteCubicCurveCommand,
  TParsedAbsoluteCubicCurveShortcutCommand,
  TParsedAbsoluteHorizontalLineCommand,
  TParsedAbsoluteLineCommand,
  TParsedAbsoluteMoveToCommand,
  TParsedAbsoluteQuadraticCurveCommand,
  TParsedAbsoluteQuadraticCurveShortcutCommand,
  TParsedAbsoluteVerticalLineCommand,
  TParsedClosePathCommand,
  TParsedLineCommand,
  TParsedRelativeArcCommand,
  TParsedRelativeClosePathCommand,
  TParsedRelativeCubicCurveCommand,
  TParsedRelativeCubicCurveShortcutCommand,
  TParsedRelativeHorizontalLineCommand,
  TParsedRelativeLineCommand,
  TParsedRelativeMoveToCommand,
  TParsedRelativeQuadraticCurveCommand,
  TParsedRelativeQuadraticCurveShortcutCommand,
  TParsedRelativeVerticalLineCommand,
} from './typedefs';

/**
 * 检查命令是否为绝对移动命令 (M)
 * @param cmd 路径命令
 * @returns 如果是绝对移动命令则返回 true
 */
export function isAbsMoveToCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteMoveToCommand {
  return cmd.length == 3 && cmd[0] == 'M';
}
/**
 * 检查命令是否为相对移动命令 (m)
 * @param cmd 路径命令
 * @returns 如果是相对移动命令则返回 true
 */
export function isRelMoveToCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeMoveToCommand {
  return cmd.length == 3 && cmd[0] == 'm';
}

/**
 * 检查命令是否为绝对直线命令 (L)
 * @param cmd 路径命令
 * @returns 如果是绝对直线命令则返回 true
 */
export function isAbsLineCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteLineCommand {
  return cmd.length == 3 && cmd[0] == 'L';
}
/**
 * 检查命令是否为相对直线命令 (l)
 * @param cmd 路径命令
 * @returns 如果是相对直线命令则返回 true
 */
export function isRelLineCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeLineCommand {
  return cmd.length == 3 && cmd[0] == 'l';
}
/**
 * 检查命令是否为直线命令 (L 或 l)
 * @param cmd 路径命令
 * @returns 如果是直线命令则返回 true
 */
export function isLineCommand(
  cmd: TComplexParsedCommand,
): cmd is TParsedLineCommand {
  return isAbsLineCmd(cmd) || isRelLineCmd(cmd);
}

/**
 * 检查命令是否为绝对水平直线命令 (H)
 * @param cmd 路径命令
 * @returns 如果是绝对水平直线命令则返回 true
 */
export function isAbsHorizontalLineCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteHorizontalLineCommand {
  return cmd.length == 2 && cmd[0] == 'H';
}
/**
 * 检查命令是否为相对水平直线命令 (h)
 * @param cmd 路径命令
 * @returns 如果是相对水平直线命令则返回 true
 */
export function isRelHorizontalLineCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeHorizontalLineCommand {
  return cmd.length == 2 && cmd[0] == 'h';
}

/**
 * 检查命令是否为绝对垂直直线命令 (V)
 * @param cmd 路径命令
 * @returns 如果是绝对垂直直线命令则返回 true
 */
export function isAbsVerticalLineCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteVerticalLineCommand {
  return cmd.length == 2 && cmd[0] == 'V';
}
/**
 * 检查命令是否为相对垂直直线命令 (v)
 * @param cmd 路径命令
 * @returns 如果是相对垂直直线命令则返回 true
 */
export function isRelVerticalLineCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeVerticalLineCommand {
  return cmd.length == 2 && cmd[0] == 'v';
}

/**
 * 检查命令是否为绝对闭合路径命令 (Z)
 * @param cmd 路径命令
 * @returns 如果是绝对闭合路径命令则返回 true
 */
export function isAbsClosePathCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteClosePathCommand {
  return cmd.length == 1 && cmd[0] == 'Z';
}
/**
 * 检查命令是否为相对闭合路径命令 (z)
 * @param cmd 路径命令
 * @returns 如果是相对闭合路径命令则返回 true
 */
export function isRelClosePathCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeClosePathCommand {
  return cmd.length == 1 && cmd[0] == 'z';
}
/**
 * 检查命令是否为闭合路径命令 (Z 或 z)
 * @param cmd 路径命令
 * @returns 如果是闭合路径命令则返回 true
 */
export function isClosePathCommand(
  cmd: TComplexParsedCommand,
): cmd is TParsedClosePathCommand {
  return cmd.length == 1 && (cmd[0] == 'z' || cmd[0] == 'Z');
}

/**
 * 检查命令是否为绝对三次贝塞尔曲线命令 (C)
 * @param cmd 路径命令
 * @returns 如果是绝对三次贝塞尔曲线命令则返回 true
 */
export function isAbsCubicCurveCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteCubicCurveCommand {
  return cmd.length == 7 && cmd[0] == 'C';
}
/**
 * 检查命令是否为相对三次贝塞尔曲线命令 (c)
 * @param cmd 路径命令
 * @returns 如果是相对三次贝塞尔曲线命令则返回 true
 */
export function isRelCubicCurveCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeCubicCurveCommand {
  return cmd.length == 7 && cmd[0] == 'c';
}

/**
 * 检查命令是否为绝对平滑三次贝塞尔曲线命令 (S)
 * @param cmd 路径命令
 * @returns 如果是绝对平滑三次贝塞尔曲线命令则返回 true
 */
export function isAbsCubicCurveShortcutCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteCubicCurveShortcutCommand {
  return cmd.length == 5 && cmd[0] == 'S';
}
/**
 * 检查命令是否为相对平滑三次贝塞尔曲线命令 (s)
 * @param cmd 路径命令
 * @returns 如果是相对平滑三次贝塞尔曲线命令则返回 true
 */
export function isRelCubicCurveShortcutCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeCubicCurveShortcutCommand {
  return cmd.length == 5 && cmd[0] == 's';
}

/**
 * 检查命令是否为绝对二次贝塞尔曲线命令 (Q)
 * @param cmd 路径命令
 * @returns 如果是绝对二次贝塞尔曲线命令则返回 true
 */
export function isAbsQuadraticCurveCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteQuadraticCurveCommand {
  return cmd.length == 5 && cmd[0] == 'Q';
}
/**
 * 检查命令是否为相对二次贝塞尔曲线命令 (q)
 * @param cmd 路径命令
 * @returns 如果是相对二次贝塞尔曲线命令则返回 true
 */
export function isRelQuadraticCurveCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeQuadraticCurveCommand {
  return cmd.length == 5 && cmd[0] == 'q';
}

/**
 * 检查命令是否为绝对平滑二次贝塞尔曲线命令 (T)
 * @param cmd 路径命令
 * @returns 如果是绝对平滑二次贝塞尔曲线命令则返回 true
 */
export function isAbsQuadraticCurveShortcutCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteQuadraticCurveShortcutCommand {
  return cmd.length == 3 && cmd[0] == 'T';
}
/**
 * 检查命令是否为相对平滑二次贝塞尔曲线命令 (t)
 * @param cmd 路径命令
 * @returns 如果是相对平滑二次贝塞尔曲线命令则返回 true
 */
export function isRelQuadraticCurveShortcutCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeQuadraticCurveShortcutCommand {
  return cmd.length == 3 && cmd[0] == 't';
}

/**
 * 检查命令是否为绝对圆弧命令 (A)
 * @param cmd 路径命令
 * @returns 如果是绝对圆弧命令则返回 true
 */
export function isAbsArcCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedAbsoluteArcCommand {
  return cmd.length == 8 && cmd[0] == 'A';
}
/**
 * 检查命令是否为相对圆弧命令 (a)
 * @param cmd 路径命令
 * @returns 如果是相对圆弧命令则返回 true
 */
export function isRelArcCmd(
  cmd: TComplexParsedCommand,
): cmd is TParsedRelativeArcCommand {
  return cmd.length == 8 && cmd[0] == 'a';
}
