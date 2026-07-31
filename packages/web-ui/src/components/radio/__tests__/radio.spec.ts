import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { waitForUpdate, spyEvents, cleanupElement, queryA11y } from '@/shared/test-utils'

import type { WebUiRadio } from '..'

const createRadio = (): WebUiRadio => {
  const el = document.createElement('web-ui-radio')
  document.body.appendChild(el)
  return el
}

describe('WebUiRadio 组件', () => {
  describe('属性：checked', () => {
    it('checked 默认值为 false', async () => {
      const el = createRadio()
      await waitForUpdate(el)
      expect(el.checked).toBe(false)
      cleanupElement(el)
    })

    it('设置 checked 不反射到 host', async () => {
      const el = createRadio()
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(false)

      el.checked = true
      await waitForUpdate(el)
      expect(el.checked).toBe(true)
      cleanupElement(el)
    })

    it('设置 checked 不触发 input/change 事件', async () => {
      const el = createRadio()
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      el.checked = true
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('disabled 属性反射到 host', async () => {
      const el = createRadio()
      expect(el.hasAttribute('disabled')).toBe(false)
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('disabled 时点击不触发事件', async () => {
      const el = createRadio()
      el.disabled = true
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="radio"]')
      if (label instanceof HTMLElement) {
        label.click()
      }
      await waitForUpdate(el)

      expect(el.checked).toBe(false)
      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('属性：value / name / required', () => {
    it('value 可设置和获取', async () => {
      const el = createRadio()
      el.value = 'option-1'
      await waitForUpdate(el)
      expect(el.value).toBe('option-1')
      cleanupElement(el)
    })

    it('name 可设置和获取', async () => {
      const el = createRadio()
      el.name = 'gender'
      await waitForUpdate(el)
      expect(el.name).toBe('gender')
      cleanupElement(el)
    })

    it('required 属性反射到 host', async () => {
      const el = createRadio()
      el.required = true
      await waitForUpdate(el)
      expect(el.hasAttribute('required')).toBe(true)
      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击选中后派发 input 和 change 事件，不派发 update:checked', async () => {
      const el = createRadio()
      el.value = 'option-a'
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')
      const [updateEvents, detachUpdate] = spyEvents(el, 'update:checked')

      const label = queryA11y(el, '[role="radio"]')
      if (label instanceof HTMLElement) {
        label.click()
      }
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      expect(updateEvents).toHaveLength(0)

      detachInput()
      detachChange()
      detachUpdate()
      cleanupElement(el)
    })

    it('已选中时点击不再触发事件', async () => {
      const el = createRadio()
      el.checked = true
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="radio"]')
      if (label instanceof HTMLElement) {
        label.click()
      }
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)
      expect(el.checked).toBe(true)

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('键盘操作', () => {
    it('空格键选中并触发 input/change', async () => {
      const el = createRadio()
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="radio"]')
      if (label instanceof HTMLElement) {
        label.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      }
      await waitForUpdate(el)

      expect(el.checked).toBe(true)
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)

      detachInput()
      detachChange()
      cleanupElement(el)
    })

    it('Enter 键选中', async () => {
      const el = createRadio()
      await waitForUpdate(el)

      const label = queryA11y(el, '[role="radio"]')
      if (label instanceof HTMLElement) {
        label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      }
      await waitForUpdate(el)

      expect(el.checked).toBe(true)
      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    it('拥有 role="radio" 和正确的 aria-checked', async () => {
      const el = createRadio()
      await waitForUpdate(el)

      const label = queryA11y(el, '[role="radio"]')
      expect(label).toBeTruthy()
      expect(label?.getAttribute('aria-checked')).toBe('false')

      el.checked = true
      await waitForUpdate(el)

      const labelAfter = queryA11y(el, '[role="radio"]')
      expect(labelAfter?.getAttribute('aria-checked')).toBe('true')

      cleanupElement(el)
    })
  })
})
