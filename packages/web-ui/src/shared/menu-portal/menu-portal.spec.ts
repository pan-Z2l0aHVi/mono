import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createMenuPortalOverlay } from './menu-portal'

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
})
