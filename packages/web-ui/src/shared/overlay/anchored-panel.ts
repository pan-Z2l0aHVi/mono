import { definePlugin } from '@greypan/js-kit'

import { overlayComposition } from './composition'
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
      overlayComposition.unregisterPanel(portal.panel)
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
      // portal panel 与宿主物理分离；本地 panel 也可能隔着 shadow 边界。
      // 以 anchor 祖先链寻找最近的已登记 overlay，建立统一逻辑父子关系。
      overlayComposition.registerPanelFromAncestry(panel, anchor)
      ensureOverlay(anchor, panel)
      overlay?.open()
      showOverlayPresence(panel, { isInstant })
    }

    const dispose = () => {
      overlay?.dispose()
      overlay = undefined
      const panel = getPanel()
      if (panel) overlayComposition.unregisterPanel(panel)
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
        if (panel) overlayComposition.unregisterPanel(panel)
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
