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

describe('WebUiBadge', () => {
  describe('默认属性值', () => {
    it('默认 count 为 0', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      expect(el.count).toBe(0)
      cleanupElement(el)
    })

    it('默认 max 为 99', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      expect(el.max).toBe(99)
      cleanupElement(el)
    })

    it('默认 placement 为 top-right', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      expect(el.placement).toBe('top-right')
      cleanupElement(el)
    })

    it('默认 dot、showZero、badgeHidden 为 false', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      expect(el.dot).toBe(false)
      expect(el.showZero).toBe(false)
      expect(el.badgeHidden).toBe(false)
      cleanupElement(el)
    })

    it('默认 offsetX 和 offsetY 为 0', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      expect(el.offsetX).toBe(0)
      expect(el.offsetY).toBe(0)
      cleanupElement(el)
    })
  })

  describe('属性反射', () => {
    it('count 反射到宿主元素', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.count = 42
      await waitForUpdate(el)
      expect(el.getAttribute('count')).toBe('42')
      cleanupElement(el)
    })

    it('max 反射到宿主元素', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.max = 999
      await waitForUpdate(el)
      expect(el.getAttribute('max')).toBe('999')
      cleanupElement(el)
    })

    it('placement 反射到宿主元素', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.placement = 'bottom-left'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('bottom-left')
      cleanupElement(el)
    })

    it('dot 布尔属性反射', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.dot = true
      await waitForUpdate(el)
      expect(el.hasAttribute('dot')).toBe(true)
      cleanupElement(el)
    })

    it('offset-x 反射到宿主元素', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.offsetX = -4
      await waitForUpdate(el)
      expect(el.getAttribute('offset-x')).toBe('-4')
      cleanupElement(el)
    })

    it('offset-y 反射到宿主元素', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.offsetY = 8
      await waitForUpdate(el)
      expect(el.getAttribute('offset-y')).toBe('8')
      cleanupElement(el)
    })
  })

  describe('count 显示行为', () => {
    it('count > 0 时显示徽章，文本为数字', async () => {
      const el = createBadge({ count: '5' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeTruthy()
      expect(status?.textContent?.trim()).toBe('5')
      cleanupElement(el)
    })

    it('count 为 0 时默认不显示', async () => {
      const el = createBadge({ count: '0' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeNull()
      cleanupElement(el)
    })

    it('count > max 时显示 "max+"', async () => {
      const el = createBadge({ count: '100', max: '99' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status?.textContent?.trim()).toBe('99+')
      cleanupElement(el)
    })

    it('count 等于 max 时显示数字', async () => {
      const el = createBadge({ count: '99', max: '99' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status?.textContent?.trim()).toBe('99')
      cleanupElement(el)
    })

    it('count 小于 max 时显示数字', async () => {
      const el = createBadge({ count: '50', max: '99' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status?.textContent?.trim()).toBe('50')
      cleanupElement(el)
    })
  })

  describe('dot 模式', () => {
    it('dot 模式显示圆点', async () => {
      const el = createBadge({ dot: '' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeTruthy()
      expect(status?.textContent?.trim()).toBe('')
      cleanupElement(el)
    })

    it('dot 模式即使 count=0 也显示', async () => {
      const el = createBadge({ count: '0', dot: '' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeTruthy()
      cleanupElement(el)
    })
  })

  describe('show-zero 模式', () => {
    it('show-zero 时 count=0 显示 0', async () => {
      const el = createBadge({ count: '0', 'show-zero': '' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeTruthy()
      expect(status?.textContent?.trim()).toBe('0')
      cleanupElement(el)
    })
  })

  describe('badge-hidden 模式', () => {
    it('badge-hidden 时徽章不显示', async () => {
      const el = createBadge({ count: '5', 'badge-hidden': '' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeNull()
      cleanupElement(el)
    })
  })

  describe('非法 placement 回退', () => {
    it('非法 placement 值回退为 top-right', async () => {
      const el = createBadge()
      await waitForUpdate(el)
      el.setAttribute('placement', 'invalid-position')
      await waitForUpdate(el)
      expect(el.placement).toBe('top-right')
      expect(el.getAttribute('placement')).toBe('top-right')
      cleanupElement(el)
    })
  })

  describe('slot 投影', () => {
    it('携带 slot 内容时组件正常渲染', async () => {
      const el = createBadge({ count: '3' }, '<button>消息</button>')
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeTruthy()
      expect(status?.textContent?.trim()).toBe('3')
      expect(el.querySelector('button')?.textContent).toBe('消息')
      cleanupElement(el)
    })
  })

  describe('无障碍', () => {
    it('count 模式徽章有 role="status"', async () => {
      const el = createBadge({ count: '1' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status).toBeTruthy()
      cleanupElement(el)
    })

    it('count > 0 时 aria-label 为 "N 条未读消息"', async () => {
      const el = createBadge({ count: '3' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]') as HTMLElement
      expect(status.getAttribute('aria-label')).toBe('3 条未读消息')
      cleanupElement(el)
    })

    it('dot 模式 aria-label 为 "未读"', async () => {
      const el = createBadge({ dot: '' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]') as HTMLElement
      expect(status.getAttribute('aria-label')).toBe('未读')
      cleanupElement(el)
    })
  })

  describe('极端值', () => {
    it('极大 count 值显示 max+', async () => {
      const el = createBadge({ count: '999999' })
      await waitForUpdate(el)
      const status = queryA11y(el, '[role="status"]')
      expect(status?.textContent?.trim()).toBe('99+')
      cleanupElement(el)
    })
  })
})
