import { config } from '../config';
import { SHARED_ATTRIBUTES } from '../parser/attributes';
import { parseAttributes } from '../parser/parseAttributes';
import type { XY } from '../Point';
import { Point } from '../Point';
import { makeBoundingBoxFromPoints } from '../util/misc/boundingBoxFromPoints';
import { toFixed } from '../util/misc/toFixed';
import {
  getBoundsOfCurve,
  joinPath,
  makePathSimpler,
  parsePath,
} from '../util/path';
import { classRegistry } from '../ClassRegistry';
import { FabricObject, cacheProperties } from './Object/FabricObject';
import type {
  TComplexPathData,
  TPathSegmentInfo,
  TSimplePathData,
} from '../util/path/typedefs';
import type { FabricObjectProps, SerializedObjectProps } from './Object/types';
import type { ObjectEvents } from '../EventTypeDefs';
import type {
  TBBox,
  TClassProperties,
  TSVGReviver,
  TOptions,
} from '../typedefs';
import { CENTER, LEFT, TOP } from '../constants';
import type { CSSRules } from '../parser/typedefs';

/**
 * 路径独有的属性接口
 */
interface UniquePathProps {
  /**
   * 源路径字符串
   */
  sourcePath?: string;
  /**
   * 路径数据
   */
  path?: TSimplePathData;
}

/**
 * 序列化路径属性接口
 */
export interface SerializedPathProps
  extends SerializedObjectProps,
    UniquePathProps {}

/**
 * 路径属性接口
 */
export interface PathProps extends FabricObjectProps, UniquePathProps {}

/**
 * 路径边界框接口
 */
export interface IPathBBox extends TBBox {
  /**
   * 左侧位置
   */
  left: number;
  /**
   * 顶部位置
   */
  top: number;
  /**
   * 路径偏移量
   */
  pathOffset: Point;
}

/**
 * 路径类
 */
export class Path<
  Props extends TOptions<PathProps> = Partial<PathProps>,
  SProps extends SerializedPathProps = SerializedPathProps,
  EventSpec extends ObjectEvents = ObjectEvents,
