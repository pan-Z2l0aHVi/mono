import { describe, expect, it } from 'vite-plus/test'

import '..'
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
  describe('基础渲染', () => {
    it('渲染选项文本', async () => {
      const el = createOption({ value: 'apple' }, 'Apple')
      await el.updateComplete
      expect(el.textContent?.trim()).toBe('Apple')
      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反射到 host', async () => {
      const el = createOption({ value: 'apple' }, 'Apple')
      el.disabled = true
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)
      el.remove()
    })
  })

  describe('prop: selected', () => {
    it('selected 属性反射到 host', async () => {
      const el = createOption({ value: 'apple' }, 'Apple')
      el.selected = true
      await el.updateComplete
      expect(el.hasAttribute('selected')).toBe(true)
      el.remove()
    })
  })
})
