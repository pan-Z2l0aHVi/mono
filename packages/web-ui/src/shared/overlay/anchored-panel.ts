import { definePlugin } from '@greypan/js-kit'

import type { OpenOverlay, OpenOverlayHandle, OverlayArbitration } from './open-overlay'
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
  /**
   * 承载「本面板是一次开启态浮层」的实例：登记与 Escape 归属由它完成，本模块不再
   * 自己维护逻辑父子关系。
   *
   * 必须是**调用方持有的那个实例**（而不是这里新建一个）——调用方同时要用它的帧
   * 事务入口，两个实例会让「我开着吗」重新分裂。
   */
  openOverlay: OpenOverlay
  /** 本面板与 Escape 仲裁的关系。tooltip 传 `none`；缺省 `escape`。 */
  arbitration?: OverlayArbitration
}

/**
 * 管理锚定面板的本地/Portal 容器、定位器和可中断 presence。
 * 内容迁移与交互语义由各组件保留，避免把不同组件的 public contract 混入此模块。
 */
export interface AnchoredPanelApi {
  getPanel(): HTMLElement | null
  /**
   * 当前开启会话的句柄；未开启时为 `null`。
   * 查询（`contains` / `containsEvent` / `hasFocusWithin`）与 `setInert` 都走它，
   * 调用方因此不必持有 panel 引用，也不知道存在全局注册表。
   */
  getHandle(): OpenOverlayHandle | null
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
    let handle: OpenOverlayHandle | null = null

    const getPanel = () => portal?.panel ?? ctx.getLocalPanel()

    const releaseHandle = () => {
      handle?.release()
      handle = null
    }

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
      // portal panel 与宿主物理分离；本地 panel 也可能隔着 shadow 边界。
      // 以 anchor 祖先链寻找最近的已开启浮层，建立统一逻辑父子关系。
      // claim ⟺ open：重复 open 视为新的一次开启，旧会话整体作废。
      releaseHandle()
      handle = ctx.openOverlay.claim(panel, { arbitration: ctx.arbitration, ancestryFrom: anchor })
      ensureOverlay(anchor, panel)
      overlay?.open()
      showOverlayPresence(panel, { isInstant })
    }

    const dispose = () => {
      overlay?.dispose()
      overlay = undefined
      releaseHandle()
      disposePortal()
    }

    return {
      getPanel() {
        return getPanel()
      },

      getHandle() {
        return handle
      },

      open,

      async close(isStillOpen) {
        /*
         * 开启态在这一刻结束：仲裁归属与逻辑组合树同时撤销，不等退场动画。
         *
         * 撤销晚于 `open → false` 会让关闭中的面板继续当「最内层」——它已不再开启却仍
         * 占着名额，于是紧接着的 Escape 被它吞掉，外层浮层永远等不到自己那一次
         * （issue #120 承诺的「一次 Escape 关一层」退化成关不掉外面那层）。
         * 旧实现里仲裁候选读 `isOpen()`、组合树读登记表，两者寿命本就不同；本模块用
         * 「已登记 ⟺ 已开启」把二者统一到 open 语义上。
         *
         * 退场被中断（重新打开）时句柄已撤销，随后的 `open()` 会重新 claim —— 与
         * 「重复 open 视为新的一次开启」走同一条路径，不会留下无主的层。
         */
        releaseHandle()
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
