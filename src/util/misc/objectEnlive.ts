import { noop } from '../../constants';
import type { FabricObject } from '../../shapes/Object/FabricObject';
import type {
  Abortable,
  Constructor,
  TCrossOrigin,
  TFiller,
} from '../../typedefs';
import { createImage } from './dom';
import { classRegistry } from '../../ClassRegistry';
import type { BaseFilter } from '../../filters/BaseFilter';
import type { FabricObject as BaseFabricObject } from '../../shapes/Object/Object';
import { FabricError, SignalAbortedError } from '../internals/console';
import type { Shadow } from '../../Shadow';

/**
 * 图片加载选项类型
 */
export type LoadImageOptions = Abortable & {
  /**
   * 图片加载的 cors 值，默认为 anonymous
   * cors value for the image loading, default to anonymous
   */
  crossOrigin?: TCrossOrigin;
};

/**
 * 从给定的 url 加载图像元素并解析它，或者捕获错误。
 * @param url 代表图像的 URL
 * @param [options] 图像加载选项
 * @returns 加载的图像
 *
 * Loads image element from given url and resolve it, or catch.
 * @param {String} url URL representing an image
 * @param {LoadImageOptions} [options] image loading options
 * @returns {Promise<HTMLImageElement>} the loaded image.
 */
export const loadImage = (
  url: string,
  { signal, crossOrigin = null }: LoadImageOptions = {},
) =>
  new Promise<HTMLImageElement>(function (resolve, reject) {
    if (signal && signal.aborted) {
      return reject(new SignalAbortedError('loadImage'));
    }
    const img = createImage();
    let abort: EventListenerOrEventListenerObject;
    if (signal) {
      abort = function (err: Event) {
        img.src = '';
        reject(err);
      };
      signal.addEventListener('abort', abort, { once: true });
    }
    const done = function () {
      img.onload = img.onerror = null;
      abort && signal?.removeEventListener('abort', abort);
      resolve(img);
    };
    if (!url) {
      done();
      return;
    }
    img.onload = done;
    img.onerror = function () {
      abort && signal?.removeEventListener('abort', abort);
      reject(new FabricError(`Error loading ${img.src}`));
    };
    crossOrigin && (img.crossOrigin = crossOrigin);
    img.src = url;
  });

export type EnlivenObjectOptions = Abortable & {
  /**
   * 用于进一步解析对象元素的方法，
   * 在创建每个 fabric 对象后调用。
   * Method for further parsing of object elements,
   * called after each fabric object created.
   */
  reviver?: <
    T extends
      | BaseFabricObject
      | FabricObject
      | BaseFilter<string>
      | Shadow
      | TFiller,
  >(
    serializedObj: Record<string, any>,
    instance: T,
  ) => void;
};

/**
 * @TODO type this correctly.
 * 从对象表示创建相应的 fabric 实例
 * @param objects 要激活的对象
 * @param [options] 选项
 * @param [options.reviver] 用于进一步解析对象元素的方法，在创建每个 fabric 对象后调用。
 * @param [options.signal] 处理中止，参见 https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
 * @returns
 *
 * @TODO type this correctly.
 * Creates corresponding fabric instances from their object representations
 * @param {Object[]} objects Objects to enliven
 * @param {EnlivenObjectOptions} [options]
 * @param {(serializedObj: object, instance: FabricObject) => any} [options.reviver] Method for further parsing of object elements,
 * called after each fabric object created.
 * @param {AbortSignal} [options.signal] handle aborting, see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
 * @returns {Promise<FabricObject[]>}
 */
export const enlivenObjects = <
  T extends
    | BaseFabricObject
    | FabricObject
    | BaseFilter<string>
    | Shadow
    | TFiller,
>(
  objects: any[],
  { signal, reviver = noop }: EnlivenObjectOptions = {},
) =>
  new Promise<T[]>((resolve, reject) => {
    const instances: T[] = [];
    signal && signal.addEventListener('abort', reject, { once: true });
    Promise.all(
      objects.map((obj) =>
        classRegistry
          .getClass<
            Constructor<T> & {
              fromObject(options: any, context: Abortable): Promise<T>;
            }
          >(obj.type)
          .fromObject(obj, { signal })
          .then((fabricInstance) => {
            reviver(obj, fabricInstance);
            instances.push(fabricInstance);
            return fabricInstance;
          }),
      ),
    )
      .then(resolve)
      .catch((error) => {
        // cleanup
        instances.forEach((instance) => {
          (instance as FabricObject).dispose &&
            (instance as FabricObject).dispose();
        });
        reject(error);
      })
      .finally(() => {
        signal && signal.removeEventListener('abort', reject);
      });
  });

/**
 * 创建驻留在对象中的相应 fabric 实例，例如 `clipPath`
 * @param object 具有要激活属性的对象（fill, stroke, clipPath, path）
 * @param [options] 选项
 * @param [options.signal] 处理中止，参见 https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
 * @returns 具有激活值的输入对象
 *
 * Creates corresponding fabric instances residing in an object, e.g. `clipPath`
 * @param {Object} object with properties to enlive ( fill, stroke, clipPath, path )
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] handle aborting, see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
 * @returns {Promise<Record<string, FabricObject | TFiller | null>>} the input object with enlived values
 */
export const enlivenObjectEnlivables = <
  R = Record<string, FabricObject | TFiller | null>,
>(
  serializedObject: any,
  { signal }: Abortable = {},
) =>
  new Promise<R>((resolve, reject) => {
    const instances: (FabricObject | TFiller | Shadow)[] = [];
    signal && signal.addEventListener('abort', reject, { once: true });
    // enlive every possible property
    const promises = Object.values(serializedObject).map((value: any) => {
      if (!value) {
        return value;
      }
      /**
       * clipPath or shadow or gradient or text on a path or a pattern,
       * or the backgroundImage or overlayImage of canvas
       * If we have a type and there is a classe registered for it, we enlive it.
       * If there is no class registered for it we return the value as is
       * */
      if (value.type && classRegistry.has(value.type)) {
        return enlivenObjects<FabricObject | Shadow | TFiller>([value], {
          signal,
        }).then(([enlived]) => {
          instances.push(enlived);
          return enlived;
        });
      }
      return value;
    });
    const keys = Object.keys(serializedObject);
    Promise.all(promises)
      .then((enlived) => {
        return enlived.reduce((acc, instance, index) => {
          acc[keys[index]] = instance;
          return acc;
        }, {});
      })
      .then(resolve)
      .catch((error) => {
        // cleanup
        instances.forEach((instance: any) => {
          instance.dispose && instance.dispose();
        });
        reject(error);
      })
      .finally(() => {
        signal && signal.removeEventListener('abort', reject);
      });
  });
