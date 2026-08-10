import { resolveOverlayContainer } from '@/shared/overlay/portal'

export interface MenuPortalOverlay {
  readonly panel: HTMLElement
  readonly content: HTMLElement
}

/**
 * 菜单浮层面板：面板直接挂到 overlay 容器（与普通 Overlay Portal 共用容器解析），
 * 样式复用容器内已注入的共享菜单样式（glass/menu-portal/overlay-motion），
 * 因此无需自建 shadow。菜单内容由 dropdown/context-menu 自行构建（menu-tree），
 * 这里只提供 panel 与 content 挂载点。
 */
export function createMenuPortalOverlay(className: string, target?: Element): MenuPortalOverlay {
  const panel = document.createElement('div')
  panel.className = `wui-menu-portal-overlay wui-floating-panel wui-glass ${className}`
  panel.dataset.wuiPresence = 'entering'
  const scroll = document.createElement('div')
  scroll.className = 'wui-menu-scroll'
  const content = document.createElement('div')
  content.className = 'wui-menu-content'
  scroll.append(content)
  panel.append(scroll)

  const container = resolveOverlayContainer(undefined, target ?? document.body, {
    preferRootTheme: target === undefined
  })
  container.appendChild(panel)

  return { panel, content }
}
