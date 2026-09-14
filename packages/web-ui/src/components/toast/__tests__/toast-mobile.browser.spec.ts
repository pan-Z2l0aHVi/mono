import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { pollUntil } from '@/shared/test-utils'

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

  it('toast 单层玻璃：toast 自身 opacity + backdrop-filter 插值过渡', async () => {
    const el = document.createElement('web-ui-toast')
    el.message = 'blur continuity'
    el.visible = true
    document.body.append(el)
    await el.updateComplete

    const toast = el.shadowRoot?.querySelector<HTMLElement>('.toast')
    expect(toast).toBeTruthy()
    // 单层玻璃：wui-glass 在 toast 自身，背景/阴影/blur 都由它承担，
    // opacity + backdrop-filter（blur(0px)↔blur(4px)）+ transform 一起过渡。
    expect(toast!.classList.contains('wui-glass')).toBe(true)
    expect(getComputedStyle(toast!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(toast!).transitionProperty).toContain('opacity')
    expect(getComputedStyle(toast!).transitionProperty).toContain('backdrop-filter')
    expect(getComputedStyle(toast!).transitionProperty).toContain('transform')
    expect(getComputedStyle(toast!).backdropFilter).toContain('blur(4px)')

    // 退场：toast 自身 opacity 从 1 淡出、blur 回 0px 插值起点，背景随自身淡出
    // （无独立 surface，自然无白底残影层）。
    el.visible = false
    await el.updateComplete
    expect(getComputedStyle(toast!).transitionProperty).toContain('opacity')
    await pollUntil(() => getComputedStyle(toast!).opacity !== '1', 'toast did not fade out')
  })
})
