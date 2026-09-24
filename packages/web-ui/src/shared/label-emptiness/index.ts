/**
 * 判断 label 槽位有没有真的画出东西。
 *
 * radio / checkbox 的触发行是 `inline-flex` + `gap: 10px`，宿主宽度由内容撑开，所以那条 gap 是
 * 指示器与标签之间的距离。但 gap 只认「这里有个 flex item」，不认它有没有宽度：槽位空着，或者只放了
 * 一个视觉隐藏的无障碍名（`.sr-only` 出流，不产生行内盒），标签盒子是 0 宽，指示器右边仍然多出 10px。
 *
 * 判据因此取渲染宽度而不是「槽位有没有被指派内容」——两者只在无障碍名那一种用法上分开，而那正是这里
 * 要修的一种。CSS 也判不出这件事：`slot:empty` 看的是 slot 自己的子节点，被 assign 进来的节点并不是
 * 它的孩子。同理不能用 `hidden` 把盒子收掉，display: none 会连带把里面的文字从无障碍名里去掉。
 */
import type { LitElement, ReactiveController, ReactiveControllerHost } from 'lit'

interface Watched {
  readonly notify: (empty: boolean) => void
  empty: boolean
}

const watched = new WeakMap<Element, Watched>()
let observer: ResizeObserver | undefined

/**
 * 全模块共用一个 ResizeObserver：一个列表里可能有上百个选择控件，逐实例建观察者要给每个控件单独排
 * 一次尺寸回调。没有 ResizeObserver 的环境（jsdom）没有布局可测，直接不接。
 */
function getObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null
  if (observer) return observer

  observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const target = watched.get(entry.target)
      if (!target) continue

      const empty = entry.contentRect.width === 0
      if (target.empty === empty) continue

      target.empty = empty
      target.notify(empty)
    }
  })

  return observer
}

function watch(target: Element, notify: (empty: boolean) => void) {
  const shared = getObserver()
  if (!shared) return

  // 初值跟宿主的默认状态一致：非空。首帧的真实尺寸由 observe() 的初始回调报上来。
  watched.set(target, { notify, empty: false })
  shared.observe(target)
}

function unwatch(target: Element) {
  watched.delete(target)
  observer?.unobserve(target)
}

/** 把标签盒子的空 / 非空变化报给宿主；断开重连后重新接上观察。 */
export class LabelEmptinessController implements ReactiveController {
  private target: Element | undefined

  constructor(
    private readonly host: ReactiveControllerHost & LitElement,
    private readonly selector: string,
    private readonly notify: (empty: boolean) => void
  ) {
    host.addController(this)
  }

  /*
   * 两个生命周期都要接：重连（移出 DOM 再放回去、列表重排、Teleport）不会排一次更新，所以只挂在
   * hostUpdated 上的话，观察在断开时被拆掉就再也接不回来，标签后来改成什么都不显示宽度都停在旧值上。
   * 而首连时 shadow root 还没有子节点，这里查不到目标，得靠 hostUpdated 补上第一次。
   */
  hostConnected() {
    this.attach()
  }

  hostUpdated() {
    this.attach()
  }

  hostDisconnected() {
    if (this.target) unwatch(this.target)
    this.target = undefined
  }

  private attach() {
    if (this.target) return

    const target = this.host.renderRoot.querySelector(this.selector)
    if (!target) return

    this.target = target
    watch(target, this.notify)
  }
}
