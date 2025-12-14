//@ts-nocheck
import { Point } from '../Point';
import { FabricObject } from '../shapes/Object/FabricObject';
import { uid } from '../util/internals/uid';

(function (global) {
  /** ERASER_START */

  /**
   * 扩展 Fabric 对象以支持橡皮擦功能
   */
  var fabric = global.fabric,
    /**
     * 在剪切路径上方绘制橡皮擦
     */
    __drawClipPath = fabric.Object.prototype._drawClipPath;
  /**
   * 唯一标识符生成器
   */
  var _needsItsOwnCache = fabric.Object.prototype.needsItsOwnCache;
  /**
   *  返回实例的对象表示
   */
  var _toObject = fabric.Object.prototype.toObject;
  /**
   * 返回 svg 输出的 id 属性
   */
  var _getSvgCommons = fabric.Object.prototype.getSvgCommons;
  /**
   * 创建基本的剪切路径 SVG 标记
   */
  var __createBaseClipPathSVGMarkup =
    fabric.Object.prototype._createBaseClipPathSVGMarkup;
  /**
   * 创建基本的 SVG 标记
   */
  var __createBaseSVGMarkup = fabric.Object.prototype._createBaseSVGMarkup;

  fabric.Object.prototype.cacheProperties.push('eraser');
  fabric.Object.prototype.stateProperties.push('eraser');

  /**
   * @fires erasing:end
   */
  fabric.util.object.extend(fabric.Object.prototype, {
    /**
     * 指示此对象是否可以被 {@link fabric.EraserBrush} 擦除
     * `deep` 选项引入了对组 `erasable` 属性的细粒度控制。
     * 当设置为 `deep` 时，如果嵌套对象是可擦除的，橡皮擦将擦除它们，而保留组和其他对象不变。
     * 当设置为 `true` 时，橡皮擦将擦除整个组。一旦组发生变化，橡皮擦将传播到其子项以实现正确的功能。
     * 当设置为 `false` 时，橡皮擦将保留所有对象（包括组）不变。
     *
     * Indicates whether this object can be erased by {@link fabric.EraserBrush}
     * The `deep` option introduces fine grained control over a group's `erasable` property.
     * When set to `deep` the eraser will erase nested objects if they are erasable, leaving the group and the other objects untouched.
     * When set to `true` the eraser will erase the entire group. Once the group changes the eraser is propagated to its children for proper functionality.
     * When set to `false` the eraser will leave all objects including the group untouched.
     * @see {@link http://fabric5.fabricjs.com/erasing#erasable_property}
     * @type boolean | 'deep'
     * @default true
     */
    erasable: true,

    /**
     * 橡皮擦对象
     *
     * @see {@link http://fabric5.fabricjs.com/erasing#eraser}
     * @type fabric.Eraser
     */
    eraser: undefined,

    /**
     * 检查对象是否需要自己的缓存
     * @override
     * @returns 如果需要自己的缓存则返回 true
     *
     * @override
     * @returns Boolean
     */
    needsItsOwnCache: function () {
      return _needsItsOwnCache.call(this) || !!this.eraser;
    },

    /**
     * 在剪切路径上方绘制橡皮擦
     * @override
     * @private
     * @param ctx 渲染上下文
     * @param clipPath 剪切路径对象
     *
     * draw eraser above clip path
     * @override
     * @private
     * @param {CanvasRenderingContext2D} ctx
     * @param {fabric.Object} clipPath
     */
    _drawClipPath: function (ctx, clipPath) {
      __drawClipPath.call(this, ctx, clipPath);
      if (this.eraser) {
        //  update eraser size to match instance
        var size = this._getNonTransformedDimensions();
        this.eraser.isType('eraser') &&
          this.eraser.set({
            width: size.x,
            height: size.y,
          });
        __drawClipPath.call(this, ctx, this.eraser);
      }
    },

    /**
     * 返回实例的对象表示
     * @param propertiesToInclude 您可能希望在输出中额外包含的任何属性
     * @returns 实例的对象表示
     *
     * Returns an object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} Object representation of an instance
     */
    toObject: function (propertiesToInclude) {
      var object = _toObject.call(
        this,
        ['erasable'].concat(propertiesToInclude),
      );
      if (this.eraser && !this.eraser.excludeFromExport) {
        object.eraser = this.eraser.toObject(propertiesToInclude);
      }
      return object;
    },

    /* _TO_SVG_START_ */
    /**
     * 返回 svg 输出的 id 属性
     * @override
     * @returns id 属性字符串
     *
     * Returns id attribute for svg output
     * @override
     * @return {String}
     */
    getSvgCommons: function () {
      return (
        _getSvgCommons.call(this) +
        (this.eraser ? 'mask="url(#' + this.eraser.clipPathId + ')" ' : '')
      );
    },

    /**
     * 为橡皮擦创建 svg 标记
     * 使用 <mask> 实现 svg 的擦除，致谢：https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
     * 必须在对象标记创建之前调用，因为它依赖于掩码的 `clipPathId` 属性
     * @param reviver 用于进一步解析 svg 表示的方法
     * @returns svg 标记字符串
     *
     * create svg markup for eraser
     * use <mask> to achieve erasing for svg, credit: https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
     * must be called before object markup creation as it relies on the `clipPathId` property of the mask
     * @param {Function} [reviver]
     * @returns
     */
    _createEraserSVGMarkup: function (reviver) {
      if (this.eraser) {
        this.eraser.clipPathId = 'MASK_' + uid();
        return [
          '<mask id="',
          this.eraser.clipPathId,
          '" >',
          this.eraser.toSVG(reviver),
          '</mask>',
          '\n',
        ].join('');
      }
      return '';
    },

    /**
     * 创建基本的剪切路径 SVG 标记
     * @private
     * @param objectMarkup 对象标记
     * @param options 选项
     * @returns SVG 标记字符串
     *
     * @private
     */
    _createBaseClipPathSVGMarkup: function (objectMarkup, options) {
      return [
        this._createEraserSVGMarkup(options && options.reviver),
        __createBaseClipPathSVGMarkup.call(this, objectMarkup, options),
      ].join('');
    },

    /**
     * 创建基本的 SVG 标记
     * @private
     * @param objectMarkup 对象标记
     * @param options 选项
     * @returns SVG 标记字符串
     *
     * @private
     */
    _createBaseSVGMarkup: function (objectMarkup, options) {
      return [
        this._createEraserSVGMarkup(options && options.reviver),
        __createBaseSVGMarkup.call(this, objectMarkup, options),
      ].join('');
    },
    /* _TO_SVG_END_ */
  });

  fabric.util.object.extend(fabric.Group.prototype, {
    /**
     * 将橡皮擦路径添加到对象
     * @private
     * @param path 橡皮擦路径
     * @returns Promise<fabric.Path[]>
     *
     * @private
     * @param {fabric.Path} path
     * @returns {Promise<fabric.Path[]>}
     */
    _addEraserPathToObjects: function (path) {
      return Promise.all(
        this._objects.map(function (object) {
          return fabric.EraserBrush.prototype._addPathToObjectEraser.call(
            fabric.EraserBrush.prototype,
            object,
            path,
          );
        }),
      );
    },

    /**
     * 将组的橡皮擦应用于其对象
     * @see {@link http://fabric5.fabricjs.com/erasing#erasable_property}
     * @returns Promise<fabric.Path[]|fabric.Path[][]|void>
     *
     * Applies the group's eraser to its objects
     * @see {@link http://fabric5.fabricjs.com/erasing#erasable_property}
     * @returns {Promise<fabric.Path[]|fabric.Path[][]|void>}
     */
    applyEraserToObjects: function () {
      var _this = this,
        eraser = this.eraser;
      return Promise.resolve().then(function () {
        if (eraser) {
          delete _this.eraser;
          var transform = _this.calcTransformMatrix();
          return eraser.clone().then(function (eraser) {
            var clipPath = _this.clipPath;
            return Promise.all(
              eraser.getObjects('path').map(function (path) {
                //  first we transform the path from the group's coordinate system to the canvas'
                var originalTransform = fabric.util.multiplyTransformMatrices(
                  transform,
                  path.calcTransformMatrix(),
                );
                fabric.util.applyTransformToObject(path, originalTransform);
                return clipPath
                  ? clipPath.clone().then(
                      function (_clipPath) {
                        var eraserPath =
                          fabric.EraserBrush.prototype.applyClipPathToPath.call(
                            fabric.EraserBrush.prototype,
                            path,
                            _clipPath,
                            transform,
                          );
                        return _this._addEraserPathToObjects(eraserPath);
                      },
                      ['absolutePositioned', 'inverted'],
                    )
                  : _this._addEraserPathToObjects(path);
              }),
            );
          });
        }
      });
    },
  });

  /**
   * 对象的橡皮擦
   *
   * An object's Eraser
   * @private
   * @class fabric.Eraser
   */
  fabric.Eraser = fabric.util.createClass(fabric.Group, {
    /**
     * 类型
     * @readonly
     */
    type: 'eraser',

    /**
     * X 轴原点
     */
    originX: 'center',

    /**
     * Y 轴原点
     */
    originY: 'center',

    /**
     * 橡皮擦应保持大小
     * 添加或删除路径时尺寸不应更改
     * 由 {@link fabric.Object#_drawClipPath} 处理
     * @override
     * @private
     *
     * eraser should retain size
     * dimensions should not change when paths are added or removed
     * handled by {@link fabric.Object#_drawClipPath}
     * @override
     * @private
     */
    layout: 'fixed',

    /**
     * 绘制对象
     * @param ctx 渲染上下文
     */
    drawObject: function (ctx) {
      ctx.save();
      ctx.fillStyle = 'black';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
      this.callSuper('drawObject', ctx);
    },

    /* _TO_SVG_START_ */
    /**
     * 返回实例的 svg 表示
     * 使用 <mask> 实现 svg 的擦除，致谢：https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
     * 对于遮罩，我们需要在所有路径之前添加一个白色矩形
     *
     * @param reviver 用于进一步解析 svg 表示的方法
     * @returns 实例的 svg 表示
     *
     * Returns svg representation of an instance
     * use <mask> to achieve erasing for svg, credit: https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
     * for masking we need to add a white rect before all paths
     *
     * @param {Function} [reviver] Method for further parsing of svg representation.
     * @return {String} svg representation of an instance
     */
    _toSVG: function (reviver) {
      var svgString = ['<g ', 'COMMON_PARTS', ' >\n'];
      var x = -this.width / 2,
        y = -this.height / 2;
      var rectSvg = [
        '<rect ',
        'fill="white" ',
        'x="',
        x,
        '" y="',
        y,
        '" width="',
        this.width,
        '" height="',
        this.height,
        '" />\n',
      ].join('');
      svgString.push('\t\t', rectSvg);
      for (var i = 0, len = this._objects.length; i < len; i++) {
        svgString.push('\t\t', this._objects[i].toSVG(reviver));
      }
      svgString.push('</g>\n');
      return svgString;
    },
    /* _TO_SVG_END_ */
  });

  /**
   * 从对象表示返回实例
   * @memberOf fabric.Eraser
   * @param object 用于创建 Eraser 的对象
   * @returns Promise<fabric.Eraser>
   *
   * Returns instance from an object representation
   * @memberOf fabric.Eraser
   * @param {Object} object Object to create an Eraser from
   * @returns {Promise<fabric.Eraser>}
   */
  fabric.Eraser.fromObject = function (object) {
    var objects = object.objects || [],
      options = fabric.util.object.clone(object, true);
    delete options.objects;
    return Promise.all([
      fabric.util.enlivenObjects<FabricObject>(objects),
      fabric.util.enlivenObjectEnlivables(options),
    ]).then(function (enlivedProps) {
      return new fabric.Eraser(
        enlivedProps[0],
        Object.assign(options, enlivedProps[1]),
        true,
      );
    });
  };

  /**
   * 橡皮擦画笔类混入
   */
  var __renderOverlay = fabric.Canvas.prototype._renderOverlay;
  /**
   * @fires erasing:start
   * @fires erasing:end
   */
  fabric.util.object.extend(fabric.Canvas.prototype, {
    /**
     * 由 {@link #renderAll} 使用
     * @returns boolean
     *
     * Used by {@link #renderAll}
     * @returns boolean
     */
    isErasing: function () {
      return (
        this.isDrawingMode &&
        this.freeDrawingBrush &&
        this.freeDrawingBrush.type === 'eraser' &&
        this.freeDrawingBrush._isErasing
      );
    },

    /**
     * 擦除时，画笔会从画布中剪切出擦除路径
     * 所以我们需要在每次渲染时将其渲染在画布顶部
     * @param ctx 渲染上下文
     *
     * While erasing the brush clips out the erasing path from canvas
     * so we need to render it on top of canvas every render
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderOverlay: function (ctx) {
      __renderOverlay.call(this, ctx);
      this.isErasing() && this.freeDrawingBrush._render();
    },
  });

  /**
   * 橡皮擦画笔类
   * 支持选择性擦除，意味着只有可擦除的对象才会受到橡皮擦画笔的影响。
   * 支持 **反向** 擦除，意味着画笔可以“撤消”擦除。
   *
   * 为了支持选择性擦除，画笔会剪切整个画布，
   * 然后使用图案画笔（遮罩）在擦除路径上绘制所有不可擦除的对象。
   * 如果画笔是 **反向** 的，则无需剪切画布。画笔绘制所有可擦除对象，但不带橡皮擦。
   * 这实现了看似只擦除或取消擦除可擦除对象的预期效果。
   * 擦除完成后，创建的路径将添加到所有相交对象的 `eraser` 属性中。
   *
   * 为了更新 EraserBrush，请调用 `preparePattern`。
   * 当画布在擦除期间发生变化（即动画）并且您希望橡皮擦反映这些变化时，这可能会派上用场。
   *
   * EraserBrush class
   * Supports selective erasing meaning that only erasable objects are affected by the eraser brush.
   * Supports **inverted** erasing meaning that the brush can "undo" erasing.
   *
   * In order to support selective erasing, the brush clips the entire canvas
   * and then draws all non-erasable objects over the erased path using a pattern brush so to speak (masking).
   * If brush is **inverted** there is no need to clip canvas. The brush draws all erasable objects without their eraser.
   * This achieves the desired effect of seeming to erase or unerase only erasable objects.
   * After erasing is done the created path is added to all intersected objects' `eraser` property.
   *
   * In order to update the EraserBrush call `preparePattern`.
   * It may come in handy when canvas changes during erasing (i.e animations) and you want the eraser to reflect the changes.
   *
   * @see {@link http://fabric5.fabricjs.com/erasing}
   * @class fabric.EraserBrush
   * @extends fabric.PencilBrush
   * @memberof fabric
   */
  fabric.EraserBrush = fabric.util.createClass(
    fabric.PencilBrush,
    /** @lends fabric.EraserBrush.prototype */ {
      type: 'eraser',

      /**
       * 当设置为 `true` 时，画笔将创建撤消擦除的视觉效果
       *
       * When set to `true` the brush will create a visual effect of undoing erasing
       * @type boolean
       */
      inverted: false,

      /**
       * 用于修复 https://github.com/fabricjs/fabric.js/issues/7984
       * 在剪切主上下文时减小路径宽度，从而使两个上下文的视觉重叠更好
       *
       * Used to fix https://github.com/fabricjs/fabric.js/issues/7984
       * Reduces the path width while clipping the main context, resulting in a better visual overlap of both contexts
       * @type number
       */
      erasingWidthAliasing: 4,

      /**
       * @private
       */
      _isErasing: false,

      /**
       * 检查对象是否可擦除
       * @private
       * @param object 要检查的对象
       * @returns boolean
       *
       * @private
       * @param {fabric.Object} object
       * @returns boolean
       */
      _isErasable: function (object) {
        return object.erasable !== false;
      },

      /**
       * 准备集合遍历
       * @private
       * 旨在支持擦除包含可擦除和不可擦除对象的集合，同时保持对象堆叠顺序。\
       * 迭代集合以允许嵌套的选择性擦除。\
       * 在渲染图案画笔之前准备对象。\
       * 如果画笔 **不是** 反向的，则渲染所有不可擦除的对象。\
       * 如果画笔是反向的，则渲染所有对象，可擦除对象不带橡皮擦。
       * 这将渲染被擦除的部分，就好像它们最初没有被擦除一样，从而实现撤消效果。
       *
       * @param collection 集合
       * @param objects 对象数组
       * @param ctx 渲染上下文
       * @param restorationContext 恢复上下文
       *
       * @private
       * This is designed to support erasing a collection with both erasable and non-erasable objects while maintaining object stacking.\
       * Iterates over collections to allow nested selective erasing.\
       * Prepares objects before rendering the pattern brush.\
       * If brush is **NOT** inverted render all non-erasable objects.\
       * If brush is inverted render all objects, erasable objects without their eraser.
       * This will render the erased parts as if they were not erased in the first place, achieving an undo effect.
       *
       * @param {fabric.Collection} collection
       * @param {fabric.Object[]} objects
       * @param {CanvasRenderingContext2D} ctx
       * @param {{ visibility: fabric.Object[], eraser: fabric.Object[], collection: fabric.Object[] }} restorationContext
       */
      _prepareCollectionTraversal: function (
        collection,
        objects,
        ctx,
        restorationContext,
      ) {
        objects.forEach(function (obj) {
          var dirty = false;
          if (obj.forEachObject && obj.erasable === 'deep') {
            //  traverse
            this._prepareCollectionTraversal(
              obj,
              obj._objects,
              ctx,
              restorationContext,
            );
          } else if (!this.inverted && obj.erasable && obj.visible) {
            //  render only non-erasable objects
            obj.visible = false;
            restorationContext.visibility.push(obj);
            dirty = true;
          } else if (
            this.inverted &&
            obj.erasable &&
            obj.eraser &&
            obj.visible
          ) {
            //  render all objects without eraser
            var eraser = obj.eraser;
            obj.eraser = undefined;
            obj.dirty = true;
            restorationContext.eraser.push([obj, eraser]);
            dirty = true;
          }
          if (dirty && collection instanceof fabric.Object) {
            collection.dirty = true;
            restorationContext.collection.push(collection);
          }
        }, this);
      },

      /**
       * 为擦除画笔准备图案
       * 此图案将在剪切主上下文后绘制在顶部上下文上，
       * 实现仅擦除可擦除对象的视觉效果
       * @private
       * @param objects 覆盖默认行为，传递要在图案上渲染的对象
       *
       * Prepare the pattern for the erasing brush
       * This pattern will be drawn on the top context after clipping the main context,
       * achieving a visual effect of erasing only erasable objects
       * @private
       * @param {fabric.Object[]} [objects]  override default behavior by passing objects to render on pattern
       */
      preparePattern: function (objects) {
        if (!this._patternCanvas) {
          this._patternCanvas = fabric.util.createCanvasElement();
        }
        var canvas = this._patternCanvas;
        objects =
          objects || this.canvas._objectsToRender || this.canvas._objects;
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        var patternCtx = canvas.getContext('2d');
        if (this.canvas._isRetinaScaling()) {
          var retinaScaling = this.canvas.getRetinaScaling();
          this.canvas.__initRetinaScaling(retinaScaling, canvas, patternCtx);
        }
        var backgroundImage = this.canvas.backgroundImage,
          bgErasable = backgroundImage && this._isErasable(backgroundImage),
          overlayImage = this.canvas.overlayImage,
          overlayErasable = overlayImage && this._isErasable(overlayImage);
        if (
          !this.inverted &&
          ((backgroundImage && !bgErasable) || !!this.canvas.backgroundColor)
        ) {
          if (bgErasable) {
            this.canvas.backgroundImage = undefined;
          }
          this.canvas._renderBackground(patternCtx);
          if (bgErasable) {
            this.canvas.backgroundImage = backgroundImage;
          }
        } else if (this.inverted) {
          var eraser = backgroundImage && backgroundImage.eraser;
          if (eraser) {
            backgroundImage.eraser = undefined;
            backgroundImage.dirty = true;
          }
          this.canvas._renderBackground(patternCtx);
          if (eraser) {
            backgroundImage.eraser = eraser;
            backgroundImage.dirty = true;
          }
        }
        patternCtx.save();
        patternCtx.transform.apply(patternCtx, this.canvas.viewportTransform);
        var restorationContext = { visibility: [], eraser: [], collection: [] };
        this._prepareCollectionTraversal(
          this.canvas,
          objects,
          patternCtx,
          restorationContext,
        );
        this.canvas._renderObjects(patternCtx, objects);
        restorationContext.visibility.forEach(function (obj) {
          obj.visible = true;
        });
        restorationContext.eraser.forEach(function (entry) {
          var obj = entry[0],
            eraser = entry[1];
          obj.eraser = eraser;
          obj.dirty = true;
        });
        restorationContext.collection.forEach(function (obj) {
          obj.dirty = true;
        });
        patternCtx.restore();
        if (
          !this.inverted &&
          ((overlayImage && !overlayErasable) || !!this.canvas.overlayColor)
        ) {
          if (overlayErasable) {
            this.canvas.overlayImage = undefined;
          }
          __renderOverlay.call(this.canvas, patternCtx);
          if (overlayErasable) {
            this.canvas.overlayImage = overlayImage;
          }
        } else if (this.inverted) {
          var eraser = overlayImage && overlayImage.eraser;
          if (eraser) {
            overlayImage.eraser = undefined;
            overlayImage.dirty = true;
          }
          __renderOverlay.call(this.canvas, patternCtx);
          if (eraser) {
            overlayImage.eraser = eraser;
            overlayImage.dirty = true;
          }
        }
      },

      /**
       * 设置画笔样式
       * @private
       * @param ctx 渲染上下文
       *
       * Sets brush styles
       * @private
       * @param {CanvasRenderingContext2D} ctx
       */
      _setBrushStyles: function (ctx) {
        this.callSuper('_setBrushStyles', ctx);
        ctx.strokeStyle = 'black';
      },

      /**
       * **自定义**
       *
       * 如果您需要橡皮擦在每次渲染时更新（即在擦除期间进行动画），请通过 **添加** 以下内容来覆盖此方法（性能可能会受到影响）：
       * @example
       * ```
       * if(ctx === this.canvas.contextTop) {
       *  this.preparePattern();
       * }
       * ```
       *
       * **Customiztion**
       *
       * if you need the eraser to update on each render (i.e animating during erasing) override this method by **adding** the following (performance may suffer):
       * @example
       * ```
       * if(ctx === this.canvas.contextTop) {
       *  this.preparePattern();
       * }
       * ```
       *
       * @override fabric.BaseBrush#_saveAndTransform
       * @param {CanvasRenderingContext2D} ctx
       */
      _saveAndTransform: function (ctx) {
        this.callSuper('_saveAndTransform', ctx);
        this._setBrushStyles(ctx);
        ctx.globalCompositeOperation =
          ctx === this.canvas.getContext()
            ? 'destination-out'
            : 'destination-in';
      },

      /**
       * 我们指示 {@link fabric.PencilBrush} 在必要时重新绘制自身
       * @returns boolean
       *
       * We indicate {@link fabric.PencilBrush} to repaint itself if necessary
       * @returns
       */
      needsFullRender: function () {
        return true;
      },

      /**
       * 鼠标按下事件处理
       * @param pointer 指针位置
       * @param options 事件选项
       * @returns
       *
       * @param {Point} pointer
       * @param {fabric.IEvent} options
       * @returns
       */
      onMouseDown: function (pointer, options) {
        if (!this.canvas._isMainEvent(options.e)) {
          return;
        }
        this._prepareForDrawing(pointer);
        // capture coordinates immediately
        // this allows to draw dots (when movement never occurs)
        this._captureDrawingPath(pointer);

        //  prepare for erasing
        this.preparePattern();
        this._isErasing = true;
        this.canvas.fire('erasing:start');
        this._render();
      },

      /**
       * 渲染逻辑：
       * 1. 使用画笔通过在画布顶部渲染来剪切画布（如果 `inverted === true` 则不需要）
       * 2. 在顶部上下文中使用画布图案渲染画笔
       *
       * Rendering Logic:
       * 1. Use brush to clip canvas by rendering it on top of canvas (unnecessary if `inverted === true`)
       * 2. Render brush with canvas pattern on top context
       *
       * @todo provide a better solution to https://github.com/fabricjs/fabric.js/issues/7984
       */
      _render: function () {
        var ctx,
          lineWidth = this.width;
        var t = this.canvas.getRetinaScaling(),
          s = 1 / t;
        //  clip canvas
        ctx = this.canvas.getContext();
        //  a hack that fixes https://github.com/fabricjs/fabric.js/issues/7984 by reducing path width
        //  the issue's cause is unknown at time of writing (@ShaMan123 06/2022)
        if (lineWidth - this.erasingWidthAliasing > 0) {
          this.width = lineWidth - this.erasingWidthAliasing;
          this.callSuper('_render', ctx);
          this.width = lineWidth;
        }
        //  render brush and mask it with pattern
        ctx = this.canvas.contextTop;
        this.canvas.clearContext(ctx);
        ctx.save();
        ctx.scale(s, s);
        ctx.drawImage(this._patternCanvas, 0, 0);
        ctx.restore();
        this.callSuper('_render', ctx);
      },

      /**
       * 创建 fabric.Path 对象
       * @override
       * @private
       * @param pathData 路径数据
       * @returns 添加到画布的路径
       *
       * Creates fabric.Path object
       * @override
       * @private
       * @param {(string|number)[][]} pathData Path data
       * @return {fabric.Path} Path to add on canvas
       * @returns
       */
      createPath: function (pathData) {
        var path = this.callSuper('createPath', pathData);
        path.globalCompositeOperation = this.inverted
          ? 'source-over'
          : 'destination-out';
        path.stroke = this.inverted ? 'white' : 'black';
        return path;
      },

      /**
       * 将剪切路径应用于路径的实用程序。
       * 用于保留嵌套对象中橡皮擦路径的剪切。
       * 当组具有应在对组对象应用擦除之前应用于路径的剪切路径时调用。
       * @param path 画布坐标平面中的橡皮擦路径
       * @param clipPath 要应用于路径的剪切路径
       * @param clipPathContainerTransformMatrix 剪切路径所属对象的变换矩阵
       * @returns 带有剪切路径的路径
       *
       * Utility to apply a clip path to a path.
       * Used to preserve clipping on eraser paths in nested objects.
       * Called when a group has a clip path that should be applied to the path before applying erasing on the group's objects.
       * @param {fabric.Path} path The eraser path in canvas coordinate plane
       * @param {fabric.Object} clipPath The clipPath to apply to the path
       * @param {number[]} clipPathContainerTransformMatrix The transform matrix of the object that the clip path belongs to
       * @returns {fabric.Path} path with clip path
       */
      applyClipPathToPath: function (
        path,
        clipPath,
        clipPathContainerTransformMatrix,
      ) {
        var pathInvTransform = fabric.util.invertTransform(
            path.calcTransformMatrix(),
          ),
          clipPathTransform = clipPath.calcTransformMatrix(),
          transform = clipPath.absolutePositioned
            ? pathInvTransform
            : fabric.util.multiplyTransformMatrices(
                pathInvTransform,
                clipPathContainerTransformMatrix,
              );
        //  when passing down a clip path it becomes relative to the parent
        //  so we transform it acoordingly and set `absolutePositioned` to false
        clipPath.absolutePositioned = false;
        fabric.util.applyTransformToObject(
          clipPath,
          fabric.util.multiplyTransformMatrices(transform, clipPathTransform),
        );
        //  We need to clip `path` with both `clipPath` and it's own clip path if existing (`path.clipPath`)
        //  so in turn `path` erases an object only where it overlaps with all it's clip paths, regardless of how many there are.
        //  this is done because both clip paths may have nested clip paths of their own (this method walks down a collection => this may reccur),
        //  so we can't assign one to the other's clip path property.
        path.clipPath = path.clipPath
          ? fabric.util.mergeClipPaths(clipPath, path.clipPath)
          : clipPath;
        return path;
      },

      /**
       * 将剪切路径应用于路径的实用程序。
       * 用于保留嵌套对象中橡皮擦路径的剪切。
       * 当组具有应在对组对象应用擦除之前应用于路径的剪切路径时调用。
       * @param path 橡皮擦路径
       * @param object 剪切路径所属的对象
       * @returns Promise<fabric.Path>
       *
       * Utility to apply a clip path to a path.
       * Used to preserve clipping on eraser paths in nested objects.
       * Called when a group has a clip path that should be applied to the path before applying erasing on the group's objects.
       * @param {fabric.Path} path The eraser path
       * @param {fabric.Object} object The clipPath to apply to path belongs to object
       * @returns {Promise<fabric.Path>}
       */
      clonePathWithClipPath: function (path, object) {
        var objTransform = object.calcTransformMatrix();
        var clipPath = object.clipPath;
        var _this = this;
        return Promise.all([
          path.clone(),
          clipPath.clone(['absolutePositioned', 'inverted']),
        ]).then(function (clones) {
          return _this.applyClipPathToPath(clones[0], clones[1], objTransform);
        });
      },

      /**
       * 将路径添加到对象的橡皮擦，如有必要，向下遍历对象的后代
       *
       * @public
       * @fires erasing:end on object
       * @param obj 对象
       * @param path 路径
       * @param context 分配被擦除对象的上下文
       * @returns Promise<fabric.Path | fabric.Path[]>
       *
       * @public
       * @fires erasing:end on object
       * @param {fabric.Object} obj
       * @param {fabric.Path} path
       * @param {Object} [context] context to assign erased objects to
       * @returns {Promise<fabric.Path | fabric.Path[]>}
       */
      _addPathToObjectEraser: function (obj, path, context) {
        var _this = this;
        //  object is collection, i.e group
        if (obj.forEachObject && obj.erasable === 'deep') {
          var targets = obj._objects.filter(function (_obj) {
            return _obj.erasable;
          });
          if (targets.length > 0 && obj.clipPath) {
            return this.clonePathWithClipPath(path, obj).then(function (_path) {
              return Promise.all(
                targets.map(function (_obj) {
                  return _this._addPathToObjectEraser(_obj, _path, context);
                }),
              );
            });
          } else if (targets.length > 0) {
            return Promise.all(
              targets.map(function (_obj) {
                return _this._addPathToObjectEraser(_obj, path, context);
              }),
            );
          }
          return;
        }
        //  prepare eraser
        var eraser = obj.eraser;
        if (!eraser) {
          eraser = new fabric.Eraser();
          obj.eraser = eraser;
        }
        //  clone and add path
        return path.clone().then(function (path) {
          // http://fabricjs.com/using-transformations
          var desiredTransform = fabric.util.multiplyTransformMatrices(
            fabric.util.invertTransform(obj.calcTransformMatrix()),
            path.calcTransformMatrix(),
          );
          fabric.util.applyTransformToObject(path, desiredTransform);
          eraser.add(path);
          obj.set('dirty', true);
          obj.fire('erasing:end', {
            path: path,
          });
          if (context) {
            (obj.group ? context.subTargets : context.targets).push(obj);
            //context.paths.set(obj, path);
          }
          return path;
        });
      },

      /**
       * 将橡皮擦路径添加到画布可绘制对象的剪切路径
       *
       * @param source 画布源
       * @param path 路径
       * @param context 分配被擦除对象的上下文
       * @returns Promise<fabric.Path[]|void> 橡皮擦路径
       *
       * @param {fabric.Canvas} source
       * @param {fabric.Canvas} path
       * @param {Object} [context] context to assign erased objects to
       * @returns {Promise<fabric.Path[]|void>} eraser paths
       */
      applyEraserToCanvas: function (path, context) {
        var canvas = this.canvas;
        return Promise.all(
          ['backgroundImage', 'overlayImage'].map(function (prop) {
            var drawable = canvas[prop];
            return (
              drawable &&
              drawable.erasable &&
              this._addPathToObjectEraser(drawable, path).then(function (path) {
                if (context) {
                  context.drawables[prop] = drawable;
                  //context.paths.set(drawable, path);
                }
                return path;
              })
            );
          }, this),
        );
      },

      /**
       * 在 contextTop 画布上绘制路径后，在 mouseup 上
       * 我们使用捕获的点创建一个新的 fabric 路径对象
       * 并将其添加到每个相交的可擦除对象。
       *
       * On mouseup after drawing the path on contextTop canvas
       * we use the points captured to create an new fabric path object
       * and add it to every intersected erasable object.
       */
      _finalizeAndAddPath: function () {
        var ctx = this.canvas.contextTop,
          canvas = this.canvas;
        ctx.closePath();
        if (this.decimate) {
          this._points = this.decimatePoints(this._points, this.decimate);
        }

        // clear
        canvas.clearContext(canvas.contextTop);
        this._isErasing = false;

        var pathData =
          this._points && this._points.length > 1
            ? this.convertPointsToSVGPath(this._points)
            : null;
        if (!pathData || this._isEmptySVGPath(pathData)) {
          canvas.fire('erasing:end');
          // do not create 0 width/height paths, as they are
          // rendered inconsistently across browsers
          // Firefox 4, for example, renders a dot,
          // whereas Chrome 10 renders nothing
          canvas.requestRenderAll();
          return;
        }

        var path = this.createPath(pathData);
        //  needed for `intersectsWithObject`
        path.setCoords();
        //  commense event sequence
        canvas.fire('before:path:created', { path: path });

        // finalize erasing
        var _this = this;
        var context = {
          targets: [],
          subTargets: [],
          //paths: new Map(),
          drawables: {},
        };
        var tasks = canvas._objects.map(function (obj) {
          return (
            obj.erasable &&
            obj.intersectsWithObject(path, true, true) &&
            _this._addPathToObjectEraser(obj, path, context)
          );
        });
        tasks.push(_this.applyEraserToCanvas(path, context));
        return Promise.all(tasks).then(function () {
          //  fire erasing:end
          canvas.fire(
            'erasing:end',
            Object.assign(context, {
              path: path,
            }),
          );

          canvas.requestRenderAll();
          _this._resetShadow();

          // fire event 'path' created
          canvas.fire('path:created', { path: path });
        });
      },
    },
  );

  /** ERASER_END */
})(typeof exports !== 'undefined' ? exports : window);
