import type { ObjectEvents } from '../../EventTypeDefs';
import type { FabricObjectProps, SerializedObjectProps } from '../Object/types';
import type { TOptions } from '../../typedefs';
import { FabricObject } from '../Object/FabricObject';
import { styleProperties } from './constants';
import type { StylePropertiesType } from './constants';
import type { FabricText } from './Text';
import { pick } from '../../util';
import { pickBy } from '../../util/misc/pick';

/**
 * 完整的文本样式声明类型
 */
export type CompleteTextStyleDeclaration = Pick<
  FabricText,
  StylePropertiesType
>;

/**
 * 文本样式声明类型
 */
export type TextStyleDeclaration = Partial<CompleteTextStyleDeclaration>;

/**
 * 文本样式类型
 */
export type TextStyle = {
  [line: number | string]: { [char: number | string]: TextStyleDeclaration };
};

/**
 * 样式化文本类
 */
export abstract class StyledText<
  Props extends TOptions<FabricObjectProps> = Partial<FabricObjectProps>,
  SProps extends SerializedObjectProps = SerializedObjectProps,
  EventSpec extends ObjectEvents = ObjectEvents,
> extends FabricObject<Props, SProps, EventSpec> {
  /**
   * 文本样式对象
   */
  declare abstract styles: TextStyle;
  /**
   * 文本行数组
   */
  declare protected abstract _textLines: string[][];
  /**
   * 强制清除缓存标志
   */
  declare protected _forceClearCache: boolean;
  /**
   * 样式属性数组
   */
  static _styleProperties: Readonly<StylePropertiesType[]> = styleProperties;
  /**
   * 获取二维光标位置
   * @param selectionStart 选择起始索引
   * @param skipWrapping 是否跳过换行处理
   * @return {Object} 包含字符索引和行索引的对象
   */
  abstract get2DCursorLocation(
    selectionStart: number,
    skipWrapping?: boolean,
  ): { charIndex: number; lineIndex: number };

  /**
   * 如果对象没有样式或行中没有样式，则返回 true
   * @param {Number} lineIndex 行索引，lineIndex 是在换行后的行上。
   * @return {Boolean}
   *
   * Returns true if object has no styling or no styling in a line
   * @param {Number} lineIndex , lineIndex is on wrapped lines.
   * @return {Boolean}
   */
  isEmptyStyles(lineIndex?: number): boolean {
    if (!this.styles) {
      return true;
    }
    if (typeof lineIndex !== 'undefined' && !this.styles[lineIndex]) {
      return true;
    }
    const obj =
      typeof lineIndex === 'undefined'
        ? this.styles
        : { line: this.styles[lineIndex] };
    for (const p1 in obj) {
      for (const p2 in obj[p1]) {
        // eslint-disable-next-line no-unused-vars
        for (const p3 in obj[p1][p2]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 如果对象具有样式属性或在指定行中具有该属性，则返回 true
   * 此函数用于检测文本是否将使用特定属性。
   * @param {String} property 要检查的属性
   * @param {Number} lineIndex 要检查样式的行索引
   * @return {Boolean}
   *
   * Returns true if object has a style property or has it ina specified line
   * This function is used to detect if a text will use a particular property or not.
   * @param {String} property to check for
   * @param {Number} lineIndex to check the style on
   * @return {Boolean}
   */
  styleHas(property: keyof TextStyleDeclaration, lineIndex?: number): boolean {
    if (!this.styles) {
      return false;
    }
    if (typeof lineIndex !== 'undefined' && !this.styles[lineIndex]) {
      return false;
    }
    const obj =
      typeof lineIndex === 'undefined'
        ? this.styles
        : { 0: this.styles[lineIndex] };
    // eslint-disable-next-line
    for (const p1 in obj) {
      // eslint-disable-next-line
      for (const p2 in obj[p1]) {
        if (typeof obj[p1][p2][property] !== 'undefined') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查文本中的字符是否具有与文本框该属性值匹配的属性值。
   * 如果匹配，则删除字符级属性。
   * 如果字符没有其他属性，则也将其删除。
   * 最后，如果包含该字符的行没有其他字符，则也将其删除。
   *
   * Check if characters in a text have a value for a property
   * whose value matches the textbox's value for that property.  If so,
   * the character-level property is deleted.  If the character
   * has no other properties, then it is also deleted.  Finally,
   * if the line containing that character has no other characters
   * then it also is deleted.
   */
  cleanStyle(property: keyof TextStyleDeclaration) {
    if (!this.styles) {
      return false;
    }
    const obj = this.styles;
    let stylesCount = 0,
      letterCount,
      stylePropertyValue,
      allStyleObjectPropertiesMatch = true,
      graphemeCount = 0;
    for (const p1 in obj) {
      letterCount = 0;
      for (const p2 in obj[p1]) {
        const styleObject = obj[p1][p2] || {},
          stylePropertyHasBeenSet = styleObject[property] !== undefined;

        stylesCount++;

        if (stylePropertyHasBeenSet) {
          if (!stylePropertyValue) {
            stylePropertyValue = styleObject[property];
          } else if (styleObject[property] !== stylePropertyValue) {
            allStyleObjectPropertiesMatch = false;
          }

          if (styleObject[property] === this[property as keyof this]) {
            delete styleObject[property];
          }
        } else {
          allStyleObjectPropertiesMatch = false;
        }

        if (Object.keys(styleObject).length !== 0) {
          letterCount++;
        } else {
          delete obj[p1][p2];
        }
      }

      if (letterCount === 0) {
        delete obj[p1];
      }
    }
    // if every grapheme has the same style set then
    // delete those styles and set it on the parent
    for (let i = 0; i < this._textLines.length; i++) {
      graphemeCount += this._textLines[i].length;
    }
    if (allStyleObjectPropertiesMatch && stylesCount === graphemeCount) {
      this[property as keyof this] = stylePropertyValue as any;
      this.removeStyle(property);
    }
  }

  /**
   * 从文本对象中的所有单个字符样式中删除一个或多个样式属性。
   * 如果字符样式对象不包含其他样式属性，则将其删除。
   * 如果行样式对象不包含其他字符样式，则将其删除。
   * @param {String} props 要从字符样式中删除的属性。
   *
   * Remove a style property or properties from all individual character styles
   * in a text object.  Deletes the character style object if it contains no other style
   * props.  Deletes a line style object if it contains no other character styles.
   *
   * @param {String} props The property to remove from character styles.
   */
  removeStyle(property: keyof TextStyleDeclaration) {
    if (!this.styles) {
      return;
    }
    const obj = this.styles;
    let line, lineNum, charNum;
    for (lineNum in obj) {
      line = obj[lineNum];
      for (charNum in line) {
        delete line[charNum][property];
        if (Object.keys(line[charNum]).length === 0) {
          delete line[charNum];
        }
      }
      if (Object.keys(line).length === 0) {
        delete obj[lineNum];
      }
    }
  }

  /**
   * 扩展给定索引处的样式对象
   * @param index  字符索引
   * @param style  样式对象
   */
  private _extendStyles(index: number, style: TextStyleDeclaration): void {
    const { lineIndex, charIndex } = this.get2DCursorLocation(index);

    if (!this._getLineStyle(lineIndex)) {
      this._setLineStyle(lineIndex);
    }

    const newStyle = pickBy(
      {
        // first create a new object that is a merge of existing and new
        ...this._getStyleDeclaration(lineIndex, charIndex),
        ...style,
        // use the predicate to discard undefined values
      },
      (value) => value !== undefined,
    );

    // finally assign to the old position the new style
    this._setStyleDeclaration(lineIndex, charIndex, newStyle);
  }

  /**
   * 获取当前选择/光标（在起始位置）的样式
   * @param {Number} startIndex 获取样式的起始索引
   * @param {Number} endIndex 获取样式的结束索引，如果未指定则为 startIndex + 1
   * @param {Boolean} [complete] 是否获取完整样式
   * @return {Array} styles 包含一个、零个或多个样式对象的数组
   *
   * Gets style of a current selection/cursor (at the start position)
   * @param {Number} startIndex Start index to get styles at
   * @param {Number} endIndex End index to get styles at, if not specified startIndex + 1
   * @param {Boolean} [complete] get full style or not
   * @return {Array} styles an array with one, zero or more Style objects
   */
  getSelectionStyles(
    startIndex: number,
    endIndex?: number,
    complete?: boolean,
  ): TextStyleDeclaration[] {
    const styles: TextStyleDeclaration[] = [];
    for (let i = startIndex; i < (endIndex || startIndex); i++) {
      styles.push(this.getStyleAtPosition(i, complete));
    }
    return styles;
  }

  /**
   * 获取当前选择/光标位置的样式
   * @param {Number} position 获取样式的位置
   * @param {Boolean} [complete] 如果为 true 则为完整样式
   * @return {Object} style 指定索引处的样式对象
   * @private
   *
   * Gets style of a current selection/cursor position
   * @param {Number} position  to get styles at
   * @param {Boolean} [complete] full style if true
   * @return {Object} style Style object at a specified index
   * @private
   */
  getStyleAtPosition(position: number, complete?: boolean) {
    const { lineIndex, charIndex } = this.get2DCursorLocation(position);
    return complete
      ? this.getCompleteStyleDeclaration(lineIndex, charIndex)
      : this._getStyleDeclaration(lineIndex, charIndex);
  }

  /**
   * 设置当前选择的样式，如果不存在选择，则不设置任何内容。
   * @param {Object} styles 样式对象
   * @param {Number} startIndex 获取样式的起始索引
   * @param {Number} [endIndex] 获取样式的结束索引，如果未指定则为 startIndex + 1
   *
   * Sets style of a current selection, if no selection exist, do not set anything.
   * @param {Object} styles Styles object
   * @param {Number} startIndex Start index to get styles at
   * @param {Number} [endIndex] End index to get styles at, if not specified startIndex + 1
   */
  setSelectionStyles(styles: object, startIndex: number, endIndex?: number) {
    for (let i = startIndex; i < (endIndex || startIndex); i++) {
      this._extendStyles(i, styles);
    }
    /* not included in _extendStyles to avoid clearing cache more than once */
    this._forceClearCache = true;
  }

  /**
   * 获取给定字符的样式对象的引用（不是克隆），
   * 如果没有为行或字符设置样式，则返回一个新的空对象。
   * 这很棘手且令人困惑，因为当您获得一个空对象时，您无法确定它是引用还是新对象。
   * @TODO 这应该始终返回引用或始终返回克隆，或者在必要时返回 undefined。
   * @protected
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @return {TextStyleDeclaration} 现有样式对象的引用，或者当未定义时返回新的空对象
   *
   * Get a reference, not a clone, to the style object for a given character,
   * if no style is set for a line or char, return a new empty object.
   * This is tricky and confusing because when you get an empty object you can't
   * determine if it is a reference or a new one.
   * @TODO this should always return a reference or always a clone or undefined when necessary.
   * @protected
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @return {TextStyleDeclaration} a style object reference to the existing one or a new empty object when undefined
   */
  _getStyleDeclaration(
    lineIndex: number,
    charIndex: number,
  ): TextStyleDeclaration {
    const lineStyle = this.styles && this.styles[lineIndex];
    return lineStyle ? (lineStyle[charIndex] ?? {}) : {};
  }

  /**
   * 返回一个包含字符所有样式属性的新对象
   * 返回的对象是新创建的
   * @param {Number} lineIndex 字符所在行的索引
   * @param {Number} charIndex 字符在行上的位置
   * @return {Object} 样式对象
   *
   * return a new object that contains all the style property for a character
   * the object returned is newly created
   * @param {Number} lineIndex of the line where the character is
   * @param {Number} charIndex position of the character on the line
   * @return {Object} style object
   */
  getCompleteStyleDeclaration(
    lineIndex: number,
    charIndex: number,
  ): CompleteTextStyleDeclaration {
    return {
      ...pick(
        this,
        (this.constructor as typeof StyledText)
          ._styleProperties as (keyof this)[],
      ),
      ...this._getStyleDeclaration(lineIndex, charIndex),
    } as CompleteTextStyleDeclaration;
  }

  /**
   * 在给定索引处设置样式对象
   *
   * @param {Number} lineIndex 行索引
   * @param {Number} charIndex 字符索引
   * @param {Object} style 样式对象
   * @private
   */
  protected _setStyleDeclaration(
    lineIndex: number,
    charIndex: number,
    style: object,
  ) {
    this.styles[lineIndex][charIndex] = style;
  }

  /**
   * 删除给定索引处的样式对象
   *
   * @param {Number} lineIndex 行索引
   * @param {Number} charIndex 字符索引
   * @private
   */
  protected _deleteStyleDeclaration(lineIndex: number, charIndex: number) {
    delete this.styles[lineIndex][charIndex];
  }

  /**
   * 检查行样式是否存在
   *
   * @param {Number} lineIndex
   * @return {Boolean} 行是否存在
   * @private
   *
   * @param {Number} lineIndex
   * @return {Boolean} if the line exists or not
   * @private
   */
  protected _getLineStyle(lineIndex: number): boolean {
    return !!this.styles[lineIndex];
  }

  /**
   * 将行样式设置为空对象以便初始化
   * @param {Number} lineIndex
   * @private
   *
   * Set the line style to an empty object so that is initialized
   * @param {Number} lineIndex
   * @private
   */
  protected _setLineStyle(lineIndex: number) {
    this.styles[lineIndex] = {};
  }

  /**
   * 删除给定索引处的行样式对象
   * @param lineIndex  行索引
   */
  protected _deleteLineStyle(lineIndex: number) {
    delete this.styles[lineIndex];
  }
}
