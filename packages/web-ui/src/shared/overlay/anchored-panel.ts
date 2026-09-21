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
   * 当前在场会话的句柄；没有任何在场会话时为 `null`。
   * 查询（`contains` / `containsEvent` / `hasFocusWithin`）与 `setInert` 都走它，
   * 调用方因此不必持有 panel 引用，也不知道存在全局注册表。
   * 退场等待期间仍是同一个句柄（暂缓仲裁），动画播完或重新 `open()` 才换人。
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
         * 第三态「可见但暂缓仲裁」：退场等待期间面板仍在场，登记不撤，但不再走关闭
         * 入口——它已经在关的路上了。撤销推迟到动画结束，或被 `open()` 以新会话取代。
         *
         * 旧实现在这里立即 `releaseHandle()`，于是两条提前返回的路径都把还看得见的面板
         * 留在未登记状态：未登记即不参与「谁是最内层」的仲裁，直到下一次 `open()` 才
         * 恢复（issue #138）。
         *
         * 暂缓层只是兜底候选：仍在开启的外层永远优先。否则「内层关掉后立刻再按一次
         * Escape」会被退场动画吞掉，外层永远等不到自己那一次——issue #120 的契约。
         *
         * 退场被打断时 `showOverlayPresence` 已把面板带回场，`open()` 同时重新 claim
         * （与「重复 open 视为新的一次开启」同一条路径），本条 `close()` 随后的
         * `return false` 不碰那个新句柄。
         *
         * 走到 `isStillOpen()` 时退场已经播完：面板已 `hidden`。此刻宿主仍认为开着，
         * 是面板状态与宿主状态不一致的那一格——把层交还仲裁而不是继续暂缓。继续暂缓的
         * 前提是「面板可见」，而这里面板已经看不见了：一个隐藏的面板无限吞掉 Escape，
         * 用户再也没有按键路径把这个状态收敛掉（按一次 Escape 走宿主的关闭入口，宿主
         * 回写 open=false 后由随后的 close() 正常收尾）。登记仍然不撤，「宿主认为开着
         * 就不掉出仲裁」的 #138 语义不变。
         */
        handle?.deferArbitration()
        overlay?.close()
        const panel = getPanel()
        if (panel && !(await hideOverlayPresence(panel))) return false
        if (isStillOpen()) {
          handle?.deferArbitration(false)
          return false
        }
        releaseHandle()
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
