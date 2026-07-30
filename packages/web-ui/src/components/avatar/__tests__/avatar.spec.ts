import { describe, expect, it } from 'vite-plus/test'

import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import '..'
import type { WebUiAvatar } from '..'

const createAvatar = (attrs?: Record<string, string>): WebUiAvatar => {
  const el = document.createElement('web-ui-avatar')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiAvatar', () => {
  describe('默认属性值', () => {
    it('默认 size 为 40', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      expect(el.size).toBe(40)
      cleanupElement(el)
    })

    it('默认 shape 为 circle', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      expect(el.shape).toBe('circle')
      cleanupElement(el)
    })

    it('默认 src 为空字符串', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      expect(el.src).toBe('')
      cleanupElement(el)
    })

    it('默认 alt 和 name 为空字符串', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      expect(el.alt).toBe('')
      expect(el.name).toBe('')
      cleanupElement(el)
    })
  })

  describe('属性反射', () => {
    it('size 属性反射到宿主元素', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      el.size = 64
      await waitForUpdate(el)
      expect(el.getAttribute('size')).toBe('64')
      cleanupElement(el)
    })

    it('shape 属性反射到宿主元素', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      el.shape = 'square'
      await waitForUpdate(el)
      expect(el.getAttribute('shape')).toBe('square')
      cleanupElement(el)
    })

    it('alt 属性反射到宿主元素', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      el.alt = '用户头像'
      await waitForUpdate(el)
      expect(el.getAttribute('alt')).toBe('用户头像')
      cleanupElement(el)
    })

    it('name 属性反射到宿主元素', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      el.name = 'John Doe'
      await waitForUpdate(el)
      expect(el.getAttribute('name')).toBe('John Doe')
      cleanupElement(el)
    })

    it('src 属性反射到宿主元素', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      el.src = '/avatar.png'
      await waitForUpdate(el)
      expect(el.getAttribute('src')).toBe('/avatar.png')
      cleanupElement(el)
    })
  })

  describe('非法输入回退', () => {
    it('非法 shape 回退为 circle', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      el.setAttribute('shape', 'invalid-value')
      await waitForUpdate(el)
      expect(el.shape).toBe('circle')
      expect(el.getAttribute('shape')).toBe('circle')
      cleanupElement(el)
    })
  })

  describe('slot 投影', () => {
    it('默认 slot 内容保留在 light DOM', async () => {
      const el = createAvatar()
      const child = document.createElement('span')
      child.textContent = 'VIP'
      el.appendChild(child)
      document.body.appendChild(el)
      await waitForUpdate(el)
      expect(el.children.length).toBe(1)
      expect(el.textContent?.trim()).toBe('VIP')
      cleanupElement(el)
    })
  })

  describe('无障碍', () => {
    it('有 alt 时内部元素 role 为 img', async () => {
      const el = createAvatar({ alt: '用户头像', src: '/a.png' })
      await waitForUpdate(el)
      const imgRole = queryA11y(el, '[role="img"]')
      expect(imgRole).toBeTruthy()
      cleanupElement(el)
    })

    it('有 alt 时内部元素有 aria-label', async () => {
      const el = createAvatar({ alt: '头像' })
      await waitForUpdate(el)
      const imgRole = queryA11y(el, '[role="img"]')
      expect(imgRole?.getAttribute('aria-label')).toBe('头像')
      cleanupElement(el)
    })

    it('无 alt 有 name 时 aria-label 为 name', async () => {
      const el = createAvatar({ name: 'Alice' })
      await waitForUpdate(el)
      const imgRole = queryA11y(el, '[role="img"]')
      expect(imgRole?.getAttribute('aria-label')).toBe('Alice')
      cleanupElement(el)
    })

    it('无 alt 无 name 时为装饰性 role=presentation', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      const presentation = queryA11y(el, '[role="presentation"]')
      expect(presentation).toBeTruthy()
      expect(presentation?.getAttribute('aria-hidden')).toBe('true')
      cleanupElement(el)
    })
  })
})
