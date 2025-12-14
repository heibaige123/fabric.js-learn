import { getFabricWindow } from '../env';
import { createCanvasElement, createCanvasElementFor } from '../util/misc/dom';
import { WebGLFilterBackend } from './WebGLFilterBackend';
import type { TWebGLPipelineState, T2DPipelineState } from './typedefs';

/**
 * 检查管道状态是否为 WebGL
 * @param options 管道状态选项
 * @returns 是否为 WebGL 管道状态
 */
export const isWebGLPipelineState = (
  options: TWebGLPipelineState | T2DPipelineState,
): options is TWebGLPipelineState => {
  return (options as TWebGLPipelineState).webgl !== undefined;
};

/**
 * 选择一种将数据从 GL 上下文复制到 2d 画布的方法。
 * 在某些浏览器中，使用 drawImage 应该更快，但在旧硬件和驱动程序的小型组合中也存在错误。
 * 对于该特定操作，putImageData 比 drawImage 快。
 *
 * Pick a method to copy data from GL context to 2d canvas.  In some browsers using
 * drawImage should be faster, but is also bugged for a small combination of old hardware
 * and drivers.
 * putImageData is faster than drawImage for that specific operation.
 * @param width 宽度
 * @param height 高度
 * @returns 如果 putImageData 更快则返回 true
 */
export const isPutImageFaster = (width: number, height: number): boolean => {
  const targetCanvas = createCanvasElementFor({ width, height });
  const sourceCanvas = createCanvasElement();
  const gl = sourceCanvas.getContext('webgl')!;
  // eslint-disable-next-line no-undef
  const imageBuffer = new ArrayBuffer(width * height * 4);

  const testContext = {
    imageBuffer: imageBuffer,
  } as unknown as Required<WebGLFilterBackend>;
  const testPipelineState = {
    destinationWidth: width,
    destinationHeight: height,
    targetCanvas: targetCanvas,
  } as unknown as TWebGLPipelineState;
  let startTime;

  startTime = getFabricWindow().performance.now();
  WebGLFilterBackend.prototype.copyGLTo2D.call(
    testContext,
    gl,
    testPipelineState,
  );
  const drawImageTime = getFabricWindow().performance.now() - startTime;

  startTime = getFabricWindow().performance.now();
  WebGLFilterBackend.prototype.copyGLTo2DPutImageData.call(
    testContext,
    gl,
    testPipelineState,
  );
  const putImageDataTime = getFabricWindow().performance.now() - startTime;

  return drawImageTime > putImageDataTime;
};
