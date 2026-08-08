import { describe, expect, it, vi } from 'vite-plus/test'

import { waitForUpdate, spyEvents, cleanupElement } from '@/shared/test-utils'

import '..'
import type { WebUiButton } from '..'

const createButton = (text = ''): WebUiButton => {
  const el = document.createElement('web-ui-button')
  if (text) el.textContent = text
  document.body.appendChild(el)
  return el
}

describe('WebUiButton 组件', () => {
  describe('属性: variant', () => {
    it('默认值为 glass，非法输入回退到默认值', async () => {
      const el = createButton()
      await waitForUpdate(el)
      expect(el.variant).toBe('glass')

      ;(el as any).variant = 'unknown'
      await waitForUpdate(el)
      expect(el.variant).toBe('glass')

      cleanupElement(el)
    })

    it('设置后反射到 host 属性', async () => {
      const el = createButton()
      el.variant = 'primary'
      await waitForUpdate(el)
      expect(el.getAttribute('variant')).toBe('primary')

      el.variant = 'danger'
      await waitForUpdate(el)
      expect(el.getAttribute('variant')).toBe('danger')

      cleanupElement(el)
    })

    it('所有合法 variant 值生效', async () => {
      const values = ['primary', 'secondary', 'ghost', 'danger', 'glass'] as const
      for (const v of values) {
        const el = createButton()
        el.variant = v
        await waitForUpdate(el)
        expect(el.variant).toBe(v)
        expect(el.getAttribute('variant')).toBe(v)
        cleanupElement(el)
      }
    })
  })

  describe('原生按钮契约', () => {
    it('type 默认 button，非法值规范化为 button 并映射到内部按钮', async () => {
      const el = createButton('OK')
      await waitForUpdate(el)
      const inner = el.shadowRoot?.querySelector('button')
      expect(el.type).toBe('button')
      expect(inner?.type).toBe('button')

      ;(el as any).type = 'invalid'
      await waitForUpdate(el)
      expect(el.type).toBe('button')
      expect(el.getAttribute('type')).toBe('button')
      expect(inner?.type).toBe('button')

      el.type = 'submit'
      await waitForUpdate(el)
      expect(inner?.type).toBe('submit')
      cleanupElement(el)
    })

    it('将文档化的可访问名称映射到内部按钮', async () => {
      const el = createButton()
      el.setAttribute('aria-label', 'Close')
      await waitForUpdate(el)
      const inner = el.shadowRoot?.querySelector('button')
      expect(inner?.getAttribute('aria-label')).toBe('Close')
      cleanupElement(el)
    })

    it('将 data-* 保留在组件宿主而不复制到内部按钮', async () => {
      const el = createButton()
      el.setAttribute('data-testid', 'save')
      await waitForUpdate(el)
      expect(el.getAttribute('data-testid')).toBe('save')
      expect(el.shadowRoot?.querySelector('button')?.hasAttribute('data-testid')).toBe(false)
      cleanupElement(el)
    })
  })

  describe('属性: disabled', () => {
    it('属性反射到 host，初始值为 false', async () => {
      const el = createButton()
      expect(el.hasAttribute('disabled')).toBe(false)
      expect(el.disabled).toBe(false)

      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      expect(el.disabled).toBe(true)

      cleanupElement(el)
    })

    it('disabled 为 true 时阻止 click 事件', async () => {
      const el = createButton('OK')
      el.disabled = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })
  })

  describe('属性: loading', () => {
    it('loading 属性反射到 host', async () => {
      const el = createButton()
      expect(el.hasAttribute('loading')).toBe(false)

      el.loading = true
      await waitForUpdate(el)
      expect(el.hasAttribute('loading')).toBe(true)

      cleanupElement(el)
    })

    it('loading 为 true 时阻止 click 事件', async () => {
      const el = createButton('OK')
      el.loading = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })
  })

  describe('属性: icon', () => {
    it('icon 属性反射到 host', async () => {
      const el = createButton()
      expect(el.hasAttribute('icon')).toBe(false)

      el.icon = true
      await waitForUpdate(el)
      expect(el.hasAttribute('icon')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性: full', () => {
    it('full 属性反射到 host', async () => {
      const el = createButton()
      expect(el.hasAttribute('full')).toBe(false)

      el.full = true
      await waitForUpdate(el)
      expect(el.hasAttribute('full')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('事件: click', () => {
    it('点击触发 click 事件', async () => {
      const el = createButton('OK')
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      el.shadowRoot?.querySelector('button')?.click()
      expect(events).toHaveLength(1)

      cleanupElement(el)
    })
  })

  describe('键盘操作', () => {
    it('内联按钮的 click 方法触发宿主事件', async () => {
      const el = createButton('OK')
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'click')
      const btn = el.shadowRoot?.querySelector('button')
      btn?.click()
      expect(events).toHaveLength(1)

      cleanupElement(el)
    })
  })

  describe('插槽', () => {
    it('slot 内容可通过 textContent 访问', async () => {
      const el = createButton('Click Me')
      await waitForUpdate(el)
      expect(el.textContent).toBe('Click Me')

      cleanupElement(el)
    })
  })
})
