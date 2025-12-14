import type { TEvent } from '../EventTypeDefs';
import type { Point } from '../Point';

/**
 * 画笔事件数据
 */
export type TBrushEventData = TEvent & { pointer: Point };

/**
 * 圆形画笔点
 */
export type CircleBrushPoint = {
  x: number;
  y: number;
  radius: number;
  fill: string;
};

/**
 * 喷雾画笔点
 */
export type SprayBrushPoint = {
  x: number;
  y: number;
  width: number;
  opacity: number;
};
