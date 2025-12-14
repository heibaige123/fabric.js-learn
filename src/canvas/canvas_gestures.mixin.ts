// @ts-nocheck

import { scalingEqually } from '../controls/scale';
import { fireEvent } from '../controls/fireEvent';
import {
  degreesToRadians,
  radiansToDegrees,
} from '../util/misc/radiansDegreesConversion';
import { Canvas } from './Canvas';
import { CENTER, ROTATING, ROTATE, SCALE } from '../constants';

/**
 * 使用 Event.js 库添加对多点触控手势的支持。
 * 触发以下自定义事件：
 * - touch:gesture
 * - touch:drag
 * - touch:orientation
 * - touch:shake
 * - touch:longpress
 *
 * Adds support for multi-touch gestures using the Event.js library.
 * Fires the following custom events:
 * - touch:gesture
 * - touch:drag
 * - touch:orientation
 * - touch:shake
 * - touch:longpress
 */
Object.assign(Canvas.prototype, {
  /**
   * 定义当在对象上检测到 Event.js 手势时的操作。目前仅支持双指手势。
   *
   * Method that defines actions when an Event.js gesture is detected on an object. Currently only supports
   * 2 finger gestures.
   * @param e Event.js 的事件对象
   * @param {Event} e Event object by Event.js
   * @param self Event.js 的事件代理对象
   * @param {Event} self Event proxy object by Event.js
   */
  __onTransformGesture: function (e, self) {
    if (
      this.isDrawingMode ||
      !e.touches ||
      e.touches.length !== 2 ||
      'gesture' !== self.gesture
    ) {
      return;
    }

    const { target } = this.findTarget(e);
    if ('undefined' !== typeof target) {
      this.__gesturesParams = {
        e: e,
        self: self,
        target: target,
      };

      this.__gesturesRenderer();
    }

    this.fire('touch:gesture', {
      target: target,
      e: e,
      self: self,
    });
  },
  /**
   * 手势参数
   */
  __gesturesParams: null,
  /**
   * 手势渲染器
   */
  __gesturesRenderer: function () {
    if (this.__gesturesParams === null || this._currentTransform === null) {
      return;
    }

    const self = this.__gesturesParams.self;
    const t = this._currentTransform;
    const e = this.__gesturesParams.e;

    t.action = SCALE;
    t.originX = t.originY = CENTER;

    this._scaleObjectBy(self.scale, e);

    if (self.rotation !== 0) {
      t.action = ROTATE;
      this._rotateObjectByAngle(self.rotation, e);
    }

    this.requestRenderAll();

    t.action = 'drag';
  },

  /**
   * 定义当检测到 Event.js 拖动时的操作。
   *
   * Method that defines actions when an Event.js drag is detected.
   *
   * @param e Event.js 的事件对象
   * @param {Event} e Event object by Event.js
   * @param self Event.js 的事件代理对象
   * @param {Event} self Event proxy object by Event.js
   */
  __onDrag: function (e, self) {
    this.fire('touch:drag', {
      e: e,
      self: self,
    });
  },

  /**
   * 定义当检测到 Event.js 方向改变事件时的操作。
   *
   * Method that defines actions when an Event.js orientation event is detected.
   *
   * @param e Event.js 的事件对象
   * @param {Event} e Event object by Event.js
   * @param self Event.js 的事件代理对象
   * @param {Event} self Event proxy object by Event.js
   */
  __onOrientationChange: function (e, self) {
    this.fire('touch:orientation', {
      e: e,
      self: self,
    });
  },

  /**
   * 定义当检测到 Event.js 摇动事件时的操作。
   *
   * Method that defines actions when an Event.js shake event is detected.
   *
   * @param e Event.js 的事件对象
   * @param {Event} e Event object by Event.js
   * @param self Event.js 的事件代理对象
   * @param {Event} self Event proxy object by Event.js
   */
  __onShake: function (e, self) {
    this.fire('touch:shake', {
      e: e,
      self: self,
    });
  },

  /**
   * 定义当检测到 Event.js 长按事件时的操作。
   *
   * Method that defines actions when an Event.js longpress event is detected.
   *
   * @param e Event.js 的事件对象
   * @param {Event} e Event object by Event.js
   * @param self Event.js 的事件代理对象
   * @param {Event} self Event proxy object by Event.js
   */
  __onLongPress: function (e, self) {
    this.fire('touch:longpress', {
      e: e,
      self: self,
    });
  },

  /**
   * 处理手势事件
   *
   * @private
   * @param e Event.js 手势触发的事件对象
   * @param {Event} [e] Event object fired on Event.js gesture
   * @param self 内部事件对象
   * @param {Event} [self] Inner Event object
   */
  _onGesture: function (e, self) {
    this.__onTransformGesture(e, self);
  },

  /**
   * 处理拖动事件
   *
   * @private
   * @param e Event.js 拖动触发的事件对象
   * @param {Event} [e] Event object fired on Event.js drag
   * @param self 内部事件对象
   * @param {Event} [self] Inner Event object
   */
  _onDrag: function (e, self) {
    this.__onDrag(e, self);
  },

  /**
   * 按比例缩放对象
   *
   * Scales an object by a factor
   * @param s 应用于当前缩放级别的缩放因子
   * @param {Number} s The scale factor to apply to the current scale level
   * @param e Event.js 的事件对象
   * @param {Event} e Event object by Event.js
   */
  _scaleObjectBy: function (s, e) {
    const t = this._currentTransform;
    const target = t.target;
    t.gestureScale = s;
    target._scaling = true;
    return scalingEqually(e, t, 0, 0);
  },

  /**
   * 按角度旋转对象
   *
   * Rotates object by an angle
   * @param curAngle 旋转角度（度）
   * @param {Number} curAngle The angle of rotation in degrees
   * @param e Event.js 的事件对象
   * @param {Event} e Event object by Event.js
   */
  _rotateObjectByAngle: function (curAngle, e) {
    const t = this._currentTransform;

    if (t.target.get('lockRotation')) {
      return;
    }
    t.target.rotate(radiansToDegrees(degreesToRadians(curAngle) + t.theta));
    fireEvent(ROTATING, {
      target: t.target,
      e: e,
      transform: t,
    });
  },

  /**
   * 处理方向改变事件
   *
   * @private
   * @param e Event.js 方向改变触发的事件对象
   * @param {Event} [e] Event object fired on Event.js orientation change
   * @param self 内部事件对象
   * @param {Event} [self] Inner Event object
   */
  _onOrientationChange: function (e, self) {
    this.__onOrientationChange(e, self);
  },

  /**
   * 处理摇动事件
   *
   * @private
   * @param e Event.js 摇动触发的事件对象
   * @param {Event} [e] Event object fired on Event.js shake
   * @param self 内部事件对象
   * @param {Event} [self] Inner Event object
   */
  _onShake: function (e, self) {
    this.__onShake(e, self);
  },

  /**
   * 处理长按事件
   *
   * @private
   * @param e Event.js 长按触发的事件对象
   * @param {Event} [e] Event object fired on Event.js shake
   * @param self 内部事件对象
   * @param {Event} [self] Inner Event object
   */
  _onLongPress: function (e, self) {
    this.__onLongPress(e, self);
  },
});
