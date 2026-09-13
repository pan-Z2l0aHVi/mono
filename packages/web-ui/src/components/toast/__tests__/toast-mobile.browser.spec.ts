import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('WebUiToast 移动端适配（浏览器）', () => {
  it('窄视口下保留两侧 viewport gap，不再撑出横向滚动', async () => {
    await page.viewport(320, 568)
    const el = document.createElement('web-ui-toast')
    el.message = 'viewport width test'
    el.visible = true
    document.body.append(el)
    await el.updateComplete

    const toast = el.shadowRoot?.querySelector<HTMLElement>('.toast')
    expect(toast).toBeTruthy()
    expect(toast!.getBoundingClientRect().width).toBe(288)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320)
  })

  it('toast 玻璃使用双层结构：blur 层 + surface 层各自 opacity 过渡', async () => {
    const el = document.createElement('web-ui-toast')
    el.message = 'blur continuity'
    el.visible = true
    document.body.append(el)
    await el.updateComplete

    const toast = el.shadowRoot?.querySelector<HTMLElement>('.toast')
    const blur = toast?.querySelector('.toast-blur') as HTMLElement
    const surface = toast?.querySelector('.toast-surface') as HTMLElement
    expect(blur).toBeTruthy()
    expect(surface).toBeTruthy()
    // toast 自身 opacity 恒 1、只做 transform 过渡（避免成为 backdrop root）
    expect(getComputedStyle(toast!).transitionProperty).not.toContain('opacity')
    expect(getComputedStyle(blur).backdropFilter).not.toBe('none')
    expect(getComputedStyle(blur).transitionProperty).toContain('opacity')
    expect(getComputedStyle(surface).transitionProperty).toContain('opacity')
  })
})
