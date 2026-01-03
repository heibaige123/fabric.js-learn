/**
 * 事件回调函数类型
 */
export type TEventCallback<T = any> = (options: T) => any;

/**
 * 事件注册对象类型
 */
type EventRegistryObject<E> = {
  [K in keyof E]?: TEventCallback<E[K]>;
};

/**
 * 可观察对象类，提供事件发布/订阅功能
 *
 * @see {@link http://fabric5.fabricjs.com/fabric-intro-part-2#events}
 * @see {@link http://fabric5.fabricjs.com/events|Events demo}
 */
export class Observable<EventSpec> {
  /**
   * 事件监听器存储对象
   */
  private __eventListeners: Record<keyof EventSpec, TEventCallback[]> =
    {} as Record<keyof EventSpec, TEventCallback[]>;

  /**
   * 观察指定的事件
   * @alias on
   * @param {string} eventName 事件名称 (例如 'after:render')
   * @param {EventRegistryObject} handlers 键/值对 (例如 {'after:render': handler, 'selection:cleared': handler})
   * @param {Function} handler 当指定类型的事件发生时接收通知的函数
   * @return {Function} 取消订阅函数
   *
   */
  on<K extends keyof EventSpec, E extends EventSpec[K]>(
    eventName: K,
    handler: TEventCallback<E>,
  ): VoidFunction;
  on(handlers: EventRegistryObject<EventSpec>): VoidFunction;
  on<K extends keyof EventSpec, E extends EventSpec[K]>(
    arg0: K | EventRegistryObject<EventSpec>,
    handler?: TEventCallback<E>,
  ): VoidFunction {
    if (!this.__eventListeners) {
      this.__eventListeners = {} as Record<keyof EventSpec, TEventCallback[]>;
    }
    if (typeof arg0 === 'object') {
      // one object with key/value pairs was passed
      Object.entries(arg0).forEach(([eventName, handler]) => {
        this.on(eventName as K, handler as TEventCallback);
      });
      return () => this.off(arg0);
    } else if (handler) {
      const eventName = arg0;
      if (!this.__eventListeners[eventName]) {
        this.__eventListeners[eventName] = [];
      }
      this.__eventListeners[eventName].push(handler);
      return () => this.off(eventName, handler);
    } else {
      // noop
      return () => false;
    }
  }

  /**
   * 观察指定的事件 **一次**
   * @alias once
   * @param {string} eventName 事件名称 (例如 'after:render')
   * @param {EventRegistryObject} handlers 键/值对 (例如 {'after:render': handler, 'selection:cleared': handler})
   * @param {Function} handler 当指定类型的事件发生时接收通知的函数
   * @return {Function} 取消订阅函数
   */
  once<K extends keyof EventSpec, E extends EventSpec[K]>(
    eventName: K,
    handler: TEventCallback<E>,
  ): VoidFunction;
  once(handlers: EventRegistryObject<EventSpec>): VoidFunction;
  once<K extends keyof EventSpec, E extends EventSpec[K]>(
    arg0: K | EventRegistryObject<EventSpec>,
    handler?: TEventCallback<E>,
  ): VoidFunction {
    if (typeof arg0 === 'object') {
      // one object with key/value pairs was passed
      const disposers: VoidFunction[] = [];
      Object.entries(arg0).forEach(([eventName, handler]) => {
        disposers.push(this.once(eventName as K, handler as TEventCallback));
      });
      return () => disposers.forEach((d) => d());
    } else if (handler) {
      const disposer = this.on<K, E>(
        arg0,
        function onceHandler(this: Observable<EventSpec>, ...args) {
          handler.call(this, ...args);
          disposer();
        },
      );
      return disposer;
    } else {
      // noop
      return () => false;
    }
  }

  /**
   * 移除事件监听器
   * @private
   * @param {string} eventName 事件名称
   * @param {Function} [handler] 处理函数
   */
  private _removeEventListener<K extends keyof EventSpec>(
    eventName: K,
    handler?: TEventCallback,
  ) {
    if (!this.__eventListeners[eventName]) {
      return;
    }

    if (handler) {
      const eventListener = this.__eventListeners[eventName];
      const index = eventListener.indexOf(handler);
      index > -1 && eventListener.splice(index, 1);
    } else {
      this.__eventListeners[eventName] = [];
    }
  }

  /**
   * 取消订阅 eventname 的所有事件监听器。
   * 不要使用这种模式。你可能会杀死内部 fabricJS 事件。
   * 我们知道我们应该为内部流程提供受保护的事件，但我们还没有
   * @deprecated
   * @param {string} eventName 事件名称 (例如 'after:render')
   */
  off<K extends keyof EventSpec>(eventName: K): void;
  /**
   * 取消订阅一个事件监听器
   * @param {string} eventName 事件名称 (例如 'after:render')
   * @param {TEventCallback} handler 要取消订阅的事件监听器
   */
  off<K extends keyof EventSpec>(eventName: K, handler: TEventCallback): void;
  /**
   * 取消订阅事件监听器
   * @param handlers 处理程序键/值对 (例如 {'after:render': handler, 'selection:cleared': handler})
   */
  off(handlers: EventRegistryObject<EventSpec>): void;
  /**
   * 取消订阅所有事件监听器
   */
  off(): void;
  off<K extends keyof EventSpec>(
    arg0?: K | EventRegistryObject<EventSpec>,
    handler?: TEventCallback,
  ) {
    if (!this.__eventListeners) {
      return;
    }

    // remove all key/value pairs (event name -> event handler)
    if (typeof arg0 === 'undefined') {
      for (const eventName in this.__eventListeners) {
        this._removeEventListener(eventName);
      }
    }
    // one object with key/value pairs was passed
    else if (typeof arg0 === 'object') {
      Object.entries(arg0).forEach(([eventName, handler]) => {
        this._removeEventListener(eventName as K, handler as TEventCallback);
      });
    } else {
      this._removeEventListener(arg0, handler);
    }
  }

  /**
   * 触发带有可选选项对象的事件
   * @param {String} eventName 要触发的事件名称
   * @param {Object} [options] 选项对象
   */
  fire<K extends keyof EventSpec>(eventName: K, options?: EventSpec[K]) {
    if (!this.__eventListeners) {
      return;
    }

    const listenersForEvent = this.__eventListeners[eventName]?.concat();
    if (listenersForEvent) {
      for (let i = 0; i < listenersForEvent.length; i++) {
        listenersForEvent[i].call(this, options || {});
      }
    }
  }
}
