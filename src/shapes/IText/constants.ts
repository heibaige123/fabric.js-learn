/**
 * IText 键盘映射类型
 */
export type TKeyMapIText = Record<
  KeyboardEvent['keyCode'],
  CursorHandlingMethods
>;

/**
 * 光标处理方法类型
 */
export type CursorHandlingMethods =
  | 'moveCursorUp'
  | 'moveCursorDown'
  | 'moveCursorLeft'
  | 'moveCursorRight'
  | 'exitEditing'
  | 'copy'
  | 'cut'
  | 'cmdAll';

/**
 * 移动光标向上
 */
const MOVE_CURSOR_UP: CursorHandlingMethods = 'moveCursorUp';
/**
 * 移动光标向下
 */
const MOVE_CURSOR_DOWN: CursorHandlingMethods = 'moveCursorDown';
/**
 * 移动光标向左
 */
const MOVE_CURSOR_LEFT: CursorHandlingMethods = 'moveCursorLeft';
/**
 * 移动光标向右
 */
const MOVE_CURSOR_RIGHT: CursorHandlingMethods = 'moveCursorRight';
/**
 * 退出编辑模式
 */
const EXIT_EDITING: CursorHandlingMethods = 'exitEditing';

// @TODO look into import { Key } from 'ts-key-enum';
// and transition from keyCode to Key
// also reduce string duplication
/**
 * 默认键盘映射
 */
export const keysMap: TKeyMapIText = {
  /**
   * 退出编辑模式
   */
  9: EXIT_EDITING,
  /**
   * 退出编辑模式
   */
  27: EXIT_EDITING,
  /**
   * 向上移动光标
   */
  33: MOVE_CURSOR_UP,
  /**
   * 向下移动光标
   */
  34: MOVE_CURSOR_DOWN,
  /**
   * 向右移动光标
   */
  35: MOVE_CURSOR_RIGHT,
  /**
   * 向左移动光标
   */
  36: MOVE_CURSOR_LEFT,
  /**
   * 向左移动光标
   */
  37: MOVE_CURSOR_LEFT,
  /**
   * 向上移动光标
   */
  38: MOVE_CURSOR_UP,
  /**
   * 向右移动光标
   */
  39: MOVE_CURSOR_RIGHT,
  /**
   * 向下移动光标
   */
  40: MOVE_CURSOR_DOWN,
};

/**
 * RTL（从右到左）语言环境的键盘映射
 */
export const keysMapRtl: TKeyMapIText = {
  /**
   * 退出编辑模式
   */
  9: EXIT_EDITING,
  /**
   * 退出编辑模式
   */
  27: EXIT_EDITING,
  /**
   * 向上移动光标
   */
  33: MOVE_CURSOR_UP,
  /**
   * 向下移动光标
   */
  34: MOVE_CURSOR_DOWN,
  /**
   * 向左移动光标
   */
  35: MOVE_CURSOR_LEFT,
  /**
   * 向右移动光标
   */
  36: MOVE_CURSOR_RIGHT,
  /**
   * 向右移动光标
   */
  37: MOVE_CURSOR_RIGHT,
  /**
   * 向上移动光标
   */
  38: MOVE_CURSOR_UP,
  /**
   * 向左移动光标
   */
  39: MOVE_CURSOR_LEFT,
  /**
   * 向下移动光标
   */
  40: MOVE_CURSOR_DOWN,
};

/**
 * 用于 keyUp + ctrl || cmd 的功能
 *
 * For functionalities on keyUp + ctrl || cmd
 */
export const ctrlKeysMapUp: TKeyMapIText = {
  /**
   * 复制
   */
  67: 'copy',
  // there was a reason this wasn't deleted. for now leave it here
  /**
   * 剪切
   */
  88: 'cut',
};

/**
 * 用于 keyDown + ctrl || cmd 的功能
 *
 * For functionalities on keyDown + ctrl || cmd
 */
export const ctrlKeysMapDown: TKeyMapIText = {
  /**
   * 全选
   */
  65: 'cmdAll',
};
