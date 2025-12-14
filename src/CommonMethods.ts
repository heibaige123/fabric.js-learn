import { Observable } from './Observable';

/**
 * 通用方法类
 */
export class CommonMethods<EventSpec> extends Observable<EventSpec> {
  /**
   * 从选项设置对象的属性，仅用于初始化
   * @protected
   * @param {Object} [options] 选项对象
   *
   * Sets object's properties from options, for initialization only
   * @protected
   * @param {Object} [options] Options object
   */
  protected _setOptions(options: any = {}) {
    for (const prop in options) {
      this.set(prop, options[prop]);
    }
  }

  /**
   * 设置对象属性
   * @private
   * @param {Record<string, any>} obj 属性对象
   *
   * @private
   */
  _setObject(obj: Record<string, any>) {
    for (const prop in obj) {
      this._set(prop, obj[prop]);
    }
  }

  /**
   * 将属性设置为给定值。当更改位置/尺寸相关属性（left, top, scale, angle 等）时，`set` 不会更新对象的边框/控件位置。如果需要更新这些，请调用 `setCoords()`。
   * @param {String|Object} key 属性名称或对象（如果是对象，则遍历对象属性）
   * @param {Object|Function} value 属性值（如果是函数，则将值传递给它，并将其返回值用作新值）
   * @returns {CommonMethods} 当前实例
   *
   * Sets property to a given value. When changing position/dimension -related properties (left, top, scale, angle, etc.) `set` does not update position of object's borders/controls. If you need to update those, call `setCoords()`.
   * @param {String|Object} key Property name or object (if object, iterate over the object properties)
   * @param {Object|Function} value Property value (if function, the value is passed into it and its return value is used as a new one)
   */
  set(key: string | Record<string, any>, value?: any) {
    if (typeof key === 'object') {
      this._setObject(key);
    } else {
      this._set(key, value);
    }
    return this;
  }

  /**
   * 内部设置属性方法
   * @param {string} key 属性名
   * @param {any} value 属性值
   */
  _set(key: string, value: any) {
    this[key as keyof this] = value;
  }

  /**
   * 切换指定属性从 `true` 到 `false` 或从 `false` 到 `true`
   * @param {String} property 要切换的属性
   * @returns {CommonMethods} 当前实例
   *
   * Toggles specified property from `true` to `false` or from `false` to `true`
   * @param {String} property Property to toggle
   */
  toggle(property: string) {
    const value = this.get(property);
    if (typeof value === 'boolean') {
      this.set(property, !value);
    }
    return this;
  }

  /**
   * 基本获取器
   * @param {String} property 属性名称
   * @return {*} 属性值
   *
   * Basic getter
   * @param {String} property Property name
   * @return {*} value of a property
   */
  get(property: string): any {
    return this[property as keyof this];
  }
}
