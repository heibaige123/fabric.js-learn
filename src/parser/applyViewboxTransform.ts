import { svgNS } from './constants';
import {
  parsePreserveAspectRatioAttribute,
  parseUnit,
} from '../util/misc/svgParsing';
import { svgViewBoxElementsRegEx, reViewBoxAttrValue } from './constants';
import { NONE } from '../constants';

/**
 * 解析后的 viewBox 变换信息
 */
export type ParsedViewboxTransform = Partial<{
  /**
   * 宽度
   */
  width: number;
  /**
   * 高度
   */
  height: number;
  /**
   * 最小 X 坐标
   */
  minX: number;
  /**
   * 最小 Y 坐标
   */
  minY: number;
  /**
   * viewBox 宽度
   */
  viewBoxWidth: number;
  /**
   * viewBox 高度
   */
  viewBoxHeight: number;
}>;

/**
 * 添加一个 <g> 元素来包裹所有子元素，并使 viewBox 变换矩阵应用于所有元素
 *
 * Add a <g> element that envelop all child elements and makes the viewbox transformMatrix descend on all elements
 * @param element 需要应用变换的元素
 * @returns 解析后的 viewBox 变换信息
 */
export function applyViewboxTransform(
  element: Element,
): ParsedViewboxTransform {
  if (!svgViewBoxElementsRegEx.test(element.nodeName)) {
    return {};
  }
  /**
   * viewBox 属性值
   */
  const viewBoxAttr: string | null = element.getAttribute('viewBox');
  /**
   * X 轴缩放比例
   */
  let scaleX = 1;
  /**
   * Y 轴缩放比例
   */
  let scaleY = 1;
  /**
   * 最小 X 坐标
   */
  let minX = 0;
  /**
   * 最小 Y 坐标
   */
  let minY = 0;
  /**
   * 变换矩阵字符串
   */
  let matrix;
  /**
   * 目标元素
   */
  let el;
  /**
   * 宽度属性值
   */
  const widthAttr = element.getAttribute('width');
  /**
   * 高度属性值
   */
  const heightAttr = element.getAttribute('height');
  /**
   * X 坐标属性值
   */
  const x = element.getAttribute('x') || 0;
  /**
   * Y 坐标属性值
   */
  const y = element.getAttribute('y') || 0;
  /**
   * 是否为有效的 viewBox
   */
  const goodViewbox = viewBoxAttr && reViewBoxAttrValue.test(viewBoxAttr);
  /**
   * 是否缺失 viewBox
   */
  const missingViewBox = !goodViewbox;
  /**
   * 是否缺失尺寸属性
   */
  const missingDimAttr =
    !widthAttr || !heightAttr || widthAttr === '100%' || heightAttr === '100%';

  /**
   * 平移矩阵字符串
   */
  let translateMatrix = '';
  /**
   * 宽度差异
   */
  let widthDiff = 0;
  /**
   * 高度差异
   */
  let heightDiff = 0;

  if (missingViewBox) {
    if (
      (x || y) &&
      element.parentNode &&
      element.parentNode.nodeName !== '#document'
    ) {
      translateMatrix =
        ' translate(' + parseUnit(x || '0') + ' ' + parseUnit(y || '0') + ') ';
      matrix = (element.getAttribute('transform') || '') + translateMatrix;
      element.setAttribute('transform', matrix);
      element.removeAttribute('x');
      element.removeAttribute('y');
    }
  }

  if (missingViewBox && missingDimAttr) {
    return {
      width: 0,
      height: 0,
    };
  }

  /**
   * 解析后的尺寸信息
   */
  const parsedDim: ParsedViewboxTransform = {
    width: 0,
    height: 0,
  };

  if (missingViewBox) {
    parsedDim.width = parseUnit(widthAttr!);
    parsedDim.height = parseUnit(heightAttr!);
    // set a transform for elements that have x y and are inner(only) SVGs
    // 为具有 x y 且是内部（仅）SVG 的元素设置变换
    return parsedDim;
  }

  /**
   * 解析后的 viewBox 数组
   */
  const pasedViewBox = viewBoxAttr.match(reViewBoxAttrValue)!;
  minX = -parseFloat(pasedViewBox[1]);
  minY = -parseFloat(pasedViewBox[2]);
  /**
   * viewBox 宽度
   */
  const viewBoxWidth = parseFloat(pasedViewBox[3]);
  /**
   * viewBox 高度
   */
  const viewBoxHeight = parseFloat(pasedViewBox[4]);
  parsedDim.minX = minX;
  parsedDim.minY = minY;
  parsedDim.viewBoxWidth = viewBoxWidth;
  parsedDim.viewBoxHeight = viewBoxHeight;
  if (!missingDimAttr) {
    parsedDim.width = parseUnit(widthAttr);
    parsedDim.height = parseUnit(heightAttr);
    scaleX = parsedDim.width / viewBoxWidth;
    scaleY = parsedDim.height / viewBoxHeight;
  } else {
    parsedDim.width = viewBoxWidth;
    parsedDim.height = viewBoxHeight;
  }

  // default is to preserve aspect ratio
  /**
   * 保持纵横比属性
   *
   * default is to preserve aspect ratio
   */
  const preserveAspectRatio = parsePreserveAspectRatioAttribute(
    element.getAttribute('preserveAspectRatio') || '',
  );
  if (preserveAspectRatio.alignX !== NONE) {
    //translate all container for the effect of Mid, Min, Max
    // 平移所有容器以实现 Mid, Min, Max 的效果
    if (preserveAspectRatio.meetOrSlice === 'meet') {
      scaleY = scaleX = scaleX > scaleY ? scaleY : scaleX;
      // calculate additional translation to move the viewbox
      // 计算额外的平移以移动 viewbox
    }
    if (preserveAspectRatio.meetOrSlice === 'slice') {
      scaleY = scaleX = scaleX > scaleY ? scaleX : scaleY;
      // calculate additional translation to move the viewbox
      // 计算额外的平移以移动 viewbox
    }
    widthDiff = parsedDim.width - viewBoxWidth * scaleX;
    heightDiff = parsedDim.height - viewBoxHeight * scaleX;
    if (preserveAspectRatio.alignX === 'Mid') {
      widthDiff /= 2;
    }
    if (preserveAspectRatio.alignY === 'Mid') {
      heightDiff /= 2;
    }
    if (preserveAspectRatio.alignX === 'Min') {
      widthDiff = 0;
    }
    if (preserveAspectRatio.alignY === 'Min') {
      heightDiff = 0;
    }
  }

  if (
    scaleX === 1 &&
    scaleY === 1 &&
    minX === 0 &&
    minY === 0 &&
    x === 0 &&
    y === 0
  ) {
    return parsedDim;
  }
  if ((x || y) && element.parentNode!.nodeName !== '#document') {
    translateMatrix =
      ' translate(' + parseUnit(x || '0') + ' ' + parseUnit(y || '0') + ') ';
  }

  matrix =
    translateMatrix +
    ' matrix(' +
    scaleX +
    ' 0' +
    ' 0 ' +
    scaleY +
    ' ' +
    (minX * scaleX + widthDiff) +
    ' ' +
    (minY * scaleY + heightDiff) +
    ') ';
  // seems unused.
  // 似乎未使用。
  // parsedDim.viewboxTransform = parseTransformAttribute(matrix);
  if (element.nodeName === 'svg') {
    el = element.ownerDocument.createElementNS(svgNS, 'g');
    // element.firstChild != null
    while (element.firstChild) {
      el.appendChild(element.firstChild);
    }
    element.appendChild(el);
  } else {
    el = element;
    el.removeAttribute('x');
    el.removeAttribute('y');
    matrix = el.getAttribute('transform') + matrix;
  }
  el.setAttribute('transform', matrix);
  return parsedDim;
}
