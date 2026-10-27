import '..'

import { describe, expect, it } from 'vite-plus/test'

import {
  cleanupElement,
  contractReflection,
  flushSlotChange,
  mountElement,
  queryA11y,
  waitForUpdate
} from '@/shared/test-utils'

import type { WebUiBadge } from '..'

const createBadge = (attrs?: Record<string, string>, slotContent?: string): WebUiBadge =>
  mountElement<WebUiBadge>('web-ui-badge', { attrs, html: slotContent })

/** 徽章本体：公开语义是 `role="status"`，文案与 label 挂在它上面。 */
const statusOf = (el: WebUiBadge): Element | null => queryA11y(el, '[role="status"]')

describe('WebUiBadge 组件', () => {
  contractReflection('property 写入后同步到宿主 attribute', () => createBadge(), [
    ['count', 42, 'count', '42'],
    ['max', 999, 'max', '999'],
    ['placement', 'bottom-left', 'placement', 'bottom-left'],
    ['offsetX', -4, 'offset-x', '-4'],
    ['offsetY', 8, 'offset-y', '8']
  ])

  describe('count 与 max 的显示语义', () => {
    it.each([
      ['count=5', { count: '5' }, '5'],
      ['count=0 且未开 show-zero', { count: '0' }, null],
      ['count=100/max=99 收敛为 99+', { count: '100', max: '99' }, '99+'],
      ['count 等于 max 时不加后缀', { count: '99', max: '99' }, '99'],
      ['count 低于 max 时原样显示', { count: '50', max: '99' }, '50']
    ])('%s', async (_label, attrs, expectedText) => {
      const el = createBadge(attrs as Record<string, string>)
      await waitForUpdate(el)

      const status = statusOf(el)
      expect(status?.textContent?.trim() ?? null).toBe(expectedText)
      cleanupElement(el)
    })

    // count 会被 clamp 到 >= 0；负值若漏过 clamp，显示逻辑会把它当「有未读」渲染出来。
    it('负 count 被钳制为 0，并按 0 决定可见性', async () => {
      const el = createBadge()
      await waitForUpdate(el)

      el.count = -5
      await waitForUpdate(el)

      expect(el.count).toBe(0)
      expect(el.getAttribute('count')).toBe('0')
      expect(statusOf(el)).toBeNull()
      cleanupElement(el)
    })
  })

  describe('aria-label 覆盖', () => {
    it('计数态回退内置英文并带 {count} 插值', async () => {
      const el = createBadge({ count: '5' })
      await waitForUpdate(el)

      expect(statusOf(el)?.getAttribute('aria-label')).toBe('5 unread messages')
      cleanupElement(el)
    })

    it('宿主 aria-label 设置后三种状态都用它（支持 {count} 占位）', async () => {
      const dot = createBadge({ dot: '', 'aria-label': '新通知' })
      await waitForUpdate(dot)
      expect(statusOf(dot)?.getAttribute('aria-label')).toBe('新通知')
      cleanupElement(dot)

      const counted = createBadge({ count: '7', 'aria-label': '{count} 条新通知' })
      await waitForUpdate(counted)
      expect(statusOf(counted)?.getAttribute('aria-label')).toBe('7 条新通知')
      cleanupElement(counted)

      const zero = createBadge({ count: '0', 'show-zero': '', 'aria-label': '没有新通知' })
      await waitForUpdate(zero)
      expect(statusOf(zero)?.getAttribute('aria-label')).toBe('没有新通知')
      cleanupElement(zero)
    })
  })

  describe('dot / show-zero / badge-hidden', () => {
    it('dot 模式显示无文本圆点并标注「未读」', async () => {
      const el = createBadge({ dot: '' })
      await waitForUpdate(el)

      const status = statusOf(el)
      expect(status?.textContent?.trim()).toBe('')
      expect(status?.getAttribute('aria-label')).toBe('Unread')
      cleanupElement(el)
    })

    it('dot 模式下 count=0 仍显示', async () => {
      const el = createBadge({ count: '0', dot: '' })
      await waitForUpdate(el)

      expect(statusOf(el)).toBeTruthy()
      cleanupElement(el)
    })

    it('show-zero 时 count=0 显示 0 并标注「无未读消息」', async () => {
      const el = createBadge({ count: '0', 'show-zero': '' })
      await waitForUpdate(el)

      const status = statusOf(el)
      expect(status?.textContent?.trim()).toBe('0')
      expect(status?.getAttribute('aria-label')).toBe('No unread messages')
      cleanupElement(el)
    })

    it('badge-hidden 时不显示', async () => {
      const el = createBadge({ count: '5', 'badge-hidden': '' })
      await waitForUpdate(el)

      expect(statusOf(el)).toBeNull()
      cleanupElement(el)
    })
  })

  describe('非法值回退', () => {
    it('非法 placement 回退为 top-right 并修正宿主 attribute', async () => {
      const el = createBadge()
      await waitForUpdate(el)

      el.setAttribute('placement', 'invalid-position')
      await waitForUpdate(el)

      expect(el.placement).toBe('top-right')
      expect(el.getAttribute('placement')).toBe('top-right')
      cleanupElement(el)
    })
  })

  // 徽章挂在内联元素旁时标记「固定定位」外观；这份标记由 slot 内容的有无驱动。
  describe('slot 内容', () => {
    it('携带 slot 内容时徽章与内容共存', async () => {
      const el = createBadge({ count: '3' }, '<button>消息</button>')
      await waitForUpdate(el)

      expect(statusOf(el)?.textContent?.trim()).toBe('3')
      expect(el.querySelector('button')?.textContent).toBe('消息')
      cleanupElement(el)
    })

    it('slot 内容增删不改变徽章可见性与 label', async () => {
      const el = createBadge({ count: '3' })
      await waitForUpdate(el)

      const child = document.createElement('button')
      child.textContent = '消息'
      el.append(child)
      await flushSlotChange(el)
      expect(statusOf(el)?.getAttribute('aria-label')).toBe('3 unread messages')

      child.remove()
      await flushSlotChange(el)
      expect(statusOf(el)?.getAttribute('aria-label')).toBe('3 unread messages')
      cleanupElement(el)
    })
  })
})
