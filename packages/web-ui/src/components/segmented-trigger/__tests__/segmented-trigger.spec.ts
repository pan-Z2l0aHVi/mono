import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiSegmentedTrigger } from '..'

const createTrigger = (): WebUiSegmentedTrigger => {
  const el = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  document.body.appendChild(el)
  return el
}

const clickInner = (el: WebUiSegmentedTrigger) => {
  const inner = el.shadowRoot!.querySelector('.wui-segmented-trigger') as HTMLElement
  inner.click()
}

describe('WebUiSegmentedTrigger', () => {
  describe('prop: value', () => {
    it('value 可通过属性设置和获取', async () => {
      const el = createTrigger()
      el.value = 'option-1'
      await el.updateComplete
      expect(el.value).toBe('option-1')

      el.remove()
    })
  })

  describe('prop: checked', () => {
    it('checked 属性反映到 host 元素', async () => {
      const el = createTrigger()
      el.checked = true
      await el.updateComplete
      expect(el.hasAttribute('checked')).toBe(true)

      el.checked = false
      await el.updateComplete
      expect(el.hasAttribute('checked')).toBe(false)

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反映到 host 元素', async () => {
      const el = createTrigger()
      el.disabled = true
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)

      el.disabled = false
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(false)

      el.remove()
    })
  })

  describe('event: update:checked', () => {
    it('点击触发 update:checked，detail 包含正确的 checked 和 value', async () => {
      const el = createTrigger()
      el.value = 'option-a'
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', handler)

      clickInner(el)
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent<{ checked: boolean; value: string }>).detail
      expect(detail.checked).toBe(true)
      expect(detail.value).toBe('option-a')

      el.remove()
    })
  })

  describe('event: change', () => {
    it('点击触发 change 事件', async () => {
      const el = createTrigger()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('change', handler)

      clickInner(el)
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })
  })

  describe('已选中时不重复触发', () => {
    it('checked 为 true 时点击不再触发事件', async () => {
      const el = createTrigger()
      el.checked = true
      await el.updateComplete

      const updateHandler = vi.fn<(e: Event) => void>()
      const changeHandler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', updateHandler)
      el.addEventListener('change', changeHandler)

      clickInner(el)
      await el.updateComplete

      expect(updateHandler).not.toHaveBeenCalled()
      expect(changeHandler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('禁用时不触发', () => {
    it('disabled 为 true 时点击不触发事件', async () => {
      const el = createTrigger()
      el.disabled = true
      await el.updateComplete

      const updateHandler = vi.fn<(e: Event) => void>()
      const changeHandler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', updateHandler)
      el.addEventListener('change', changeHandler)

      clickInner(el)
      await el.updateComplete

      expect(updateHandler).not.toHaveBeenCalled()
      expect(changeHandler).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('keyboard interaction', () => {
    it('Enter 键触发点击', async () => {
      const el = createTrigger()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', handler)

      const inner = el.shadowRoot!.querySelector('.wui-segmented-trigger') as HTMLElement
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('Space 键触发点击', async () => {
      const el = createTrigger()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', handler)

      const inner = el.shadowRoot!.querySelector('.wui-segmented-trigger') as HTMLElement
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('其他键不触发', async () => {
      const el = createTrigger()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('update:checked', handler)

      const inner = el.shadowRoot!.querySelector('.wui-segmented-trigger') as HTMLElement
      inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      await el.updateComplete

      expect(handler).not.toHaveBeenCalled()

      el.remove()
    })
  })
})
