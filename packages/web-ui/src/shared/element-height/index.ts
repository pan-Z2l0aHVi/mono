/**
 * 跟踪宿主的某个子元素的 border-box 高度。
 *
 * 用途是「元素的高度是动态的，但布局里另有一处要按它让位」——例如 drawer 的拖拽热区必须
 * 避开 header，而 header 的高度由 slotted 内容与 consumer 的 padding 决定（窄屏下还可能
 * 被 `max-[640px]:h-14` 改写）。这种让位关系在 CSS 里没有纯表达：热区是 dialog 的绝对
 * 定位兄弟节点，拿不到 header 的盒子尺寸；写成 `top: 100%` 之类又会把内容区一起算进去。
 *
 * 观察的是 border-box 而不是默认的 content-box：这里的判据是「这块区域在布局里占了多高」，
 * 含 padding 与 border。改 padding 而内容不变时 content-box 尺寸可能不变，回调不会来。
 */
import type { LitElement, ReactiveController, ReactiveControllerHost } from 'lit'

interface Watched {
  readonly notify: (height: number) => void
  height: number
}

const watched = new WeakMap<Element, Watched>()
let observer: ResizeObserver | undefined

/**
 * 全模块共用一个 ResizeObserver：逐实例建观察者意味着每个目标各排一次尺寸回调，而同一屏里
 * 可能同时有几十个浮层。没有 ResizeObserver 的环境（jsdom）没有布局可测，直接不接。
 */
function getObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null
  if (observer) return observer

  observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const target = watched.get(entry.target)
      if (!target) continue

      // offsetHeight 而非 entry.borderBoxSize：后者在旧引擎上可能缺席，且是分数值；
      // 布局让位只需要整数像素，与盒子自身量出来的口径一致。
      const height = (entry.target as HTMLElement).offsetHeight
      if (target.height === height) continue

      target.height = height
      target.notify(height)
    }
  })

  return observer
}

function watch(target: Element, notify: (height: number) => void) {
  const shared = getObserver()
  if (!shared) return

  // 初值取 -1 而不是 0：首帧的真实高度由 observe() 的初始回调报上来，而 0 是一个合法高度，
  // 用它当初值会把「高度就是 0」与「还没量过」混成同一种状态。
  watched.set(target, { notify, height: -1 })
  shared.observe(target, { box: 'border-box' })
}

function unwatch(target: Element) {
  watched.delete(target)
  observer?.unobserve(target)
}

/**
 * 把目标盒子的高度变化报给宿主；断开重连后重新接上观察。
 *
 * 目标按 selector 在宿主的 renderRoot 里查，渲染结构变化（目标被条件渲染掉再渲染回来）时
 * 重新解析——同一宿主先后观察过两个不同节点的情况是真实存在的（模式切换会换掉整棵子树）。
 */
export class ElementHeightController implements ReactiveController {
  private target: Element | undefined

  constructor(
    private readonly host: ReactiveControllerHost & LitElement,
    private readonly selector: string,
    private readonly notify: (height: number) => void
  ) {
    host.addController(this)
  }

  /*
   * 两个生命周期都要接：重连（移出 DOM 再放回去、列表重排、Teleport）不会排一次更新，只挂在
   * hostUpdated 上的话观察在断开时被拆掉就再也接不回来。而首连时 shadow root 还没有子节点，
   * 这里查不到目标，得靠 hostUpdated 补上第一次。
   */
  hostConnected() {
    this.attach()
  }

  hostUpdated() {
    this.attach()
  }

  hostDisconnected() {
    this.detach()
  }

  private attach() {
    const target = this.host.renderRoot.querySelector(this.selector)
    if (target === this.target) return

    if (this.target) unwatch(this.target)
    this.target = target ?? undefined
    if (this.target) watch(this.target, this.notify)
  }

  private detach() {
    if (!this.target) return
    unwatch(this.target)
    this.target = undefined
  }
}
