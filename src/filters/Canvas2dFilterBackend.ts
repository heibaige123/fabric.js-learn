/**
 * Canvas 2D 滤镜后端。
 *
 * Canvas 2D filter backend.
 */
import type { BaseFilter } from './BaseFilter';
import type { T2DPipelineState, TPipelineResources } from './typedefs';

export class Canvas2dFilterBackend {
  /**
   * 实验性功能。此对象是一种辅助图层的存储库，用于避免在频繁过滤期间重新创建它们。
   * 如果您正在使用滑块预览滤镜，您可能不希望每一步都创建辅助图层。
   * 在此对象中将附加一些画布，创建一次，有时调整大小，从不清除。清除留给开发人员。
   *
   * Experimental. This object is a sort of repository of help layers used to avoid
   * of recreating them during frequent filtering. If you are previewing a filter with
   * a slider you probably do not want to create help layers every filter step.
   * in this object there will be appended some canvases, created once, resized sometimes
   * cleared never. Clearing is left to the developer.
   **/
  resources: TPipelineResources = {};

  /**
   * 对源图像应用一组滤镜，并将过滤后的输出绘制到提供的目标画布上。
   *
   * Apply a set of filters against a source image and draw the filtered output
   * to the provided destination canvas.
   *
   * @param {EnhancedFilter} filters The filter to apply. 要应用的滤镜。
   * @param {HTMLImageElement|HTMLCanvasElement} sourceElement The source to be filtered. 要过滤的源元素。
   * @param {Number} sourceWidth The width of the source input. 源输入的宽度。
   * @param {Number} sourceHeight The height of the source input. 源输入的高度。
   * @param {HTMLCanvasElement} targetCanvas The destination for filtered output to be drawn. 绘制过滤输出的目标画布。
   * @returns {T2DPipelineState | void} 管道状态或 void
   */
  applyFilters(
    filters: BaseFilter<string, Record<string, any>>[],
    sourceElement: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    targetCanvas: HTMLCanvasElement,
  ): T2DPipelineState | void {
    const ctx = targetCanvas.getContext('2d', {
      willReadFrequently: true,
      desynchronized: true,
    });
    if (!ctx) {
      return;
    }
    ctx.drawImage(sourceElement, 0, 0, sourceWidth, sourceHeight);
    const imageData = ctx.getImageData(0, 0, sourceWidth, sourceHeight);
    const originalImageData = ctx.getImageData(0, 0, sourceWidth, sourceHeight);
    const pipelineState: T2DPipelineState = {
      sourceWidth,
      sourceHeight,
      imageData,
      originalEl: sourceElement,
      originalImageData,
      canvasEl: targetCanvas,
      ctx,
      filterBackend: this,
    };
    filters.forEach((filter) => {
      filter.applyTo(pipelineState);
    });
    const { imageData: imageDataPostFilter } = pipelineState;
    if (
      imageDataPostFilter.width !== sourceWidth ||
      imageDataPostFilter.height !== sourceHeight
    ) {
      targetCanvas.width = imageDataPostFilter.width;
      targetCanvas.height = imageDataPostFilter.height;
    }
    ctx.putImageData(imageDataPostFilter, 0, 0);
    return pipelineState;
  }
}