> extends FabricObject<Props, SProps, EventSpec> {
  /**
   * 路径点数组
   *
   * Array of path points
   * @type Array
   */
  declare path: TSimplePathData;

  /**
   * 路径偏移量
   */
  declare pathOffset: Point;

  /**
   * 源路径字符串
   */
  declare sourcePath?: string;

  /**
   * 路径段信息
   */
  declare segmentsInfo?: TPathSegmentInfo[];

  /**
   * 类型
   */
  static type = 'Path';

  /**
   * 缓存属性
   */
  static cacheProperties = [...cacheProperties, 'path', 'fillRule'];

  /**
   * 构造函数
   *
   * Constructor
   * @param {TComplexPathData} path Path data (sequence of coordinates and corresponding "command" tokens)
   * @param {Partial<PathProps>} [options] Options object
   * @return {Path} thisArg
   */
  constructor(
    path: TComplexPathData | string,
    // todo: evaluate this spread here
    { path: _, left, top, ...options }: Partial<Props> = {},
  ) {
    super();
    Object.assign(this, Path.ownDefaults);
    this.setOptions(options);
    this._setPath(path || [], true);
    typeof left === 'number' && this.set(LEFT, left);
    typeof top === 'number' && this.set(TOP, top);
  }

  /**
   * 设置路径
   *
   * @private
   * @param {TComplexPathData | string} path Path data (sequence of coordinates and corresponding "command" tokens)
   * @param {boolean} [adjustPosition] pass true to reposition the object according to the bounding box
   * @returns {Point} top left position of the bounding box, useful for complementary positioning
   */
  _setPath(path: TComplexPathData | string, adjustPosition?: boolean) {
    this.path = makePathSimpler(Array.isArray(path) ? path : parsePath(path));
    this.setBoundingBox(adjustPosition);
  }

  /**
   * 此函数是 svg 导入的辅助函数。它通过查看折线/多边形点返回 svg 未转换坐标中对象的中心。
   *
   * This function is an helper for svg import. it returns the center of the object in the svg
   * untransformed coordinates, by look at the polyline/polygon points.
   * @private
   * @return {Point} center point from element coordinates
   */
  _findCenterFromElement(): Point {
    const bbox = this._calcBoundsFromPath();
    return new Point(bbox.left + bbox.width / 2, bbox.top + bbox.height / 2);
  }

  /**
   * 渲染路径命令
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx context to render path on
   */
  _renderPathCommands(ctx: CanvasRenderingContext2D) {
    const l = -this.pathOffset.x,
      t = -this.pathOffset.y;

    ctx.beginPath();

    for (const command of this.path) {
      switch (
        command[0] // first letter
      ) {
        case 'L': // lineto, absolute
          ctx.lineTo(command[1] + l, command[2] + t);
          break;

        case 'M': // moveTo, absolute
          ctx.moveTo(command[1] + l, command[2] + t);
          break;

        case 'C': // bezierCurveTo, absolute
          ctx.bezierCurveTo(
            command[1] + l,
            command[2] + t,
            command[3] + l,
            command[4] + t,
            command[5] + l,
            command[6] + t,
          );
          break;

        case 'Q': // quadraticCurveTo, absolute
          ctx.quadraticCurveTo(
            command[1] + l,
            command[2] + t,
            command[3] + l,
            command[4] + t,
          );
          break;

        case 'Z':
          ctx.closePath();
          break;
      }
    }
  }

  /**
   * 渲染函数
   *
   * @private
   * @param {CanvasRenderingContext2D} ctx context to render path on
   */
  _render(ctx: CanvasRenderingContext2D) {
    this._renderPathCommands(ctx);
    this._renderPaintInOrder(ctx);
  }

  /**
   * 返回实例的字符串表示
   *
   * Returns string representation of an instance
   * @return {string} string representation of an instance
   */
  toString() {
    return `#<Path (${this.complexity()}): { "top": ${this.top}, "left": ${
      this.left
    } }>`;
  }

  /**
   * 返回实例的对象表示
   *
   * Returns object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toObject<
    T extends Omit<Props & TClassProperties<this>, keyof SProps>,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SProps {
    return {
      ...super.toObject(propertiesToInclude),
      path: this.path.map((pathCmd) => pathCmd.slice()),
    };
  }

  /**
   * 返回实例的无数据对象表示
   *
   * Returns dataless object representation of an instance
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} object representation of an instance
   */
  toDatalessObject<
    T extends Omit<Props & TClassProperties<this>, keyof SProps>,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SProps {
    const o = this.toObject<T, K>(propertiesToInclude);
    if (this.sourcePath) {
      delete o.path;
      o.sourcePath = this.sourcePath;
    }
    return o;
  }

  /**
   * 返回实例的 svg 表示
   *
   * Returns svg representation of an instance
   * @return {Array} an array of strings with the specific svg representation
   * of the instance
   */
  _toSVG() {
    const path = joinPath(this.path, config.NUM_FRACTION_DIGITS);
    return [
      '<path ',
      'COMMON_PARTS',
      `d="${path}" stroke-linecap="round" />\n`,
    ];
  }

  /**
   * 获取路径命令的平移变换属性
   *
   * @private
   * @return the path command's translate transform attribute
   */
  _getOffsetTransform() {
    const digits = config.NUM_FRACTION_DIGITS;
    return ` translate(${toFixed(-this.pathOffset.x, digits)}, ${toFixed(
      -this.pathOffset.y,
      digits,
    )})`;
  }

  /**
   * 返回实例的 svg clipPath 表示
   *
   * Returns svg clipPath representation of an instance
   * @param {Function} [reviver] Method for further parsing of svg representation.
   * @return {string} svg representation of an instance
   */
  toClipPathSVG(reviver?: TSVGReviver): string {
    const additionalTransform = this._getOffsetTransform();
    return (
      '\t' +
      this._createBaseClipPathSVGMarkup(this._toSVG(), {
        reviver,
        additionalTransform: additionalTransform,
      })
    );
  }

  /**
   * 返回实例的 svg 表示
   *
   * Returns svg representation of an instance
   * @param {Function} [reviver] Method for further parsing of svg representation.
   * @return {string} svg representation of an instance
   */
  toSVG(reviver?: TSVGReviver): string {
    const additionalTransform = this._getOffsetTransform();
    return this._createBaseSVGMarkup(this._toSVG(), {
      reviver,
      additionalTransform: additionalTransform,
    });
  }

  /**
   * 返回实例复杂度的数字表示
   *
   * Returns number representation of an instance complexity
   * @return {number} complexity of this instance
   */
  complexity() {
    return this.path.length;
  }

  /**
   * 设置尺寸
   */
  setDimensions() {
    this.setBoundingBox();
  }

  /**
   * 设置边界框
   * @param adjustPosition 是否调整位置
   */
  setBoundingBox(adjustPosition?: boolean) {
    const { width, height, pathOffset } = this._calcDimensions();
    this.set({ width, height, pathOffset });
    // using pathOffset because it match the use case.
    // if pathOffset change here we need to use left + width/2 , top + height/2
    adjustPosition && this.setPositionByOrigin(pathOffset, CENTER, CENTER);
  }

  /**
   * 从路径计算边界
   * @returns 边界框
   */
  _calcBoundsFromPath(): TBBox {
    const bounds: XY[] = [];
    let subpathStartX = 0,
      subpathStartY = 0,
      x = 0, // current x
      y = 0; // current y

    for (const command of this.path) {
      // current instruction
      switch (
        command[0] // first letter
      ) {
        case 'L': // lineto, absolute
          x = command[1];
          y = command[2];
          bounds.push({ x: subpathStartX, y: subpathStartY }, { x, y });
          break;

        case 'M': // moveTo, absolute
          x = command[1];
          y = command[2];
          subpathStartX = x;
          subpathStartY = y;
          break;

        case 'C': // bezierCurveTo, absolute
          bounds.push(
            ...getBoundsOfCurve(
              x,
              y,
              command[1],
              command[2],
              command[3],
              command[4],
              command[5],
              command[6],
            ),
          );
          x = command[5];
          y = command[6];
          break;

        case 'Q': // quadraticCurveTo, absolute
          bounds.push(
            ...getBoundsOfCurve(
              x,
              y,
              command[1],
              command[2],
              command[1],
              command[2],
              command[3],
              command[4],
            ),
          );
          x = command[3];
          y = command[4];
          break;

        case 'Z':
          x = subpathStartX;
          y = subpathStartY;
          break;
      }
    }
    return makeBoundingBoxFromPoints(bounds);
  }

  /**
   * 计算尺寸
   *
   * @private
   */
  _calcDimensions(): IPathBBox {
    const bbox = this._calcBoundsFromPath();

    return {
      ...bbox,
      pathOffset: new Point(
        bbox.left + bbox.width / 2,
        bbox.top + bbox.height / 2,
      ),
    };
  }

  /**
   * 解析 SVG 元素时要考虑的属性名称列表（由 `Path.fromElement` 使用）
   *
   * List of attribute names to account for when parsing SVG element (used by `Path.fromElement`)
   * @see http://www.w3.org/TR/SVG/paths.html#PathElement
   */
  static ATTRIBUTE_NAMES = [...SHARED_ATTRIBUTES, 'd'];

  /**
   * 从对象创建 Path 实例
   *
   * Creates an instance of Path from an object
   * @param {Object} object
   * @returns {Promise<Path>}
   */
  static fromObject<T extends TOptions<SerializedPathProps>>(object: T) {
    return this._fromObject<Path>(object, {
      extraParam: 'path',
    });
  }

  /**
   * 从 SVG <path> 元素创建 Path 实例
   *
   * Creates an instance of Path from an SVG <path> element
   * @param {HTMLElement} element to parse
   * @param {Partial<PathProps>} [options] Options object
   */
  static async fromElement(
    element: HTMLElement | SVGElement,
    options?: Partial<PathProps>,
    cssRules?: CSSRules,
  ) {
    const { d, ...parsedAttributes } = parseAttributes(
      element,
      this.ATTRIBUTE_NAMES,
      cssRules,
    );
    return new this(d, {
      ...parsedAttributes,
      ...options,
      // we pass undefined to instruct the constructor to position the object using the bbox
      left: undefined,
      top: undefined,
    });
  }
}

classRegistry.setClass(Path);
classRegistry.setSVGClass(Path);

/* _FROM_SVG_START_ */
