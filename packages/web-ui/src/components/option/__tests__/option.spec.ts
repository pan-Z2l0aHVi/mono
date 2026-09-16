import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, contractReflection, queryA11y, waitForUpdate } from '@/shared/test-utils'

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

/** 命名 slot（或默认 slot）实际投影到的节点数——slot 投影是公开契约（ADR-0005 §5）。 */
function projectedCount(el: WebUiOption, slotName?: string): number {
  const selector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])'
  const slot = queryA11y(el, selector) as HTMLSlotElement | null
  return slot?.assignedNodes().length ?? 0
}

describe('WebUiOption 组件', () => {
  contractReflection('WebUiOption 属性反射', () => createOption(), [
    ['value', 'apple', 'value', 'apple'],
    ['disabled', true, 'disabled', ''],
    ['selected', true, 'selected', '']
  ] as const)

  describe('属性：label', () => {
    it('显式 label 优先于默认 slot 文本', async () => {
      const el = createOption({ value: 'a' }, '')
      el.textContent = 'Slotted'
      await waitForUpdate(el)
      expect(el.label, '未设 label 时取默认 slot 文本').toBe('Slotted')

      el.label = 'Apple'
      await waitForUpdate(el)
      expect(el.label, '显式 label 应覆盖 slot 文本').toBe('Apple')

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
    it('prefix 与 suffix 按 name 各自投影', async () => {
      const el = createOption({ value: 'a' })
      el.innerHTML = '<span slot="prefix">P</span>Option A<span slot="suffix">S</span>'
      await waitForUpdate(el)

      expect(projectedCount(el, 'prefix')).toBe(1)
      expect(projectedCount(el, 'suffix')).toBe(1)

      cleanupElement(el)
    })

    it('默认 slot 在未设 label 时参与投影', async () => {
      const el = createOption({ value: 'a' }, '')
      el.innerHTML = '<span slot="prefix">★</span>Apple<span slot="suffix">10</span>'
      await waitForUpdate(el)

      expect(projectedCount(el), '未设 label 时默认 slot 承载可见文本').toBe(1)

      cleanupElement(el)
    })
  })
})
