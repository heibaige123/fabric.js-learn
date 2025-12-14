import type { TMat2D } from './typedefs';
// use this syntax so babel plugin see this import here
import { version } from '../package.json';

/**
 * Fabric.js 版本号
 */
export const VERSION = version;
// eslint-disable-next-line @typescript-eslint/no-empty-function
/**
 * 空函数
 */
export function noop() {}

/**
 * 半个 PI (90度)
 */
export const halfPI = Math.PI / 2;
/**
 * 四分之一 PI (45度)
 */
export const quarterPI = Math.PI / 4;
/**
 * 两个 PI (360度)
 */
export const twoMathPi = Math.PI * 2;
/**
 * 角度转弧度的系数 (PI / 180)
 */
export const PiBy180 = Math.PI / 180;

/**
 * 单位矩阵
 */
export const iMatrix = Object.freeze([1, 0, 0, 1, 0, 0]) as TMat2D;
/**
 * 默认 SVG 字体大小
 */
export const DEFAULT_SVG_FONT_SIZE = 16;
/**
 * 锯齿限制
 */
export const ALIASING_LIMIT = 2;

/* "magic number" for bezier approximations of arcs (http://itc.ktu.lt/itc354/Riskus354.pdf) */
/**
 * 用于圆弧贝塞尔近似的“魔术数字”
 *
 * "magic number" for bezier approximations of arcs (http://itc.ktu.lt/itc354/Riskus354.pdf)
 */
export const kRect = 1 - 0.5522847498;

/**
 * 居中对齐
 */
export const CENTER = 'center';
/**
 * 左对齐
 */
export const LEFT = 'left';
/**
 * 顶部对齐
 */
export const TOP = 'top';
/**
 * 底部对齐
 */
export const BOTTOM = 'bottom';
/**
 * 右对齐
 */
export const RIGHT = 'right';
/**
 * 无
 */
export const NONE = 'none';

/**
 * 换行符正则
 */
export const reNewline = /\r?\n/;

/**
 * 移动动作
 */
export const MOVING = 'moving';
/**
 * 缩放动作
 */
export const SCALING = 'scaling';
/**
 * 旋转动作
 */
export const ROTATING = 'rotating';
/**
 * 旋转
 */
export const ROTATE = 'rotate';
/**
 * 倾斜动作
 */
export const SKEWING = 'skewing';
/**
 * 调整大小动作
 */
export const RESIZING = 'resizing';
/**
 * 修改多边形动作
 */
export const MODIFY_POLY = 'modifyPoly';
/**
 * 修改路径动作
 */
export const MODIFY_PATH = 'modifyPath';
/**
 * 改变事件
 */
export const CHANGED = 'changed';
/**
 * 缩放
 */
export const SCALE = 'scale';
/**
 * X 轴缩放
 */
export const SCALE_X = 'scaleX';
/**
 * Y 轴缩放
 */
export const SCALE_Y = 'scaleY';
/**
 * X 轴倾斜
 */
export const SKEW_X = 'skewX';
/**
 * Y 轴倾斜
 */
export const SKEW_Y = 'skewY';
/**
 * 填充
 */
export const FILL = 'fill';
/**
 * 描边
 */
export const STROKE = 'stroke';
/**
 * 已修改事件
 */
export const MODIFIED = 'modified';

/**
 * 从左到右
 */
export const LTR = 'ltr';
/**
 * 从右到左
 */
export const RTL = 'rtl';

/**
 * 正常
 */
export const NORMAL = 'normal';
