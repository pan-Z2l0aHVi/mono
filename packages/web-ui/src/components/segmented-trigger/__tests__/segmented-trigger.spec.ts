import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { waitForUpdate, spyEvents, expectReflected, cleanupElement, queryA11y } from '@/shared/test-utils'

import type { WebUiSegmentedTrigger } from '..'

const createTrigger = (): WebUiSegmentedTrigger => {
  const el = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  document.body.appendChild(el)
  return el
}

describe('WebUiSegmentedTrigger', () => {
  describe('prop: value', () => {
    it('value 可通过属性设置和获取', async () => {
      const el = createTrigger()
      el.value = 'option-1'
      await waitForUpdate(el)
      expect(el.value).toBe('option-1')
      cleanupElement(el)
    })
  })

  describe('prop: checked', () => {
    it('checked 属性反映到 host 元素', async () => {
      const el = createTrigger()
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(false)

      el.checked = true
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(true)

      el.checked = false
      await waitForUpdate(el)
      expect(el.hasAttribute('checked')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反映到 host 元素', async () => {
      const el = createTrigger()
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(false)

      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击触发 change 事件', async () => {
      const el = createTrigger()
      el.value = 'option-a'
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      const inner = queryA11y(el, '[role="option"]')
      if (inner instanceof HTMLElement) inner.click()
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      detach()
      cleanupElement(el)
    })

    it('已选中时不重复触发 change 事件', async () => {
      const el = createTrigger()
      el.checked = true
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      const inner = queryA11y(el, '[role="option"]')
      if (inner instanceof HTMLElement) inner.click()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      detach()
      cleanupElement(el)
    })

    it('禁用时不触发 change 事件', async () => {
      const el = createTrigger()
      el.disabled = true
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      const inner = queryA11y(el, '[role="option"]')
      if (inner instanceof HTMLElement) inner.click()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      detach()
      cleanupElement(el)
    })

    it('设置属性不触发 change 事件', async () => {
      const el = createTrigger()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      el.checked = true
      el.value = 'test'
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      detach()
      cleanupElement(el)
    })
  })

  describe('键盘操作', () => {
    it('Enter 键触发 change', async () => {
      const el = createTrigger()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      const inner = queryA11y(el, '[role="option"]')
      if (inner instanceof HTMLElement) {
        inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      }
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      detach()
      cleanupElement(el)
    })

    it('Space 键触发 change', async () => {
      const el = createTrigger()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      const inner = queryA11y(el, '[role="option"]')
      if (inner instanceof HTMLElement) {
        inner.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      }
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      detach()
      cleanupElement(el)
    })

    it('其他键不触发 change', async () => {
      const el = createTrigger()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      const inner = queryA11y(el, '[role="option"]')
      if (inner instanceof HTMLElement) {
        inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      }
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      detach()
      cleanupElement(el)
    })
  })

  describe('可访问性', () => {
    it('拥有 role="option" 和正确的 aria-selected', async () => {
      const el = createTrigger()
      await waitForUpdate(el)

      const inner = queryA11y(el, '[role="option"]')
      expect(inner).toBeTruthy()
      expect(inner?.getAttribute('aria-selected')).toBe('false')

      el.checked = true
      await waitForUpdate(el)

      expect(inner?.getAttribute('aria-selected')).toBe('true')

      cleanupElement(el)
    })
  })
})
