/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  ControlActionHandler,
  TPointerEvent,
  TransformActionHandler,
} from '../EventTypeDefs';
import { Intersection } from '../Intersection';
import { Point } from '../Point';
import { SCALE } from '../constants';
import type {
  InteractiveFabricObject,
  TOCoord,
} from '../shapes/Object/InteractiveObject';
import type { TCornerPoint, TDegree, TMat2D } from '../typedefs';
import {
  createRotateMatrix,
  createScaleMatrix,
  createTranslateMatrix,
  multiplyTransformMatrixArray,
} from '../util/misc/matrix';
import type { ControlRenderingStyleOverride } from './controlRendering';
import { renderCircleControl, renderSquareControl } from './controlRendering';

/**
 * 控件类
 */
export class Control {
  /**
   * 跟踪控件的可见性。
   * 主要是为了向后兼容。
   * 如果您不想看到某个控件，可以将其从控件集中移除。
   *
   * keep track of control visibility.
   * mainly for backward compatibility.
   * if you do not want to see a control, you can remove it
   * from the control set.
   * @type {Boolean}
   * @default true
   */
  visible = true;

  /**
   * 控件可能执行的操作名称。
   * 这是可选的。FabricJS 使用它来识别用户正在做什么，以便进行一些额外的优化。
   * 如果您正在编写自定义控件，并且想在代码的其他地方知道正在发生什么，可以在这里使用此字符串。
   * 您还可以提供自定义的 getActionName，如果您的控件根据某些外部状态运行多个操作。
   * 默认为 scale，因为这是最常见的，默认用于 4 个角。
   *
   * Name of the action that the control will likely execute.
   * This is optional. FabricJS uses to identify what the user is doing for some
   * extra optimizations. If you are writing a custom control and you want to know
   * somewhere else in the code what is going on, you can use this string here.
   * you can also provide a custom getActionName if your control run multiple actions
   * depending on some external state.
   * default to scale since is the most common, used on 4 corners by default
   * @type {String}
   * @default 'scale'
   */
  actionName = SCALE;

  /**
   * 控件的绘制角度。
   * 目前未使用，但标记为内部逻辑所需。
   * 例如：为不同的旋转控件重用相同的绘制函数。
   *
   * Drawing angle of the control.
   * NOT used for now, but name marked as needed for internal logic
   * example: to reuse the same drawing function for different rotated controls
   * @type {Number}
   * @default 0
   */
  angle = 0;

  /**
   * 控件的相对位置 X。
   * 0,0 是对象的中心，而 -0.5（左）或 0.5（右）是边界框的极点。
   *
   * Relative position of the control. X
   * 0,0 is the center of the Object, while -0.5 (left) or 0.5 (right) are the extremities
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  x = 0;

  /**
   * 控件的相对位置 Y。
   * 0,0 是对象的中心，而 -0.5（上）或 0.5（下）是边界框的极点。
   *
   * Relative position of the control. Y
   * 0,0 is the center of the Object, while -0.5 (top) or 0.5 (bottom) are the extremities
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  y = 0;

  /**
   * 控件相对于定义位置的水平偏移量（以像素为单位）。
   * 正偏移量将控件向右移动，负偏移量向左移动。
   * 当您希望控件的位置不随边界框缩放时使用。
   * 例如：旋转控件放置在边界框的 x:0, y: 0.5 处，垂直偏移 30 像素。
   * 无论对象多大，这 30 像素都将保持为 30 像素。
   * 另一个例子是在角落有两个控件，当对象缩放时保持在相同位置。
   *
   * Horizontal offset of the control from the defined position. In pixels
   * Positive offset moves the control to the right, negative to the left.
   * It used when you want to have position of control that does not scale with
   * the bounding box. Example: rotation control is placed at x:0, y: 0.5 on
   * the boundind box, with an offset of 30 pixels vertically. Those 30 pixels will
   * stay 30 pixels no matter how the object is big. Another example is having 2
   * controls in the corner, that stay in the same position when the object scale.
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  offsetX = 0;

  /**
   * 控件相对于定义位置的垂直偏移量（以像素为单位）。
   * 正偏移量将控件向下移动，负偏移量向上移动。
   *
   * Vertical offset of the control from the defined position. In pixels
   * Positive offset moves the control to the bottom, negative to the top.
   * @type {Number}
   * @default 0
   */
  offsetY = 0;

