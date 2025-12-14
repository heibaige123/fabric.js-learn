/**
 * Number#toFixed 的包装器，与原生方法相反，它返回数字而不是字符串。
 * @param number 要操作的数字
 * @param fractionDigits 要“保留”的小数位数
 * @returns 数字
 *
 * A wrapper around Number#toFixed, which contrary to native method returns number, not string.
 * @param {number|string} number number to operate on
 * @param {number} fractionDigits number of fraction digits to "leave"
 * @return {number}
 */
export const toFixed = (number: number | string, fractionDigits: number) =>
  parseFloat(Number(number).toFixed(fractionDigits));
