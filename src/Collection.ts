import type { Constructor, TBBox } from './typedefs';
import { removeFromArray } from './util/internals/removeFromArray';
import { Point } from './Point';
import type { ActiveSelection } from './shapes/ActiveSelection';
import type { Group } from './shapes/Group';
import type { InteractiveFabricObject } from './shapes/Object/InteractiveObject';
import type { FabricObject } from './shapes/Object/FabricObject';

/**
 * 检查对象是否为集合（Group 或 ActiveSelection）
 * @param {FabricObject} fabricObject 要检查的对象
 * @returns {boolean} 如果是集合则返回 true
 */
export const isCollection = (
  fabricObject?: FabricObject,
): fabricObject is Group | ActiveSelection => {
  return !!fabricObject && Array.isArray((fabricObject as Group)._objects);
};

/**
 * 创建集合混入
 * @param {Constructor} Base 基类
 * @returns {Collection} 集合类
 */
export function createCollectionMixin<TBase extends Constructor>(Base: TBase) {
  /**
   * 集合类
   */
  class Collection extends Base {
    /**
     * 对象列表
     *
     * @type {FabricObject[]}
     * @TODO needs to end up in the constructor too
     */
    _objects: FabricObject[] = [];

    /**
     * 对象添加时的回调
     * @param {FabricObject} object 被添加的对象
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onObjectAdded(object: FabricObject) {
      // subclasses should override this method
    }

    /**
     * 对象移除时的回调
     * @param {FabricObject} object 被移除的对象
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onObjectRemoved(object: FabricObject) {
      // subclasses should override this method
    }

    /**
     * 堆栈顺序改变时的回调
     * @param {FabricObject} object 改变顺序的对象
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onStackOrderChanged(object: FabricObject) {
      // subclasses should override this method
    }

    /**
     * 向集合添加对象
     * 对象应该是 FabricObject 的实例（或继承自 FabricObject）
     * @param {...FabricObject[]} objects 要添加的对象
     * @returns {number} 新的数组长度
     *
     */
    add(...objects: FabricObject[]): number {
      const size = this._objects.push(...objects);
      objects.forEach((object) => this._onObjectAdded(object));
      return size;
    }

    /**
     * 在指定索引处向集合插入对象
     * @param {number} index 插入对象的索引
     * @param {...FabricObject[]} objects 要插入的对象
     * @returns {number} 新的数组长度
     *
     */
    insertAt(index: number, ...objects: FabricObject[]) {
      this._objects.splice(index, 0, ...objects);
      objects.forEach((object) => this._onObjectAdded(object));
      return this._objects.length;
    }

    /**
     * 从集合中移除对象，然后渲染画布（如果 `renderOnAddRemove` 不为 `false`）
     * @private
     * @param {...FabricObject[]} objects 要移除的对象
     * @returns {FabricObject[]} 已移除的对象
     *
     */
    remove(...objects: FabricObject[]) {
      const array = this._objects,
        removed: FabricObject[] = [];
      objects.forEach((object) => {
        const index = array.indexOf(object);
        // only call onObjectRemoved if an object was actually removed
        if (index !== -1) {
          array.splice(index, 1);
          removed.push(object);
          this._onObjectRemoved(object);
        }
      });
      return removed;
    }

    /**
     * 对此组中的每个对象执行给定函数
     * getObjects().forEach 的简单快捷方式，在 es6 之前比较复杂，
     * 现在只是一个快捷方式。
     * @param {Function} callback
     *                   回调函数，第一个参数为当前对象，
     *                   第二个参数为索引，第三个参数为所有对象的数组。
     */
    forEachObject(
      callback: (
        object: FabricObject,
        index: number,
        array: FabricObject[],
      ) => any,
    ) {
      this.getObjects().forEach((object, index, objects) =>
        callback(object, index, objects),
      );
    }

    /**
     * 返回此实例的子对象数组
     * @param {...String} [types] 指定时，仅返回这些类型的对象
     * @return {Array} 对象数组
     */
    getObjects(...types: string[]) {
      if (types.length === 0) {
        return [...this._objects];
      }
      return this._objects.filter((o) => o.isType(...types));
    }

    /**
     * 返回指定索引处的对象
     * @param {Number} index 索引
     * @return {Object} 指定索引处的对象
     *
     */
    item(index: number) {
      return this._objects[index];
    }

    /**
     * 如果集合不包含任何对象，则返回 true
     * @return {Boolean} 如果集合为空则返回 true
     *
     * Returns true if collection contains no objects
     * @return {Boolean} true if collection is empty
     */
    isEmpty() {
      return this._objects.length === 0;
    }

    /**
     * 返回集合的大小（即：包含其对象的数组的长度）
     * @return {Number} 集合大小
     */
    size() {
      return this._objects.length;
    }

    /**
     * 如果集合包含某个对象，则返回 true。\
     * **出于性能原因，建议使用 {@link FabricObject#isDescendantOf}**
     * 而不是 `a.contains(b)`，请使用 `b.isDescendantOf(a)`
     * @param {Object} object 要检查的对象
     * @param {Boolean} [deep=false] `true` 检查所有后代，`false` 仅检查 `_objects`
     * @return {Boolean} 如果集合包含该对象，则返回 `true`
     */
    contains(object: FabricObject, deep?: boolean): boolean {
      if (this._objects.includes(object)) {
        return true;
      } else if (deep) {
        return this._objects.some(
          (obj) =>
            obj instanceof Collection &&
            (obj as unknown as Collection).contains(object, true),
        );
      }
      return false;
    }

    /**
     * 返回集合复杂度的数字表示
     * @return {Number} 复杂度
     */
    complexity() {
      return this._objects.reduce((memo, current) => {
        memo += current.complexity ? current.complexity() : 0;
        return memo;
      }, 0);
    }

    /**
     * 将一个对象或多选的对象移动到绘制对象堆栈的底部
     * @param {fabric.Object} object 要发送到背面的对象
     * @returns {boolean} 如果发生更改则返回 true
     *
     */
    sendObjectToBack(object: FabricObject) {
      if (!object || object === this._objects[0]) {
        return false;
      }
      removeFromArray(this._objects, object);
      this._objects.unshift(object);
      this._onStackOrderChanged(object);
      return true;
    }

    /**
     * 将一个对象或多选的对象移动到绘制对象堆栈的顶部
     * @param {fabric.Object} object 要发送到顶部的对象
     * @returns {boolean} 如果发生更改则返回 true
     *
     */
    bringObjectToFront(object: FabricObject) {
      if (!object || object === this._objects[this._objects.length - 1]) {
        return false;
      }
      removeFromArray(this._objects, object);
      this._objects.push(object);
      this._onStackOrderChanged(object);
      return true;
    }

    /**
     * 在绘制对象堆栈中向下移动对象或选择
     * 可选参数 `intersecting` 允许将对象移动到第一个相交对象的后面。
     * 相交是通过边界框计算的。如果未找到相交，则堆栈不会发生变化。
     * @param {fabric.Object} object 要发送的对象
     * @param {boolean} [intersecting] 如果为 `true`，则将对象发送到下一个较低的相交对象后面
     * @returns {boolean} 如果发生更改则返回 true
     *
     * @param {fabric.Object} object Object to send
     * @param {boolean} [intersecting] If `true`, send object behind next lower intersecting object
     * @returns {boolean} true if change occurred
     */
    sendObjectBackwards(object: FabricObject, intersecting?: boolean) {
      if (!object) {
        return false;
      }
      const idx = this._objects.indexOf(object);
      if (idx !== 0) {
        // if object is not on the bottom of stack
        const newIdx = this.findNewLowerIndex(object, idx, intersecting);
        removeFromArray(this._objects, object);
        this._objects.splice(newIdx, 0, object);
        this._onStackOrderChanged(object);
        return true;
      }
      return false;
    }

    /**
     * 在绘制对象堆栈中向上移动对象或选择
     * 可选参数 `intersecting` 允许将对象移动到第一个相交对象的前面。
     * 相交是通过边界框计算的。如果未找到相交，则堆栈不会发生变化。
     * @param {fabric.Object} object 要发送的对象
     * @param {boolean} [intersecting] 如果为 `true`，则将对象发送到下一个较高的相交对象前面
     * @returns {boolean} 如果发生更改则返回 true
     *
     */
    bringObjectForward(object: FabricObject, intersecting?: boolean) {
      if (!object) {
        return false;
      }
      const idx = this._objects.indexOf(object);
      if (idx !== this._objects.length - 1) {
        // if object is not on top of stack (last item in an array)
        const newIdx = this.findNewUpperIndex(object, idx, intersecting);
        removeFromArray(this._objects, object);
        this._objects.splice(newIdx, 0, object);
        this._onStackOrderChanged(object);
        return true;
      }
      return false;
    }

    /**
     * 将对象移动到绘制对象堆栈中的指定级别
     * @param {fabric.Object} object 要发送的对象
     * @param {number} index 要移动到的位置
     * @returns {boolean} 如果发生更改则返回 true
     *
     */
    moveObjectTo(object: FabricObject, index: number) {
      if (object === this._objects[index]) {
        return false;
      }
      removeFromArray(this._objects, object);
      this._objects.splice(index, 0, object);
      this._onStackOrderChanged(object);
      return true;
    }

    /**
     * 查找新的较低索引
     * @param {FabricObject} object 对象
     * @param {number} idx 当前索引
     * @param {boolean} [intersecting] 是否检查相交
     * @returns {number} 新索引
     */
    findNewLowerIndex(
      object: FabricObject,
      idx: number,
      intersecting?: boolean,
    ) {
      let newIdx;

      if (intersecting) {
        newIdx = idx;
        // traverse down the stack looking for the nearest intersecting object
        for (let i = idx - 1; i >= 0; --i) {
          if (object.isOverlapping(this._objects[i])) {
            newIdx = i;
            break;
          }
        }
      } else {
        newIdx = idx - 1;
      }

      return newIdx;
    }

    /**
     * 查找新的较高索引
     * @param {FabricObject} object 对象
     * @param {number} idx 当前索引
     * @param {boolean} [intersecting] 是否检查相交
     * @returns {number} 新索引
     */
    findNewUpperIndex(
      object: FabricObject,
      idx: number,
      intersecting?: boolean,
    ) {
      let newIdx;

      if (intersecting) {
        newIdx = idx;
        // traverse up the stack looking for the nearest intersecting object
        for (let i = idx + 1; i < this._objects.length; ++i) {
          if (object.isOverlapping(this._objects[i])) {
            newIdx = i;
            break;
          }
        }
      } else {
        newIdx = idx + 1;
      }

      return newIdx;
    }

    /**
     * 给定一个边界框，返回集合中包含在该边界框内的所有对象。
     * 如果 `includeIntersecting` 为 true，则也返回与边界框相交的对象。
     * 这旨在与选择一起使用。不是通用方法。
     * @param {TBBox} bbox 场景坐标中的边界框
     * @param {{ includeIntersecting?: boolean }} options 包含 includeIntersecting 的对象
     * @returns 包含在边界框中的对象数组，按堆栈顺序从上到下排列
     *
     */
    collectObjects(
      { left, top, width, height }: TBBox,
      { includeIntersecting = true }: { includeIntersecting?: boolean } = {},
    ) {
      const objects: InteractiveFabricObject[] = [],
        tl = new Point(left, top),
        br = tl.add(new Point(width, height));

      // we iterate reverse order to collect top first in case of click.
      for (let i = this._objects.length - 1; i >= 0; i--) {
        const object = this._objects[i] as unknown as InteractiveFabricObject;
        if (
          object.selectable &&
          object.visible &&
          ((includeIntersecting && object.intersectsWithRect(tl, br)) ||
            object.isContainedWithinRect(tl, br) ||
            (includeIntersecting && object.containsPoint(tl)) ||
            (includeIntersecting && object.containsPoint(br)))
        ) {
          objects.push(object);
        }
      }

      return objects;
    }
  }

  // https://github.com/microsoft/TypeScript/issues/32080
  return Collection;
}