  /**
   * 设置控件的长度。如果为 null，则默认为对象的 cornerSize。
   * 设置时需要同时设置 sizeX 和 sizeY。
   *
   * Sets the length of the control. If null, defaults to object's cornerSize.
   * Expects both sizeX and sizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  sizeX = 0;

  /**
   * 设置控件的高度。如果为 null，则默认为对象的 cornerSize。
   * 设置时需要同时设置 sizeX 和 sizeY。
   *
   * Sets the height of the control. If null, defaults to object's cornerSize.
   * Expects both sizeX and sizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  sizeY = 0;

  /**
   * 设置控件触摸区域的长度。如果为 null，则默认为对象的 touchCornerSize。
   * 设置时需要同时设置 touchSizeX 和 touchSizeY。
   *
   * Sets the length of the touch area of the control. If null, defaults to object's touchCornerSize.
   * Expects both touchSizeX and touchSizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  touchSizeX = 0;

  /**
   * 设置控件触摸区域的高度。如果为 null，则默认为对象的 touchCornerSize。
   * 设置时需要同时设置 touchSizeX 和 touchSizeY。
   *
   * Sets the height of the touch area of the control. If null, defaults to object's touchCornerSize.
   * Expects both touchSizeX and touchSizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  touchSizeY = 0;

  /**
   * 鼠标悬停在控件上时显示的 Css 光标样式。
   * 如果提供了 `cursorStyleHandler` 方法，则忽略此属性。
   *
   * Css cursor style to display when the control is hovered.
   * if the method `cursorStyleHandler` is provided, this property is ignored.
   * @type {String}
   * @default 'crosshair'
   */
  cursorStyle = 'crosshair';

  /**
   * 如果控件具有 offsetY 或 offsetX，则绘制一条连接控件和边界框的线。
   *
   * If controls has an offsetY or offsetX, draw a line that connects
   * the control to the bounding box
   * @type {Boolean}
   * @default false
   */
  withConnection = false;

  constructor(options?: Partial<Control>) {
    Object.assign(this, options);
  }

  /**
   * 控件操作处理程序，提供一个来处理操作（控件被移动）
   *
   * The control actionHandler, provide one to handle action ( control being moved )
   * @param {Event} eventData the native mouse event
   * @param {Transform} transformData properties of the current transform
   * @param {Number} x x position of the cursor
   * @param {Number} y y position of the cursor
   * @param eventData 原生鼠标事件
   * @param transformData 当前变换的属性
   * @param x 光标的 x 位置
   * @param y 光标的 y 位置
   * @return {Boolean} true if the action/event modified the object
   * @returns 如果操作/事件修改了对象，则为 true
   */
  declare actionHandler: TransformActionHandler;

  /**
   * 控件鼠标按下处理程序，提供一个来处理控件上的鼠标按下
   *
   * The control handler for mouse down, provide one to handle mouse down on control
   * @param {Event} eventData the native mouse event
   * @param {Transform} transformData properties of the current transform
   * @param {Number} x x position of the cursor
   * @param {Number} y y position of the cursor
   * @param eventData 原生鼠标事件
   * @param transformData 当前变换的属性
   * @param x 光标的 x 位置
   * @param y 光标的 y 位置
   * @return {Boolean} true if the action/event modified the object
   * @returns 如果操作/事件修改了对象，则为 true
   */
  declare mouseDownHandler?: ControlActionHandler;

  /**
   * 控件鼠标抬起处理程序，提供一个来处理鼠标抬起时的效果。
   *
   * The control mouseUpHandler, provide one to handle an effect on mouse up.
   * @param {Event} eventData the native mouse event
   * @param {Transform} transformData properties of the current transform
   * @param {Number} x x position of the cursor
   * @param {Number} y y position of the cursor
   * @param eventData 原生鼠标事件
   * @param transformData 当前变换的属性
   * @param x 光标的 x 位置
   * @param y 光标的 y 位置
   * @return {Boolean} true if the action/event modified the object
   * @returns 如果操作/事件修改了对象，则为 true
   */
  declare mouseUpHandler?: ControlActionHandler;

  /**
   * 确定控件是否应激活
   * @param controlKey 控件键
   * @param fabricObject Fabric 对象
   * @param pointer 指针位置
   * @param param3 控件角点
   * @returns 如果控件应激活，则为 true
   */
  shouldActivate(
    controlKey: string,
    fabricObject: InteractiveFabricObject,
    pointer: Point,
    { tl, tr, br, bl }: TCornerPoint,
  ) {
    // TODO: locking logic can be handled here instead of in the control handler logic
    return (
      fabricObject.canvas?.getActiveObject() === fabricObject &&
      fabricObject.isControlVisible(controlKey) &&
      Intersection.isPointInPolygon(pointer, [tl, tr, br, bl])
    );
  }

