import { FILL, LEFT, LTR, NORMAL, STROKE, reNewline } from '../../constants';
import type { TClassProperties } from '../../typedefs';
import type { FabricText } from './Text';

/**
 * 文本装饰厚度属性名
 */
export const TEXT_DECORATION_THICKNESS = 'textDecorationThickness';

/**
 * 字体属性列表
 */
const fontProperties = [
  'fontSize',
  'fontWeight',
  'fontFamily',
  'fontStyle',
] as const;

/**
 * 文本装饰属性列表
 */
export const textDecorationProperties = [
  'underline',
  'overline',
  'linethrough',
] as const;

/**
 * 文本布局属性列表
 */
export const textLayoutProperties: string[] = [
  ...fontProperties,
  'lineHeight',
  'text',
  'charSpacing',
  'textAlign',
  'styles',
  'path',
  'pathStartOffset',
  'pathSide',
  'pathAlign',
];

/**
 * 额外属性列表
 */
export const additionalProps = [
  ...textLayoutProperties,
  ...textDecorationProperties,
  'textBackgroundColor',
  'direction',
  TEXT_DECORATION_THICKNESS,
] as const;

/**
 * 样式属性类型
 */
export type StylePropertiesType =
  | 'fill'
  | 'stroke'
  | 'strokeWidth'
  | 'fontSize'
  | 'fontFamily'
  | 'fontWeight'
  | 'fontStyle'
  | 'textBackgroundColor'
  | 'deltaY'
  | 'overline'
  | 'underline'
  | 'linethrough'
  | typeof TEXT_DECORATION_THICKNESS;

/**
 * 样式属性列表
 */
export const styleProperties: Readonly<StylePropertiesType[]> = [
  ...fontProperties,
  ...textDecorationProperties,
  STROKE,
  'strokeWidth',
  FILL,
  'deltaY',
  'textBackgroundColor',
  TEXT_DECORATION_THICKNESS,
] as const;

// @TODO: Many things here are configuration related and shouldn't be on the class nor prototype
// regexes, list of properties that are not suppose to change by instances, magic consts.
// this will be a separated effort
/**
 * 文本默认值
 */
export const textDefaultValues: Partial<TClassProperties<FabricText>> = {
  /**
   * 换行符正则
   */
  _reNewline: reNewline,
  /**
   * 空格和制表符正则（全局）
   */
  _reSpacesAndTabs: /[ \t\r]/g,
  /**
   * 空格和制表符正则
   */
  _reSpaceAndTab: /[ \t\r]/,
  /**
   * 单词正则
   */
  _reWords: /\S+/g,
  /**
   * 字体大小
   */
  fontSize: 40,
  /**
   * 字体粗细
   */
  fontWeight: NORMAL,
  /**
   * 字体系列
   */
  fontFamily: 'Times New Roman',
  /**
   * 下划线
   */
  underline: false,
  /**
   * 上划线
   */
  overline: false,
  /**
   * 删除线
   */
  linethrough: false,
  /**
   * 文本对齐方式
   */
  textAlign: LEFT,
  /**
   * 字体样式
   */
  fontStyle: NORMAL,
  /**
   * 行高
   */
  lineHeight: 1.16,
  /**
   * 文本背景颜色
   */
  textBackgroundColor: '',
  /**
   * 描边
   */
  stroke: null,
  /**
   * 阴影
   */
  shadow: null,
  /**
   * 路径
   */
  path: undefined,
  /**
   * 路径起始偏移量
   */
  pathStartOffset: 0,
  /**
   * 路径侧边
   */
  pathSide: LEFT,
  /**
   * 路径对齐方式
   */
  pathAlign: 'baseline',
  /**
   * 字符间距
   */
  charSpacing: 0,
  /**
   * Y轴偏移
   */
  deltaY: 0,
  /**
   * 文本方向
   */
  direction: LTR,
  /**
   * 缓存字体大小
   */
  CACHE_FONT_SIZE: 400,
  /**
   * 最小文本宽度
   */
  MIN_TEXT_WIDTH: 2,
  // Text magic numbers
  /**
   * 上标配置
   */
  superscript: {
    size: 0.6, // fontSize factor
    baseline: -0.35, // baseline-shift factor (upwards)
  },
  /**
   * 下标配置
   */
  subscript: {
    size: 0.6, // fontSize factor
    baseline: 0.11, // baseline-shift factor (downwards)
  },
  /**
   * 字体大小分数
   */
  _fontSizeFraction: 0.222,
  /**
   * 偏移量配置
   */
  offsets: {
    underline: 0.1,
    linethrough: -0.28167, // added 1/30 to original number
    overline: -0.81333, // added 1/15 to original number
  },
  /**
   * 字体大小倍数
   */
  _fontSizeMult: 1.13,
  /**
   * 文本装饰厚度
   */
  [TEXT_DECORATION_THICKNESS]: 66.667, // before implementation was 1/15
};

/**
 * 两端对齐
 */
export const JUSTIFY = 'justify';
/**
 * 左对齐（两端对齐模式下）
 */
export const JUSTIFY_LEFT = 'justify-left';
/**
 * 右对齐（两端对齐模式下）
 */
export const JUSTIFY_RIGHT = 'justify-right';
/**
 * 居中对齐（两端对齐模式下）
 */
export const JUSTIFY_CENTER = 'justify-center';
