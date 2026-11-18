import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { cleanupElement, mountElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSwitch } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（checked 默认值与不反射、name/disabled/required 反射、
 * role="switch" 与 aria-checked、input・change 事件）见
 * `src/shared/form-association/__tests__/choice-control-contract.spec.ts`；
 * 拖拽手势见 `switch-gesture.browser.spec.ts`。
 * 本文件只保留 switch 特有的公开契约。
 */
const createSwitch = (): WebUiSwitch => mountElement<WebUiSwitch>('web-ui-switch')

describe('WebUiSwitch 组件特有契约', () => {
  it('在宿主公开 switch 语义与可交互状态', async () => {
    const el = createSwitch()
    await waitForUpdate(el)

    expect(el.getAttribute('role')).toBe('switch')
    expect(el.getAttribute('aria-checked')).toBe('false')
    expect(el.getAttribute('aria-disabled')).toBe('false')
    expect(el.tabIndex).toBe(0)

    el.checked = true
    await waitForUpdate(el)
    expect(el.getAttribute('aria-checked')).toBe('true')

    el.disabled = true
    await waitForUpdate(el)
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.tabIndex).toBe(-1)

    el.disabled = false
    await waitForUpdate(el)
    expect(el.getAttribute('aria-disabled')).toBe('false')
    expect(el.tabIndex).toBe(0)

    cleanupElement(el)
  })

  it('loading 时点击不切换状态', async () => {
    const el = createSwitch()
    el.loading = true
    await waitForUpdate(el)

    el.click()
    await waitForUpdate(el)

    expect(el.checked).toBe(false)
    cleanupElement(el)
  })

  it('loading spinner 使用 theme accent token', async () => {
    const el = createSwitch()
    el.loading = true
    await waitForUpdate(el)

    // jsdom 不解析 var()，computed-color 对表由 switch-loading.browser.spec.ts 承担；
    // 这里钉「接线仍在」：颜色最终落到 icon 内 svg 的行内 style（消费点），而
    // 不只是查透传的 color attribute。
    const svg = el.shadowRoot?.querySelector('web-ui-icon')?.shadowRoot?.querySelector('svg')
    expect((svg as HTMLElement | null)?.style.color ?? '').toContain('--wui-color-accent')
    cleanupElement(el)
  })

  it('多次点击每次都派发一次 input 与 change', async () => {
    const el = createSwitch()
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    for (let i = 0; i < 3; i++) {
      el.click()
      await waitForUpdate(el)
    }

    expect(inputEvents).toHaveLength(3)
    expect(changeEvents).toHaveLength(3)
    cleanupElement(el)
  })
})
