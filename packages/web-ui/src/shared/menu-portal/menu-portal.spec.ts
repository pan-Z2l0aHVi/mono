import { afterEach, describe, expect, it } from 'vite-plus/test'

import { createMenuPortalOverlay } from './menu-portal'

afterEach(() => {
  document.body.replaceChildren()
})

describe('菜单 Portal 容器', () => {
  it('创建滚动视口和随内容滚动的内边距层', () => {
    const { panel, content } = createMenuPortalOverlay('context-menu')
    const scroll = panel.firstElementChild

    expect(panel.dataset.wuiPresence).toBe('entering')
    expect(scroll?.classList.contains('wui-menu-scroll')).toBe(true)
    expect(scroll?.firstElementChild).toBe(content)
  })
})
