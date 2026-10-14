// @vitest-environment jsdom

/*
 * jsdom 不做布局：元素没有盒模型——offsetHeight / offsetTop 恒为 0，offsetParent 恒为 null，
 * document.scrollingElement.clientHeight 恒为 0，Element.scrollTo 是空实现，ResizeObserver
 * 不存在。
 *
 * 虚拟滚动恰好把这些全变成了硬前提。虚拟器是 virtua 的 WindowVirtualizer（window 模式），
 * 它读的是：
 *   - document.scrollingElement.clientHeight：视口高度。为 0 → 虚拟窗口算成空 range，
 *     一个条目都不渲染，整份 spec 报「row / undefined」。
 *   - document.scrollingElement.scrollTop：滚动偏移（Element.scrollTo 也是往它上面写）。
 *     不补就既读不到位置、也写不动位置，涉及滚动位置的断言全红。
 *   - ResizeObserver：条目高度的唯一来源；而且它只接受 offsetParent 非空的元素——
 *     jsdom 的 offsetParent 恒为 null，光有 ResizeObserver 也量不进去。
 *   - documentElement.scrollHeight 恒为 0：夹取与扫选边缘滚动算出的上限是 0，
 *     「滚得动」的那几个分支永远不触发。
 *
 * 所以补的是这些环境缺口，不 mock 库的 rect 观测——那会绕开「视口与条目尺寸决定窗口」
 * 这条真实逻辑。
 */

/** 虚拟窗口按这个高度计算。真实值由浏览器视口给出，这里只驱动虚拟窗口的算术。 */
export const VIEWPORT_HEIGHT = 600

/**
 * 行的名义高度。jsdom 不做布局，条目包裹层没有内容高度；高度为 0 会让虚拟器把每个条目都按
 * 同一偏移摆放、内容全堆在一起，「不重叠」也就无从谈起。所以给条目补一个高度。
 */
export const ROW_HEIGHT = 40

/**
 * 未被量到的行按估值参与总高计算。必须与 ResourceList 的 ROW_ESTIMATE 一致，否则
 * 「总高 = 已量行 × 真实行高 + 未量行 × 估值」这条断言会算出另一个数。
 */
export const ROW_ESTIMATE = 64

/**
 * 被量的是虚拟器自建的条目包裹层——它里面含着一行；行本身被直接观察时同样算。
 * 除了这层，虚拟器还会观察滚动元素（视口）本身，那一条按 0 走它自己的分支。
 */
function isMeasuredRow(element: Element) {
  return element.hasAttribute('data-resource-row') || element.querySelector('[data-resource-row]') !== null
}

/**
 * jsdom 没有 ResizeObserver。条目高度靠它量出来：没有这个实现，虚拟器把每个条目都当成未测量，
 * 总高与窗口全按估值算，行高相关的断言失去意义（见 ROW_HEIGHT 的说明）。
 *
 * 回调不能同步触发：virtua 在回调里会跳过 offsetParent 为空的元素，而条目包裹层在 Vue 的函数式
 * ref 建出来的那一刻往往还没 attach。真实的 ResizeObserver 也在微任务之后才交付，所以这里排一个
 * 微任务，与真实时序一致。
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
    const height = isMeasuredRow(target) ? ROW_HEIGHT : 0
    // contentRect 是 virtua 读尺寸的那一份（窗口模式与容器模式都取 contentRect.height），
    // 它要有 width / height 两个键；只给 blockSize 的话读出来是 undefined，尺寸会被整批丢掉。
    const contentRect = {
      x: 0,
      y: 0,
      width: 800,
      height,
      top: 0,
      right: 800,
      bottom: height,
      left: 0,
      toJSON: () => contentRect
    }
    const boxSize = { inlineSize: 800, blockSize: height, toJSON: () => boxSize }
    const entry = {
      target,
      contentRect,
      borderBoxSize: [boxSize],
      contentBoxSize: [boxSize],
      devicePixelContentBoxSize: [boxSize]
    } as unknown as ResizeObserverEntry
    this.callback([entry], this as unknown as ResizeObserver)
  }
}

const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')
const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
const originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
const originalResizeObserver = globalThis.ResizeObserver
const originalWindowResizeObserver = Object.getOwnPropertyDescriptor(window, 'ResizeObserver')
const originalScrollTo = window.scrollTo
const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY')
const originalScrollingElement = Object.getOwnPropertyDescriptor(document, 'scrollingElement')
const originalDocScrollTop = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollTop')
const originalDocClientHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'clientHeight')
const originalDocScrollHeight = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight')

/**
 * 记录当前滚动位置，供断言读。window 模式下它同时是 window.scrollY 与
 * document.scrollingElement.scrollTop——两者由同一份状态驱动，写哪边读哪边都一致。
 */
export function currentScrollY() {
  return window.scrollY
}

/**
 * 让虚拟列表在 jsdom 里算得出窗口。返回 restore 供 afterEach 还原。
 *
 * 补的是 virtua 必需的几件环境：视口高度（scrollingElement.clientHeight）、滚动位置
 * （scrollingElement.scrollTop，含它调用的 Element.scrollTo 写入路径）、条目高度
 * （ResizeObserver，以及它要求非空的 offsetParent）、可滚上限（documentElement.scrollHeight）。
 * 缺一件就会让「库算不出窗口」和「行没有高度」两种失败混在一起。
 */
