import type { GLProbe } from '../filters/GLProbes/GLProbe';
import type { DOMWindow } from 'jsdom';
import type { TextStyleDeclaration } from '../shapes/Text/StyledText';

/**
 * 复制粘贴数据类型
 */
export type TCopyPasteData = {
  copiedText?: string;
  copiedTextStyle?: TextStyleDeclaration[];
};

/**
 * Fabric 环境类型定义
 */
export type TFabricEnv = {
  readonly document: Document;
  readonly window: (Window & typeof globalThis) | DOMWindow;
  readonly isTouchSupported: boolean;
  WebGLProbe: GLProbe;
  dispose(element: Element): void;
  copyPasteData: TCopyPasteData;
};
