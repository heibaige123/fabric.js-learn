import { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TWebGLPipelineState } from './typedefs';
import { isWebGLPipelineState } from './utils';
import { classRegistry } from '../ClassRegistry';

/**
 * Composed 滤镜的自有属性
 */
type ComposedOwnProps = {
  /**
   * 子滤镜数组
   */
  subFilters: BaseFilter<string, object, object>[];
};

/**
 * Composed 滤镜的序列化属性
 */
type ComposedSerializedProps = {
  /**
   * 子滤镜的序列化对象数组
   */
  subFilters: Record<string, unknown>[];
};

/**
 * 一个容器类，知道如何将一系列滤镜应用于输入图像。
 *
 * A container class that knows how to apply a sequence of filters to an input image.
 */
export class Composed extends BaseFilter<
  'Composed',
  ComposedOwnProps,
  ComposedSerializedProps
> {
  /**
   * 要应用的非稀疏滤镜数组
   *
   * A non sparse array of filters to apply
   */
  declare subFilters: ComposedOwnProps['subFilters'];

  static type = 'Composed';

  /**
   * 构造函数
   * @param options 选项对象
   */
  constructor(
    options: { subFilters?: BaseFilter<string>[] } & Record<string, any> = {},
  ) {
    super(options);
    this.subFilters = options.subFilters || [];
  }

  /**
   * 将此容器的滤镜应用于提供的输入图像。
   *
   * Apply this container's filters to the input image provided.
   *
   * @param {Object} options 选项对象
   * @param {Number} options.passes The number of filters remaining to be applied. 剩余要应用的滤镜数量。
   */
  applyTo(options: TWebGLPipelineState | T2DPipelineState) {
    if (isWebGLPipelineState(options)) {
      options.passes += this.subFilters.length - 1;
    }
    this.subFilters.forEach((filter) => {
      filter.applyTo(options);
    });
  }

  /**
   * 将此滤镜序列化为 JSON。
   *
   * Serialize this filter into JSON.
   * @returns {Object} A JSON representation of this filter. 此滤镜的 JSON 表示。
   */
  toObject() {
    return {
      type: this.type,
      subFilters: this.subFilters.map((filter) => filter.toObject()),
    };
  }

  /**
   * 是否为中性状态
   * @returns {boolean} 是否为中性状态
   */
  isNeutralState() {
    return !this.subFilters.some((filter) => !filter.isNeutralState());
  }

  /**
   * 将 ComposedFilter 的 JSON 定义反序列化为具体实例。
   *
   * Deserialize a JSON definition of a ComposedFilter into a concrete instance.
   * @param {oject} object Object to create an instance from 用于创建实例的对象
   * @param {object} [options] 选项
   * @param {AbortSignal} [options.signal] handle aborting `BlendImage` filter loading, see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal 处理中止 `BlendImage` 滤镜加载
   * @returns {Promise<Composed>} Promise 对象
   */
  static fromObject(
    object: Record<string, any>,
    options?: { signal: AbortSignal },
  ): Promise<Composed> {
    return Promise.all(
      ((object.subFilters || []) as BaseFilter<string>[]).map((filter) =>
        classRegistry
          .getClass<typeof BaseFilter>(filter.type)
          .fromObject(filter, options),
      ),
    ).then((enlivedFilters) => new this({ subFilters: enlivedFilters }));
  }
}

classRegistry.setClass(Composed);
