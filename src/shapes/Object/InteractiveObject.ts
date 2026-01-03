import { Point, ZERO } from '../../Point';
import type { TCornerPoint, TDegree } from '../../typedefs';
import { FabricObject } from './Object';
import { degreesToRadians } from '../../util/misc/radiansDegreesConversion';
import type { TQrDecomposeOut } from '../../util/misc/matrix';
import {
  calcDimensionsMatrix,
  createRotateMatrix,
  createTranslateMatrix,
  multiplyTransformMatrices,
  qrDecompose,
} from '../../util/misc/matrix';
import type { Control } from '../../controls/Control';
import { sizeAfterTransform } from '../../util/misc/objectTransforms';
import type { ObjectEvents, TPointerEvent } from '../../EventTypeDefs';
import type { Canvas } from '../../canvas/Canvas';
import type { ControlRenderingStyleOverride } from '../../controls/controlRendering';
import type { FabricObjectProps } from './types/FabricObjectProps';
import type { TFabricObjectProps, SerializedObjectProps } from './types';
import { createObjectDefaultControls } from '../../controls/commonControls';
import { interactiveObjectDefaultValues } from './defaultValues';
import { SCALE } from '../../constants';

/**
 * 对象坐标接口，包含角点和触摸角点
 */
export type TOCoord = Point & {
  /***
   * 角点坐标
   */
  corner: TCornerPoint;
  /**
   * 触摸角点坐标
   */
  touchCorner: TCornerPoint;
};

/**
 * 控制集类型，键为控制名称，值为 Control 对象
 */
export type TControlSet = Record<string, Control>;

/**
 * 边框渲染样式覆盖类型
 */
export type TBorderRenderingStyleOverride = Partial<
  Pick<InteractiveFabricObject, 'borderColor' | 'borderDashArray'>
>;

/**
 * 样式覆盖类型，结合了控制渲染样式、边框渲染样式和其他属性
 */
export type TStyleOverride = ControlRenderingStyleOverride &
  TBorderRenderingStyleOverride &
  Partial<
    Pick<InteractiveFabricObject, 'hasBorders' | 'hasControls'> & {
      /**
       * 是否为活动选择
       */
      forActiveSelection: boolean;
    }
  >;

/**
 * 交互式 Fabric 对象类，提供交互功能（如缩放、旋转、移动等）
 */
