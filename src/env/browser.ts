/* eslint-disable no-restricted-globals */
import { WebGLProbe } from '../filters/GLProbes/WebGLProbe';
import type { TCopyPasteData, TFabricEnv } from './types';

/**
 * 复制粘贴数据存储对象
 */
const copyPasteData: TCopyPasteData = {};

/**
 * 获取浏览器环境配置
 * @returns Fabric 环境对象
 */
export const getEnv = (): TFabricEnv => {
  return {
    document,
    window,
    isTouchSupported:
      'ontouchstart' in window ||
      'ontouchstart' in document ||
      (window && window.navigator && window.navigator.maxTouchPoints > 0),
    WebGLProbe: new WebGLProbe(),
    dispose() {
      // noop
    },
    copyPasteData,
  };
};
