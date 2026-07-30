import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme } from '@/shared/theme/theme-scope'

export type OverlayContainer = HTMLElement | (() => HTMLElement | undefined)

interface OverlayPortalOptions {
  container?: OverlayContainer
  target: Element
  style: string
  className: string
}

export interface OverlayPortal {
  readonly panel: HTMLElement
  restoreContent(): void
  moveContent(nodes: Node[]): void
  remove(): void
}

export function createOverlayPortal(options: OverlayPortalOptions): OverlayPortal {
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = options.style
  const panel = document.createElement('div')
  panel.className = options.className
  root.append(style, panel)
  resolveOverlayContainer(options.container, options.target).appendChild(host)

  const nodes: Node[] = []
  return {
    panel,
    moveContent(content) {
      nodes.splice(0, nodes.length, ...content)
      panel.append(...nodes)
    },
    restoreContent() {
      options.target.append(...nodes)
      nodes.length = 0
    },
    remove() {
      host.remove()
    }
  }
}

export function resolveOverlayContainer(container: OverlayContainer | undefined, target: Element): HTMLElement {
  const explicit = typeof container === 'function' ? container() : container
  return explicit ?? findNearestTheme(target)?.getOverlayRoot() ?? getFallbackOverlayRoot()
}
