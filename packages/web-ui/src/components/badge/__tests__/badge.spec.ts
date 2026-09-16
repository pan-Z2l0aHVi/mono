import { describe, expect, it } from 'vite-plus/test'

import {
  cleanupElement,
  contractReflection,
  expectReflected,
  flushSlotChange,
  mountElement,
  queryA11y,
  waitForUpdate
} from '@/shared/test-utils'

import '..'
import type { WebUiBadge } from '..'

const createBadge = (attrs?: Record<string, string>, slotContent?: string): WebUiBadge =>
  mountElement<WebUiBadge>('web-ui-badge', { attrs, html: slotContent })

const statusOf = (el: WebUiBadge): Element | null => queryA11y(el, '[role="status"]')

describe('WebUiBadge 组件', () => {
  describe('默认属性与反射', () => {
    it('默认值符合契约', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      expect(el.count).toBe(0)
      expect(el.max).toBe(99)
      expect(el.placement).toBe('top-right')
      expect(el.dot).toBe(false)
      expect(el.showZero).toBe(false)
      expect(el.badgeHidden).toBe(false)
      expect(el.offsetX).toBe(0)
      expect(el.offsetY).toBe(0)
      cleanupElement(el)
    })

    contractReflection('property 写入后同步到宿主 attribute', () => createBadge(), [
      ['count', 42, 'count', '42'],
      ['max', 999, 'max', '999'],
      ['placement', 'bottom-left', 'placement', 'bottom-left'],
      ['offsetX', -4, 'offset-x', '-4'],
      ['offsetY', 8, 'offset-y', '8']
    ])

    it('dot 布尔属性反射（存在语义）', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.dot = true
      await waitForUpdate(el)
      expect(el.dot).toBe(true)
      expectReflected(el, 'dot', true)
      el.dot = false
      await waitForUpdate(el)
      expect(el.dot).toBe(false)
      expectReflected(el, 'dot', false)
      cleanupElement(el)
    })
  })

  describe('count 显示行为', () => {
    it.each([
      [{ count: '5' }, '5', true],
      [{ count: '0' }, null, false],
      [{ count: '100', max: '99' }, '99+', true],
      [{ count: '99', max: '99' }, '99', true],
      [{ count: '50', max: '99' }, '50', true]
    ] as const)('count/max 组合显示 %o -> %s', async (attrs, expectedText, shouldShow) => {
      const el = createBadge(attrs as Record<string, string>)
      await waitForUpdate(el)
      const status = statusOf(el)
      expect(!!status).toBe(shouldShow)
      expect(status?.textContent?.trim() ?? null).toBe(expectedText)
      cleanupElement(el)
    })

    it('极大 count 值显示 max+', async () => {
      const el = createBadge({ count: '999999' })
      await waitForUpdate(el)
      expect(statusOf(el)?.textContent?.trim()).toBe('99+')
      cleanupElement(el)
    })

    it('count 负值被钳制为 0，同样按 0 决定可见性', async () => {
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

  describe('dot / show-zero / badge-hidden', () => {
    it('dot 模式显示空圆点且 aria-label=未读', async () => {
      const el = createBadge({ dot: '' })
      await waitForUpdate(el)
      const status = statusOf(el)
      expect(status).toBeTruthy()
      expect(status?.textContent?.trim()).toBe('')
      expect(status?.getAttribute('aria-label')).toBe('未读')
      cleanupElement(el)
    })

    it('dot 模式即使 count=0 也显示', async () => {
      const el = createBadge({ count: '0', dot: '' })
      await waitForUpdate(el)
      expect(statusOf(el)).toBeTruthy()
      cleanupElement(el)
    })

    it('show-zero 时 count=0 显示 0', async () => {
      const el = createBadge({ count: '0', 'show-zero': '' })
      await waitForUpdate(el)
      expect(statusOf(el)?.textContent?.trim()).toBe('0')
      cleanupElement(el)
    })

    it('show-zero 且 count=0 时 aria-label 标注无未读消息', async () => {
      const el = createBadge({ count: '0', 'show-zero': '' })
      await waitForUpdate(el)
      expect(statusOf(el)?.getAttribute('aria-label')).toBe('无未读消息')
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
    it('非法 placement 回退为 top-right', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.setAttribute('placement', 'invalid-position')
      await waitForUpdate(el)
      expect(el.placement).toBe('top-right')
      expect(el.getAttribute('placement')).toBe('top-right')
      cleanupElement(el)
    })
  })

  describe('插槽与原生组合', () => {
    it('携带 slot 内容时与徽章共存（组件间组合）', async () => {
      const el = createBadge({ count: '3' }, '<button>消息</button>')
      await waitForUpdate(el)
      expect(statusOf(el)?.textContent?.trim()).toBe('3')
      expect(el.querySelector('button')?.textContent).toBe('消息')
      cleanupElement(el)
    })

    it('slot 内容增删不改变徽章可见性与 aria-label', async () => {
      const el = createBadge({ count: '3' })
      await waitForUpdate(el)
      expect(statusOf(el)).toBeTruthy()
      expect(statusOf(el)?.getAttribute('aria-label')).toBe('3 条未读消息')

      const child = document.createElement('button')
      child.textContent = '消息'
      el.append(child)
      await flushSlotChange(el)
      expect(statusOf(el)).toBeTruthy()
      expect(statusOf(el)?.getAttribute('aria-label')).toBe('3 条未读消息')

      child.remove()
      await flushSlotChange(el)
      expect(statusOf(el)).toBeTruthy()
      expect(statusOf(el)?.getAttribute('aria-label')).toBe('3 条未读消息')
      cleanupElement(el)
    })
  })

  describe('无障碍（对外可见）', () => {
    it('徽章拥有 role=status 且有可读 label', async () => {
      const el = createBadge({ count: '1' })
      await waitForUpdate(el)
      const status = statusOf(el)
      expect(status).toBeTruthy()
      expect(status?.getAttribute('aria-label')).toBe('1 条未读消息')
      cleanupElement(el)
    })

    it('count>0 与 dot 的 aria-label 区分', async () => {
      const c = createBadge({ count: '3' })
      await waitForUpdate(c)
      expect(statusOf(c)?.getAttribute('aria-label')).toBe('3 条未读消息')
      cleanupElement(c)
      const d = createBadge({ dot: '' })
      await waitForUpdate(d)
      expect(statusOf(d)?.getAttribute('aria-label')).toBe('未读')
      cleanupElement(d)
    })
  })
})