  /**
   * 返回控件操作处理程序
   *
   * Returns control actionHandler
   * @param {Event} eventData the native mouse event
   * @param {FabricObject} fabricObject on which the control is displayed
   * @param {Control} control control for which the action handler is being asked
   * @param eventData 原生鼠标事件
   * @param fabricObject 显示控件的对象
   * @param control 正在请求操作处理程序的控件
   * @return {Function} the action handler
   * @returns 操作处理程序
   */
  getActionHandler(
    eventData: TPointerEvent,
    fabricObject: InteractiveFabricObject,
    control: Control,
  ): TransformActionHandler | undefined {
    return this.actionHandler;
  }

  /**
   * 返回控件鼠标按下处理程序
   *
   * Returns control mouseDown handler
   * @param {Event} eventData the native mouse event
   * @param {FabricObject} fabricObject on which the control is displayed
   * @param {Control} control control for which the action handler is being asked
   * @param eventData 原生鼠标事件
   * @param fabricObject 显示控件的对象
   * @param control 正在请求操作处理程序的控件
   * @return {Function} the action handler
   * @returns 操作处理程序
   */
  getMouseDownHandler(
    eventData: TPointerEvent,
    fabricObject: InteractiveFabricObject,
    control: Control,
  ): ControlActionHandler | undefined {
    return this.mouseDownHandler;
  }

  /**
   * 返回控件鼠标抬起处理程序。
   * 在操作期间，fabricObject 或 control 可能是不同的对象
   *
   * Returns control mouseUp handler.
   * During actions the fabricObject or the control can be of different obj
   * @param {Event} eventData the native mouse event
   * @param {FabricObject} fabricObject on which the control is displayed
   * @param {Control} control control for which the action handler is being asked
   * @param eventData 原生鼠标事件
   * @param fabricObject 显示控件的对象
   * @param control 正在请求操作处理程序的控件
   * @return {Function} the action handler
   * @returns 操作处理程序
   */
  getMouseUpHandler(
    eventData: TPointerEvent,
    fabricObject: InteractiveFabricObject,
    control: Control,
  ): ControlActionHandler | undefined {
    return this.mouseUpHandler;
  }

  /**
   * 返回用于 css 的控件 cursorStyle。如果您需要更复杂的函数，可以在构造函数中传递一个
   * cursorStyle 属性
   *
   * Returns control cursorStyle for css using cursorStyle. If you need a more elaborate
   * function you can pass one in the constructor
   * the cursorStyle property
   * @param {Event} eventData the native mouse event
   * @param {Control} control the current control ( likely this)
   * @param {FabricObject} object on which the control is displayed
   * @param eventData 原生鼠标事件
   * @param control 当前控件（可能是 this）
   * @param fabricObject 显示控件的对象
   * @param coord 坐标
   * @return {String}
   * @returns 光标样式字符串
   */
  cursorStyleHandler(
    eventData: TPointerEvent,
    control: Control,
    fabricObject: InteractiveFabricObject,
    coord: TOCoord,
  ) {
    return control.cursorStyle;
  }

  /**
   * 返回操作名称。基本实现仅返回 actionName 属性。
   *
   * Returns the action name. The basic implementation just return the actionName property.
   * @param {Event} eventData the native mouse event
   * @param {Control} control the current control ( likely this)
   * @param {FabricObject} object on which the control is displayed
   * @param eventData 原生鼠标事件
   * @param control 当前控件（可能是 this）
   * @param fabricObject 显示控件的对象
   * @return {String}
   * @returns 操作名称
   */
  getActionName(
    eventData: TPointerEvent,
    control: Control,
    fabricObject: InteractiveFabricObject,
  ) {
    return control.actionName;
  }

  /**
   * 返回控件可见性
   *
   * Returns controls visibility
   * @param {FabricObject} object on which the control is displayed
   * @param {String} controlKey key where the control is memorized on the
   * @param fabricObject 显示控件的对象
   * @param controlKey 控件在对象上存储的键
   * @return {Boolean}
   * @returns 可见性
   */
  getVisibility(fabricObject: InteractiveFabricObject, controlKey: string) {
    return fabricObject._controlsVisibility?.[controlKey] ?? this.visible;
  }

