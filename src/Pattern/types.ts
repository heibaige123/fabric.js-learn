import type { Pattern } from './Pattern';

/**
 * 图案重复方式
 */
export type PatternRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';

/**
 * 可导出的图案键
 */
type ExportedKeys =
  | 'crossOrigin'
  | 'offsetX'
  | 'offsetY'
  | 'patternTransform'
  | 'repeat'
  | 'source';

/**
 * 图案选项接口
 */
export type PatternOptions = Partial<Pick<Pattern, ExportedKeys>> & {
  source: CanvasImageSource;
};

/**
 * 序列化后的图案选项接口
 */
export type SerializedPatternOptions = Omit<PatternOptions, 'source'> & {
  type: 'pattern';
  source: string;
};
