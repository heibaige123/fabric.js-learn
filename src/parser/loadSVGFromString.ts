import { getFabricWindow } from '../env';
import type { LoadImageOptions } from '../util/misc/objectEnlive';
import { parseSVGDocument } from './parseSVGDocument';
import type { SVGParsingOutput, TSvgReviverCallback } from './typedefs';

/**
 * 接收对应于 SVG 文档的字符串，并将其解析为一组 fabric 对象
 *
 * Takes string corresponding to an SVG document, and parses it into a set of fabric objects
 * @param string 代表 svg 的字符串
 * @param {String} string representing the svg
 * @param {TSvgParsedCallback} callback Invoked when the parsing is done, with null if parsing wasn't possible with the list of svg nodes.
 * {@link TSvgParsedCallback} also receives `allElements` array as the last argument. This is the full list of svg nodes available in the document.
 * You may want to use it if you are trying to regroup the objects as they were originally grouped in the SVG. ( This was the reason why it was added )
 * @param reviver 用于进一步解析 SVG 元素的额外回调，在每个 fabric 对象创建后调用。
 * 接收原始 svg 元素和生成的 `FabricObject` 作为参数。用于检查 fabric 未解析的额外属性，或进行额外的自定义操作
 * @param {TSvgReviverCallback} [reviver] Extra callback for further parsing of SVG elements, called after each fabric object has been created.
 * Takes as input the original svg element and the generated `FabricObject` as arguments. Used to inspect extra properties not parsed by fabric,
 * or extra custom manipulation
 * @param options 包含解析选项的对象
 * @param {Object} [options] Object containing options for parsing
 * @param {String} [options.crossOrigin] crossOrigin setting to use for external resources
 * @param {AbortSignal} [options.signal] handle aborting, see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
 * @returns 解析结果的 Promise
 */
export function loadSVGFromString(
  string: string,
  reviver?: TSvgReviverCallback,
  options?: LoadImageOptions,
): Promise<SVGParsingOutput> {
  /**
   * DOM 解析器实例
   */
  const parser = new (getFabricWindow().DOMParser)(),
    // should we use `image/svg+xml` here?
    // 我们应该在这里使用 `image/svg+xml` 吗？
    /**
     * 解析后的文档对象
     */
    doc = parser.parseFromString(string.trim(), 'text/xml');
  return parseSVGDocument(doc, reviver, options);
}
