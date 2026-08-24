import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { waitForUpdate, expectReflected, cleanupElement } from '@/shared/test-utils'

import type { WebUiOption } from '..'

const createOption = (attrs?: Record<string, string>, label = 'Option'): WebUiOption => {
  const el = document.createElement('web-ui-option')
  el.label = label
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiOption 组件', () => {
  describe('属性：value', () => {
    it('value 可设置和获取', async () => {
      const el = createOption()
      el.value = 'apple'
      await waitForUpdate(el)
      expect(el.value).toBe('apple')
      cleanupElement(el)
    })

    it('value 反映到 host 属性', async () => {
      const el = createOption({ value: 'apple' })
      await waitForUpdate(el)
      expect(el.getAttribute('value')).toBe('apple')
      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('disabled 属性反射到 host', async () => {
      const el = createOption()
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(false)

      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：selected', () => {
    it('selected 属性反射到 host', async () => {
      const el = createOption()
      await waitForUpdate(el)
      expect(el.hasAttribute('selected')).toBe(false)

      el.selected = true
      await waitForUpdate(el)
      expect(el.hasAttribute('selected')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：label', () => {
    it('label 可设置和获取', async () => {
      const el = createOption()
      el.label = 'Apple'
      await waitForUpdate(el)
      expect(el.label).toBe('Apple')
      cleanupElement(el)
    })

    it('未设置 label 时回退到默认 slot 文本', async () => {
      const el = createOption({ value: 'a' }, '')
      el.textContent = 'Default label'
      await waitForUpdate(el)

      expect(el.label).toBe('Default label')

      cleanupElement(el)
    })

    it('label 渲染到 shadow DOM', async () => {
      const el = createOption({ value: 'a' }, 'Hello World')
      await waitForUpdate(el)

      expect(el.shadowRoot?.textContent?.trim()).toBe('Hello World')

      cleanupElement(el)
    })
  })

  describe('注册/注销通信', () => {
    it('connectedCallback 派发 option-register', async () => {
      const handler = vi.fn<(e: Event) => void>()
      document.addEventListener('option-register', handler)

      const el = createOption({ value: 'apple' }, 'Apple')
      await waitForUpdate(el)

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail
      expect(detail.value).toBe('apple')
      expect(detail.label).toBe('Apple')
      expect(detail.disabled).toBe(false)

      document.removeEventListener('option-register', handler)
      cleanupElement(el)
    })

    it('disconnectedCallback 派发 option-unregister', async () => {
      const el = createOption({ value: 'banana' }, 'Banana')
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('option-unregister', handler)

      el.remove()

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent).detail
      expect(detail.value).toBe('banana')

      cleanupElement(el)
    })
  })

  describe('插槽：prefix / suffix', () => {
    it('提供 prefix slot 时渲染 prefix 内容', async () => {
      const el = createOption({ value: 'a' })
      el.innerHTML = '<span slot="prefix">P</span>Option A'
      await waitForUpdate(el)

      const prefix = el.querySelector('[slot="prefix"]')
      expect(prefix).toBeTruthy()
      expect(prefix!.textContent?.trim()).toBe('P')

      cleanupElement(el)
    })

    it('提供 suffix slot 时渲染 suffix 内容', async () => {
      const el = createOption({ value: 'a' })
      el.innerHTML = 'Option A<span slot="suffix">S</span>'
      await waitForUpdate(el)

      const suffix = el.querySelector('[slot="suffix"]')
      expect(suffix).toBeTruthy()
      expect(suffix!.textContent?.trim()).toBe('S')

      cleanupElement(el)
    })

    it('无 prefix/suffix 时 label 正常显示', async () => {
      const el = createOption({ value: 'a' }, 'Hello')
      await waitForUpdate(el)

      expect(el.label).toBe('Hello')
      expect(el.shadowRoot?.textContent?.trim()).toContain('Hello')

      cleanupElement(el)
    })

    it('prefix + label + suffix 同时存在', async () => {
      const el = createOption({ value: 'a' }, 'Apple')
      el.innerHTML = '<span slot="prefix">★</span><span slot="suffix">10</span>'
      await waitForUpdate(el)

      expect(el.querySelector('[slot="prefix"]')?.textContent?.trim()).toBe('★')
      expect(el.querySelector('[slot="suffix"]')?.textContent?.trim()).toBe('10')

      cleanupElement(el)
    })
  })
})
