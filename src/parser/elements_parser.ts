import { Gradient } from '../gradient/Gradient';
import { Group } from '../shapes/Group';
import { FabricImage } from '../shapes/Image';
import { classRegistry } from '../ClassRegistry';
import {
  invertTransform,
  multiplyTransformMatrices,
  qrDecompose,
} from '../util/misc/matrix';
import { removeTransformMatrixForSvgParsing } from '../util/transform_matrix_removal';
import type { FabricObject } from '../shapes/Object/FabricObject';
import { Point } from '../Point';
import { CENTER, FILL, STROKE } from '../constants';
import { getGradientDefs } from './getGradientDefs';
import { getCSSRules } from './getCSSRules';
import type { LoadImageOptions } from '../util';
import type { CSSRules, TSvgReviverCallback } from './typedefs';
import type { ParsedViewboxTransform } from './applyViewboxTransform';
import type { SVGOptions } from '../gradient';
import { getTagName } from './getTagName';
import { parseTransformAttribute } from './parseTransformAttribute';

/**
 * 查找元素对应的 Fabric 类
 * @param el SVG 元素
 * @returns 对应的 Fabric 类
 */
const findTag = (el: Element) =>
  classRegistry.getSVGClass(getTagName(el).toLowerCase());

/**
 * 存储类型定义
 */
type StorageType = {
  /**
   * 填充渐变元素
   */
  fill: SVGGradientElement;
  /**
   * 描边渐变元素
   */
  stroke: SVGGradientElement;
  /**
   * 剪切路径元素数组
   */
  clipPath: Element[];
};

/**
 * 未解析的 Fabric 对象类型
 */
type NotParsedFabricObject = FabricObject & {
  /**
   * 填充属性
   */
  fill: string;
  /**
   * 描边属性
   */
  stroke: string;
  /**
   * 剪切路径属性
   */
  clipPath?: string;
  /**
   * 剪切规则属性
   */
  clipRule?: CanvasFillRule;
};

/**
 * 元素解析器类
 */
export class ElementsParser {
  /**
   * 要解析的元素数组
   */
  declare elements: Element[];
  /**
   * 加载图像选项和解析后的 viewBox 变换
   */
  declare options: LoadImageOptions & ParsedViewboxTransform;
  /**
   * SVG 复活回调函数
   */
  declare reviver?: TSvgReviverCallback;
  /**
   * URL 正则表达式
   */
  declare regexUrl: RegExp;
  /**
   * 文档对象
   */
  declare doc: Document;
  /**
   * 剪切路径记录
   */
  declare clipPaths: Record<string, Element[]>;
  /**
   * 渐变定义记录
   */
  declare gradientDefs: Record<string, SVGGradientElement>;
  /**
   * CSS 规则
   */
  declare cssRules: CSSRules;

  /**
   * 构造函数
   * @param elements 要解析的元素数组
   * @param options 加载图像选项和解析后的 viewBox 变换
   * @param reviver SVG 复活回调函数
   * @param doc 文档对象
   * @param clipPaths 剪切路径记录
   */
  constructor(
    elements: Element[],
    options: LoadImageOptions & ParsedViewboxTransform,
    reviver: TSvgReviverCallback | undefined,
    doc: Document,
    clipPaths: Record<string, Element[]>,
  ) {
    this.elements = elements;
    this.options = options;
    this.reviver = reviver;
    this.regexUrl = /^url\(['"]?#([^'"]+)['"]?\)/g;
    this.doc = doc;
    this.clipPaths = clipPaths;
    this.gradientDefs = getGradientDefs(doc);
    this.cssRules = getCSSRules(doc);
  }

  /**
   * 解析所有元素
   * @returns 解析后的 Fabric 对象数组的 Promise
   */
  parse(): Promise<Array<FabricObject | null>> {
    return Promise.all(
      this.elements.map((element) => this.createObject(element)),
    );
  }

  /**
   * 创建 Fabric 对象
   * @param el SVG 元素
   * @returns 创建的 Fabric 对象的 Promise，如果无法创建则返回 null
   */
  async createObject(el: Element): Promise<FabricObject | null> {
    /**
     * 对应的 Fabric 类
     */
    const klass = findTag(el);
    if (klass) {
      /**
       * 创建的对象
       */
      const obj: NotParsedFabricObject = await klass.fromElement(
        el,
        this.options,
        this.cssRules,
      );
      this.resolveGradient(obj, el, FILL);
      this.resolveGradient(obj, el, STROKE);
      if (obj instanceof FabricImage && obj._originalElement) {
        removeTransformMatrixForSvgParsing(
          obj,
          obj.parsePreserveAspectRatioAttribute(),
        );
      } else {
        removeTransformMatrixForSvgParsing(obj);
      }
      await this.resolveClipPath(obj, el);
      this.reviver && this.reviver(el, obj);
      return obj;
    }
    return null;
  }

  /**
   * 提取属性定义
   * @param obj 未解析的 Fabric 对象
   * @param property 属性名称 ('fill' | 'stroke' | 'clipPath')
   * @param storage 存储记录
   * @returns 提取的属性定义，如果未找到则返回 undefined
   */
  extractPropertyDefinition(
    obj: NotParsedFabricObject,
    property: 'fill' | 'stroke' | 'clipPath',
    storage: Record<string, StorageType[typeof property]>,
  ): StorageType[typeof property] | undefined {
    /**
     * 属性值
     */
    const value = obj[property]!,
      /**
       * URL 正则表达式
       */
      regex = this.regexUrl;
    if (!regex.test(value)) {
      return undefined;
    }
    // verify: can we remove the 'g' flag? and remove lastIndex changes?
    // 验证：我们可以移除 'g' 标志吗？并移除 lastIndex 更改？
    regex.lastIndex = 0;
    // we passed the regex test, so we know is not null;
    // 我们通过了正则测试，所以我们知道它不为空；
    /**
     * 提取的 ID
     */
    const id = regex.exec(value)![1];
    regex.lastIndex = 0;
    // @todo fix this
    // @todo 修复这个问题
    return storage[id];
  }