  /**
   * 设置控件可见性
   *
   * Sets controls visibility
   * @param {Boolean} visibility for the object
   * @param visibility 对象的可见性
   * @param name 控件名称
   * @param fabricObject Fabric 对象
   * @return {Void}
   */
  setVisibility(
    visibility: boolean,
    name?: string,
    fabricObject?: InteractiveFabricObject,
  ) {
    this.visible = visibility;
  }

  /**
   * 控件位置处理程序
   * @param dim 控件尺寸
   * @param finalMatrix 最终变换矩阵
   * @param fabricObject 交互式 Fabric 对象
   * @param currentControl 当前控件
   * @returns 控件位置点
   */
  positionHandler(
    dim: Point,
    finalMatrix: TMat2D,
    fabricObject: InteractiveFabricObject,
    currentControl: Control,
  ) {
    return new Point(
      this.x * dim.x + this.offsetX,
      this.y * dim.y + this.offsetY,
    ).transform(finalMatrix);
  }

  /**
   * 根据对象值返回此控件的坐标。
   *
   * Returns the coords for this control based on object values.
   * @param {Number} objectAngle angle from the fabric object holding the control
   * @param {Number} objectCornerSize cornerSize from the fabric object holding the control (or touchCornerSize if
   *   isTouch is true)
   * @param {Number} centerX x coordinate where the control center should be
   * @param {Number} centerY y coordinate where the control center should be
   * @param {boolean} isTouch true if touch corner, false if normal corner
   * @param angle 包含控件的 fabric 对象的角度
   * @param objectCornerSize 包含控件的 fabric 对象的 cornerSize（如果 isTouch 为 true，则为 touchCornerSize）
   * @param centerX 控件中心应所在的 x 坐标
   * @param centerY 控件中心应所在的 y 坐标
   * @param isTouch 如果是触摸角则为 true，如果是普通角则为 false
   * @param fabricObject Fabric 对象
   */
  calcCornerCoords(
    angle: TDegree,
    objectCornerSize: number,
    centerX: number,
    centerY: number,
    isTouch: boolean,
    fabricObject: InteractiveFabricObject,
  ) {
    const t = multiplyTransformMatrixArray([
      createTranslateMatrix(centerX, centerY),
      createRotateMatrix({ angle }),
      createScaleMatrix(
        (isTouch ? this.touchSizeX : this.sizeX) || objectCornerSize,
        (isTouch ? this.touchSizeY : this.sizeY) || objectCornerSize,
      ),
    ]);
    return {
      tl: new Point(-0.5, -0.5).transform(t),
      tr: new Point(0.5, -0.5).transform(t),
      br: new Point(0.5, 0.5).transform(t),
      bl: new Point(-0.5, 0.5).transform(t),
    };
  }

  /**
   * 控件的渲染函数。
   * 当此函数运行时，上下文未缩放、未旋转。只是视网膜缩放。
   * 如果所有函数想要在检测到位置的地方绘制控件，则必须在开始绘制之前平移到点 left,top。
   * left 和 top 是 positionHandler 函数的结果
   *
   * Render function for the control.
   * When this function runs the context is unscaled. unrotate. Just retina scaled.
   * all the functions will have to translate to the point left,top before starting Drawing
   * if they want to draw a control where the position is detected.
   * left and top are the result of the positionHandler function
   * @param {RenderingContext2D} ctx the context where the control will be drawn
   * @param {Number} left position of the canvas where we are about to render the control.
   * @param {Number} top position of the canvas where we are about to render the control.
   * @param {Object} styleOverride
   * @param {FabricObject} fabricObject the object where the control is about to be rendered
   * @param ctx 将绘制控件的上下文
   * @param left 我们即将渲染控件的画布位置。
   * @param top 我们即将渲染控件的画布位置。
   * @param styleOverride 样式覆盖
   * @param fabricObject 即将渲染控件的对象
   */
  render(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: ControlRenderingStyleOverride | undefined,
    fabricObject: InteractiveFabricObject,
  ) {
    styleOverride = styleOverride || {};
    switch (styleOverride.cornerStyle || fabricObject.cornerStyle) {
      case 'circle':
        renderCircleControl.call(
          this,
          ctx,
          left,
          top,
          styleOverride,
          fabricObject,
        );
        break;
      default:
        renderSquareControl.call(
          this,
          ctx,
          left,
          top,
          styleOverride,
          fabricObject,
        );
    }
  }
}
