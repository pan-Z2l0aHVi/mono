import '..'
import '@/components/button'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { flush, flushSlotChange, queryA11y } from '@/shared/test-utils'

import type { WebUiBadge } from '..'

afterEach(() => document.body.replaceChildren())

function createBadge(content?: string): WebUiBadge {
  const el = document.createElement('web-ui-badge') as WebUiBadge
  el.count = 3
  if (content !== undefined) el.innerHTML = content
  document.body.append(el)
  return el
}

function expectBadgeOverContent(el: WebUiBadge): void {
  const status = queryA11y(el, '[role="status"]')
  if (!status) throw new Error('web-ui-badge 缺少状态角标')

  const hostBox = el.getBoundingClientRect()
  const badgeBox = status.getBoundingClientRect()
  expect(badgeBox.left + badgeBox.width / 2).toBeCloseTo(hostBox.right, 0)
  expect(badgeBox.top + badgeBox.height / 2).toBeCloseTo(hostBox.top, 0)
}

function expectBadgeInline(el: WebUiBadge): void {
  const status = queryA11y(el, '[role="status"]')
  if (!status) throw new Error('web-ui-badge 缺少状态角标')
  expect(status.getBoundingClientRect().top).toBeGreaterThanOrEqual(el.getBoundingClientRect().top)
}

describe('web-ui-badge 的默认插槽定位（浏览器）', () => {
  it.each([
    ['纯文本', '收件箱'],
    ['元素', '<span>收件箱</span>']
  ])('%s 内容时角标叠加在宿主右上角', async (_label, content) => {
    const el = createBadge(content)
    await el.updateComplete
    await flushSlotChange(el)

    expect(queryA11y(el, '[role="status"]')).not.toBeNull()
    expectBadgeOverContent(el)
  })

  it.each([
    ['空白文本', ' \n\t '],
    ['注释', '<!-- no visible content -->']
  ])('%s 不触发角标叠加定位', async (_label, content) => {
    const el = createBadge(content)
    await el.updateComplete
    await flushSlotChange(el)

    expect(queryA11y(el, '[role="status"]')).not.toBeNull()
    expectBadgeInline(el)
  })

  it('同一文本节点变成可见文字或空白时更新定位', async () => {
    const el = createBadge(' \t ')
    await el.updateComplete
    await flushSlotChange(el)
    expectBadgeInline(el)

    const textNode = el.firstChild
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) throw new Error('默认插槽缺少文本节点')

    textNode.textContent = '收件箱'
    await flush()
    await el.updateComplete
    expect(textNode.textContent).toBe('收件箱')
    expectBadgeOverContent(el)

    textNode.textContent = ' \t '
    await flush()
    await el.updateComplete
    expect(textNode.textContent).toBe(' \t ')
    expectBadgeInline(el)
  })

  it('插入默认插槽文本后切换为叠加定位，移除后恢复行内定位', async () => {
    const el = createBadge()
    await el.updateComplete

    el.append('收件箱')
    await flushSlotChange(el)
    expect(el.textContent).toBe('收件箱')
    expectBadgeOverContent(el)

    el.replaceChildren()
    await flushSlotChange(el)
    expect(el.textContent).toBe('')

    const status = queryA11y(el, '[role="status"]')
    if (!status) throw new Error('web-ui-badge 缺少状态角标')
    expect(status.getBoundingClientRect().top).toBeGreaterThan(el.getBoundingClientRect().top)
  })
})

describe('WebUiBadge 指针命中（浏览器）', () => {
  it('点击角标与插槽控件的重叠区域时触发控件 click', async () => {
    const badge = document.createElement('web-ui-badge') as WebUiBadge
    badge.count = 5

    const button = document.createElement('web-ui-button')
    button.textContent = 'Messages'
    badge.append(button)
    document.body.append(badge)

    await badge.updateComplete

    const status = badge.shadowRoot?.querySelector<HTMLElement>('[role="status"]')
    expect(status, 'badge 应有可访问的 status 指示').toBeTruthy()

    const buttonRect = button.getBoundingClientRect()
    const statusRect = status!.getBoundingClientRect()
    const overlap = {
      left: Math.max(buttonRect.left, statusRect.left),
      right: Math.min(buttonRect.right, statusRect.right),
      top: Math.max(buttonRect.top, statusRect.top),
      bottom: Math.min(buttonRect.bottom, statusRect.bottom)
    }
    expect(overlap.right).toBeGreaterThan(overlap.left)
    expect(overlap.bottom).toBeGreaterThan(overlap.top)

    let clickCount = 0
    button.addEventListener('click', () => clickCount++)

    await page.elementLocator(button).click({
      position: {
        x: (overlap.left + overlap.right) / 2 - buttonRect.left,
        y: (overlap.top + overlap.bottom) / 2 - buttonRect.top
      }
    })

    expect(clickCount).toBe(1)
  })
})
