import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiCheckbox } from '..'

const createCheckbox = (): WebUiCheckbox => {
  const el = document.createElement('web-ui-checkbox') as WebUiCheckbox
  document.body.appendChild(el)
  return el
}

describe('WebUiCheckbox', () => {
  describe('prop: checked', () => {
    it('checked 属性反映到 host 元素，点击后切换', async () => {
      const el = createCheckbox()
      await el.updateComplete
      expect(el.hasAttribute('checked')).toBe(false)

      const label = el.shadowRoot!.querySelector('label')!
      label.click()
      await el.updateComplete
      expect(el.checked).toBe(true)
      expect(el.hasAttribute('checked')).toBe(true)

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反映到 host 元素，阻止切换', async () => {
      const el = createCheckbox()
      el.disabled = true
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)

      const label = el.shadowRoot!.querySelector('label')!
      label.click()
      await el.updateComplete
      expect(el.checked).toBe(false)
      expect(el.hasAttribute('checked')).toBe(false)

      el.remove()
    })
  })

  describe('event: update:checked', () => {
    it('点击触发 update:checked，detail 包含正确的 checked 和 value', async () => {
      const el = createCheckbox()
      el.value = 'agree'
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', handler)

      const label = el.shadowRoot!.querySelector('label')!
      label.click()
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent<{ checked: boolean; value: string }>).detail
      expect(detail.checked).toBe(true)
      expect(detail.value).toBe('agree')

      el.remove()
    })
  })

  describe('event: change', () => {
    it('点击触发 change 事件', async () => {
      const el = createCheckbox()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('change', handler)

      const label = el.shadowRoot!.querySelector('label')!
      label.click()
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })
  })

  describe('切换行为', () => {
    it('每次点击在 true/false 之间切换', async () => {
      const el = createCheckbox()
      await el.updateComplete
      const label = el.shadowRoot!.querySelector('label')!

      // 初始 false，点击变成 true
      label.click()
      await el.updateComplete
      expect(el.checked).toBe(true)

      // 再点击变成 false
      label.click()
      await el.updateComplete
      expect(el.checked).toBe(false)

      // 再点击变成 true
      label.click()
      await el.updateComplete
      expect(el.checked).toBe(true)

      el.remove()
    })
  })

  describe('禁用时不触发', () => {
    it('disabled 为 true 时点击不切换也不触发事件', async () => {
      const el = createCheckbox()
      el.disabled = true
      await el.updateComplete

      const updateHandler = vi.fn<(e: Event) => void>()
      const changeHandler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', updateHandler)
      el.addEventListener('change', changeHandler)

      const label = el.shadowRoot!.querySelector('label')!
      label.click()
      await el.updateComplete

      expect(el.checked).toBe(false)
      expect(updateHandler).not.toHaveBeenCalled()
      expect(changeHandler).not.toHaveBeenCalled()

      el.remove()
    })
  })
})
