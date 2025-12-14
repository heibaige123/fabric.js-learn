/**
 * 使用另一个对象的属性填充对象
 * @param source 源对象
 * @param properties 要包含的属性名称
 * @returns 填充了所选键的对象
 *
 * Populates an object with properties of another object
 * @param {Object} source Source object
 * @param {string[]} properties Properties names to include
 * @returns object populated with the picked keys
 */
export const pick = <T extends Record<string, any>>(
  source: T,
  keys: (keyof T)[] = [],
) => {
  return keys.reduce((o, key) => {
    if (key in source) {
      o[key] = source[key];
    }
    return o;
  }, {} as Partial<T>);
};

/**
 * 创建一个对象，该对象由经 predicate 判断为真值的自身可枚举字符串键控属性组成。
 * @param source 源对象
 * @param predicate 每次迭代调用的函数
 * @returns 新对象
 */
export const pickBy = <T extends Record<string, any>>(
  source: T,
  predicate: <K extends keyof T>(value: T[K], key: K, collection: T) => boolean,
) => {
  return (Object.keys(source) as (keyof T)[]).reduce((o, key) => {
    if (predicate(source[key], key, source)) {
      o[key] = source[key];
    }
    return o;
  }, {} as Partial<T>);
};
