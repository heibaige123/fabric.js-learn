/**
 * 记录日志消息
 * @param severity 日志严重程度 ('log', 'warn', 'error')
 * @param optionalParams 可选参数
 */
export const log = (
  severity: 'log' | 'warn' | 'error',
  ...optionalParams: any[]
) =>
  // eslint-disable-next-line no-restricted-syntax
  console[severity]('fabric', ...optionalParams);

/**
 * Fabric 错误类
 */
export class FabricError extends Error {
  /**
   * 创建一个 FabricError 实例
   * @param message 错误消息
   * @param options 错误选项
   */
  constructor(message?: string, options?: ErrorOptions) {
    super(`fabric: ${message}`, options);
  }
}

/**
 * 信号中止错误类
 */
export class SignalAbortedError extends FabricError {
  /**
   * 创建一个 SignalAbortedError 实例
   * @param context 上下文信息
   */
  constructor(context: string) {
    super(`${context} 'options.signal' is in 'aborted' state`);
  }
}
