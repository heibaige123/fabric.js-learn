import type { Shadow } from '../../../Shadow';
import type { Canvas } from '../../../canvas/Canvas';
import type { StaticCanvas } from '../../../canvas/StaticCanvas';
import type { TFiller } from '../../../typedefs';
import type { FabricObject } from '../Object';
import type { ObjectTransformActionProps } from './ObjectTransformProps';
import type {
  ClipPathProps,
  SerializedObjectProps,
} from './SerializedObjectProps';

/**
 * 对象属性接口
 */
export interface ObjectProps
  extends SerializedObjectProps,
    ClipPathProps,
    ObjectTransformActionProps {
  /**
   * 剪切路径对象
   */
  clipPath?: FabricObject;
  /**
   * 填充颜色或图案
   */
  fill: TFiller | string | null;
  /**
   * 描边颜色或图案
   */
  stroke: TFiller | string | null;
  /**
   * 阴影对象
   */
  shadow: Shadow | null;
  /**
   * 画布实例
   */
  canvas?: StaticCanvas | Canvas;

  /**
   * 对象的最小允许缩放值
   *
   * Minimum allowed scale value of an object
   * @type Number
   * @default 0
   */
  minScaleLimit: number;

  /**
   * 当为 `true` 时，对象缓存在附加画布上。
   * 当为 `false` 时，除非必要（clipPath），否则不缓存对象
   * 默认为 true
   *
   * When `true`, object is cached on an additional canvas.
   * When `false`, object is not cached unless necessary ( clipPath )
   * default to true
   * @since 1.7.0
   * @type Boolean
   * @default true
   */
  objectCaching: boolean;

  /**
   * 当为 `false` 时，默认对象的值不包含在其序列化中
   *
   * When `false`, default object's values are not included in its serialization
   * @type Boolean
   */
  includeDefaultValues: boolean;

  /**
   * 当为 `true` 时，对象不会导出到 OBJECT/JSON 中
   *
   * When `true`, object is not exported in OBJECT/JSON
   * @since 1.6.3
   * @type Boolean
   */
  excludeFromExport: boolean;
}
