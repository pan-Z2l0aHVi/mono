/**
 * 过滤掉 OverlayScrollbars 自己的常驻动画，留下宿主链条上的那些。
 *
 * 组件内部滚动容器被接管后，滚动条元素常驻 CSS 过渡、尺寸观察元素还挂着一个 1ms 的入场动画，
 * 两者都不会随时间消失。于是「动画清空」这个信号永不成立：以它为判据的轮询会一直等到超时。
 * 这些动画与宿主是否收敛无关。
 */
function isHostAnimation(animation: Animation): boolean {
  const target = (animation.effect as KeyframeEffect | null)?.target
  return !(target instanceof Element && target.closest('[data-overlayscrollbars], [data-overlayscrollbars-viewport]'))
}

/**
 * 宿主子树里**属于宿主自己**的动画，用于等「打开/关闭过渡收敛」。
 *
 * 单独建模块而不是写进 `test-utils/index.ts`：`real-gesture.ts` 只在 browser mode 下可用，
 * 这里保持同样的可单独引用性。
 */
export function hostAnimations(root: Element): Animation[] {
  return root.getAnimations({ subtree: true }).filter(isHostAnimation)
}

/**
 * 同 `hostAnimations`，但面向 `document.getAnimations()`。
 *
 * `document.getAnimations()` 与元素上的 `{ subtree: true }` 不是一回事：它**会**穿进 shadow root，
 * 因此抽屉里的滚动条动画也在集合里。要等「整页动画收敛」的地方用它。
 */
export function documentHostAnimations(): Animation[] {
  return document.getAnimations().filter(isHostAnimation)
}