export class InteractiveFabricObject<
    Props extends TFabricObjectProps = Partial<FabricObjectProps>,
    SProps extends SerializedObjectProps = SerializedObjectProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  >
  extends FabricObject<Props, SProps, EventSpec>
  implements FabricObjectProps
{
  /**
   * 如果为 true，则不缓存缩放
   */
  declare noScaleCache: boolean;

  /**
   * 旋转吸附角度
   */
  declare snapAngle?: TDegree;
  /**
   * 旋转吸附阈值
   */
  declare snapThreshold?: TDegree;

  /**
   * 锁定水平移动
   */
  declare lockMovementX: boolean;
  /**
   * 锁定垂直移动
   */
  declare lockMovementY: boolean;
  /**
   * 锁定旋转
   */
  declare lockRotation: boolean;
  /**
   * 锁定水平缩放
   */
  declare lockScalingX: boolean;
  /**
   * 锁定垂直缩放
   */
  declare lockScalingY: boolean;
  /**
   * 锁定水平倾斜
   */
  declare lockSkewingX: boolean;
  /**
   * 锁定垂直倾斜
   */
  declare lockSkewingY: boolean;
  /**
   * 锁定缩放翻转
   */
  declare lockScalingFlip: boolean;

  /**
   * 控制角大小
   */
  declare cornerSize: number;
  /**
   * 触摸控制角大小
   */
  declare touchCornerSize: number;
  /**
   * 透明控制角
   */
  declare transparentCorners: boolean;
  /**
   * 控制角颜色
   */
  declare cornerColor: string;
  /**
   * 控制角描边颜色
   */
  declare cornerStrokeColor: string;
  /**
   * 控制角样式
   */
  declare cornerStyle: 'rect' | 'circle';
  /**
   * 控制角虚线数组
   */
  declare cornerDashArray: number[] | null;
  /**
   * 是否有控制点
   */
  declare hasControls: boolean;

  /**
   * 边框颜色
   */
  declare borderColor: string;
  /**
   * 边框虚线数组
   */
  declare borderDashArray: number[] | null;
  /**
   * 移动时边框不透明度
   */
  declare borderOpacityWhenMoving: number;
  /**
   * 边框缩放因子
   */
  declare borderScaleFactor: number;
  /**
   * 是否有边框
   */
  declare hasBorders: boolean;
  /**
   * 选中时的背景颜色
   */
  declare selectionBackgroundColor: string;

  /**
   * 是否可选中
   */
  declare selectable: boolean;
  /**
   * 是否响应事件
   */
  declare evented: boolean;
  /**
   * 是否逐像素查找目标
   */
  declare perPixelTargetFind: boolean;
  /**
   * 激活时机（按下或抬起）
   */
  declare activeOn: 'down' | 'up';

  /**
   * 悬停光标
   */
  declare hoverCursor: CSSStyleDeclaration['cursor'] | null;
  /**
   * 移动光标
   */
  declare moveCursor: CSSStyleDeclaration['cursor'] | null;

  /**
   * 对象控件在视口坐标中的位置
   * 由 {@link Control#positionHandler} 和 {@link Control#calcCornerCoords} 计算，取决于 {@link padding}。
   * `corner/touchCorner` 描述形成角交互区域的 4 个点。
   * 用于绘制和定位控件。
   *
   * The object's controls' position in viewport coordinates
   * Calculated by {@link Control#positionHandler} and {@link Control#calcCornerCoords}, depending on {@link padding}.
   * `corner/touchCorner` describe the 4 points forming the interactive area of the corner.
   * Used to draw and locate controls.
   */
  declare oCoords: Record<string, TOCoord>;

  /**
   * 在鼠标移动期间保留最后悬停的角的值。
   * 0 表示没有角，或 'mt', 'ml', 'mtr' 等。
   * 它应该是私有的，但将其用作只读属性没有坏处。
   * 这不会自动清理。未选中的对象可能有错误的值
   *
   * keeps the value of the last hovered corner during mouse move.
   * 0 is no corner, or 'mt', 'ml', 'mtr' etc..
   * It should be private, but there is no harm in using it as
   * a read-only property.
   * this isn't cleaned automatically. Non selected objects may have wrong values
   * @type [string]
   */
  declare __corner?: string;

  /**
   * 此对象的控件可见性映射。
   * 这是在引入控件时留下的，以免过多破坏 api
   * 这优先于通用控件可见性
   *
   * a map of control visibility for this object.
   * this was left when controls were introduced to not break the api too much
   * this takes priority over the generic control visibility
   */
  declare _controlsVisibility: Record<string, boolean>;

  /**
   * 保存对象的控件。
   * 控件由 default_controls.js 添加
   *
   * holds the controls for the object.
   * controls are added by default_controls.js
   */
  declare controls: TControlSet;

  /**
   * 内部布尔值，用于向代码发出信号，表明对象是移动操作的一部分。
   *
   * internal boolean to signal the code that the object is
   * part of the move action.
   */
  declare isMoving?: boolean;

  /**
   * 从手势模块使用的布尔值，用于在没有缩放变换到位时跟踪缩放操作。
   * 这是一个边缘情况，在所有代码库中使用了两次。
   * 可能是为了跟踪一些性能问题而添加的
   *
   * A boolean used from the gesture module to keep tracking of a scaling
   * action when there is no scaling transform in place.
   * This is an edge case and is used twice in all codebase.
   * Probably added to keep track of some performance issues
   * @TODO use git blame to investigate why it was added
   * DON'T USE IT. WE WILL TRY TO REMOVE IT
   */
  declare _scaling?: boolean;

  /**
   * 关联的画布实例
   */
  declare canvas?: Canvas;

  /**
   * 交互式对象的默认属性值
   */
  static ownDefaults = interactiveObjectDefaultValues;

  /**
   * 获取交互式对象的默认属性值
   * @returns
   */
  static getDefaults(): Record<string, any> {
    return {
      ...super.getDefaults(),
      ...InteractiveFabricObject.ownDefaults,
    };
  }

  /**
   * 构造函数
   *
   * Constructor
   * @param {Object} [options] Options object
   */
  constructor(options?: Props) {
    super();
    Object.assign(
      this,
      (this.constructor as typeof InteractiveFabricObject).createControls(),
      InteractiveFabricObject.ownDefaults,
    );
    this.setOptions(options);
  }

  /**
   * 创建默认控件对象。
   * 如果您希望在所有对象之间共享控件实例
   * 使此函数返回一个空对象并将控件添加到 ownDefaults
   *
   * Creates the default control object.
   * If you prefer to have on instance of controls shared among all objects
   * make this function return an empty object and add controls to the ownDefaults
   * @param {Object} [options] Options object
   */
  static createControls(): { controls: Record<string, Control> } {
    return { controls: createObjectDefaultControls() };
  }

  /**
   * 更新缓存画布的宽度和高度
   * 如果画布需要调整大小，则返回 true 或 false。
   *
   * Update width and height of the canvas for cache
   * returns true or false if canvas needed resize.
   * @private
   * @return {Boolean} true if the canvas has been resized
   */
  _updateCacheCanvas() {
    const targetCanvas = this.canvas;
    if (this.noScaleCache && targetCanvas && targetCanvas._currentTransform) {
      const transform = targetCanvas._currentTransform,
        target = transform.target,
        action = transform.action;
      if (
        this === (target as unknown as this) &&
        action &&
        action.startsWith(SCALE)
      ) {
        return false;
      }
    }
    return super._updateCacheCanvas();
  }

  /**
   * 获取当前活动的控件
   */
  getActiveControl() {
    const key = this.__corner;
    return key
      ? {
          key,
          control: this.controls[key],
          coord: this.oCoords[key],
        }
      : undefined;
  }

  /**
   * 确定鼠标光标下的角，由 `pointer` 表示。
   * 仅当对象处于活动状态时，此函数才返回角。
   * 这样做是为了避免选择非活动对象的角并激活变换而不是拖动操作。
   * fabricJS 的默认行为是，如果您想变换对象，首先选择它以显示控件集
   *
   * Determines which corner is under the mouse cursor, represented by `pointer`.
   * This function returns a corner only if the object is the active one.
   * This is done to avoid selecting corner of non active object and activating transformations
   * rather than drag action. The default behavior of fabricJS is that if you want to transform
   * an object, first you select it to show the control set
   * @private
   * @param {Object} pointer The pointer indicating the mouse position
   * @param {boolean} forTouch indicates if we are looking for interaction area with a touch action
   * @return {String|Boolean} corner code (tl, tr, bl, br, etc.), or 0 if nothing is found.
   */
  findControl(
    pointer: Point,
    forTouch = false,
  ): { key: string; control: Control; coord: TOCoord } | undefined {
    if (!this.hasControls || !this.canvas) {
      return undefined;
    }

    this.__corner = undefined;
    const cornerEntries = Object.entries(this.oCoords);
    for (let i = cornerEntries.length - 1; i >= 0; i--) {
      const [key, corner] = cornerEntries[i];
      const control = this.controls[key];

      if (
        control.shouldActivate(
          key,
          this,
          pointer,
          forTouch ? corner.touchCorner : corner.corner,
        )
      ) {
        // this.canvas.contextTop.fillRect(pointer.x - 1, pointer.y - 1, 2, 2);
        this.__corner = key;

        return { key, control, coord: this.oCoords[key] };
      }
    }

    return undefined;
  }

  /**
   * 计算每个控件的中心坐标加上控件本身的角
   * 这基本上只是委托给每个控件的 positionHandler
   * 警告：更改传递给 positionHandler 的内容是一项重大更改，因为 position handler
   * 是一个公共 api，只有在非常必要的情况下才应该这样做
   *
   * Calculates the coordinates of the center of each control plus the corners of the control itself
   * This basically just delegates to each control positionHandler
   * WARNING: changing what is passed to positionHandler is a breaking change, since position handler
   * is a public api and should be done just if extremely necessary
   * @return {Record<string, TOCoord>}
   */
  calcOCoords(): Record<string, TOCoord> {
    const vpt = this.getViewportTransform(),
      center = this.getCenterPoint(),
      tMatrix = createTranslateMatrix(center.x, center.y),
      rMatrix = createRotateMatrix({
        angle: this.getTotalAngle() - (!!this.group && this.flipX ? 180 : 0),
      }),
      positionMatrix = multiplyTransformMatrices(tMatrix, rMatrix),
      startMatrix = multiplyTransformMatrices(vpt, positionMatrix),
      finalMatrix = multiplyTransformMatrices(startMatrix, [
        1 / vpt[0],
        0,
        0,
        1 / vpt[3],
        0,
        0,
      ]),
      transformOptions = this.group
        ? qrDecompose(this.calcTransformMatrix())
        : undefined;
    // decomposing could bring negative scaling and `_calculateCurrentDimensions` can't take it
    if (transformOptions) {
      transformOptions.scaleX = Math.abs(transformOptions.scaleX);
      transformOptions.scaleY = Math.abs(transformOptions.scaleY);
    }
    const dim = this._calculateCurrentDimensions(transformOptions),
      coords: Record<string, TOCoord> = {};

    this.forEachControl((control, key) => {
      const position = control.positionHandler(dim, finalMatrix, this, control);
      // coords[key] are sometimes used as points. Those are points to which we add
      // the property corner and touchCorner from `_calcCornerCoords`.
      // don't remove this assign for an object spread.
      coords[key] = Object.assign(
        position,
        this._calcCornerCoords(control, position),
      );
    });

    // debug code
    /*
      const canvas = this.canvas;
      setTimeout(function () {
      if (!canvas) return;
        canvas.contextTop.clearRect(0, 0, 700, 700);
        canvas.contextTop.fillStyle = 'green';
        Object.keys(coords).forEach(function(key) {
          const control = coords[key];
          canvas.contextTop.fillRect(control.x, control.y, 3, 3);
        });
      } 50);
    */
    return coords;
  }

  /**
   * 设置确定每个控件交互区域的坐标
   * 注意：如果我们切换到 ROUND 角区域，所有这些都将消失。
   * 一切都将解析为单个点和距离的勾股定理
   * @todo evaluate simplification of code switching to circle interaction area at runtime
   *
   * Sets the coordinates that determine the interaction area of each control
   * note: if we would switch to ROUND corner area, all of this would disappear.
   * everything would resolve to a single point and a pythagorean theorem for the distance
   * @todo evaluate simplification of code switching to circle interaction area at runtime
   * @private
   */
  private _calcCornerCoords(control: Control, position: Point) {
    const angle = this.getTotalAngle();
    const corner = control.calcCornerCoords(
      angle,
      this.cornerSize,
      position.x,
      position.y,
      false,
      this,
    );
    const touchCorner = control.calcCornerCoords(
      angle,
      this.touchCornerSize,
      position.x,
      position.y,
      true,
      this,
    );
    return { corner, touchCorner };
  }

  /**
   * @override 同时设置控件的坐标
   * 参见 {@link https://github.com/fabricjs/fabric.js/wiki/When-to-call-setCoords} 和 {@link https://fabric5.fabricjs.com/fabric-gotchas}
   *
   */
  setCoords(): void {
    super.setCoords();
    this.canvas && (this.oCoords = this.calcOCoords());
  }

  /**
   * 为每个控件调用一个函数。该函数被调用，
   * 带有控件、控件的键和调用迭代器的对象
   *
   * Calls a function for each control. The function gets called,
   * with the control, the control's key and the object that is calling the iterator
   * @param {Function} fn function to iterate over the controls over
   */
  forEachControl(
    fn: (
      control: Control,
      key: string,
      fabricObject: InteractiveFabricObject,
    ) => any,
  ) {
    for (const i in this.controls) {
      fn(this.controls[i], i, this);
    }
  }

  /**
   * 在对象后面绘制一个彩色层，在其选择边框内。
   * 需要公共选项：padding, selectionBackgroundColor
   * 当上下文被转换时调用此函数
   * 检查当对象在 staticCanvas 上时是否跳过
   * @todo evaluate if make this disappear in favor of a pre-render hook for objects
   * this was added by Andrea Bogazzi to make possible some feature for work reasons
   * it seemed a good option, now is an edge case
   *
   * Draws a colored layer behind the object, inside its selection borders.
   * Requires public options: padding, selectionBackgroundColor
   * this function is called when the context is transformed
   * has checks to be skipped when the object is on a staticCanvas
   * @todo evaluate if make this disappear in favor of a pre-render hook for objects
   * this was added by Andrea Bogazzi to make possible some feature for work reasons
   * it seemed a good option, now is an edge case
   * @param {CanvasRenderingContext2D} ctx Context to draw on
   */
  drawSelectionBackground(ctx: CanvasRenderingContext2D): void {
    if (
      !this.selectionBackgroundColor ||
      (this.canvas && (this.canvas._activeObject as unknown as this) !== this)
    ) {
      return;
    }
    ctx.save();
    const center = this.getRelativeCenterPoint(),
      wh = this._calculateCurrentDimensions(),
      vpt = this.getViewportTransform();
    ctx.translate(center.x, center.y);
    ctx.scale(1 / vpt[0], 1 / vpt[3]);
    ctx.rotate(degreesToRadians(this.angle));
    ctx.fillStyle = this.selectionBackgroundColor;
    ctx.fillRect(-wh.x / 2, -wh.y / 2, wh.x, wh.y);
    ctx.restore();
  }

  /**
   * @public 重写此函数以自定义控制框的绘制，例如圆角、不同的边框样式。
   *
   * @public override this function in order to customize the drawing of the control box, e.g. rounded corners, different border style.
   * @param {CanvasRenderingContext2D} ctx ctx is rotated and translated so that (0,0) is at object's center
   * @param {Point} size the control box size used
   */
  strokeBorders(ctx: CanvasRenderingContext2D, size: Point): void {
    ctx.strokeRect(-size.x / 2, -size.y / 2, size.x, size.y);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} ctx Context to draw on
   * @param {Point} size
   * @param {TStyleOverride} styleOverride object to override the object style
   */
  _drawBorders(
    ctx: CanvasRenderingContext2D,
    size: Point,
    styleOverride: TStyleOverride = {},
  ): void {
    const options = {
      hasControls: this.hasControls,
      borderColor: this.borderColor,
      borderDashArray: this.borderDashArray,
      ...styleOverride,
    };
    ctx.save();
    ctx.strokeStyle = options.borderColor;
    this._setLineDash(ctx, options.borderDashArray);
    this.strokeBorders(ctx, size);
    options.hasControls && this.drawControlsConnectingLines(ctx, size);
    ctx.restore();
  }

  /**
   * 渲染对象的控件和边框
   * 这里的上下文没有被转换
   * @todo move to interactivity
   *
   * Renders controls and borders for the object
   * the context here is not transformed
   * @todo move to interactivity
   * @param {CanvasRenderingContext2D} ctx Context to render on
   * @param {TStyleOverride} [styleOverride] properties to override the object style
   */
  _renderControls(
    ctx: CanvasRenderingContext2D,
    styleOverride: TStyleOverride = {},
  ) {
    const { hasBorders, hasControls } = this;
    const styleOptions = {
      hasBorders,
      hasControls,
      ...styleOverride,
    };
    const vpt = this.getViewportTransform(),
      shouldDrawBorders = styleOptions.hasBorders,
      shouldDrawControls = styleOptions.hasControls;
    const matrix = multiplyTransformMatrices(vpt, this.calcTransformMatrix());
    const options = qrDecompose(matrix);
    ctx.save();
    ctx.translate(options.translateX, options.translateY);
    ctx.lineWidth = this.borderScaleFactor; // 1 * this.borderScaleFactor;
    // since interactive groups have been introduced, an object could be inside a group and needing controls
    // the following equality check `this.group === this.parent` covers:
    // object without a group ( undefined === undefined )
    // object inside a group
    // excludes object inside a group but multi selected since group and parent will differ in value
    if (this.group === this.parent) {
      ctx.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
    }
    if (this.flipX) {
      options.angle -= 180;
    }
    ctx.rotate(degreesToRadians(this.group ? options.angle : this.angle));
    shouldDrawBorders && this.drawBorders(ctx, options, styleOverride);
    shouldDrawControls && this.drawControls(ctx, styleOverride);
    ctx.restore();
  }

  /**
   * 绘制对象边界框的边框。
   * 需要公共属性：width, height
   * 需要公共选项：padding, borderColor
   *
   * Draws borders of an object's bounding box.
   * Requires public properties: width, height
   * Requires public options: padding, borderColor
   * @param {CanvasRenderingContext2D} ctx Context to draw on
   * @param {object} options object representing current object parameters
   * @param {TStyleOverride} [styleOverride] object to override the object style
   */
  drawBorders(
    ctx: CanvasRenderingContext2D,
    options: TQrDecomposeOut,
    styleOverride: TStyleOverride,
  ): void {
    let size;
    if ((styleOverride && styleOverride.forActiveSelection) || this.group) {
      const bbox = sizeAfterTransform(
          this.width,
          this.height,
          calcDimensionsMatrix(options),
        ),
        stroke = !this.isStrokeAccountedForInDimensions()
          ? (this.strokeUniform
              ? new Point().scalarAdd(this.canvas ? this.canvas.getZoom() : 1)
              : // this is extremely confusing. options comes from the upper function
                // and is the qrDecompose of a matrix that takes in account zoom too
                new Point(options.scaleX, options.scaleY)
            ).scalarMultiply(this.strokeWidth)
          : ZERO;
      size = bbox
        .add(stroke)
        .scalarAdd(this.borderScaleFactor)
        .scalarAdd(this.padding * 2);
    } else {
      size = this._calculateCurrentDimensions().scalarAdd(
        this.borderScaleFactor,
      );
    }
    this._drawBorders(ctx, size, styleOverride);
  }

  /**
   * 从对象边界框的边框绘制线条到设置了 `withConnection` 属性的控件。
   * 需要公共属性：width, height
   * 需要公共选项：padding, borderColor
   *
   * Draws lines from a borders of an object's bounding box to controls that have `withConnection` property set.
   * Requires public properties: width, height
   * Requires public options: padding, borderColor
   * @param {CanvasRenderingContext2D} ctx Context to draw on
   * @param {Point} size object size x = width, y = height
   */
  drawControlsConnectingLines(
    ctx: CanvasRenderingContext2D,
    size: Point,
  ): void {
    let shouldStroke = false;

    ctx.beginPath();
    this.forEachControl((control, key) => {
      // in this moment, the ctx is centered on the object.
      // width and height of the above function are the size of the bbox.
      if (control.withConnection && control.getVisibility(this, key)) {
        // reset movement for each control
        shouldStroke = true;
        ctx.moveTo(control.x * size.x, control.y * size.y);
        ctx.lineTo(
          control.x * size.x + control.offsetX,
          control.y * size.y + control.offsetY,
        );
      }
    });
    shouldStroke && ctx.stroke();
  }

  /**
   * 绘制对象边界框的角。
   * 需要公共属性：width, height
   * 需要公共选项：cornerSize, padding
   * 请注意，自 fabric 6.0 起，此函数不再调用 setCoords。
   * 如果我们要渲染控件的对象在标准选择和变换过程之外，则需要手动调用 setCoords。
   *
   * Draws corners of an object's bounding box.
   * Requires public properties: width, height
   * Requires public options: cornerSize, padding
   * Be aware that since fabric 6.0 this function does not call setCoords anymore.
   * setCoords needs to be called manually if the object of which we are rendering controls
   * is outside the standard selection and transform process.
   * @param {CanvasRenderingContext2D} ctx Context to draw on
   * @param {ControlRenderingStyleOverride} styleOverride object to override the object style
   */
  drawControls(
    ctx: CanvasRenderingContext2D,
    styleOverride: ControlRenderingStyleOverride = {},
  ) {
    ctx.save();
    const retinaScaling = this.getCanvasRetinaScaling();
    const { cornerStrokeColor, cornerDashArray, cornerColor } = this;
    const options = {
      cornerStrokeColor,
      cornerDashArray,
      cornerColor,
      ...styleOverride,
    };
    ctx.setTransform(retinaScaling, 0, 0, retinaScaling, 0, 0);
    ctx.strokeStyle = ctx.fillStyle = options.cornerColor;
    if (!this.transparentCorners) {
      ctx.strokeStyle = options.cornerStrokeColor;
    }
    this._setLineDash(ctx, options.cornerDashArray);
    this.forEachControl((control, key) => {
      if (control.getVisibility(this, key)) {
        const p = this.oCoords[key];
        control.render(ctx, p.x, p.y, options, this);
      }
    });
    ctx.restore();
  }

  /**
   * 如果指定的控件可见，则返回 true，否则返回 false。
   *
   * Returns true if the specified control is visible, false otherwise.
   * @param {string} controlKey The key of the control. Possible values are usually 'tl', 'tr', 'br', 'bl', 'ml', 'mt', 'mr', 'mb', 'mtr',
   * but since the control api allow for any control name, can be any string.
   * @returns {boolean} true if the specified control is visible, false otherwise
   */
  isControlVisible(controlKey: string): boolean {
    return (
      this.controls[controlKey] &&
      this.controls[controlKey].getVisibility(this, controlKey)
    );
  }

  /**
   * 设置指定控件的可见性。
   * 请不要使用。
   *
   * Sets the visibility of the specified control.
   * please do not use.
   * @param {String} controlKey The key of the control. Possible values are 'tl', 'tr', 'br', 'bl', 'ml', 'mt', 'mr', 'mb', 'mtr'.
   * but since the control api allow for any control name, can be any string.
   * @param {Boolean} visible true to set the specified control visible, false otherwise
   * @todo discuss this overlap of priority here with the team. Andrea Bogazzi for details
   */
  setControlVisible(controlKey: string, visible: boolean) {
    if (!this._controlsVisibility) {
      this._controlsVisibility = {};
    }
    this._controlsVisibility[controlKey] = visible;
  }

  /**
   * 设置对象控件的可见性状态，这只是 setControlVisible 的批量选项；
   *
   * Sets the visibility state of object controls, this is just a bulk option for setControlVisible;
   * @param {Record<string, boolean>} [options] with an optional key per control
   * example: {Boolean} [options.bl] true to enable the bottom-left control, false to disable it
   */
  setControlsVisibility(options: Record<string, boolean> = {}) {
    Object.entries(options).forEach(([controlKey, visibility]) =>
      this.setControlVisible(controlKey, visibility),
    );
  }

  /**
   * 清除 canvas.contextTop 中对应于 canvas.contextContainer 中对象边界框的特定区域。
   * 此函数用于清除 contextTop 中我们在对象顶部渲染临时效果的部分。
   * 例如：闪烁的光标文本选择，拖动效果。
   * @todo discuss swapping restoreManually with a renderCallback, but think of async issues
   *
   * Clears the canvas.contextTop in a specific area that corresponds to the object's bounding box
   * that is in the canvas.contextContainer.
   * This function is used to clear pieces of contextTop where we render ephemeral effects on top of the object.
   * Example: blinking cursor text selection, drag effects.
   * @todo discuss swapping restoreManually with a renderCallback, but think of async issues
   * @param {Boolean} [restoreManually] When true won't restore the context after clear, in order to draw something else.
   * @return {CanvasRenderingContext2D|undefined} canvas.contextTop that is either still transformed
   * with the object transformMatrix, or restored to neutral transform
   */
  clearContextTop(
    restoreManually?: boolean,
  ): CanvasRenderingContext2D | undefined {
    if (!this.canvas) {
      return;
    }
    const ctx = this.canvas.contextTop;
    if (!ctx) {
      return;
    }
    const v = this.canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    this.transform(ctx);
    // we add 4 pixel, to be sure to do not leave any pixel out
    const width = this.width + 4,
      height = this.height + 4;
    ctx.clearRect(-width / 2, -height / 2, width, height);

    restoreManually || ctx.restore();
    return ctx;
  }

  /**
   * 每次 _discardActiveObject 或 _setActiveObject 尝试取消选择此对象时都会调用此回调函数。
   * 如果函数返回 true，则取消该过程
   *
   * This callback function is called every time _discardActiveObject or _setActiveObject
   * try to to deselect this object. If the function returns true, the process is cancelled
   * @param {Object} [_options] options sent from the upper functions
   * @param {TPointerEvent} [options.e] event if the process is generated by an event
   * @param {FabricObject} [options.object] next object we are setting as active, and reason why
   * this is being deselected
   */
  onDeselect(_options?: {
    e?: TPointerEvent;
    object?: InteractiveFabricObject;
  }): boolean {
    // implemented by sub-classes, as needed.
    return false;
  }

  /**
   * 每次 _discardActiveObject 或 _setActiveObject 尝试选择此对象时都会调用此回调函数。
   * 如果函数返回 true，则取消该过程
   *
   * This callback function is called every time _discardActiveObject or _setActiveObject
   * try to to select this object. If the function returns true, the process is cancelled
   * @param {Object} [_options] options sent from the upper functions
   * @param {Event} [_options.e] event if the process is generated by an event
   */
  onSelect(_options?: { e?: TPointerEvent }): boolean {
    // implemented by sub-classes, as needed.
    return false;
  }

  /**
   * 重写以自定义拖动行为
   * 从 {@link Canvas#_onMouseMove} 触发
   *
   * Override to customize Drag behavior
   * Fired from {@link Canvas#_onMouseMove}
   * @returns true in order for the window to start a drag session
   */
  shouldStartDragging(_e: TPointerEvent) {
    return false;
  }

  /**
   * 重写以自定义拖动行为
   * 一旦拖动会话开始就触发
   *
   * Override to customize Drag behavior\
   * Fired once a drag session has started
   * @returns true to handle the drag event
   */
  onDragStart(_e: DragEvent) {
    return false;
  }

  /**
   * 重写以自定义拖放行为
   *
   * Override to customize drag and drop behavior
   * @public
   * @param {DragEvent} _e
   * @returns {boolean} true if the object currently dragged can be dropped on the target
   */
  canDrop(_e: DragEvent): boolean {
    return false;
  }

  /**
   * 重写以自定义拖放行为
   * 当对象是拖动事件的源时渲染特定效果
   * 例如：渲染从文本对象拖动的文本部分的选中状态
   *
   * Override to customize drag and drop behavior
   * render a specific effect when an object is the source of a drag event
   * example: render the selection status for the part of text that is being dragged from a text object
   * @public
   * @param {DragEvent} _e
   */
  renderDragSourceEffect(_e: DragEvent) {
    // for subclasses
  }

  /**
   * 重写以自定义拖放行为
   * 当对象是拖动事件的目标时渲染特定效果
   * 用于显示底层对象可以接收放置，或显示放置时对象将如何更改。例如：显示文本即将放置的位置的光标
   *
   * Override to customize drag and drop behavior
   * render a specific effect when an object is the target of a drag event
   * used to show that the underly object can receive a drop, or to show how the
   * object will change when dropping. example: show the cursor where the text is about to be dropped
   * @public
   * @param {DragEvent} _e
   */
  renderDropTargetEffect(_e: DragEvent) {
    // for subclasses
  }
}
