/**
 * 全局唯一 ID 计数器
 */
let id = 0;

/**
 * 生成唯一的 ID
 * @returns 唯一的数字 ID
 */
export const uid = () => id++;
