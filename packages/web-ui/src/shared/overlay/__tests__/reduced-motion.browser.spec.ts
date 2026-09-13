import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/dialog'
import '@/components/drawer'
import '@/components/dropdown'
import '@/components/switch'
import '@/components/theme'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// "移除位移"的行为断言：none 与 translate(0,0) 在渲染上等价，均视为零位移；
// 不锁定浏览器对 transform 的序列化格式。
function expectNoTranslation(transform: string): void {
  const matrix = !transform || transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform)
  expect(matrix.m41).toBe(0)
  expect(matrix.m42).toBe(0)
}

afterEach(() => document.body.replaceChildren())

describe('减少动效（浏览器）', () => {
  it('Dialog 和 Drawer 移除位移并保留透明度过渡', async () => {
    const dialog = document.createElement('web-ui-dialog')
    document.body.append(dialog)
    dialog.open = true
    await dialog.updateComplete
    await nextFrame()

    const dialogElement = dialog.shadowRoot?.querySelector('dialog')
    expectNoTranslation(getComputedStyle(dialogElement!).transform)
    // dialog 元素自身不再过渡 opacity（opacity<1 会形成 backdrop root、禁用玻璃模糊），
    // 淡入淡出由内容层与模糊层承担，reduce 下两者仍保留 opacity 过渡。
    const surface = dialogElement?.querySelector('.wui-dialog-surface') as HTMLElement
    const blurLayer = dialogElement?.querySelector('.wui-dialog-blur') as HTMLElement
    expect(getComputedStyle(surface).transitionProperty).toContain('opacity')
    expect(getComputedStyle(blurLayer).transitionProperty).toContain('opacity')

    dialog.remove()

    const drawer = document.createElement('web-ui-drawer')
    document.body.append(drawer)
    drawer.open = true
    await drawer.updateComplete
    await nextFrame()

    const drawerElement = drawer.shadowRoot?.querySelector('dialog')
    expectNoTranslation(getComputedStyle(drawerElement!).transform)
    expect(getComputedStyle(drawerElement!).transitionProperty).toContain('opacity')
  })

  it('锚定浮层移除缩放并保留透明度过渡', async () => {
    const menu = document.createElement('web-ui-dropdown')
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
