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
})
