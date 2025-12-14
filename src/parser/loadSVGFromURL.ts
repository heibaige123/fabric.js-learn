import { createEmptyResponse } from './parseSVGDocument';
import { loadSVGFromString } from './loadSVGFromString';
import type { SVGParsingOutput, TSvgReviverCallback } from './typedefs';
import type { LoadImageOptions } from '../util/misc/objectEnlive';
import { FabricError } from '../util/internals/console';

/**
 * 接收对应于 SVG 文档的 URL，并将其解析为一组 fabric 对象。
 * 注意，SVG 是通过 fetch API 获取的，因此需要符合 SOP（同源策略）
 *
 * Takes url corresponding to an SVG document, and parses it into a set of fabric objects.
 * Note that SVG is fetched via fetch API, so it needs to conform to SOP (Same Origin Policy)
 * @param url SVG 的 URL
 * @param {string} url where the SVG is
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
export function loadSVGFromURL(
  url: string,
  reviver?: TSvgReviverCallback,
  options: LoadImageOptions = {},
): Promise<SVGParsingOutput> {
  return fetch(url.replace(/^\n\s*/, '').trim(), {
    signal: options.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new FabricError(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then((svgText) => {
      return loadSVGFromString(svgText, reviver, options);
    })
    .catch(() => {
      // this is an unhappy path, we dont care about speed
      // 这是一个不愉快的路径，我们不关心速度
      return createEmptyResponse();
    });
}
