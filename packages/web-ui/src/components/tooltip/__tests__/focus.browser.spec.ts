import '..'
import '@/components/button'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import type { WebUiButton } from '@/components/button'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

function mountShadowTriggerTooltip(): { tooltip: WebUiTooltip; trigger: WebUiButton } {
  const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
  tooltip.content = 'Keyboard tooltip'
  tooltip.showDelay = 2000

  const trigger = document.createElement('web-ui-button')
  trigger.textContent = 'Trigger'
  tooltip.append(trigger)
  document.body.append(tooltip)

  return { tooltip, trigger }
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
})
