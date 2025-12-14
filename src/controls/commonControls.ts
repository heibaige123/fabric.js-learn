import { RESIZING, ROTATE } from '../constants';
import { changeWidth } from './changeWidth';
import { Control } from './Control';
import { rotationStyleHandler, rotationWithSnapping } from './rotate';
import { scaleCursorStyleHandler, scalingEqually } from './scale';
import {
  scaleOrSkewActionName,
  scaleSkewCursorStyleHandler,
  scalingXOrSkewingY,
  scalingYOrSkewingX,
} from './scaleSkew';

// use this function if you want to generate new controls for every instance
/**
 * 创建对象的默认控件
 * 如果你想为每个实例生成新的控件，请使用此函数
 */
export const createObjectDefaultControls = () => ({
  /**
   * 左中控件
   */
  ml: new Control({
    x: -0.5,
    y: 0,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionHandler: scalingXOrSkewingY,
    getActionName: scaleOrSkewActionName,
  }),

  /**
   * 右中控件
   */
  mr: new Control({
    x: 0.5,
    y: 0,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionHandler: scalingXOrSkewingY,
    getActionName: scaleOrSkewActionName,
  }),

  /**
   * 下中控件
   */
  mb: new Control({
    x: 0,
    y: 0.5,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionHandler: scalingYOrSkewingX,
    getActionName: scaleOrSkewActionName,
  }),

  /**
   * 上中控件
   */
  mt: new Control({
    x: 0,
    y: -0.5,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionHandler: scalingYOrSkewingX,
    getActionName: scaleOrSkewActionName,
  }),

  /**
   * 左上控件
   */
  tl: new Control({
    x: -0.5,
    y: -0.5,
    cursorStyleHandler: scaleCursorStyleHandler,
    actionHandler: scalingEqually,
  }),

  /**
   * 右上控件
   */
  tr: new Control({
    x: 0.5,
    y: -0.5,
    cursorStyleHandler: scaleCursorStyleHandler,
    actionHandler: scalingEqually,
  }),
  /**
   * 左下控件
   */
  bl: new Control({
    x: -0.5,
    y: 0.5,
    cursorStyleHandler: scaleCursorStyleHandler,
    actionHandler: scalingEqually,
  }),
  /**
   * 右下控件
   */
  br: new Control({
    x: 0.5,
    y: 0.5,
    cursorStyleHandler: scaleCursorStyleHandler,
    actionHandler: scalingEqually,
  }),

  /**
   * 旋转控件
   */
  mtr: new Control({
    x: 0,
    y: -0.5,
    actionHandler: rotationWithSnapping,
    cursorStyleHandler: rotationStyleHandler,
    offsetY: -40,
    withConnection: true,
    actionName: ROTATE,
  }),
});

/**
 * 创建调整大小的控件
 */
export const createResizeControls = () => ({
  /**
   * 右中控件
   */
  mr: new Control({
    x: 0.5,
    y: 0,
    actionHandler: changeWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: RESIZING,
  }),
  /**
   * 左中控件
   */
  ml: new Control({
    x: -0.5,
    y: 0,
    actionHandler: changeWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: RESIZING,
  }),
});

/**
 * 创建文本框的默认控件
 */
export const createTextboxDefaultControls = () => ({
  ...createObjectDefaultControls(),
  ...createResizeControls(),
});
