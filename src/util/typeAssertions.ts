import type { FabricObject } from '../shapes/Object/Object';
import type { TFiller } from '../typedefs';
import type { FabricText } from '../shapes/Text/Text';
import type { Pattern } from '../Pattern';
import type { Path } from '../shapes/Path';
import type { ActiveSelection } from '../shapes/ActiveSelection';

/**
 * 检查值是否为填充对象 (TFiller)
 * @param filler 要检查的值
 * @returns 如果是填充对象则返回 true，否则返回 false
 */
export const isFiller = (
  filler: TFiller | string | null,
): filler is TFiller => {
  return !!filler && (filler as TFiller).toLive !== undefined;
};

/**
 * 检查值是否为可序列化的填充对象
 * @param filler 要检查的值
 * @returns 如果是可序列化的填充对象则返回 true，否则返回 false
 */
export const isSerializableFiller = (
  filler: TFiller | string | null,
): filler is TFiller => {
  return !!filler && typeof (filler as TFiller).toObject === 'function';
};

/**
 * 检查填充对象是否为图案 (Pattern)
 * @param filler 要检查的填充对象
 * @returns 如果是图案则返回 true，否则返回 false
 */
export const isPattern = (filler: TFiller): filler is Pattern => {
  return (
    !!filler && (filler as Pattern).offsetX !== undefined && 'source' in filler
  );
};

/**
 * 检查对象是否为文本对象 (FabricText)
 * @param fabricObject 要检查的 Fabric 对象
 * @returns 如果是文本对象则返回 true，否则返回 false
 */
export const isTextObject = (
  fabricObject?: FabricObject,
): fabricObject is FabricText => {
  return (
    !!fabricObject &&
    typeof (fabricObject as FabricText)._renderText === 'function'
  );
};

/**
 * 检查对象是否为路径对象 (Path)
 * @param fabricObject 要检查的 Fabric 对象
 * @returns 如果是路径对象则返回 true，否则返回 false
 */
export const isPath = (fabricObject?: FabricObject): fabricObject is Path => {
  // we could use instanceof but that would mean pulling in Text code for a simple check
  // @todo discuss what to do and how to do
  return (
    !!fabricObject &&
    typeof (fabricObject as Path)._renderPathCommands === 'function'
  );
};

/**
 * 检查对象是否为活动选区 (ActiveSelection)
 * @param fabricObject 要检查的 Fabric 对象
 * @returns 如果是活动选区则返回 true，否则返回 false
 */
export const isActiveSelection = (
  fabricObject?: FabricObject,
): fabricObject is ActiveSelection =>
  !!fabricObject && 'multiSelectionStacking' in fabricObject;
