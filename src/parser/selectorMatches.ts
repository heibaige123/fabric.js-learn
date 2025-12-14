/**
 * 检查元素是否匹配给定的选择器
 * @param element 要检查的元素
 * @param selector 选择器字符串
 * @returns 如果匹配则返回 true，否则返回 false
 */
export function selectorMatches(
  element: HTMLElement | SVGElement,
  selector: string,
) {
  const nodeName = element.nodeName;
  const classNames = element.getAttribute('class');
  const id = element.getAttribute('id');
  const azAz = '(?![a-zA-Z\\-]+)';
  let matcher;
  // i check if a selector matches slicing away part from it.
  // if i get empty string i should match
  matcher = new RegExp('^' + nodeName, 'i');
  selector = selector.replace(matcher, '');
  if (id && selector.length) {
    matcher = new RegExp('#' + id + azAz, 'i');
    selector = selector.replace(matcher, '');
  }
  if (classNames && selector.length) {
    const splitClassNames = classNames.split(' ');
    for (let i = splitClassNames.length; i--; ) {
      matcher = new RegExp('\\.' + splitClassNames[i] + azAz, 'i');
      selector = selector.replace(matcher, '');
    }
  }
  return selector.length === 0;
}
