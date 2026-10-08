import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/context-menu'
import '@/components/dropdown-item'
import '@/components/popover'
import '@/components/theme'
import type { WebUiContextMenu } from '@/components/context-menu'
import type { WebUiPopover } from '@/components/popover'
import { getMenuPanels, getPortalPanels } from '@/shared/test-utils'

interface ThemedHost extends HTMLElement {
  appearance: string
  updateComplete: Promise<unknown>
  getOverlayRoot(): HTMLElement | undefined
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

afterEach(() => document.body.replaceChildren())

/*
 * 浮层定位器「穿 shadow 边界」的守卫。
 *
 * 模态化 context-menu 的 scrim 挂在**最近主题的 overlay root 里**，那层在 `<web-ui-theme>`
 * 的 shadow root 内 —— `document.querySelectorAll` 穿不过 shadow 边界。定位器若漏掉这条，
 * 带主题的用例不会报错，而是**静默退化**：`getMenuPanels()` / `getPortalPanels()` 恒返回空，
 * 下游写 `toHaveLength(0)` 的断言永远绿。所以这里必须真的查到面板，而不是断言「容器存在」。
 *
 * 反事实：把 `getOverlayContainers()` 的 scrim 分支改回只查 `document`（不穿 shadow），
 * 本用例两条断言都会红。
 */
describe('浮层定位器（带主题，浏览器）', () => {
  it('主题 shadow 内的模态 context-menu：getMenuPanels 与 getPortalPanels 都查得到面板', async () => {
    const theme = document.createElement('web-ui-theme') as ThemedHost
    theme.appearance = 'dark'
    document.body.append(theme)
    await theme.updateComplete

    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    // 菜单项里再嵌一个 anchored 浮层：它随菜单项迁进面板，于是同样落在 scrim 内，
    // 用来钉住 `getPortalPanels()` 那条路径（它要求容器下挂着带 shadow 的 portal host）。
    menu.innerHTML = `
      <web-ui-dropdown-item>
        Actions
        <web-ui-popover portal>
          <button slot="trigger">Nested</button>
          <div>Nested panel</div>
        </web-ui-popover>
      </web-ui-dropdown-item>`
    theme.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const menuPanels = getMenuPanels('上下文菜单')
    expect(menuPanels.length).toBe(1)
    expect(menuPanels[0]?.textContent).toContain('Actions')

    const nested = menuPanels[0]?.querySelector<WebUiPopover>('web-ui-popover')
    expect(nested).toBeTruthy()
    nested!.show()
    await nested!.updateComplete
    await nextFrame()

    const portalPanels = getPortalPanels('dialog').filter(panel => panel.textContent?.includes('Nested panel'))
    expect(portalPanels.length).toBe(1)
  })
})
