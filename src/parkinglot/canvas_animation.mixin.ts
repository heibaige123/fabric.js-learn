// @ts-nocheck

import { StaticCanvas } from '../canvas/StaticCanvas';
import { animate } from '../util/animation/animate';

Object.assign(StaticCanvas.prototype, {
  /**
   * fx* 方法的动画持续时间（以毫秒为单位）
   *
   * Animation duration (in ms) for fx* methods
   * @type Number
   */
  FX_DURATION: 500,

  /**
   * 通过动画水平居中对象。
   * @param object 要居中的对象
   * @param callbacks 带有可选 "onComplete" 和/或 "onChange" 属性的回调对象
   * @param callbacks.onComplete 完成时调用
   * @param callbacks.onChange 动画的每一步调用
   * @returns 上下文
   *
   * Centers object horizontally with animation.
   * @param {fabric.Object} object Object to center
   * @param {Object} [callbacks] Callbacks object with optional "onComplete" and/or "onChange" properties
   * @param {Function} [callbacks.onComplete] Invoked on completion
   * @param {Function} [callbacks.onChange] Invoked on every step of animation
   * @return {fabric.AnimationContext} context
   */
  fxCenterObjectH: function (object, callbacks) {
    callbacks = callbacks || {};

    var empty = function () {},
      onComplete = callbacks.onComplete || empty,
      onChange = callbacks.onChange || empty,
      _this = this;

    return animate({
      target: this,
      startValue: object.getX(),
      endValue: this.getCenterPoint().x,
      duration: this.FX_DURATION,
      onChange: function (value) {
        object.setX(value);
        _this.requestRenderAll();
        onChange();
      },
      onComplete: function () {
        object.setCoords();
        onComplete();
      },
    });
  },

  /**
   * 通过动画垂直居中对象。
   * @param object 要居中的对象
   * @param callbacks 带有可选 "onComplete" 和/或 "onChange" 属性的回调对象
   * @param callbacks.onComplete 完成时调用
   * @param callbacks.onChange 动画的每一步调用
   * @returns 上下文
   *
   * Centers object vertically with animation.
   * @param {fabric.Object} object Object to center
   * @param {Object} [callbacks] Callbacks object with optional "onComplete" and/or "onChange" properties
   * @param {Function} [callbacks.onComplete] Invoked on completion
   * @param {Function} [callbacks.onChange] Invoked on every step of animation
   * @return {fabric.AnimationContext} context
   */
  fxCenterObjectV: function (object, callbacks) {
    callbacks = callbacks || {};

    var empty = function () {},
      onComplete = callbacks.onComplete || empty,
      onChange = callbacks.onChange || empty,
      _this = this;

    return animate({
      target: this,
      startValue: object.getY(),
      endValue: this.getCenterPoint().y,
      duration: this.FX_DURATION,
      onChange: function (value) {
        object.setY(value);
        _this.requestRenderAll();
        onChange();
      },
      onComplete: function () {
        object.setCoords();
        onComplete();
      },
    });
  },

  /**
   * 与 `fabric.Canvas#remove` 相同，但带有动画效果
   * @param object 要移除的对象
   * @param callbacks 带有可选 "onComplete" 和/或 "onChange" 属性的回调对象
   * @param callbacks.onComplete 完成时调用
   * @param callbacks.onChange 动画的每一步调用
   * @returns 上下文
   *
   * Same as `fabric.Canvas#remove` but animated
   * @param {fabric.Object} object Object to remove
   * @param {Object} [callbacks] Callbacks object with optional "onComplete" and/or "onChange" properties
   * @param {Function} [callbacks.onComplete] Invoked on completion
   * @param {Function} [callbacks.onChange] Invoked on every step of animation
   * @return {fabric.AnimationContext} context
   */
  fxRemove: function (object, callbacks) {
    callbacks = callbacks || {};
    var empty = function () {},
      onComplete = callbacks.onComplete || empty,
      onChange = callbacks.onChange || empty,
      _this = this;

    return animate({
      target: this,
      startValue: object.opacity,
      endValue: 0,
      duration: this.FX_DURATION,
      onChange: function (value) {
        object.set('opacity', value);
        _this.requestRenderAll();
        onChange();
      },
      onComplete: function () {
        _this.remove(object);
        onComplete();
      },
    });
  },

  /**
   * 通过动画拉直对象
   * @param object 要拉直的对象
   * @returns thisArg
   *
   * @param {fabric.Object} object Object to straighten
   * @return {fabric.Canvas} thisArg
   */
  fxStraightenObject: function (object: FabricObject) {
    return object.fxStraighten({
      onChange: () => this.requestRenderAll(),
    });
  },
});
