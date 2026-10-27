import '@/components/theme'

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

  it('省略 target 时挂到 root theme 的 theme-owned overlay root', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.appendChild(theme)
    await theme.updateComplete
    const root = theme.getOverlayRoot()
    if (!root) throw new Error('Expected the theme to expose an overlay root')

    const { panel } = createMenuPortalOverlay('context-menu')

    expect(root.contains(panel), 'panel 应挂在 theme 自己的 overlay root 内').toBe(true)
  })
})
