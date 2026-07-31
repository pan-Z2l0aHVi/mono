import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiInputNumber } from '..'

function createNumber(attrs?: Record<string, string>): WebUiInputNumber {
  const el = document.createElement('web-ui-input-number')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiInputNumber 组件', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('默认值', () => {
    it('value 默认 0', () => {
      const el = createNumber()
      expect(el.value).toBe(0)
      cleanupElement(el)
    })

    it('disabled 默认 false', () => {
      const el = createNumber()
      expect(el.disabled).toBe(false)
      cleanupElement(el)
    })

    it('precision 默认 0', () => {
      const el = createNumber()
      expect(el.precision).toBe(0)
      cleanupElement(el)
    })

    it('formAssociated 已声明', () => {
      expect((customElements.get('web-ui-input-number') as typeof WebUiInputNumber).formAssociated).toBe(true)
    })
  })

  describe('属性反射', () => {
    it('disabled 属性反射', async () => {
      const el = createNumber()
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('placeholder 属性反射', async () => {
      const el = createNumber({ placeholder: '输入数字' })
      await waitForUpdate(el)
      expect(el.getAttribute('placeholder')).toBe('输入数字')
      cleanupElement(el)
    })

    it('name 属性反射', async () => {
      const el = createNumber({ name: 'count' })
      await waitForUpdate(el)
      expect(el.getAttribute('name')).toBe('count')
      cleanupElement(el)
    })

    it('required 属性反射', async () => {
      const el = createNumber()
      el.required = true
      await waitForUpdate(el)
      expect(el.hasAttribute('required')).toBe(true)
      cleanupElement(el)
    })

    it('precision 属性反射', () => {
      const el = createNumber({ precision: '2' })
      expect(el.getAttribute('precision')).toBe('2')
      cleanupElement(el)
    })
  })

  describe('步进按钮', () => {
    it('点击增加按钮增大值', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const incBtn = queryA11y(el, 'button[aria-label="Increase"]') as HTMLButtonElement
      incBtn.click()
      await waitForUpdate(el)

      expect(el.value).toBe(6)
      cleanupElement(el)
    })

    it('点击减少按钮减小值', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const decBtn = queryA11y(el, 'button[aria-label="Decrease"]') as HTMLButtonElement
      decBtn.click()
      await waitForUpdate(el)

      expect(el.value).toBe(4)
      cleanupElement(el)
    })

    it('点击增加按钮触发 input 事件', async () => {
      const el = createNumber()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      const incBtn = queryA11y(el, 'button[aria-label="Increase"]') as HTMLButtonElement
      incBtn.click()

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('disabled 时点击按钮不触发 input 事件', async () => {
      const el = createNumber()
      el.disabled = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      const incBtn = queryA11y(el, 'button[aria-label="Increase"]') as HTMLButtonElement
      incBtn.click()

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('设置属性时不派发 input 事件', async () => {
      const el = createNumber()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      el.value = 5
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('min / max 边界', () => {
    it('到达 min 时减少按钮被禁用', async () => {
      const el = createNumber()
      el.min = 0
      el.value = 0
      await waitForUpdate(el)

      const decBtn = queryA11y(el, 'button[aria-label="Decrease"]') as HTMLButtonElement
      expect(decBtn.disabled).toBe(true)

      const incBtn = queryA11y(el, 'button[aria-label="Increase"]') as HTMLButtonElement
      expect(incBtn.disabled).toBe(false)
      cleanupElement(el)
    })

    it('到达 max 时增加按钮被禁用', async () => {
      const el = createNumber()
      el.max = 10
      el.value = 10
      await waitForUpdate(el)

      const incBtn = queryA11y(el, 'button[aria-label="Increase"]') as HTMLButtonElement
      expect(incBtn.disabled).toBe(true)

      const decBtn = queryA11y(el, 'button[aria-label="Decrease"]') as HTMLButtonElement
      expect(decBtn.disabled).toBe(false)
      cleanupElement(el)
    })

    it('超出范围时自动 clamp', async () => {
      const el = createNumber()
      el.min = 0
      el.max = 100
      el.value = 200
      await waitForUpdate(el)

      expect(el.value).toBe(100)
      cleanupElement(el)
    })

    it('低于范围时自动 clamp', async () => {
      const el = createNumber()
      el.min = 0
      el.max = 100
      el.value = -10
      await waitForUpdate(el)

      expect(el.value).toBe(0)
      cleanupElement(el)
    })
  })

  describe('精度', () => {
    it('precision=1 保留一位小数', async () => {
      const el = createNumber()
      el.precision = 1
      el.value = 1.26
      await waitForUpdate(el)

      expect(el.value).toBe(1.3)
      cleanupElement(el)
    })

    it('precision=2 保留两位小数', async () => {
      const el = createNumber()
      el.precision = 2
      el.value = 1.234
      await waitForUpdate(el)

      expect(el.value).toBe(1.23)
      cleanupElement(el)
    })

    it('precision 变化后重算现有值', async () => {
      const el = createNumber()
      // value 在设入时已按当前精度舍入，精度变更不会恢复已丢失的精度
      el.value = 1.234
      await waitForUpdate(el)
      expect(el.value).toBe(1)
      el.precision = 2
      await waitForUpdate(el)
      expect(el.value).toBe(1)
      cleanupElement(el)
    })
  })

  describe('键盘操作', () => {
    it('ArrowUp 增大值并派发 input 和 change', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')

      const input = queryA11y(el, 'input') as HTMLInputElement
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(6)
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      cleanupElement(el)
    })

    it('ArrowDown 减小值并派发 input 和 change', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')

      const input = queryA11y(el, 'input') as HTMLInputElement
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(4)
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      cleanupElement(el)
    })

    it('disabled 时键盘无响应', async () => {
      const el = createNumber()
      el.value = 5
      el.disabled = true
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const input = queryA11y(el, 'input') as HTMLInputElement
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(5)
      expect(inputEvents).toHaveLength(0)
      cleanupElement(el)
    })
  })
})
