/**
 * 跟踪宿主的内容盒行内尺寸（可用行内空间）。
 *
 * 用途是「渲染结果必须按容器宽度算」的组件：中间省略的切点由可用空间决定，而容器宽度
 * 只由外部布局给出，组件自己算不出来。观察宿主本身即可——宿主的内容盒就是它的可用行内
 * 空间，不需要再往里指定子元素。
 *
 * 口径取 `contentRect.width` 而不是 `clientWidth`：后者是整数，最多丢掉 1px；中间省略
 * 是在预算边界上取最长前缀的，少给 1px 会让最后被选中的那个簇贴边溢出，而多算 1px 则
 * 是白白丢掉一个字符。
 */
import type { LitElement, ReactiveController, ReactiveControllerHost } from 'lit'

type WidthHost = ReactiveControllerHost & LitElement

interface Watched {
  readonly notify: (width: number) => void
  width: number
}

const watched = new WeakMap<Element, Watched>()
let observer: ResizeObserver | undefined

/**
 * 全模块共用一个 ResizeObserver：一张表里可能有成百上千个这样的单元格，逐实例建观察者要
 * 给每个单元格单独排一次尺寸回调。没有 ResizeObserver 的环境（jsdom）没有布局可测，直接不接。
 */
function getObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null
  if (observer) return observer

  observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const target = watched.get(entry.target)
      if (!target) continue

      const width = entry.contentRect.width
      if (target.width === width) continue

      target.width = width
      target.notify(width)
    }
  })

  return observer
}

function watch(target: Element, notify: (width: number) => void) {
  const shared = getObserver()
  if (!shared) return

  // 初值取 -1 而不是 0：0 是一个合法的宽度（`display: none` 就是 0），用它当初值会把
  // 「宽度真的是 0」与「还没量过」混成同一种状态，而这两种状态的处置相反——前者必须跳过。
  watched.set(target, { notify, width: -1 })
  shared.observe(target, { box: 'content-box' })
}

function unwatch(target: Element) {
  watched.delete(target)
  observer?.unobserve(target)
}

/** 把宿主内容盒的行内尺寸变化报给宿主。 */
export class ElementWidthController implements ReactiveController {
  constructor(
    private readonly host: WidthHost,
    private readonly notify: (width: number) => void
  ) {
    host.addController(this)
  }

  /*
   * 只接断开/重连：观察目标是宿主自己，它不会像查询出来的子元素那样在渲染之间被换掉，
   * 因此不需要 hostUpdated 补挂。断开时观察被拆掉，重连必须接回来，否则组件被移出
   * 文档再放回去之后宽度就再也不会更新。
   */
  hostConnected() {
    watch(this.host, this.notify)
  }

  hostDisconnected() {
    unwatch(this.host)
  }
}
