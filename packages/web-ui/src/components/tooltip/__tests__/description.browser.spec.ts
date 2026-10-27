import '..'
import '@/components/button'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getPortalPanel, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

async function openTooltip(tooltip: WebUiTooltip) {
  await waitForUpdate(tooltip)
  const trigger = tooltip.querySelector('web-ui-button')
  if (trigger) await waitForUpdate(trigger)
  tooltip.open = true
  await waitForUpdate(tooltip)
  await waitForFrame()
}

function createTooltip(content: string): WebUiTooltip {
  const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
  tooltip.content = content
  const trigger = document.createElement('web-ui-button')
  trigger.textContent = 'Trigger'
  tooltip.append(trigger)
  document.body.append(tooltip)
  return tooltip
}

describe('WebUiTooltip 可访问描述（浏览器）', () => {
  it('content 属性打开时写到 trigger 的原生焦点元素，关闭后移除', async () => {
    const tooltip = createTooltip('保存当前更改')
    const trigger = tooltip.querySelector('web-ui-button')!
    await openTooltip(tooltip)
    const innerButton = trigger.shadowRoot?.querySelector('button')
    expect(innerButton).toBeTruthy()

    expect(innerButton!.getAttribute('aria-description')).toBe('保存当前更改')
    const panel = tooltip.shadowRoot?.querySelector<HTMLElement>('[role="tooltip"]')
    expect(panel?.id).not.toBe('')

    tooltip.open = false
    await waitForUpdate(tooltip)
    expect(innerButton!.hasAttribute('aria-description')).toBe(false)
  })

  it('content 插槽的文本同样可读，打开期更新内容会同步描述', async () => {
    const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
    tooltip.innerHTML = '<button>Trigger</button><span slot="content">插槽 <b>提示</b></span>'
    document.body.append(tooltip)
    const trigger = tooltip.querySelector('button')!

    await openTooltip(tooltip)
    expect(trigger.getAttribute('aria-description')).toBe('插槽 提示')

    const content = tooltip.querySelector('[slot="content"]')!
    const next = document.createElement('span')
    next.slot = 'content'
    next.textContent = '新的提示'
    content.replaceWith(next)
    await waitForFrame()
    expect(trigger.getAttribute('aria-description')).toBe('新的提示')
  })

  it('portal 模式的面板带唯一 id，描述仍写在 trigger 上', async () => {
    const tooltip = createTooltip('Portal 说明')
    tooltip.portal = true
    const trigger = tooltip.querySelector('web-ui-button')!

    await openTooltip(tooltip)
    const innerButton = trigger.shadowRoot?.querySelector('button')
    expect(innerButton).toBeTruthy()

    const panel = getPortalPanel('tooltip')
    expect(panel?.id).not.toBe('')
    expect(innerButton!.getAttribute('aria-description')).toBe('Portal 说明')

    tooltip.open = false
    await waitForUpdate(tooltip)
    expect(innerButton!.hasAttribute('aria-description')).toBe(false)
  })

  it('关闭后还原消费者自己写的 aria-description', async () => {
    const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
    tooltip.content = '展示期说明'
    tooltip.innerHTML = '<button aria-description="原有说明">Trigger</button>'
    document.body.append(tooltip)
    const trigger = tooltip.querySelector('button')!

    await openTooltip(tooltip)
    expect(trigger.getAttribute('aria-description')).toBe('展示期说明')

    tooltip.open = false
    await waitForUpdate(tooltip)
    expect(trigger.getAttribute('aria-description')).toBe('原有说明')
  })
})
