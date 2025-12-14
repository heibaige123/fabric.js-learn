import type {
  ObjectModificationEvents,
  TModificationEvents,
} from '../EventTypeDefs';

/**
 * 触发对象修改事件
 * @param eventName 事件名称
 * @param options 事件选项
 */
export const fireEvent = (
  eventName: TModificationEvents,
  options: ObjectModificationEvents[typeof eventName],
) => {
  const {
    transform: { target },
  } = options;
  target.canvas?.fire(`object:${eventName}`, {
    ...options,
    target,
  });
  target.fire(eventName, options);
};
