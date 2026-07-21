import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/option'

import type { WebUiSelect } from '..'

const createSelect = (optionsHtml = '', attrs?: Record<string, string>): WebUiSelect => {
  const el = document.createElement('web-ui-select') as WebUiSelect
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = optionsHtml
  document.body.appendChild(el)
  return el
}

const OPTIONS_HTML = `
  <web-ui-option value="apple">Apple</web-ui-option>
  <web-ui-option value="banana">Banana</web-ui-option>
  <web-ui-option value="cherry">Cherry</web-ui-option>
`

describe('WebUiSelect', () => {
  describe('prop: value', () => {
    it('显示选中项的文本', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'banana'
      await el.updateComplete

      const label = el.shadowRoot?.querySelector('.label')
      expect(label?.textContent).toBe('Banana')

      el.remove()
    })

    it('无选中值时显示 placeholder', async () => {
      const el = createSelect(OPTIONS_HTML, { placeholder: '请选择' })
      await el.updateComplete

      const label = el.shadowRoot?.querySelector('.label')
      expect(label?.textContent).toBe('请选择')

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 时不可打开', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.disabled = true
      await el.updateComplete

      const trigger = el.shadowRoot?.querySelector('.select-trigger') as HTMLElement
      trigger.click()
      await el.updateComplete

      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })

  describe('prop: full', () => {
    it('full 属性反射到 host', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.full = true
      await el.updateComplete

      expect(el.hasAttribute('full')).toBe(true)

      el.remove()
    })
  })

  describe('打开/关闭', () => {
    it('点击触发器打开浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await el.updateComplete

      const trigger = el.shadowRoot?.querySelector('.select-trigger') as HTMLElement
      trigger.click()
      await el.updateComplete

      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('点击选项后关闭浮层并更新 value', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      await el.updateComplete

      const trigger = el.shadowRoot?.querySelector('.select-trigger') as HTMLElement
      trigger.click()
      await el.updateComplete

      const options = el.querySelectorAll('web-ui-option')
      ;(options[1] as HTMLElement).click()
      await el.updateComplete

      expect(el.value).toBe('banana')
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('点击外部关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await el.updateComplete

      const trigger = el.shadowRoot?.querySelector('.select-trigger') as HTMLElement
      trigger.click()
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      document.body.click()
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })

  describe('事件', () => {
    it('选择时触发 change 事件', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('change', handler)

      const trigger = el.shadowRoot?.querySelector('.select-trigger') as HTMLElement
      trigger.click()
      await el.updateComplete

      const options = el.querySelectorAll('web-ui-option')
      ;(options[1] as HTMLElement).click()
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })
  })

  describe('键盘导航', () => {
    it('Escape 关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await el.updateComplete

      const trigger = el.shadowRoot?.querySelector('.select-trigger') as HTMLElement
      trigger.click()
      await el.updateComplete

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('Enter 选中高亮项并关闭', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      await el.updateComplete

      const trigger = el.shadowRoot?.querySelector('.select-trigger') as HTMLElement
      trigger.click()
      await el.updateComplete

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await el.updateComplete
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await el.updateComplete
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await el.updateComplete

      expect(el.value).toBe('banana')
      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })
})
