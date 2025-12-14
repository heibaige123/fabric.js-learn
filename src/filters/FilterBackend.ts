import { config } from '../config';
import { getEnv } from '../env';
import { createCanvasElement } from '../util/misc/dom';
import { Canvas2dFilterBackend } from './Canvas2dFilterBackend';
import { WebGLFilterBackend } from './WebGLFilterBackend';

/**
 * 滤镜后端类型
 */
export type FilterBackend = WebGLFilterBackend | Canvas2dFilterBackend;

let filterBackend: FilterBackend;

/**
 * 验证是否可以初始化 webgl 或回退到 canvas2d 过滤后端
 *
 * Verifies if it is possible to initialize webgl or fallback on a canvas2d filtering backend
 */
export function initFilterBackend(): FilterBackend {
  const { WebGLProbe } = getEnv();
  WebGLProbe.queryWebGL(createCanvasElement());
  if (config.enableGLFiltering && WebGLProbe.isSupported(config.textureSize)) {
    return new WebGLFilterBackend({ tileSize: config.textureSize });
  } else {
    return new Canvas2dFilterBackend();
  }
}

/**
 * 获取当前的 fabricJS 滤镜后端，如果尚不可用则初始化一个
 *
 * Get the current fabricJS filter backend  or initialize one if not available yet
 * @param [strict] pass `true` to create the backend if it wasn't created yet (default behavior),
 * pass `false` to get the backend ref without mutating it
 * 传递 `true` 以在后端尚未创建时创建它（默认行为），传递 `false` 以获取后端引用而不改变它
 */
export function getFilterBackend(strict = true): FilterBackend {
  if (!filterBackend && strict) {
    filterBackend = initFilterBackend();
  }
  return filterBackend;
}

/**
 * 设置滤镜后端
 * @param backend 滤镜后端实例
 */
export function setFilterBackend(backend: FilterBackend) {
  filterBackend = backend;
}
