import {
  TOP,
  LEFT,
  SCALE_Y,
  SCALE_X,
  SKEW_X,
  SKEW_Y,
  FILL,
  STROKE,
  CENTER,
} from '../../constants';
import type { TClassProperties } from '../../typedefs';
import type { InteractiveFabricObject } from './InteractiveObject';
import type { FabricObject } from './Object';

/**
 * 状态属性列表，用于检查对象状态是否改变
 */
export const stateProperties = [
  TOP,
  LEFT,
  SCALE_X,
  SCALE_Y,
  'flipX',
  'flipY',
  'originX',
  'originY',
  'angle',
  'opacity',
  'globalCompositeOperation',
  'shadow',
  'visible',
  SKEW_X,
  SKEW_Y,
];

/**
 * 缓存属性列表，用于检查缓存是否需要刷新
 */
export const cacheProperties = [
  FILL,
  STROKE,
  'strokeWidth',
  'strokeDashArray',
  'width',
  'height',
  'paintFirst',
  'strokeUniform',
  'strokeLineCap',
  'strokeDashOffset',
  'strokeLineJoin',
  'strokeMiterLimit',
  'backgroundColor',
  'clipPath',
];

/**
 * FabricObject 的默认值
 */
export const fabricObjectDefaultValues: Partial<
  TClassProperties<FabricObject>
> = {
  // see composeMatrix() to see order of transforms. First defaults listed based on this
  /** 顶部位置 */
  top: 0,
  /** 左侧位置 */
  left: 0,
  /** 宽度 */
  width: 0,
  /** 高度 */
  height: 0,
  /** 角度 */
  angle: 0,
  /** 水平翻转 */
  flipX: false,
  /** 垂直翻转 */
  flipY: false,
  /** 水平缩放 */
  scaleX: 1,
  /** 垂直缩放 */
  scaleY: 1,
  /** 最小缩放限制 */
  minScaleLimit: 0,
  /** 水平倾斜 */
  skewX: 0,
  /** 垂直倾斜 */
  skewY: 0,
  /** 水平原点 */
  originX: CENTER,
  /** 垂直原点 */
  originY: CENTER,
  /** 描边宽度 */
  strokeWidth: 1,
  /** 描边是否统一 */
  strokeUniform: false,
  /** 内边距 */
  padding: 0,
  /** 不透明度 */
  opacity: 1,
  /** 绘制顺序 */
  paintFirst: FILL,
  /** 填充颜色 */
  fill: 'rgb(0,0,0)',
  /** 填充规则 */
  fillRule: 'nonzero',
  /** 描边颜色 */
  stroke: null,
  /** 描边虚线数组 */
  strokeDashArray: null,
  /** 描边虚线偏移 */
  strokeDashOffset: 0,
  /** 描边线帽样式 */
  strokeLineCap: 'butt',
  /** 描边连接样式 */
  strokeLineJoin: 'miter',
  /** 描边斜接限制 */
  strokeMiterLimit: 4,
  /** 全局合成操作 */
  globalCompositeOperation: 'source-over',
  /** 背景颜色 */
  backgroundColor: '',
  /** 阴影 */
  shadow: null,
  /** 是否可见 */
  visible: true,
  /** 是否包含默认值 */
  includeDefaultValues: true,
  /** 是否从导出中排除 */
  excludeFromExport: false,
  /** 是否开启对象缓存 */
  objectCaching: true,
  /** 剪切路径 */
  clipPath: undefined,
  /** 是否反转剪切 */
  inverted: false,
  /** 是否绝对定位 */
  absolutePositioned: false,
  /** 是否中心旋转 */
  centeredRotation: true,
  /** 是否中心缩放 */
  centeredScaling: false,
  /** 是否脏（需要重绘） */
  dirty: true,
} as const;

/**
 * InteractiveFabricObject 的默认值
 */
export const interactiveObjectDefaultValues: Partial<
  TClassProperties<InteractiveFabricObject>
> = {
  /** 不缓存缩放 */
  noScaleCache: true,
  /** 锁定水平移动 */
  lockMovementX: false,
  /** 锁定垂直移动 */
  lockMovementY: false,
  /** 锁定旋转 */
  lockRotation: false,
  /** 锁定水平缩放 */
  lockScalingX: false,
  /** 锁定垂直缩放 */
  lockScalingY: false,
  /** 锁定水平倾斜 */
  lockSkewingX: false,
  /** 锁定垂直倾斜 */
  lockSkewingY: false,
  /** 锁定缩放翻转 */
  lockScalingFlip: false,
  /** 控制角大小 */
  cornerSize: 13,
  /** 触摸控制角大小 */
  touchCornerSize: 24,
  /** 透明控制角 */
  transparentCorners: true,
  /** 控制角颜色 */
  cornerColor: 'rgb(178,204,255)',
  /** 控制角描边颜色 */
  cornerStrokeColor: '',
  /** 控制角样式 */
  cornerStyle: 'rect',
  /** 控制角虚线数组 */
  cornerDashArray: null,
  /** 是否有控制点 */
  hasControls: true,
  /** 边框颜色 */
  borderColor: 'rgb(178,204,255)',
  /** 边框虚线数组 */
  borderDashArray: null,
  /** 移动时边框不透明度 */
  borderOpacityWhenMoving: 0.4,
  /** 边框缩放因子 */
  borderScaleFactor: 1,
  /** 是否有边框 */
  hasBorders: true,
  /** 选中时的背景颜色 */
  selectionBackgroundColor: '',
  /** 是否可选中 */
  selectable: true,
  /** 是否响应事件 */
  evented: true,
  /** 是否逐像素查找目标 */
  perPixelTargetFind: false,
  /** 激活时机（按下或抬起） */
  activeOn: 'down',
  /** 悬停光标 */
  hoverCursor: null,
  /** 移动光标 */
  moveCursor: null,
};
