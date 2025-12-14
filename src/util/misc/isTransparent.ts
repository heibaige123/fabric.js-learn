/**
 * 如果上下文在指定位置具有透明像素（考虑到容差），则返回 true
 *
 * Returns true if context has transparent pixel
 * at specified location (taking tolerance into account)
 * @param ctx 上下文
 * @param x canvas 元素坐标中的 x 坐标，不是 fabric 空间。整数
 * @param y canvas 元素坐标中的 y 坐标，不是 fabric 空间。整数
 * @param tolerance 点周围的容差像素，不是 alpha 容差，整数
 * @returns 如果透明则返回 true
 *
 * @param {CanvasRenderingContext2D} ctx context
 * @param {Number} x x coordinate in canvasElementCoordinate, not fabric space. integer
 * @param {Number} y y coordinate in canvasElementCoordinate, not fabric space. integer
 * @param {Number} tolerance Tolerance pixels around the point, not alpha tolerance, integer
 * @return {boolean} true if transparent
 */
export const isTransparent = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tolerance: number,
): boolean => {
  tolerance = Math.round(tolerance);
  const size = tolerance * 2 + 1;
  const { data } = ctx.getImageData(x - tolerance, y - tolerance, size, size);

  // Split image data - for tolerance > 1, pixelDataSize = 4;
  for (let i = 3; i < data.length; i += 4) {
    const alphaChannel = data[i];
    if (alphaChannel > 0) {
      return false;
    }
  }
  return true;
};
