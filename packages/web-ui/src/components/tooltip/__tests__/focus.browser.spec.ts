import '..'
import '@/components/button'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import type { WebUiButton } from '@/components/button'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

function createTooltip(attrs: Record<string, string>): { tooltip: WebUiTooltip; trigger: WebUiButton } {
  const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
  for (const [name, value] of Object.entries(attrs)) tooltip.setAttribute(name, value)
  tooltip.content = 'Keyboard tooltip'

  const trigger = document.createElement('web-ui-button')
  trigger.textContent = 'Trigger'
  tooltip.append(trigger)
  document.body.append(tooltip)

  return { tooltip, trigger }
}

// show-delay 拉到 2 秒：下面的用例都要在「不等延迟」的路径上判定，避免和悬停延迟抢时间。
function mountShadowTriggerTooltip(): { tooltip: WebUiTooltip; trigger: WebUiButton } {
  return createTooltip({ 'show-delay': '2000' })
}

describe('WebUiTooltip 焦点触发（浏览器）', () => {
  it('Tab 聚焦 web-ui-button 的 shadow 按钮后立即显示', async () => {
    const { tooltip, trigger } = mountShadowTriggerTooltip()
    await waitForUpdate(tooltip)
    await waitForUpdate(trigger)

    await userEvent.keyboard('{Tab}')
    await waitForUpdate(tooltip)

    const innerButton = trigger.shadowRoot?.querySelector('button')
    expect(document.activeElement).toBe(trigger)
    expect(trigger.shadowRoot?.activeElement).toBe(innerButton)
    expect(innerButton?.matches(':focus-visible')).toBe(true)
    expect(trigger.matches(':focus-visible')).toBe(false)
    expect(tooltip.open).toBe(true)
    expect(queryA11y(tooltip, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(false)

    cleanupElement(tooltip)
  })

  it('鼠标点击聚焦 web-ui-button 时不立即显示', async () => {
    const { tooltip, trigger } = mountShadowTriggerTooltip()
    await waitForUpdate(tooltip)
    await waitForUpdate(trigger)

    const innerButton = trigger.shadowRoot?.querySelector('button')
    expect(innerButton).toBeTruthy()
    await userEvent.click(innerButton!)
    await waitForUpdate(tooltip)

    expect(trigger.shadowRoot?.activeElement).toBe(innerButton)
    expect(innerButton?.matches(':focus-visible')).toBe(false)
    expect(tooltip.open).toBe(false)
    expect(queryA11y(tooltip, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(true)

    cleanupElement(tooltip)
  })

  it('click focus 集合下鼠标点击只切换一次', async () => {
    const { tooltip, trigger } = createTooltip({ trigger: 'click focus' })
    await waitForUpdate(tooltip)
    await waitForUpdate(trigger)

    // 真实点击先聚焦再派发 click：focus 侧不能把它算成一次开合。
    const innerButton = trigger.shadowRoot?.querySelector('button')
    expect(innerButton).toBeTruthy()
    await userEvent.click(innerButton!)
    await waitForUpdate(tooltip)

    expect(tooltip.open).toBe(true)
    expect(queryA11y(tooltip, '[role="tooltip"]')?.hasAttribute('hidden')).toBe(false)

    cleanupElement(tooltip)
  })

  it('click 集合下键盘聚焦不打开', async () => {
    const { tooltip, trigger } = createTooltip({ trigger: 'click' })
    await waitForUpdate(tooltip)
    await waitForUpdate(trigger)

    await userEvent.keyboard('{Tab}')
    await waitForUpdate(tooltip)

    expect(trigger.shadowRoot?.activeElement).toBeTruthy()
    expect(tooltip.open).toBe(false)

    cleanupElement(tooltip)
  })
})
