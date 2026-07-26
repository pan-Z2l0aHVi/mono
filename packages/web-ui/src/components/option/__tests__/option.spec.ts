import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { waitForUpdate, expectReflected, cleanupElement } from '@/shared/test-utils'

import type { WebUiOption } from '..'

const createOption = (attrs?: Record<string, string>, text = 'Option'): WebUiOption => {
  const el = document.createElement('web-ui-option') as WebUiOption
  el.textContent = text
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiOption', () => {
  describe('prop: value', () => {
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

  describe('prop: disabled', () => {
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

  describe('prop: selected', () => {
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
})