  /**
   * 解析渐变
   * @param obj 未解析的 Fabric 对象
   * @param el SVG 元素
   * @param property 属性名称 ('fill' | 'stroke')
   */
  resolveGradient(
    obj: NotParsedFabricObject,
    el: Element,
    property: 'fill' | 'stroke',
  ) {
    /**
     * 渐变定义
     */
    const gradientDef = this.extractPropertyDefinition(
      obj,
      property,
      this.gradientDefs,
    ) as SVGGradientElement;
    if (gradientDef) {
      /**
       * 不透明度属性
       */
      const opacityAttr = el.getAttribute(property + '-opacity');
      /**
       * 创建的渐变对象
       */
      const gradient = Gradient.fromElement(gradientDef, obj, {
        ...this.options,
        opacity: opacityAttr,
      } as SVGOptions);
      obj.set(property, gradient);
    }
  }

  // TODO: resolveClipPath could be run once per clippath with minor work per object.
  // is a refactor that i m not sure is worth on this code
  /**
   * 解析剪切路径
   *
   * TODO: resolveClipPath could be run once per clippath with minor work per object.
   * is a refactor that i m not sure is worth on this code
   * @param obj 未解析的 Fabric 对象
   * @param usingElement 使用剪切路径的元素
   * @param exactOwner 确切的所有者元素
   */
  async resolveClipPath(
    obj: NotParsedFabricObject,
    usingElement: Element,
    exactOwner?: Element,
  ) {
    /**
     * 剪切路径元素数组
     */
    const clipPathElements = this.extractPropertyDefinition(
      obj,
      'clipPath',
      this.clipPaths,
    ) as Element[];
    if (clipPathElements) {
      /**
       * 对象变换矩阵的逆矩阵
       */
      const objTransformInv = invertTransform(obj.calcTransformMatrix());
      /**
       * 剪切路径标签
       */
      const clipPathTag = clipPathElements[0].parentElement!;
      /**
       * 剪切路径所有者
       */
      let clipPathOwner = usingElement;
      while (
        !exactOwner &&
        clipPathOwner.parentElement &&
        clipPathOwner.getAttribute('clip-path') !== obj.clipPath
      ) {
        clipPathOwner = clipPathOwner.parentElement;
      }
      // move the clipPath tag as sibling to the real element that is using it
      // 将 clipPath 标签移动为使用它的真实元素的兄弟元素
      clipPathOwner.parentElement!.appendChild(clipPathTag);

      // this multiplication order could be opposite.
      // but i don't have an svg to test it
      // at the first SVG that has a transform on both places and is misplaced
      // try to invert this multiplication order
      // 这个乘法顺序可能是相反的。
      // 但我没有 svg 来测试它
      // 在第一个在两个地方都有变换且位置错误的 SVG 处
      // 尝试反转此乘法顺序
      /**
       * 最终变换矩阵
       */
      const finalTransform = parseTransformAttribute(
        `${clipPathOwner.getAttribute('transform') || ''} ${
          clipPathTag.getAttribute('originalTransform') || ''
        }`,
      );

      clipPathTag.setAttribute(
        'transform',
        `matrix(${finalTransform.join(',')})`,
      );

      /**
       * 容器（解析后的剪切路径对象数组）
       */
      const container = await Promise.all(
        clipPathElements.map((clipPathElement) => {
          return findTag(clipPathElement)
            .fromElement(clipPathElement, this.options, this.cssRules)
            .then((enlivedClippath: NotParsedFabricObject) => {
              removeTransformMatrixForSvgParsing(enlivedClippath);
              enlivedClippath.fillRule = enlivedClippath.clipRule!;
              delete enlivedClippath.clipRule;
              return enlivedClippath;
            });
        }),
      );
      /**
       * 剪切路径对象（单个对象或组）
       */
      const clipPath =
        container.length === 1 ? container[0] : new Group(container);
      /**
       * 组变换矩阵
       */
      const gTransform = multiplyTransformMatrices(
        objTransformInv,
        clipPath.calcTransformMatrix(),
      );
      if (clipPath.clipPath) {
        await this.resolveClipPath(
          clipPath,
          clipPathOwner,
          // this is tricky.
          // it tries to differentiate from when clipPaths are inherited by outside groups
          // or when are really clipPaths referencing other clipPaths
          // 这很棘手。
          // 它试图区分 clipPaths 是由外部组继承的情况
          // 还是真正的 clipPaths 引用其他 clipPaths 的情况
          clipPathTag.getAttribute('clip-path') ? clipPathOwner : undefined,
        );
      }
      const { scaleX, scaleY, angle, skewX, translateX, translateY } =
        qrDecompose(gTransform);
      clipPath.set({
        flipX: false,
        flipY: false,
      });
      clipPath.set({
        scaleX,
        scaleY,
        angle,
        skewX,
        skewY: 0,
      });
      clipPath.setPositionByOrigin(
        new Point(translateX, translateY),
        CENTER,
        CENTER,
      );
      obj.clipPath = clipPath;
    } else {
      // if clip-path does not resolve to any element, delete the property.
      // 如果 clip-path 没有解析为任何元素，则删除该属性。
      delete obj.clipPath;
      return;
    }
  }
}
