import { definePlugin } from '@greypan/js-kit'

import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/theme/theme-scope'

export type OverlayContainer = HTMLElement | (() => HTMLElement | undefined)

export interface OverlayContainerResolutionOptions {
  /** 无 target 时优先使用文档中的 root theme。 */
  preferRootTheme?: boolean
}

export interface OverlayPortalOptions {
  container?: OverlayContainer
  target: Element
  style: string
  className: string
}

export interface OverlayPortal {
  readonly panel: HTMLElement
  restoreContent(): void
  moveContent(nodes: Node[], target?: HTMLElement): void
  appendContent(nodes: Node[], target?: HTMLElement): void
  removeContent(nodes: Node[]): void
  remove(): void
}

/**
 * 构建带 Shadow DOM 样式边界的 Portal 面板，并追踪被迁移的内容节点以便恢复。
 */
export const defineOverlayPortal = () =>
  definePlugin<OverlayPortal, OverlayPortalOptions>(ctx => {
    const host = document.createElement('div')
    // :host 规则可能让宿主在 overlay 容器中生成行盒；display: contents 保留面板定位而不参与布局。
    host.style.display = 'contents'

    const root = host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = ctx.style
    const panel = document.createElement('div')
    panel.className = ctx.className
    panel.dataset.wuiPresence = 'entering'
    root.append(style, panel)

    resolveOverlayContainer(ctx.container, ctx.target).appendChild(host)

    const trackedNodes: Node[] = []
    const untrackNodes = (nodes: Node[]) => {
      nodes.forEach(node => {
        const index = trackedNodes.indexOf(node)
        if (index >= 0) trackedNodes.splice(index, 1)
      })
    }

    return {
      panel,

      moveContent(nodes, target = panel) {
        trackedNodes.splice(0, trackedNodes.length, ...nodes)
        target.append(...trackedNodes)
      },

      appendContent(nodes, target = panel) {
        untrackNodes(nodes)
        trackedNodes.push(...nodes)
        target.append(...nodes)
      },

      removeContent(nodes) {
        untrackNodes(nodes)
      },

      restoreContent() {
        ctx.target.append(...trackedNodes)
        trackedNodes.length = 0
      },

      remove() {
        host.remove()
      }
    }
  })

export function resolveOverlayContainer(
  container: OverlayContainer | undefined,
  target: Element,
  options: OverlayContainerResolutionOptions = {}
): HTMLElement {
  const explicit = typeof container === 'function' ? container() : container
  if (explicit) return explicit

  // 无 target 的调用（如菜单）优先使用 root theme；有 target 时使用最近的 theme。
  const theme = options.preferRootTheme ? findRootTheme() : findNearestTheme(target)
  return theme?.getOverlayRoot() ?? getFallbackOverlayRoot()
}
