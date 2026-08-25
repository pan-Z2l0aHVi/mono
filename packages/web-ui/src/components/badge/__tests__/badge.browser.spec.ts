import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiBadge } from '..'

async function waitForSlotChange(el: WebUiBadge, mutate: () => void): Promise<void> {
  const slot = el.shadowRoot!.querySelector('slot')!
  const slotChanged = new Promise<void>(resolve => slot.addEventListener('slotchange', () => resolve(), { once: true }))
  mutate()
  await slotChanged
  await el.updateComplete
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('WebUiBadge 组件（浏览器）', () => {
  it('插入和删除 slot 内容时同步徽章定位', async () => {
    const badge = document.createElement('web-ui-badge')
    badge.setAttribute('count', '3')
    document.body.append(badge)
    await badge.updateComplete

    let status = badge.shadowRoot!.querySelector<HTMLElement>('[role="status"]')!
    expect(getComputedStyle(status).position).not.toBe('absolute')

    const content = document.createElement('button')
    content.textContent = '消息'
    await waitForSlotChange(badge, () => badge.append(content))
    status = badge.shadowRoot!.querySelector<HTMLElement>('[role="status"]')!
    expect(getComputedStyle(status).position).toBe('absolute')

    await waitForSlotChange(badge, () => content.remove())
    status = badge.shadowRoot!.querySelector<HTMLElement>('[role="status"]')!
    expect(getComputedStyle(status).position).not.toBe('absolute')
  })

  it('反复断开重连后仍保持单次 slot 状态语义', async () => {
    const badge = document.createElement('web-ui-badge')
    badge.setAttribute('count', '3')
    document.body.append(badge)
    await badge.updateComplete

    for (let index = 0; index < 5; index++) {
      badge.remove()
      document.body.append(badge)
      await badge.updateComplete
    }

    const content = document.createElement('span')
    content.textContent = '消息'
    await waitForSlotChange(badge, () => badge.append(content))
    let status = badge.shadowRoot!.querySelector<HTMLElement>('[role="status"]')!
    expect(getComputedStyle(status).position).toBe('absolute')

    await waitForSlotChange(badge, () => content.remove())
    status = badge.shadowRoot!.querySelector<HTMLElement>('[role="status"]')!
    expect(getComputedStyle(status).position).not.toBe('absolute')
  })
})
