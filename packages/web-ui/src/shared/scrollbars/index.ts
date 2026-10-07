import { definePlugin } from '@greypan/js-kit'
import { unsafeCSS, type CSSResult, type ReactiveController, type ReactiveControllerHost } from 'lit'
import { OverlayScrollbars, type PartialOptions } from 'overlayscrollbars'

import { webUiScrollbarsOptions } from '@/scrollbars'
import scrollbarStyles from '@/scrollbars/style.css?inline'

/**
 * 组件 shadow root 必须自带的一份样式：库的结构样式（`.os-scrollbar*` 的布局、显隐、热区）
 * 与 macOS 主题。
 *
 * 不能靠 app 的全局样式表：那份文件的选择器是 document 级的属性选择器
 * （`[data-overlayscrollbars-viewport]` 等），够不到 shadow 边界里面。同一个 CSSResult 实例
 * 被多个组件共用，Lit 因此只构造一张 CSSStyleSheet，不是每个组件各解析一遍。
 */
export const overlayScrollbarShadowStyles: CSSResult = unsafeCSS(scrollbarStyles)

/** 同一份样式的原文。portal 面板是独立 shadow root、由字符串建 `<style>`，用得上它。 */
export const overlayScrollbarStylesText = scrollbarStyles

export interface ScrollbarHost {
  /** 指向 shadow 内的滚动容器；传 null 表示当前没有（组件按状态有条件渲染时用）。 */
  setTarget(target: HTMLElement | null): void
  connect(): void
  disconnect(): void
}

/**
 * 把一个 shadow 内的元素交给 OverlayScrollbars 接管。
 *
 * 目标元素必须在 shadow 内，且它的子节点是「组件自己的机制」而不是消费方的 light DOM：
 * 库会把宿主的子节点搬进自己生成的 viewport，所以宿主自身若是靠 grid / place-items 排列
 * 子项的布局容器，那个布局会随子节点一起失效。用 `<slot>` 承载消费方内容的容器不受影响
 * ——被搬动的是 slot 元素本身，投影关系不跟着走。
 */
export function defineScrollbarHost(options: { readonly options?: PartialOptions } = {}) {
  return definePlugin<ScrollbarHost, Record<never, never>>(() => {
    let target: HTMLElement | null = null
    let instance: OverlayScrollbars | null = null
    let connected = false

    const destroy = () => {
      instance?.destroy()
      instance = null
    }

    const create = () => {
      if (!connected || !target || instance) return
      instance = OverlayScrollbars(target, options.options ?? webUiScrollbarsOptions)
    }

    return {
      setTarget(next) {
        if (target === next) return
        destroy()
        target = next
        create()
      },

      connect() {
        if (connected) return
        connected = true
        create()
      },

      disconnect() {
        if (!connected) return
        connected = false
        destroy()
      }
    }
  })
}

/** 把内部滚动容器接入 Lit host 生命周期。 */
export class ScrollbarHostController implements ReactiveController {
  constructor(
    host: ReactiveControllerHost,
    private readonly scrollbars: ScrollbarHost
  ) {
    host.addController(this)
  }

  hostConnected() {
    this.scrollbars.connect()
  }

  hostDisconnected() {
    this.scrollbars.disconnect()
  }
}
