import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createMenuPortalOverlay } from '../menu-portal'

afterEach(() => {
  document.body.replaceChildren()
})

describe('菜单 Portal 容器', () => {
  it('创建 portal 面板并将内容挂载到面板内', () => {
    const { panel, content } = createMenuPortalOverlay('context-menu')

    expect(panel.dataset.wuiPresence).toBe('entering')
    expect(content.isConnected).toBe(true)
    expect(panel.contains(content)).toBe(true)
  })

  it('省略 target 时挂到 root theme 的 overlay root', () => {
    const theme = document.createElement('web-ui-theme')
    const fakeRoot = document.createElement('div')
    ;(theme as unknown as { getOverlayRoot: () => HTMLElement }).getOverlayRoot = () => fakeRoot
    document.body.appendChild(theme)

    const { panel } = createMenuPortalOverlay('context-menu')

    expect(panel.parentElement).toBe(fakeRoot)
  })
})
