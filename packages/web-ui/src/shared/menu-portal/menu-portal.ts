import menuPortalStyle from '@/assets/menu-portal.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import scrollbarStyle from '@/assets/scrollbar.css?inline'
import glass from '@/classes/glass.css?inline'
import { resolveOverlayContainer } from '@/shared/overlay/portal'

export interface MenuPortalOverlay {
  readonly panel: HTMLElement
  readonly content: HTMLElement
}

// menu panel 所需的共享样式。theme-owned/fallback overlay root 已预注入这些样式；但当 overlay 因
// target 位于已打开原生 dialog 内而被挂到该 dialog（top layer）时，dialog 的
// shadow root 并不包含这些样式。故 panel 自携带一份，保证在任何容器下都能正确渲染。
const MENU_PANEL_STYLES = `${glass}
${menuPortalStyle}
${overlayMotion}
${scrollbarStyle}`

/**
 * menu overlay panel：panel 直接挂到 overlay 容器（与普通 Overlay Portal 共用容器解析），
 * 样式复用容器内已注入的共享 menu 样式（glass/menu-portal/overlay-motion），
 * 因此无需自建 shadow。menu content 由 dropdown/context-menu 自行构建（menu-tree），
 * 这里只提供 panel 与 content 挂载点。
 */
/**
 * @param scrim 显式容器。模态化的 context-menu 传自己的 scrim `<dialog>`，panel 因此
 *   与 scrim 同处 top layer，「点外面」由 scrim 吃掉，panel 不会被下层抢走命中。
 *
   不能靠 `resolveOverlayContainer` 的祖先发现自动找到它：该函数查的是「**target 的祖先**里
     有没有已打开的 dialog」，而 scrim 是 panel 的**后代方向**，方向相反，查不到。menu panel
 *   又不在 host 的 shadow root 里（它在 `web-ui-theme` 的 overlay root 内），这条路径也断。
 *
 * 省略时行为与从前完全一致 —— dropdown 的 `target` 承重调用点（dropdown-in-dialog）
 * 一个字都不用改。
 */
export function createMenuPortalOverlay(className: string, target?: Element, scrim?: HTMLElement): MenuPortalOverlay {
  const panel = document.createElement('div')
  // 单层玻璃：wui-glass 留在 panel 自身，背景/阴影/backdrop-filter 随 panel opacity
  // 与 blur 插值一起过渡（见 overlay-motion.css），无需 blur/surface 双层。
  panel.className = `wui-menu-portal-overlay wui-floating-panel wui-glass ${className}`
  panel.dataset.wuiPresence = 'entering'
  const scroll = document.createElement('div')
  scroll.className = 'wui-menu-scroll wui-scroll'
  const content = document.createElement('div')
  content.className = 'wui-menu-content'
  scroll.append(content)

  const container =
    scrim ??
    resolveOverlayContainer(undefined, target ?? document.body, {
      preferRootTheme: target === undefined
    })
  // theme-owned/fallback overlay root 已预注入共享样式；只有 dialog 没有，因此按容器条件注入。
  if (container instanceof HTMLDialogElement) {
    const style = document.createElement('style')
    style.textContent = MENU_PANEL_STYLES
    panel.append(style)
  }
  panel.append(scroll)
  container.appendChild(panel)

  return { panel, content }
}
