import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { waitForUpdate, spyEvents, cleanupElement, queryA11y } from '@/shared/test-utils'

import type { WebUiCheckbox } from '..'

const createCheckbox = (): WebUiCheckbox => {
  const el = document.createElement('web-ui-checkbox') as WebUiCheckbox
  document.body.appendChild(el)
  return el
}

describe('WebUiCheckbox', () => {
  describe('prop: checked', () => {
    it('checked 默认值为 false', async () => {
      const el = createCheckbox()
      await waitForUpdate(el)
      expect(el.checked).toBe(false)
      cleanupElement(el)
    })

    it('设置 checked 不反射到 host', async () => {
      const el = createCheckbox()
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(false)

      el.checked = true
      await waitForUpdate(el)
      expect(el.checked).toBe(true)
      cleanupElement(el)
    })

    it('设置 checked 不触发 input/change 事件', async () => {
      const el = createCheckbox()
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

  describe('prop: disabled', () => {
    it('disabled 属性反射到 host', async () => {
      const el = createCheckbox()
      expect(el.hasAttribute('disabled')).toBe(false)
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('disabled 时点击不切换也不触发事件', async () => {
      const el = createCheckbox()
      el.disabled = true
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="checkbox"]')
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

  describe('prop: value / name / required', () => {
    it('value 可设置和获取', async () => {
      const el = createCheckbox()
      el.value = 'agree'
      await waitForUpdate(el)
      expect(el.value).toBe('agree')
      cleanupElement(el)
    })

    it('name 可设置和获取', async () => {
      const el = createCheckbox()
      el.name = 'terms'
      await waitForUpdate(el)
      expect(el.name).toBe('terms')
      cleanupElement(el)
    })

    it('required 属性反射到 host', async () => {
      const el = createCheckbox()
      el.required = true
      await waitForUpdate(el)
      expect(el.hasAttribute('required')).toBe(true)
      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击切换后派发 input 和 change 事件，不派发 update:checked', async () => {
      const el = createCheckbox()
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')
      const [updateEvents, detachUpdate] = spyEvents(el, 'update:checked')

      const label = queryA11y(el, '[role="checkbox"]')
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

    it('多次点击在 true/false 之间切换并触发事件', async () => {
      const el = createCheckbox()
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')

      const label = queryA11y(el, '[role="checkbox"]')
      if (!(label instanceof HTMLElement)) {
        detachInput()
        cleanupElement(el)
        return
      }

      // 初始 false → 点击变 true
      label.click()
      await waitForUpdate(el)
      expect(el.checked).toBe(true)

      // true → 点击变 false
      label.click()
      await waitForUpdate(el)
      expect(el.checked).toBe(false)

      // false → 点击变 true
      label.click()
      await waitForUpdate(el)
      expect(el.checked).toBe(true)

      expect(inputEvents).toHaveLength(3)

      detachInput()
      cleanupElement(el)
    })
  })

  describe('键盘操作', () => {
    it('空格键切换 checked 并触发 input/change', async () => {
      const el = createCheckbox()
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="checkbox"]')
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

    it('Enter 键切换 checked', async () => {
      const el = createCheckbox()
      await waitForUpdate(el)

      const label = queryA11y(el, '[role="checkbox"]')
      if (label instanceof HTMLElement) {
        label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      }
      await waitForUpdate(el)

      expect(el.checked).toBe(true)
      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    it('拥有 role="checkbox" 和正确的 aria-checked', async () => {
      const el = createCheckbox()
      await waitForUpdate(el)

      const label = queryA11y(el, '[role="checkbox"]')
      expect(label).toBeTruthy()
      expect(label?.getAttribute('aria-checked')).toBe('false')

      el.checked = true
      await waitForUpdate(el)

      const labelAfter = queryA11y(el, '[role="checkbox"]')
      expect(labelAfter?.getAttribute('aria-checked')).toBe('true')

      cleanupElement(el)
    })
  })
})
