import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

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
