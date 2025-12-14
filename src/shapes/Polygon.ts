import { classRegistry } from '../ClassRegistry';
import { Polyline, polylineDefaultValues } from './Polyline';

/**
 * 多边形类
 */
export class Polygon extends Polyline {
  /**
   * 自身默认值
   */
  static ownDefaults = polylineDefaultValues;

  /**
   * 类型
   */
  static type = 'Polygon';

  /**
   * 检查多边形是否是开放的
   * @returns 如果多边形是开放的，则返回 true；否则返回 false
   */
  protected isOpen() {
    return false;
  }
}

classRegistry.setClass(Polygon);
classRegistry.setSVGClass(Polygon);
