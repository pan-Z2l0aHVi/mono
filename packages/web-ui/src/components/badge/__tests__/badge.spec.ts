import { describe, expect, it } from 'vite-plus/test'

import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import '..'
import type { WebUiBadge } from '..'

const createBadge = (attrs?: Record<string, string>, slotContent?: string): WebUiBadge => {
  const el = document.createElement('web-ui-badge')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  if (slotContent) el.innerHTML = slotContent
  document.body.appendChild(el)
  return el
}

async function waitForSlotChange(el: WebUiBadge, mutate: () => void): Promise<void> {
  const slot = el.shadowRoot!.querySelector('slot')!
  const slotChanged = new Promise<void>(resolve => slot.addEventListener('slotchange', () => resolve(), { once: true }))
  mutate()
  await slotChanged
  await waitForUpdate(el)
}

describe('WebUiBadge 组件', () => {
  describe('默认属性与反射（合并）', () => {
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

    it.each([
      ['count', 42, '42'],
      ['max', 999, '999'],
      ['placement', 'bottom-left', 'bottom-left'],
      ['offset-x', -4, '-4'],
      ['offset-y', 8, '8']
    ] as const)('%s 反射到宿主 attribute', async (attr, value, expected) => {
      const el = createBadge()
      await waitForUpdate(el)
      ;(el as any)[attr === 'offset-x' ? 'offsetX' : attr === 'offset-y' ? 'offsetY' : attr] = value as never
      await waitForUpdate(el)
      expect(el.getAttribute(attr)).toBe(expected)
      cleanupElement(el)
    })

    it('dot 布尔属性反射（存在语义）', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.dot = true
      await waitForUpdate(el)
      expect(el.hasAttribute('dot')).toBe(true)
      el.dot = false
      await waitForUpdate(el)
      expect(el.hasAttribute('dot')).toBe(false)
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
      const status = queryA11y(el, '[role="status"]')
      expect(!!status).toBe(shouldShow)
      expect(status?.textContent?.trim() ?? null).toBe(expectedText)
      cleanupElement(el)
    })

    it('极大 count 值显示 max+', async () => {
      const el = createBadge({ count: '999999' })
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="status"]')?.textContent?.trim()).toBe('99+')
      cleanupElement(el)
    })
  })

  describe('dot / show-zero / badge-hidden', () => {
    it('dot 模式显示空圆点且 aria-label=未读', async () => {
      const el = createBadge({ dot: '' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]') as HTMLElement
      expect(status).toBeTruthy()
      expect(status.textContent?.trim()).toBe('')
      expect(status.getAttribute('aria-label')).toBe('未读')
      cleanupElement(el)
    })

    it('dot 模式即使 count=0 也显示', async () => {
      const el = createBadge({ count: '0', dot: '' })
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="status"]')).toBeTruthy()
      cleanupElement(el)
    })

    it('show-zero 时 count=0 显示 0', async () => {
      const el = createBadge({ count: '0', 'show-zero': '' })
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="status"]')?.textContent?.trim()).toBe('0')
      cleanupElement(el)
    })

    it('badge-hidden 时不显示', async () => {
      const el = createBadge({ count: '5', 'badge-hidden': '' })
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="status"]')).toBeNull()
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
      expect(queryA11y(el, '[role="status"]')?.textContent?.trim()).toBe('3')
      expect(el.querySelector('button')?.textContent).toBe('消息')
      cleanupElement(el)
    })
  })

  describe('无障碍（对外可见）', () => {
    it('徽章拥有 role=status 且有可读 label', async () => {
      const el = createBadge({ count: '1' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]') as HTMLElement
      expect(status).toBeTruthy()
      expect(status.getAttribute('aria-label')).toBe('1 条未读消息')
      cleanupElement(el)
    })

    it('count>0 与 dot 的 aria-label 区分', async () => {
      const c = createBadge({ count: '3' })
      await waitForUpdate(c)
      expect((queryA11y(c, '[role="status"]') as HTMLElement).getAttribute('aria-label')).toBe('3 条未读消息')
      cleanupElement(c)
      const d = createBadge({ dot: '' })
      await waitForUpdate(d)
      expect((queryA11y(d, '[role="status"]') as HTMLElement).getAttribute('aria-label')).toBe('未读')
      cleanupElement(d)
    })
  })
})
