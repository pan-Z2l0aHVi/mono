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

describe('WebUiAvatar 组件', () => {
  describe('默认属性与反射（合并）', () => {
    it('默认值符合契约', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      expect(el.size).toBe(40)
      expect(el.shape).toBe('circle')
      expect(el.src).toBe('')
      expect(el.alt).toBe('')
      expect(el.name).toBe('')
      cleanupElement(el)
    })

    it.each([
      ['size', 64, '64'],
      ['shape', 'square', 'square'],
      ['src', '/avatar.png', '/avatar.png'],
      ['alt', '用户头像', '用户头像'],
      ['name', 'John Doe', 'John Doe']
    ] as const)('%s 反射到宿主 attribute', async (prop, value, expected) => {
      const el = createAvatar()
      await waitForUpdate(el)
      ;(el as any)[prop] = value
      await waitForUpdate(el)
      expect(el.getAttribute(prop)).toBe(expected)
      cleanupElement(el)
    })

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

  describe('插槽与原生组合', () => {
    it('默认 slot 内容保留在 light DOM（与原生 span 组合）', async () => {
      const el = createAvatar()
      const child = document.createElement('span')
      child.textContent = 'VIP'
      el.appendChild(child)
      document.body.appendChild(el)
      await waitForUpdate(el)
      expect(el.children.length).toBe(1)
      expect(el.textContent?.trim()).toBe('VIP')
      expect(el.querySelector('span')?.textContent).toBe('VIP')
      cleanupElement(el)
    })

    it('在 button 内与 badge 组合使用不影响可访问性', async () => {
      const wrap = document.createElement('div')
      wrap.innerHTML = '<button><web-ui-avatar alt="用户" src="/a.png"></web-ui-avatar> 资料</button>'
      document.body.appendChild(wrap)
      const avatar = wrap.querySelector('web-ui-avatar') as WebUiAvatar
      await waitForUpdate(avatar)
      expect(queryA11y(avatar, '[role="img"]')).toBeTruthy()
      cleanupElement(wrap)
    })
  })

  describe('无障碍（对外可见）', () => {
    it.each([
      [{ alt: '用户头像', src: '/a.png' }, 'img', '用户头像'],
      [{ name: 'Alice' }, 'img', 'Alice'],
      [{}, 'presentation', null]
    ] as const)('alt/name 组合决定 role 与 label %o', async (attrs, expectedRole, expectedLabel) => {
      const el = createAvatar(attrs as Record<string, string>)
      await waitForUpdate(el)
      const node = queryA11y(el, `[role="${expectedRole}"]`)
      expect(node).toBeTruthy()
      expect(node?.getAttribute(expectedLabel ? 'aria-label' : 'aria-hidden')).toBe(expectedLabel ?? 'true')
      cleanupElement(el)
    })
  })

  describe('边界与极端', () => {
    it('未提供 src 时仍可渲染占位且为装饰性', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="presentation"]')).toBeTruthy()
      cleanupElement(el)
    })

    it('超大 size 数值仍反射且不抛错', async () => {
      const el = createAvatar()
      await waitForUpdate(el)
      el.size = 999
      await waitForUpdate(el)
      expect(el.size).toBe(999)
      expect(el.getAttribute('size')).toBe('999')
      cleanupElement(el)
    })
  })
})
