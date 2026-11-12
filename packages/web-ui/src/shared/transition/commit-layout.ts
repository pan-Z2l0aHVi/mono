/** 提交当前布局，让后续样式变化拥有可插值的起点。 */
export function commitLayout(element: HTMLElement): void {
  void element.offsetWidth
}
