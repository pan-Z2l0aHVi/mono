import { definePlugin } from '@greypan/js-kit'

import type { OverlayOptions } from './overlay'
import { defineOverlay } from './overlay'
import type { OverlayApi } from './overlay'
import type { OverlayPortal } from './portal'
import { hideOverlayPresence, showOverlayPresence } from './presence'

export interface AnchoredPanelOptions {
  getAnchor(): HTMLElement | null
  getLocalPanel(): HTMLElement | null
  getPositioning(): OverlayOptions
  isPortal(): boolean
  createPortal(): OverlayPortal
}

/**
 * 管理锚定面板的本地/Portal 容器、定位器和可中断 presence。
 * 内容迁移与交互语义由各组件保留，避免把不同组件的 public contract 混入此模块。
 */
export interface AnchoredPanelApi {
  getPanel(): HTMLElement | null
  open(isInstant?: boolean): void
  close(isStillOpen: () => boolean): Promise<boolean>
  updatePosition(): void
  reconfigure(isOpen: boolean): void
  dispose(): void
}

export const defineAnchoredPanel = () =>
  definePlugin<AnchoredPanelApi, AnchoredPanelOptions>(ctx => {
    let overlay: OverlayApi | undefined
    let portal: OverlayPortal | undefined

    const getPanel = () => portal?.panel ?? ctx.getLocalPanel()

    const disposePortal = () => {
      if (!portal) return
      portal.restoreContent()
      portal.remove()
      portal = undefined
      overlay = undefined
    }

    const getOrCreatePanel = (): HTMLElement | null => {
      if (!ctx.isPortal()) return ctx.getLocalPanel()
      portal ??= ctx.createPortal()
      return portal.panel
    }

    const ensureOverlay = (anchor: HTMLElement, panel: HTMLElement) => {
      if (overlay) {
        overlay.updateAnchor(anchor)
        overlay.update(ctx.getPositioning())
        return
      }
      overlay = defineOverlay().make({ anchor, overlay: panel, ...ctx.getPositioning() })
    }

    const open = (isInstant = false) => {
      const anchor = ctx.getAnchor()
      if (!anchor) return
      const panel = getOrCreatePanel()
      if (!panel) return
      ensureOverlay(anchor, panel)
      overlay?.open()
      showOverlayPresence(panel, { isInstant })
    }

    const dispose = () => {
      overlay?.dispose()
      overlay = undefined
      disposePortal()
    }

    return {
      getPanel() {
        return getPanel()
      },

      open,

      async close(isStillOpen) {
        overlay?.close()
        const panel = getPanel()
        if (panel && !(await hideOverlayPresence(panel))) return false
        if (isStillOpen()) return false
        disposePortal()
        return true
      },

      updatePosition() {
        overlay?.update(ctx.getPositioning())
      },

      reconfigure(isOpen) {
        const shouldAnimate = getPanel()?.dataset.wuiPresence === 'entering'
        dispose()
        if (isOpen) open(!shouldAnimate)
      },

      dispose
    }
  })
