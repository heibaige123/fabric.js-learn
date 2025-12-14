import type { Constructor } from '../typedefs';

/***
 * 将混入类（mixins）应用到派生类
 * @param derivedCtor 派生类构造函数
 * @param constructors 混入类构造函数数组
 * @returns 应用了混入的派生类构造函数
 *
 * https://www.typescriptlang.org/docs/handbook/mixins.html#alternative-pattern
 */
export function applyMixins<T extends Constructor, S extends Constructor>(
  derivedCtor: T,
  constructors: S[],
) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      name !== 'constructor' &&
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
            Object.create(null),
        );
    });
  });
  return derivedCtor as T & { prototype: InstanceType<T & S> };
}
