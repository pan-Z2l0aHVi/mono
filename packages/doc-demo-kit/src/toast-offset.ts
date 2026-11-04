/** toast 容器据它让出顶部应用外壳的高度。 */
export const TOAST_TOP_OFFSET_PROPERTY = '--wui-toast-top-offset'

const HEADER_SELECTOR = '[slot="header"]'
const BANNER_SELECTOR = '[slot="banner"]'

/** header 底边到视口顶端，向上取整到整像素、不小于 0；header 不存在时按 0 处理。 */
export function toastTopOffsetValue(headerBottom: number | null | undefined): string {
  return `${Math.max(0, Math.ceil(headerBottom ?? 0))}px`
}

export interface ToastTopOffsetHandle {
  /** 重新解析观察目标并补一帧测量：banner 用条件渲染重建，重挂后的元素要重新观察。 */
  refresh: () => void
  /** 断开观察、撤销未执行的帧并清掉属性；可重复调用。 */
  stop: () => void
}

/**
 * 观察 layout 内 `[slot="header"]` 的底边，把结果写进 `--wui-toast-top-offset`。
 *
 * 布局变化、窗口 resize 与整页滚动都合并到同一帧测量；ResizeObserver 同时盯 layout、banner 与
 * header——header 是 sticky，banner 变高只会把它整体下移，layout 宿主尺寸不变，只观察宿主会漏掉
 * 切语种导致 banner 换行这类高度变化。
 *
 * @param readLayout 每次测量/重挂观察时调用，返回 layout 宿主；宿主用 ref 持有元素时传取值函数，
 *   重新挂载后的新元素也能被拿到。
 */
export function observeToastTopOffset(readLayout: () => Element | null | undefined): ToastTopOffsetHandle {
  let frame: number | undefined
  // stop 是终态：卸载后残留的 observer 回调或晚到的 refresh 不能再把属性写回全局样式。
  let stopped = false
  const update = () => {
    const header = readLayout()?.querySelector<HTMLElement>(HEADER_SELECTOR)
    const next = toastTopOffsetValue(header?.getBoundingClientRect().bottom)
    const style = document.documentElement.style
    // 同一个值反复写会让订阅这条自定义属性的样式失效；跨断点与 banner 重挂时值经常不变。
    if (style.getPropertyValue(TOAST_TOP_OFFSET_PROPERTY) !== next) {
      style.setProperty(TOAST_TOP_OFFSET_PROPERTY, next)
    }
  }
  const schedule = () => {
    if (stopped || frame !== undefined) return
    frame = requestAnimationFrame(() => {
      frame = undefined
      update()
    })
  }
  const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
  const observeTargets = () => {
    if (stopped || !resizeObserver) return
    resizeObserver.disconnect()
    const layout = readLayout()
    for (const target of [layout, layout?.querySelector(BANNER_SELECTOR), layout?.querySelector(HEADER_SELECTOR)]) {
      if (target) resizeObserver.observe(target)
    }
  }
  observeTargets()
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('scroll', schedule, { passive: true, capture: true })
  update()

  return {
    refresh: () => {
      observeTargets()
      schedule()
    },
    stop: () => {
      if (stopped) return
      stopped = true
      resizeObserver?.disconnect()
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
        frame = undefined
      }
      // 属性归这个 observer 所有：卸载后不能把它留在全局样式上。
      document.documentElement.style.removeProperty(TOAST_TOP_OFFSET_PROPERTY)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true })
    }
  }
}
