import { ROTATE, SCALE, SKEW_X, SKEW_Y, iMatrix } from '../constants';
import { reNum } from './constants';
import type { TMat2D } from '../typedefs';
import { cleanupSvgAttribute } from '../util/internals/cleanupSvgAttribute';
import {
  createRotateMatrix,
  createScaleMatrix,
  createSkewXMatrix,
  createSkewYMatrix,
  createTranslateMatrix,
  multiplyTransformMatrixArray,
} from '../util/misc/matrix';

// == begin transform regexp
/**
 * 数字的正则表达式部分
 */
const p = `(${reNum})`;
/**
 * skewX 变换的正则表达式
 */
const skewX = String.raw`(skewX)\(${p}\)`;
/**
 * skewY 变换的正则表达式
 */
const skewY = String.raw`(skewY)\(${p}\)`;
/**
 * rotate 变换的正则表达式
 */
const rotate = String.raw`(rotate)\(${p}(?: ${p} ${p})?\)`;
/**
 * scale 变换的正则表达式
 */
const scale = String.raw`(scale)\(${p}(?: ${p})?\)`;
/**
 * translate 变换的正则表达式
 */
const translate = String.raw`(translate)\(${p}(?: ${p})?\)`;
/**
 * matrix 变换的正则表达式
 */
const matrix = String.raw`(matrix)\(${p} ${p} ${p} ${p} ${p} ${p}\)`;
/**
 * 单个变换的正则表达式
 */
const transform = `(?:${matrix}|${translate}|${rotate}|${scale}|${skewX}|${skewY})`;
/**
 * 多个变换的正则表达式
 */
const transforms = `(?:${transform}*)`;
/**
 * 变换列表的正则表达式
 */
const transformList = String.raw`^\s*(?:${transforms}?)\s*$`;
// http://www.w3.org/TR/SVG/coords.html#TransformAttribute
/**
 * 匹配变换列表的正则表达式对象
 */
const reTransformList = new RegExp(transformList);
/**
 * 匹配单个变换的正则表达式对象
 */
const reTransform = new RegExp(transform);
/**
 * 全局匹配所有变换的正则表达式对象
 */
const reTransformAll = new RegExp(transform, 'g');
// == end transform regexp

/**
 * 解析 "transform" 属性，返回一个包含 6 个元素的变换矩阵数组
 *
 * Parses "transform" attribute, returning an array of values
 * @param attributeValue 包含属性值的字符串
 * @param {String} attributeValue String containing attribute value
 * @returns 表示变换矩阵的 6 个元素的数组
 * @return {TTransformMatrix} Array of 6 elements representing transformation matrix
 */
export function parseTransformAttribute(attributeValue: string): TMat2D {
  // first we clean the string
  attributeValue = cleanupSvgAttribute(attributeValue)
    // remove spaces around front parentheses
    .replace(/\s*([()])\s*/gi, '$1');

  // start with identity matrix
  const matrices: TMat2D[] = [];

  // return if no argument was given or
  // an argument does not match transform attribute regexp
  if (
    !attributeValue ||
    (attributeValue && !reTransformList.test(attributeValue))
  ) {
    return [...iMatrix];
  }

  for (const match of attributeValue.matchAll(reTransformAll)) {
    const transformMatch = reTransform.exec(match[0]);
    if (!transformMatch) {
      continue;
    }
    let matrix: TMat2D = iMatrix;
    const matchedParams = transformMatch.filter((m) => !!m);
    const [, operation, ...rawArgs] = matchedParams;
    const [arg0, arg1, arg2, arg3, arg4, arg5] = rawArgs.map((arg) =>
      parseFloat(arg),
    );

    switch (operation) {
      case 'translate':
        matrix = createTranslateMatrix(arg0, arg1);
        break;
      case ROTATE:
        matrix = createRotateMatrix({ angle: arg0 }, { x: arg1, y: arg2 });
        break;
      case SCALE:
        matrix = createScaleMatrix(arg0, arg1);
        break;
      case SKEW_X:
        matrix = createSkewXMatrix(arg0);
        break;
      case SKEW_Y:
        matrix = createSkewYMatrix(arg0);
        break;
      case 'matrix':
        matrix = [arg0, arg1, arg2, arg3, arg4, arg5];
        break;
    }

    // snapshot current matrix into matrices array
    matrices.push(matrix);
  }

  return multiplyTransformMatrixArray(matrices);
}
