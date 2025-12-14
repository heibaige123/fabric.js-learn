/* eslint-disable no-restricted-globals */
import type { Canvas as NodeCanvas } from 'canvas';
import { JSDOM } from 'jsdom';
// @ts-expect-error internal import
import utils from 'jsdom/lib/jsdom/living/generated/utils.js';
import { NodeGLProbe } from '../filters/GLProbes/NodeGLProbe';
import type { TCopyPasteData, TFabricEnv } from './types';

const { implForWrapper: jsdomImplForWrapper } = utils;

/**
 * 复制粘贴数据存储对象
 */
const copyPasteData: TCopyPasteData = {};

/**
 * JSDOM 窗口实例
 */
const { window: JSDOMWindow } = new JSDOM(
  decodeURIComponent(
    '%3C!DOCTYPE%20html%3E%3Chtml%3E%3Chead%3E%3C%2Fhead%3E%3Cbody%3E%3C%2Fbody%3E%3C%2Fhtml%3E',
  ),
  {
    resources: 'usable',
    // needed for `requestAnimationFrame`
    pretendToBeVisual: true,
  },
);

/**
 * 获取 Node Canvas 实例
 * @param canvasEl HTMLCanvasElement 元素
 * @returns NodeCanvas 实例
 */
export const getNodeCanvas = (canvasEl: HTMLCanvasElement) => {
  const impl = jsdomImplForWrapper(canvasEl);
  return (impl._canvas || impl._image) as NodeCanvas;
};

/**
 * 释放元素资源
 * @param element 要释放的元素
 */
export const dispose = (element: Element) => {
  const impl = jsdomImplForWrapper(element);
  if (impl) {
    impl._image = null;
    impl._canvas = null;
    // unsure if necessary
    impl._currentSrc = null;
    impl._attributes = null;
    impl._classList = null;
  }
};

/**
 * 获取 Node 环境配置
 * @returns Fabric 环境对象
 */
export const getEnv = (): TFabricEnv => {
  return {
    document: JSDOMWindow.document,
    window: JSDOMWindow,
    isTouchSupported: false,
    WebGLProbe: new NodeGLProbe(),
    dispose,
    copyPasteData,
  };
};
