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
  onContentChange?: () => void
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

    const trackedNodes: Node[] = []
    const contentObserver = new MutationObserver(() => ctx.onContentChange?.())
    const untrackNodes = (nodes: Node[]) => {
      nodes.forEach(node => {
        const index = trackedNodes.indexOf(node)
        if (index >= 0) trackedNodes.splice(index, 1)
      })
    }

    resolveOverlayContainer(ctx.container, ctx.target).appendChild(host)
    if (ctx.onContentChange) contentObserver.observe(panel, { childList: true, subtree: true })

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
        contentObserver.disconnect()
        host.remove()
      }
    }
  })

/**
 * 判断 node 是否是 slot 已分配节点（或其 light DOM 后代），即 node 实际渲染在 shadowRoot 内。
 * slotted 内容的 parentNode 仍停留在 light DOM，因此不能用普通祖先遍历跨过 shadow 边界，
 * 只能通过 slot.assignedNodes() 判断内容被渲染到哪个 slot。
 */
function isAssignedIntoTarget(node: Node, assignedNode: Node, boundary: Node): boolean {
  let current: Node | null = node
  while (current && current !== boundary) {
    if (current === assignedNode) return true
    current = current.parentNode
  }
  return false
}

/**
 * 查找包含 target 且处于打开态的最近原生 <dialog>。
 * 原生 showModal() 会把 dialog 提升到浏览器 top layer，而常规 overlay 容器在普通文档流，
 * 二者无法靠 z-index 叠序——overlay 会被 top layer 的 dialog 遮住。
 * 因此 target 被渲染到某个已打开的原生 dialog 内时，应把 overlay 挂到该 dialog 上，
 * 使其一并进入 top layer（抽屉 / 对话框内的 dropdown、tooltip、context-menu 均适用）。
 */
function findEnclosingOpenDialog(target: Element): HTMLDialogElement | null {
  let current: Node | null = target
  while (current && current !== document.documentElement) {
    if (current instanceof HTMLDialogElement && current.open) return current

    // 跨过 shadow host：检查其 shadowRoot 内已打开的 dialog 是否渲染了 target。
    if (current instanceof Element && current.shadowRoot) {
      const dialogs = current.shadowRoot.querySelectorAll('dialog')
      for (const dialog of dialogs) {
        if (!(dialog instanceof HTMLDialogElement) || !dialog.open) continue
        const slots = dialog.querySelectorAll('slot')
        for (const slot of slots) {
          for (const assigned of slot.assignedNodes()) {
            if (!(assigned instanceof Node)) continue
            if (isAssignedIntoTarget(target, assigned, current)) return dialog
          }
        }
      }
    }

    current = current.parentNode
  }
  return null
}

export function resolveOverlayContainer(
  container: OverlayContainer | undefined,
  target: Element,
  options: OverlayContainerResolutionOptions = {}
): HTMLElement {
  const explicit = typeof container === 'function' ? container() : container
  if (explicit) return explicit

  // target 在已打开的原生 dialog / drawer 内：挂到该 dialog，加入 top layer。
  const enclosingDialog = findEnclosingOpenDialog(target)
  if (enclosingDialog) return enclosingDialog

  // 无 target 的调用（如菜单）优先使用 root theme；有 target 时使用最近的 theme。
  const theme = options.preferRootTheme ? findRootTheme() : findNearestTheme(target)
  return theme?.getOverlayRoot() ?? getFallbackOverlayRoot()
}
