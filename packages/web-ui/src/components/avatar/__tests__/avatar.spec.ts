import { describe, expect, it } from 'vite-plus/test'

import {
  cleanupElement,
  contractReflection,
  flushSlotChange,
  mountElement,
  queryA11y,
  waitForUpdate
} from '@/shared/test-utils'

import '..'
import type { WebUiAvatar } from '..'

const createAvatar = (attrs?: Record<string, string>): WebUiAvatar =>
  mountElement<WebUiAvatar>('web-ui-avatar', { attrs })

const innerOf = (el: WebUiAvatar): HTMLElement | null => queryA11y(el, '[role="img"]') as HTMLElement | null

describe('WebUiAvatar 组件', () => {
  describe('默认属性与反射', () => {
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

    contractReflection('property 写入后同步到宿主 attribute', () => createAvatar(), [
      ['size', 64, 'size', '64'],
      ['shape', 'square', 'shape', 'square'],
      ['src', '/avatar.png', 'src', '/avatar.png'],
      ['alt', '用户头像', 'alt', '用户头像'],
      ['name', 'John Doe', 'name', 'John Doe']
    ])

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

    it('alt 传递到内部 img 的 alt', async () => {
      const el = createAvatar({ src: '/a.png', alt: '用户头像' })
      await waitForUpdate(el)
      const img = innerOf(el)?.querySelector('img')
      expect(img?.getAttribute('alt')).toBe('用户头像')
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

  describe('回退渲染', () => {
    it('单词 name 取首字母作为回退内容', async () => {
      const el = createAvatar({ name: 'Alice' })
      await waitForUpdate(el)
      expect(innerOf(el)?.textContent?.trim()).toBe('A')
      cleanupElement(el)
    })

    it('多词 name 取前两个词首字母', async () => {
      const el = createAvatar({ name: 'John Doe' })
      await waitForUpdate(el)
      expect(innerOf(el)?.textContent?.trim()).toBe('JD')
      cleanupElement(el)
    })

    it('图片加载失败时移除 img 并回退到 initials', async () => {
      const el = createAvatar({ src: '/missing.png', name: 'Alice' })
      await waitForUpdate(el)
      const img = innerOf(el)?.querySelector('img')
      expect(img).toBeTruthy()

      img?.dispatchEvent(new Event('error'))
      await waitForUpdate(el)

      // 重新查询渲染面，避免复用可能已被重建的节点引用
      expect(innerOf(el)?.querySelector('img')).toBeNull()
      expect(innerOf(el)?.textContent?.trim()).toBe('A')
      cleanupElement(el)
    })

    it('动态插入和删除默认 slot 时同步 fallback', async () => {
      const el = createAvatar({ name: 'Alice' })
      await waitForUpdate(el)

      const content = document.createElement('span')
      content.textContent = 'VIP'
      el.append(content)
      await flushSlotChange(el)
      expect(innerOf(el)?.textContent?.includes('Alice')).toBe(false)

      content.remove()
      await flushSlotChange(el)
      expect(innerOf(el)?.textContent?.trim()).toBe('A')

      cleanupElement(el)
    })

    it('反复断开重连后仍保持 slot 状态语义', async () => {
      const el = createAvatar({ name: 'Alice' })
      document.body.appendChild(el)
      await waitForUpdate(el)

      for (let index = 0; index < 3; index++) {
        el.remove()
        document.body.appendChild(el)
        await waitForUpdate(el)
      }

      const content = document.createElement('span')
      content.textContent = 'VIP'
      el.append(content)
      await flushSlotChange(el)
      expect(innerOf(el)?.textContent?.includes('Alice')).toBe(false)

      content.remove()
      await flushSlotChange(el)
      expect(innerOf(el)?.textContent?.trim()).toBe('A')

      cleanupElement(el)
    })
  })
})
