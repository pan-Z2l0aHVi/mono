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

/** 头像的公开语义面：有 label 时是 `role="img"`，纯装饰时是 `role="presentation"`。 */
const innerOf = (el: WebUiAvatar): HTMLElement | null =>
  queryA11y(el, '[role="img"], [role="presentation"]') as HTMLElement | null

describe('WebUiAvatar 组件', () => {
  contractReflection('property 写入后同步到宿主 attribute', () => createAvatar(), [
    ['size', 64, 'size', '64'],
    ['shape', 'square', 'shape', 'square'],
    ['src', '/avatar.png', 'src', '/avatar.png'],
    ['alt', '用户头像', 'alt', '用户头像'],
    ['name', 'John Doe', 'name', 'John Doe']
  ])

  it('非法 shape 回退为 circle 并修正宿主 attribute', async () => {
    const el = createAvatar()
    await waitForUpdate(el)

    el.setAttribute('shape', 'invalid-value')
    await waitForUpdate(el)

    expect(el.shape).toBe('circle')
    expect(el.getAttribute('shape')).toBe('circle')
    cleanupElement(el)
  })

  describe('无障碍契约', () => {
    // alt 优先于 name：alt 是调用方给的替代文本，name 只是兜底的可读名。
    it.each([
      ['有 alt', { alt: '用户头像', src: '/a.png' }, 'img', '用户头像'],
      ['只有 name', { name: 'Alice' }, 'img', 'Alice'],
      ['两者都没有', {}, 'presentation', null]
    ])('%s 决定 role 与 label', async (_label, attrs, expectedRole, expectedLabel) => {
      const el = createAvatar(attrs as Record<string, string>)
      await waitForUpdate(el)

      const node = queryA11y(el, `[role="${expectedRole}"]`)
      expect(node).toBeTruthy()
      expect(node?.getAttribute(expectedLabel ? 'aria-label' : 'aria-hidden')).toBe(expectedLabel ?? 'true')
      cleanupElement(el)
    })

    it('alt 传给内部 img，图片本身也带同样的替代文本', async () => {
      const el = createAvatar({ src: '/a.png', alt: '用户头像' })
      await waitForUpdate(el)

      expect(innerOf(el)?.querySelector('img')?.getAttribute('alt')).toBe('用户头像')
      cleanupElement(el)
    })
  })

  describe('回退渲染', () => {
    it.each([
      ['单词取首字母', 'Alice', 'A'],
      ['多词取前两个词首字母', 'John Doe', 'JD']
    ])('%s', async (_label, name, expected) => {
      const el = createAvatar({ name })
      await waitForUpdate(el)

      expect(innerOf(el)?.textContent?.trim()).toBe(expected)
      cleanupElement(el)
    })

    // 加载失败必须换掉破图图标，否则用户看到的是浏览器默认的碎图。
    it('图片加载失败时移除 img 并回退到 initials', async () => {
      const el = createAvatar({ src: '/missing.png', name: 'Alice' })
      await waitForUpdate(el)
      expect(innerOf(el)?.querySelector('img')).toBeTruthy()

      innerOf(el)?.querySelector('img')?.dispatchEvent(new Event('error'))
      await waitForUpdate(el)

      // 重新查询渲染面，避免复用可能已被重建的节点引用
      expect(innerOf(el)?.querySelector('img')).toBeNull()
      expect(innerOf(el)?.textContent?.trim()).toBe('A')
      cleanupElement(el)
    })

    it('默认 slot 有内容时不再叠加 initials 回退', async () => {
      const el = createAvatar({ name: 'Alice' })
      await waitForUpdate(el)

      const content = document.createElement('span')
      content.textContent = 'VIP'
      el.append(content)
      await flushSlotChange(el)
      expect(innerOf(el)?.textContent).not.toContain('Alice')

      // 移除后回退必须回来：只加不减会让「内容被撤掉」这条路径悄悄失去占位。
      content.remove()
      await flushSlotChange(el)
      expect(innerOf(el)?.textContent?.trim()).toBe('A')
      cleanupElement(el)
    })
  })

  describe('light DOM 归属', () => {
    it('slot 内容留在消费者侧，不被组件搬走', async () => {
      const el = createAvatar()
      const child = document.createElement('span')
      child.textContent = 'VIP'
      el.append(child)
      await waitForUpdate(el)

      expect(el.children).toHaveLength(1)
      expect(child.parentElement).toBe(el)
      cleanupElement(el)
    })

    it('与按钮等原生元素组合时仍提供 img 语义', async () => {
      const wrap = document.createElement('div')
      wrap.innerHTML = '<button><web-ui-avatar alt="用户" src="/a.png"></web-ui-avatar> 资料</button>'
      document.body.appendChild(wrap)
      const avatar = wrap.querySelector('web-ui-avatar') as WebUiAvatar
      await waitForUpdate(avatar)

      expect(queryA11y(avatar, '[role="img"]')).toBeTruthy()
      cleanupElement(wrap)
    })
  })
})
