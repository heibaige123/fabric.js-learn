import type { CSSRules } from './typedefs';

/**
 * 获取给定 SVG 文档的 CSS 规则
 *
 * Returns CSS rules for a given SVG document
 * @param doc 要解析的 SVG 文档
 * @param {HTMLElement} doc SVG document to parse
 * @returns 文档的 CSS 规则
 * @return {Object} CSS rules of this document
 */
export function getCSSRules(doc: Document) {
  /**
   * 样式元素列表
   */
  const styles = doc.getElementsByTagName('style');
  /**
   * 所有 CSS 规则
   */
  const allRules: CSSRules = {};

  // very crude parsing of style contents
  // 非常粗略的样式内容解析
  for (let i = 0; i < styles.length; i++) {
    /**
     * 样式内容
     */
    const styleContents = (styles[i].textContent || '').replace(
      // remove comments
      // 移除注释
      /\/\*[\s\S]*?\*\//g,
      '',
    );

    if (styleContents.trim() === '') {
      continue;
    }
    // recovers all the rule in this form `body { style code... }`
    // 恢复所有形式为 `body { style code... }` 的规则
    // rules = styleContents.match(/[^{]*\{[\s\S]*?\}/g);
    styleContents
      .split('}')
      // remove empty rules and remove everything if we didn't split in at least 2 pieces
      // 移除空规则，如果未拆分为至少 2 部分，则移除所有内容
      .filter((rule, index, array) => array.length > 1 && rule.trim())
      // at this point we have hopefully an array of rules `body { style code... `
      // 此时我们希望有一个规则数组 `body { style code... `
      .forEach((rule) => {
        // if there is more than one opening bracket and the rule starts with '@', it is likely
        // a nested at-rule like @media, @supports, @scope, etc. Ignore these as the code below
        // can not handle it.
        // 如果有多个左大括号且规则以 '@' 开头，则可能是嵌套的 at-rule，如 @media, @supports, @scope 等。
        // 忽略这些，因为下面的代码无法处理它。
        if (
          (rule.match(/{/g) || []).length > 1 &&
          rule.trim().startsWith('@')
        ) {
          return;
        }

        /**
         * 规则匹配结果
         */
        const match = rule.split('{'),
          /**
           * 规则对象
           */
          ruleObj: Record<string, string> = {},
          /**
           * 声明部分
           */
          declaration = match[1].trim(),
          /**
           * 属性值对数组
           */
          propertyValuePairs = declaration.split(';').filter(function (pair) {
            return pair.trim();
          });

        for (let j = 0; j < propertyValuePairs.length; j++) {
          /**
           * 属性值对
           */
          const pair = propertyValuePairs[j].split(':'),
            /**
             * 属性名
             */
            property = pair[0].trim(),
            /**
             * 属性值
             */
            value = pair[1].trim();
          ruleObj[property] = value;
        }
        rule = match[0].trim();
        rule.split(',').forEach((_rule) => {
          _rule = _rule.replace(/^svg/i, '').trim();
          if (_rule === '') {
            return;
          }
          allRules[_rule] = {
            ...(allRules[_rule] || {}),
            ...ruleObj,
          };
        });
      });
  }
  return allRules;
}
