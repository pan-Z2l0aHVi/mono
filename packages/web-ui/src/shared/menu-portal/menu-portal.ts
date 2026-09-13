import glass from '@/assets/glass.css?inline'
import menuPortalStyle from '@/assets/menu-portal.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import { resolveOverlayContainer } from '@/shared/overlay/portal'

export interface MenuPortalOverlay {
  readonly panel: HTMLElement
  readonly content: HTMLElement
}

// 菜单面板所需的共享样式。常规 overlay 容器已预注入这些样式；但当 overlay 因
// target 位于已打开原生 dialog 内而被挂到该 dialog（top layer）时，dialog 的
// shadow root 并不包含这些样式。故面板自携带一份，保证在任何容器下都能正确渲染。
const MENU_PANEL_STYLES = `${glass}
${menuPortalStyle}
${overlayMotion}`

/**
 * 菜单浮层面板：面板直接挂到 overlay 容器（与普通 Overlay Portal 共用容器解析），
 * 样式复用容器内已注入的共享菜单样式（glass/menu-portal/overlay-motion），
 * 因此无需自建 shadow。菜单内容由 dropdown/context-menu 自行构建（menu-tree），
 * 这里只提供 panel 与 content 挂载点。
 */
export function createMenuPortalOverlay(className: string, target?: Element): MenuPortalOverlay {
  const panel = document.createElement('div')
  // wui-glass 不留在面板：玻璃背景/描边由 surface 层（wui-menu-scroll）承接并随其
  // opacity 淡出；面板若保留玻璃底，blur 层会把它采进 backdrop 提亮且永不淡出。
  panel.className = `wui-menu-portal-overlay wui-floating-panel ${className}`
  panel.dataset.wuiPresence = 'entering'
  // 双层玻璃：blur 层 + surface 层（scroll 容器承接内容淡入淡出），面板自身 opacity 恒 1、
  // 背景透明，保证过渡期不成为 backdrop root、blur 连续（见 overlay-motion.css）。
  const blur = document.createElement('div')
  blur.className = 'wui-floating-panel-blur'
  blur.setAttribute('aria-hidden', 'true')
  const scroll = document.createElement('div')
  scroll.className = 'wui-menu-scroll wui-floating-panel-surface wui-glass'
  const content = document.createElement('div')
  content.className = 'wui-menu-content'
  scroll.append(content)

  const container = resolveOverlayContainer(undefined, target ?? document.body, {
    preferRootTheme: target === undefined
  })
  // 常规 overlay root 已预注入共享样式；只有 dialog 没有，因此按容器条件注入。
  if (container instanceof HTMLDialogElement) {
    const style = document.createElement('style')
    style.textContent = MENU_PANEL_STYLES
    panel.append(style)
  }
  panel.append(blur, scroll)
  container.appendChild(panel)

  return { panel, content }
}
