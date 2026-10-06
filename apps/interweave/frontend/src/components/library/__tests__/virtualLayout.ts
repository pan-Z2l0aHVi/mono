// @vitest-environment jsdom

/*
 * jsdom 不做布局：元素的 offsetHeight / offsetWidth 恒为 0，window.innerHeight 也是个
 * 与 CSS 无关的常数，window.scrollTo 是空实现，ResizeObserver 不存在。
 *
 * 虚拟滚动恰好把这些变成了硬前提。滚动元素是 window（useWindowVirtualizer），
 * TanStack 的 observeWindowRect 读的就是 window.innerWidth / innerHeight。
 * 少补任何一样，失败方式都不同，而且都不报「行为变了」，只报「算不出来」：
 *
 *   - innerHeight 为 0：calculateRangeImpl 在 outerSize === 0 时把 range 置空，
 *     getVirtualItems() 返回空数组，组件一行都不渲染。整份 spec 报「row xxx not found」。
 *   - 行高为 0：range 的前向扫描 `end < scrollOffset + outerSize` 永不成立，一次把
 *     全部 1000 行放进窗口，虚拟化形同虚设（断言「只渲染窗口内的行」会红）。
 *   - 没有 ResizeObserver：行高永远量不到，itemSizeCache 恒空，总高退回纯估值。
 *   - documentElement.scrollHeight 恒为 0：夹取与扫选边缘滚动算出的上限是 0，
 *     「滚得动」的那几个分支永远不触发。
 *   - scrollTo 是空实现：scrollToIndex 与夹取都不产生位移，涉及滚动位置的断言全红。
 *
 * 所以补的是五样，不是一样。每一样都只补环境缺的那件，不 mock 库的 rect 观测——
 * 那会绕开「外层尺寸决定窗口大小」这条真实逻辑。
 */

/** 虚拟窗口按这个高度计算。真实值由浏览器视口给出，这里只驱动虚拟窗口的算术。 */
export const VIEWPORT_HEIGHT = 600

/**
 * 行的名义高度。jsdom 不做布局，offsetHeight 恒为 0；行高为 0 会让 calculateRangeImpl
 * 的前向扫描永不越过 end < scrollOffset + outerSize 那道条件，一次把 1000 行全放进窗口，
 * 虚拟化就形同虚设。所以这里给行补一个高度。
 */
export const ROW_HEIGHT = 40

/**
 * 未被量到的行按估值参与总高计算。必须与 ResourceList 的 ROW_ESTIMATE 一致，否则
 * 「总高 = 已量行 × 真实行高 + 未量行 × 估值」这条断言会算出另一个数。
 */
export const ROW_ESTIMATE = 64

/**
 * jsdom 没有 ResizeObserver。行的真实高度靠它量出来：没有这个实现，measureElement 量到的
 * 是 0，总高与窗口全按 0 算，虚拟化失去意义（见 ROW_HEIGHT 的说明）。
 *
 * 回调不能同步触发。virtual-core 的 observer 在回调里第一件事就是
 * `if (!node.isConnected) { unobserve; return }`——measureElement 是在 Vue 的函数式 ref
 * 里调用的，那一刻新节点往往还没 attach，同步回调会被当成「节点已消失」而丢弃。
 * 真实的 ResizeObserver 也在微任务之后才交付，所以这里排一个微任务，与真实时序一致。
 */
class StubResizeObserver implements ResizeObserver {
  private readonly targets = new Set<Element>()
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.targets.add(target)
    queueMicrotask(() => this.deliver(target))
  }
  unobserve(target: Element) {
    this.targets.delete(target)
  }
  disconnect() {
    this.targets.clear()
  }
  private deliver(target: Element) {
    if (!this.targets.has(target)) return
    const height = target.hasAttribute('data-index') || target.hasAttribute('data-resource-row') ? ROW_HEIGHT : 0
    const size = { inlineSize: 800, blockSize: height, x: 0, y: 0, toJSON: () => size }
    // borderBoxSize 必须给：measureElement 见到它就直接取 blockSize 作为尺寸。缺了这个字段
    // 它会落到末尾读 offsetHeight，那条分支在「entry 存在」时不返回尺寸。
    const entry = {
      target,
      contentRect: { ...size },
      borderBoxSize: [{ ...size }],
      contentBoxSize: [{ ...size }],
      devicePixelContentBoxSize: [{ ...size }]
    } as unknown as ResizeObserverEntry
    this.callback([entry], this as unknown as ResizeObserver)
  }
}

