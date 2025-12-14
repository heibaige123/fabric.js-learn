import { reNum } from '../../parser/constants';

/**
 * 逗号或空格的正则表达式部分
 */
const commaWsp = `\\s*,?\\s*`;

/**
 * p 代表参数
 * 这里使用“糟糕的命名”是因为它使正则表达式更容易阅读
 * p 是一个数字，前面有任意数量的空格（可能是 0 个），
 * 一个逗号或没有，然后可能有更多的空格或没有。
 *
 * p for param
 * using "bad naming" here because it makes the regex much easier to read
 * p is a number that is preceded by an arbitary number of spaces, maybe 0,
 * a comma or not, and then possibly more spaces or not.
 */
const p = `${commaWsp}(${reNum})`;

// const reMoveToCommand = `(M) ?(?:${p}${p} ?)+`;

// const reLineCommand = `(L) ?(?:${p}${p} ?)+`;

// const reHorizontalLineCommand = `(H) ?(?:${p} ?)+`;

// const reVerticalLineCommand = `(V) ?(?:${p} ?)+`;

// const reClosePathCommand = String.raw`(Z)\s*`;

// const reCubicCurveCommand = `(C) ?(?:${p}${p}${p}${p}${p}${p} ?)+`;

// const reCubicCurveShortcutCommand = `(S) ?(?:${p}${p}${p}${p} ?)+`;

// const reQuadraticCurveCommand = `(Q) ?(?:${p}${p}${p}${p} ?)+`;

// const reQuadraticCurveShortcutCommand = `(T) ?(?:${p}${p} ?)+`;

/**
 * 圆弧命令点的正则表达式部分
 */
export const reArcCommandPoints = `${p}${p}${p}${commaWsp}([01])${commaWsp}([01])${p}${p}`;
// const reArcCommand = `(A) ?(?:${reArcCommandPoints} ?)+`;

// export const rePathCommandGroups =
//   `(?:(?:${reMoveToCommand})` +
//   `|(?:${reLineCommand})` +
//   `|(?:${reHorizontalLineCommand})` +
//   `|(?:${reVerticalLineCommand})` +
//   `|(?:${reClosePathCommand})` +
//   `|(?:${reCubicCurveCommand})` +
//   `|(?:${reCubicCurveShortcutCommand})` +
//   `|(?:${reQuadraticCurveCommand})` +
//   `|(?:${reQuadraticCurveShortcutCommand})` +
//   `|(?:${reArcCommand}))`;

/**
 * 路径命令的正则表达式
 */
export const rePathCommand = '[mzlhvcsqta][^mzlhvcsqta]*';
