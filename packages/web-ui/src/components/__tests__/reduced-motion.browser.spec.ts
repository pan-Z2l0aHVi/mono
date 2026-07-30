import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/dialog'
import '@/components/drawer'
import '@/components/dropdown-menu'
import type { WebUiDialog } from '@/components/dialog'
import type { WebUiDrawer } from '@/components/drawer'
import type { WebUiDropdownMenu } from '@/components/dropdown-menu'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

afterEach(() => document.body.replaceChildren())

describe('reduced-motion（浏览器）', () => {
  it('Dialog 和 Drawer 移除位移并保留透明度过渡', async () => {
    const dialog = document.createElement('web-ui-dialog') as WebUiDialog
    document.body.append(dialog)
    dialog.open = true
    await dialog.updateComplete
    await nextFrame()

    const dialogElement = dialog.shadowRoot?.querySelector('dialog')
    expect(getComputedStyle(dialogElement!).transform).toBe('none')
    expect(getComputedStyle(dialogElement!).transitionProperty).toContain('opacity')

    dialog.remove()

    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    document.body.append(drawer)
    drawer.open = true
    await drawer.updateComplete
    await nextFrame()

    const drawerElement = drawer.shadowRoot?.querySelector('dialog')
    expect(getComputedStyle(drawerElement!).transform).toBe('none')
    expect(getComputedStyle(drawerElement!).transitionProperty).toContain('opacity')
  })

  it('锚定浮层移除缩放并保留透明度过渡', async () => {
    const menu = document.createElement('web-ui-dropdown-menu') as WebUiDropdownMenu
    menu.innerHTML = '<button slot="trigger">Menu</button><web-ui-dropdown-item>Item</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
    const panel = root?.querySelector<HTMLElement>('[role="menu"]')
    expect(getComputedStyle(panel!).transform).toBe('none')
    expect(getComputedStyle(panel!).transitionProperty).toContain('opacity')
  })
})