const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')
const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
const originalResizeObserver = globalThis.ResizeObserver
const originalWindowResizeObserver = Object.getOwnPropertyDescriptor(window, 'ResizeObserver')
const originalScrollTo = window.scrollTo
const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY')
const originalDocScrollHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight')

/**
 * 记录当前 scrollY，供断言读。window 模式下滚动位置就是 scrollY，用例要能验它。
 * 组件自己写的是 window.scrollTo，jsdom 里那是空实现，所以这里给它一个真实现：
 * 设 scrollY 并派发 scroll 事件，让夹取与自动滚动在测试里真的发生。
 */
export function currentScrollY() {
  return window.scrollY
}

/**
 * 让虚拟列表在 jsdom 里算得出窗口。返回 restore 供 afterEach 还原。
 *
 * 三处都要补，缺一个就会让「库算不出窗口」和「行没有高度」两种失败混在一起：
 * window.innerHeight（滚动元素的视口，observeWindowRect 读它）、
 * offsetHeight（measureElement 读它，ResizeObserver 之外还有直接读的行）、
 * ResizeObserver（行高测量的唯一来源）。
 */
export function stubLayout() {
  const { defineProperty } = Object
  let scrollY = 0

  const restore = () => {
    if (originalInnerHeight) defineProperty(window, 'innerHeight', originalInnerHeight)
    else delete (window as { innerHeight?: unknown }).innerHeight
    if (originalInnerWidth) defineProperty(window, 'innerWidth', originalInnerWidth)
    else delete (window as { innerWidth?: unknown }).innerWidth
    if (originalOffsetHeight) defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    else delete (HTMLElement.prototype as { offsetHeight?: unknown }).offsetHeight
    if (originalScrollY) defineProperty(window, 'scrollY', originalScrollY)
    else delete (window as { scrollY?: unknown }).scrollY
    if (originalDocScrollHeight) {
      defineProperty(document.documentElement, 'scrollHeight', originalDocScrollHeight)
    } else {
      delete (document.documentElement as unknown as { scrollHeight?: unknown }).scrollHeight
    }
    if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver
    else delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver
    if (originalWindowResizeObserver) {
      Object.defineProperty(window, 'ResizeObserver', originalWindowResizeObserver)
    } else {
      delete (window as unknown as { ResizeObserver?: unknown }).ResizeObserver
    }
    window.scrollTo = originalScrollTo
  }

  defineProperty(window, 'innerHeight', { configurable: true, get: () => VIEWPORT_HEIGHT })
  defineProperty(window, 'innerWidth', { configurable: true, get: () => 800 })
  defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
  // 可滚上限取 documentElement.scrollHeight - innerHeight，jsdom 不布局所以恒为 0。
  // 不补的话夹取与边缘滚动都会算出「一页都滚不动」，那两个分支永远不触发。文档高度取
  // 「撑高元素里那个最高的 style.height」——那是虚拟列表真实的文档高度来源。
  defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get(this: HTMLElement) {
      let tallest = 0
      for (const node of document.querySelectorAll<HTMLElement>('[style*="height"]')) {
        const declared = Number.parseFloat(node.style.height)
        if (Number.isFinite(declared)) tallest = Math.max(tallest, declared)
      }
      return tallest
    }
  })
  defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute('data-index') || this.hasAttribute('data-resource-row') ? ROW_HEIGHT : 0
    }
  })
  globalThis.ResizeObserver = StubResizeObserver
  // virtual-core 走的是 this.targetWindow.ResizeObserver，targetWindow 取自滚动元素 ownerDocument
  // 的 defaultView —— 在 jsdom 里就是 window。globalThis 与 window 未必是同一个对象引用，
  // 只设 globalThis 会让库拿到 undefined，行高永远量不到。两个都设。
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: StubResizeObserver
  })
  // window 模式的滚动入口。jsdom 自带的是空实现，夹取与边缘自动滚动都靠它真的改位置，
  // 顺带派发 scroll 事件——组件监听的就是这个。
  window.scrollTo = ((options?: number | ScrollToOptions) => {
    const top = typeof options === 'number' ? options : (options?.top ?? scrollY)
    scrollY = Math.max(top, 0)
    window.dispatchEvent(new Event('scroll'))
  }) as typeof window.scrollTo

  return restore
}