export function stubLayout() {
  const { defineProperty } = Object
  let scrollY = 0

  // 滚动位置只有这一份。window.scrollY、scrollingElement.scrollTop 都是它的镜像；
  // window.scrollTo 与 Element.scrollTo 都写它。scroll 事件两个目标都派发：
  // 组件监听 window，virtua 监听 document（scroll 不冒泡，少派一边就有一边收不到）。
  const setScroll = (top: number) => {
    scrollY = Math.max(top, 0)
    window.dispatchEvent(new Event('scroll'))
    document.dispatchEvent(new Event('scroll'))
  }

  const restore = () => {
    if (originalInnerHeight) defineProperty(window, 'innerHeight', originalInnerHeight)
    else delete (window as { innerHeight?: unknown }).innerHeight
    if (originalInnerWidth) defineProperty(window, 'innerWidth', originalInnerWidth)
    else delete (window as { innerWidth?: unknown }).innerWidth
    if (originalOffsetHeight) defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    else delete (HTMLElement.prototype as { offsetHeight?: unknown }).offsetHeight
    if (originalOffsetParent) defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent)
    else delete (HTMLElement.prototype as { offsetParent?: unknown }).offsetParent
    if (originalScrollY) defineProperty(window, 'scrollY', originalScrollY)
    else delete (window as { scrollY?: unknown }).scrollY
    if (originalScrollingElement) defineProperty(document, 'scrollingElement', originalScrollingElement)
    else delete (document as unknown as { scrollingElement?: unknown }).scrollingElement
    // scrollTop / clientHeight 的补丁挂在 documentElement 实例上（jsdom 的原实现挂在
    // Element.prototype 上），实例上没有自有描述符，delete 即可还原到原型那份。
    if (originalDocScrollTop) defineProperty(document.documentElement, 'scrollTop', originalDocScrollTop)
    else delete (document.documentElement as unknown as { scrollTop?: unknown }).scrollTop
    if (originalDocClientHeight) defineProperty(document.documentElement, 'clientHeight', originalDocClientHeight)
    else delete (document.documentElement as unknown as { clientHeight?: unknown }).clientHeight
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
    delete (document.documentElement as unknown as { scrollTo?: unknown }).scrollTo
    delete (document.documentElement as unknown as { scrollBy?: unknown }).scrollBy
  }

  defineProperty(window, 'innerHeight', { configurable: true, get: () => VIEWPORT_HEIGHT })
  defineProperty(window, 'innerWidth', { configurable: true, get: () => 800 })
  defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
  // 这个 jsdom 版本压根没实现 document.scrollingElement（是 undefined，不是 null），
  // 而 virtua 的 window 模式全靠它拿到「滚动元素」——没有它，mount 那一刻就抛
  // undefined.ownerDocument。补成 documentElement。
  defineProperty(document, 'scrollingElement', {
    configurable: true,
    get: () => document.documentElement
  })
  // virtua 的 window 模式把 scrollingElement 当视口：视口高度读 clientHeight，
  // 滚动位置读 scrollTop，滚动它也走这个元素自己的 scrollTo。
  defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => VIEWPORT_HEIGHT
  })
  defineProperty(document.documentElement, 'scrollTop', {
    configurable: true,
    get: () => scrollY,
    set: (value: number) => setScroll(value)
  })
  // jsdom 的 Element 上根本没有 scrollTo / scrollBy（都是 undefined），直接挂在 scrollingElement 上。
  // virtua 的滚动修正（条目尺寸变化后的锚定）走的就是 scrollBy，缺了它会在滚动的回调里抛错。
  document.documentElement.scrollTo = ((options?: number | ScrollToOptions) => {
    setScroll(typeof options === 'number' ? options : (options?.top ?? scrollY))
  }) as typeof document.documentElement.scrollTo
  document.documentElement.scrollBy = ((options?: number | ScrollToOptions) => {
    setScroll(scrollY + (typeof options === 'number' ? options : (options?.top ?? 0)))
  }) as typeof document.documentElement.scrollBy
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
      return isMeasuredRow(this) ? ROW_HEIGHT : 0
    }
  })
  // virtua 只接受 offsetParent 非空的元素上报尺寸（用它排除 display:none / 未挂载的节点）。
  // jsdom 的 offsetParent 恒为 null，不补这层的话 ResizeObserver 量出来的高度会被整批丢掉。
  defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.isConnected ? (this.parentElement ?? document.body) : null
    }
  })
  globalThis.ResizeObserver = StubResizeObserver
  // virtua 走的是它自己 window 的 ResizeObserver，在 jsdom 里就是 window。globalThis 与
  // window 未必是同一个对象引用，只设 globalThis 会让库拿到 undefined，条目高度永远量不到。
  // 两个都设。
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: StubResizeObserver
  })
  // 组件的夹取与边缘自动滚动写的是 window.scrollTo（jsdom 自带的是空实现）。
  window.scrollTo = ((options?: number | ScrollToOptions) => {
    setScroll(typeof options === 'number' ? options : (options?.top ?? scrollY))
  }) as typeof window.scrollTo

  return restore
}
