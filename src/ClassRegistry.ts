import { FabricError } from './util/internals/console';

/*
 * This Map connects the objects type value with their
 * class implementation. It used from any object to understand which are
 * the classes to enlive when requesting a object.type = 'path' for example.
 * Objects uses it for clipPath, Canvas uses it for everything.
 * This is necessary for generic code to run and enlive instances from serialized representation.
 * You can customize which classes get enlived from SVG parsing using this classRegistry.
 * The Registry start empty and gets filled in depending which files you import.
 * If you want to be able to parse arbitrary SVGs or JSON representation of canvases, coming from
 * different sources you will need to import all fabric because you may need all classes.
 */

/**
 * JSON 类型常量
 */
export const JSON = 'json';
/**
 * SVG 类型常量
 */
export const SVG = 'svg';

/**
 * 类注册表，用于管理对象类型与其类实现之间的映射
 */
export class ClassRegistry {
  /**
   * JSON 类映射
   */
  declare [JSON]: Map<string, any>;
  /**
   * SVG 类映射
   */
  declare [SVG]: Map<string, any>;

  constructor() {
    this[JSON] = new Map();
    this[SVG] = new Map();
  }

  /**
   * 检查是否注册了指定的类类型
   * @param {string} classType 类类型字符串
   * @returns {boolean} 如果已注册则返回 true
   */
  has(classType: string): boolean {
    return this[JSON].has(classType);
  }

  /**
   * 获取指定类型的类构造函数
   * @param {string} classType 类类型字符串
   * @returns {T} 类构造函数
   */
  getClass<T>(classType: string): T {
    const constructor = this[JSON].get(classType);
    if (!constructor) {
      throw new FabricError(`No class registered for ${classType}`);
    }
    return constructor;
  }

  /**
   * 注册类
   * @param {any} classConstructor 类构造函数
   * @param {string} [classType] 类类型字符串，如果未提供则使用构造函数的 type 属性
   */
  setClass(classConstructor: any, classType?: string) {
    if (classType) {
      this[JSON].set(classType, classConstructor);
    } else {
      this[JSON].set(classConstructor.type, classConstructor);
      // legacy
      // @TODO: needs to be removed in fabric 7 or 8
      this[JSON].set(classConstructor.type.toLowerCase(), classConstructor);
    }
  }

  /**
   * 获取指定 SVG 标签名的类构造函数
   * @param {string} SVGTagName SVG 标签名
   * @returns {any} 类构造函数
   */
  getSVGClass(SVGTagName: string): any {
    return this[SVG].get(SVGTagName);
  }

  /**
   * 注册 SVG 类
   * @param {any} classConstructor 类构造函数
   * @param {string} [SVGTagName] SVG 标签名，如果未提供则使用构造函数的 type 属性的小写形式
   */
  setSVGClass(classConstructor: any, SVGTagName?: string) {
    this[SVG].set(
      SVGTagName ?? classConstructor.type.toLowerCase(),
      classConstructor,
    );
  }
}

/**
 * 全局类注册表实例
 */
export const classRegistry = new ClassRegistry();
