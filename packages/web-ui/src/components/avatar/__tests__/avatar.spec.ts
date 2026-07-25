import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiAvatar } from '..'

const createAvatar = (attrs?: Record<string, string>): WebUiAvatar => {
  const el = document.createElement('web-ui-avatar') as WebUiAvatar
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiAvatar', () => {
  describe('基础渲染', () => {
    it('渲染 avatar-inner 容器', async () => {
      const el = createAvatar()
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner')
      expect(inner).toBeTruthy()

      el.remove()
    })

    it('默认 size 为 40', async () => {
      const el = createAvatar()
      await el.updateComplete

      expect(el.size).toBe(40)

      el.remove()
    })

    it('默认 shape 为 circle', async () => {
      const el = createAvatar()
      await el.updateComplete

      expect(el.shape).toBe('circle')

      el.remove()
    })

    it('size 设置到容器样式', async () => {
      const el = createAvatar({ size: '64' })
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner') as HTMLElement
      expect(inner.style.width).toBe('64px')
      expect(inner.style.height).toBe('64px')

      el.remove()
    })
  })

  describe('图片展示', () => {
    it('有 src 时渲染 img 元素', async () => {
      const el = createAvatar({ src: '/avatar.png', alt: '用户' })
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      expect(img).toBeTruthy()
      expect(img.src).toContain('/avatar.png')

      el.remove()
    })

    it('img 设置 alt 属性', async () => {
      const el = createAvatar({ src: '/avatar.png', alt: '用户头像' })
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      expect(img.alt).toBe('用户头像')

      el.remove()
    })

    it('无 src 时不渲染 img', async () => {
      const el = createAvatar()
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img')
      expect(img).toBeNull()

      el.remove()
    })
  })

  describe('首字母回退', () => {
    it('无 src 且有 name 时显示首字母', async () => {
      const el = createAvatar({ name: 'John Doe' })
      await el.updateComplete

      const initials = el.shadowRoot?.querySelector('.avatar-initials')
      expect(initials).toBeTruthy()
      expect(initials?.textContent?.trim()).toBe('JD')

      el.remove()
    })

    it('单名显示单个首字母', async () => {
      const el = createAvatar({ name: 'Alice' })
      await el.updateComplete

      const initials = el.shadowRoot?.querySelector('.avatar-initials')
      expect(initials?.textContent?.trim()).toBe('A')

      el.remove()
    })

    it('三个以上单词只取前两个首字母', async () => {
      const el = createAvatar({ name: 'John Michael Doe' })
      await el.updateComplete

      const initials = el.shadowRoot?.querySelector('.avatar-initials')
      expect(initials?.textContent?.trim()).toBe('JM')

      el.remove()
    })

    it('首字母大写', async () => {
      const el = createAvatar({ name: 'john doe' })
      await el.updateComplete

      const initials = el.shadowRoot?.querySelector('.avatar-initials')
      expect(initials?.textContent?.trim()).toBe('JD')

      el.remove()
    })

    it('多语言首字符（中文）', async () => {
      const el = createAvatar({ name: '张 三' })
      await el.updateComplete

      const initials = el.shadowRoot?.querySelector('.avatar-initials')
      expect(initials?.textContent?.trim()).toBe('张三')

      el.remove()
    })

    it('空白 name 不显示首字母', async () => {
      const el = createAvatar({ name: '   ' })
      await el.updateComplete

      const initials = el.shadowRoot?.querySelector('.avatar-initials')
      expect(initials).toBeNull()

      el.remove()
    })
  })

  describe('图标回退', () => {
    it('无 src 且无 name 时显示默认图标', async () => {
      const el = createAvatar()
      await el.updateComplete

      const icon = el.shadowRoot?.querySelector('web-ui-icon')
      expect(icon).toBeTruthy()

      el.remove()
    })

    it('有 name 时不显示默认图标', async () => {
      const el = createAvatar({ name: 'John' })
      await el.updateComplete

      const icon = el.shadowRoot?.querySelector('web-ui-icon')
      expect(icon).toBeNull()

      el.remove()
    })
  })

  describe('图片加载失败回退', () => {
    it('src 加载失败时触发 image-error 事件', async () => {
      const el = createAvatar({ src: '/broken.png', name: 'AB' })
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('image-error', handler)

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      img.dispatchEvent(new Event('error', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('src 加载失败后显示首字母', async () => {
      const el = createAvatar({ src: '/broken.png', name: 'C D' })
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      img.dispatchEvent(new Event('error', { bubbles: true, composed: true }))
      await el.updateComplete

      const initials = el.shadowRoot?.querySelector('.avatar-initials')
      expect(initials).toBeTruthy()
      expect(initials?.textContent?.trim()).toBe('CD')

      el.remove()
    })

    it('src 加载失败后 img 消失', async () => {
      const el = createAvatar({ src: '/broken.png' })
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      img.dispatchEvent(new Event('error', { bubbles: true, composed: true }))
      await el.updateComplete

      const imgAfter = el.shadowRoot?.querySelector('img')
      expect(imgAfter).toBeNull()

      el.remove()
    })

    it('更换 src 后重置错误状态', async () => {
      const el = createAvatar({ src: '/broken.png', name: 'E F' })
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      img.dispatchEvent(new Event('error', { bubbles: true, composed: true }))
      await el.updateComplete

      el.src = '/new.png'
      await el.updateComplete

      const imgNew = el.shadowRoot?.querySelector('img') as HTMLImageElement
      expect(imgNew).toBeTruthy()
      expect(imgNew.src).toContain('/new.png')

      el.remove()
    })
  })

  describe('自定义 slot 回退', () => {
    it('有 slot 内容时优先显示 slot', async () => {
      const el = createAvatar()
      el.innerHTML = '<span class="custom">VIP</span>'
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement
      expect(slot).toBeTruthy()
      expect(slot.assignedElements().length).toBe(1)

      el.remove()
    })

    it('无 src 时 slot 内容显示', async () => {
      const el = createAvatar()
      el.innerHTML = '<span>X</span>'
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement
      expect(slot).toBeTruthy()
      expect(slot.assignedElements().length).toBe(1)

      el.remove()
    })

    it('无 slot 内容时 slot 无分配元素', async () => {
      const el = createAvatar()
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement
      expect(slot).toBeTruthy()
      expect(slot.assignedElements().length).toBe(0)

      el.remove()
    })
  })

  describe('shape', () => {
    it('默认 shape 为 circle，容器有 avatar-inner 类', async () => {
      const el = createAvatar()
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner')
      expect(inner).toBeTruthy()

      el.remove()
    })

    it('shape=square 反射到 host', async () => {
      const el = createAvatar()
      el.shape = 'square'
      await el.updateComplete

      expect(el.getAttribute('shape')).toBe('square')

      el.remove()
    })
  })

  describe('a11y', () => {
    it('有 alt 时容器 role 为 img', async () => {
      const el = createAvatar({ src: '/a.png', alt: '用户' })
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner') as HTMLElement
      expect(inner.getAttribute('role')).toBe('img')

      el.remove()
    })

    it('有 alt 时容器有 aria-label', async () => {
      const el = createAvatar({ src: '/a.png', alt: '头像' })
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner') as HTMLElement
      expect(inner.getAttribute('aria-label')).toBe('头像')

      el.remove()
    })

    it('无 alt 有 name 时 aria-label 为 name', async () => {
      const el = createAvatar({ name: 'Alice' })
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner') as HTMLElement
      expect(inner.getAttribute('aria-label')).toBe('Alice')

      el.remove()
    })

    it('无 alt 无 name 时为装饰性，role=presentation', async () => {
      const el = createAvatar()
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner') as HTMLElement
      expect(inner.getAttribute('role')).toBe('presentation')
      expect(inner.getAttribute('aria-hidden')).toBe('true')

      el.remove()
    })

    it('img 元素有 alt 属性', async () => {
      const el = createAvatar({ src: '/a.png', alt: '照片' })
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      expect(img.alt).toBe('照片')

      el.remove()
    })

    it('无 alt 时 img 元素 alt 为空', async () => {
      const el = createAvatar({ src: '/a.png' })
      await el.updateComplete

      const img = el.shadowRoot?.querySelector('img') as HTMLImageElement
      expect(img.hasAttribute('alt')).toBe(false)

      el.remove()
    })
  })

  describe('glass 样式', () => {
    it('无 src 时有 wui-glass 类', async () => {
      const el = createAvatar()
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.wui-glass')
      expect(inner).toBeTruthy()

      el.remove()
    })

    it('有 src 时无 wui-glass 类', async () => {
      const el = createAvatar({ src: '/a.png' })
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.avatar-inner') as HTMLElement
      expect(inner.classList.contains('wui-glass')).toBe(false)

      el.remove()
    })
  })
})
