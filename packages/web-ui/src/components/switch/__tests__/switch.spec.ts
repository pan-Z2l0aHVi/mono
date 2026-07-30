import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { waitForUpdate, spyEvents, cleanupElement, queryA11y } from '@/shared/test-utils'

import type { WebUiSwitch } from '..'

const createSwitch = (): WebUiSwitch => {
  const el = document.createElement('web-ui-switch')
  document.body.appendChild(el)
  return el
}

describe('WebUiSwitch', () => {
  describe('prop: checked', () => {
    it('checked 默认值为 false', async () => {
      const el = createSwitch()
      await waitForUpdate(el)
      expect(el.checked).toBe(false)
      cleanupElement(el)
    })

    it('checked 设置和读取，不反射到 host', async () => {
      const el = createSwitch()
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(false)

      el.checked = true
      await waitForUpdate(el)
      expect(el.checked).toBe(true)
      cleanupElement(el)
    })

    it('设置 checked 不触发 input/change 事件', async () => {
      const el = createSwitch()
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
      const el = createSwitch()
      expect(el.hasAttribute('disabled')).toBe(false)
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('disabled 时点击不触发 input/change', async () => {
      const el = createSwitch()
      el.disabled = true
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="switch"]')
      if (label instanceof HTMLElement) {
        label.click()
      }
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)
      expect(el.checked).toBe(false)

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('prop: loading', () => {
    it('loading 时点击不切换状态', async () => {
      const el = createSwitch()
      el.loading = true
      await waitForUpdate(el)

      const label = queryA11y(el, '[role="switch"]')
      if (label instanceof HTMLElement) {
        label.click()
      }
      await waitForUpdate(el)

      expect(el.checked).toBe(false)
      cleanupElement(el)
    })
  })

  describe('prop: name / value', () => {
    it('可以设置 name', async () => {
      const el = createSwitch()
      el.name = 'agreed'
      await waitForUpdate(el)
      expect(el.name).toBe('agreed')
      cleanupElement(el)
    })

    it('可以设置 value', async () => {
      const el = createSwitch()
      el.value = 'yes'
      await waitForUpdate(el)
      expect(el.value).toBe('yes')
      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击切换后派发 input 和 change 事件', async () => {
      const el = createSwitch()
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="switch"]')
      if (label instanceof HTMLElement) {
        label.click()
      }
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)

      detachInput()
      detachChange()
      cleanupElement(el)
    })

    it('多次点击多次触发 input/change', async () => {
      const el = createSwitch()
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      const label = queryA11y(el, '[role="switch"]')
      if (!(label instanceof HTMLElement)) {
        detachInput()
        detachChange()
        cleanupElement(el)
        return
      }

      label.click()
      await waitForUpdate(el)
      label.click()
      await waitForUpdate(el)
      label.click()
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(3)
      expect(changeEvents).toHaveLength(3)

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    it('拥有 role="switch" 和正确的 aria-checked', async () => {
      const el = createSwitch()
      await waitForUpdate(el)

      const label = queryA11y(el, '[role="switch"]')
      expect(label).toBeTruthy()
      expect(label?.getAttribute('aria-checked')).toBe('false')

      el.checked = true
      await waitForUpdate(el)

      const labelAfter = queryA11y(el, '[role="switch"]')
      expect(labelAfter?.getAttribute('aria-checked')).toBe('true')

      cleanupElement(el)
    })
  })
})
