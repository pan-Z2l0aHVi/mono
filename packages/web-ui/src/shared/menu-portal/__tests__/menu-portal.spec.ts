import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createMenuPortalOverlay } from '../menu-portal'

afterEach(() => {
  document.body.replaceChildren()
})

describe('menu Portal 容器', () => {
  it('创建 portal panel 并将内容挂载到 panel 内', () => {
    const { panel, content } = createMenuPortalOverlay('context-menu')

    expect(panel.isConnected).toBe(true)
    expect(content.isConnected).toBe(true)
    expect(panel.contains(content)).toBe(true)
  })

  it('省略 target 时挂到 root theme 的 theme-owned overlay root', () => {
    const theme = document.createElement('web-ui-theme')
    const fakeRoot = document.createElement('div')
    ;(theme as unknown as { getOverlayRoot: () => HTMLElement }).getOverlayRoot = () => fakeRoot
    document.body.appendChild(theme)

    const { panel } = createMenuPortalOverlay('context-menu')

    expect(panel.parentElement).toBe(fakeRoot)
  })
})
