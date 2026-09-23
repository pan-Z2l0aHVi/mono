import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiInputNumber } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（value/disabled 默认值、属性反射、input・change・focus・blur 事件、
 * value 双向同步、formAssociated）见
 * `src/shared/form-association/__tests__/text-control-contract.spec.ts`。
 * 本文件只保留 input-number 特有的公开契约：步进按钮、min/max 收敛、精度、键盘。
 */
const createNumber = (attrs?: Record<string, string>): WebUiInputNumber =>
  mountElement<WebUiInputNumber>('web-ui-input-number', { attrs })

const nativeInput = (el: WebUiInputNumber): HTMLInputElement => queryA11y(el, 'input') as HTMLInputElement
const stepButton = (el: WebUiInputNumber, direction: 'Increase' | 'Decrease'): HTMLButtonElement =>
  queryA11y(el, `button[aria-label="${direction}"]`) as HTMLButtonElement

describe('WebUiInputNumber 组件特有契约', () => {
  it('precision 默认 0', () => {
    const el = createNumber()
    expect(el.precision).toBe(0)
    cleanupElement(el)
  })

  describe('步进按钮', () => {
    it('点击增加按钮增大值', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(el.value).toBe(6)
      cleanupElement(el)
    })

    it('点击减少按钮减小值', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      stepButton(el, 'Decrease').click()
      await waitForUpdate(el)

      expect(el.value).toBe(4)
      cleanupElement(el)
    })

    it('点击增加按钮只派发 input，不派发 change', async () => {
      const el = createNumber()
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(0)
      cleanupElement(el)
    })

    it('disabled 时点击按钮不触发 input 事件', async () => {
      const el = createNumber()
      el.disabled = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      stepButton(el, 'Increase').click()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('readonly 时步进按钮禁用且点击不触发 input', async () => {
      const el = createNumber()
      el.readonly = true
      await waitForUpdate(el)

      expect(stepButton(el, 'Increase').disabled).toBe(true)
      expect(stepButton(el, 'Decrease').disabled).toBe(true)

      const [events] = spyEvents(el, 'input')
      stepButton(el, 'Increase').click()
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

      expect(stepButton(el, 'Decrease').disabled).toBe(true)
      expect(stepButton(el, 'Increase').disabled).toBe(false)
      cleanupElement(el)
    })

    it('到达 max 时增加按钮被禁用', async () => {
      const el = createNumber()
      el.max = 10
      el.value = 10
      await waitForUpdate(el)

      expect(stepButton(el, 'Increase').disabled).toBe(true)
      expect(stepButton(el, 'Decrease').disabled).toBe(false)
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

    it('precision 变化不恢复设值时已按旧精度舍入的值', async () => {
      const el = createNumber()
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

      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
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

      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
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
      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(5)
      expect(inputEvents).toHaveLength(0)
      cleanupElement(el)
    })

    it('readonly 时键盘无响应', async () => {
      const el = createNumber()
      el.value = 5
      el.readonly = true
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      nativeInput(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(5)
      expect(inputEvents).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('readonly 时的原生 change', () => {
    it('文本失焦提交时原生 change 转发为宿主 change', async () => {
      const el = createNumber()
      el.value = 5
      await waitForUpdate(el)

      const [changeEvents] = spyEvents(el, 'change')
      const input = nativeInput(el)
      // 真实浏览器派发的 change 不 composed，被 shadow root 挡住；组件补发 composed change
      input.value = '8'
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(8)
      expect(changeEvents).toHaveLength(1)
      cleanupElement(el)
    })

    it('readonly 时原生 change 不转发', async () => {
      const el = createNumber()
      el.value = 5
      el.readonly = true
      await waitForUpdate(el)

      const [changeEvents] = spyEvents(el, 'change')
      const input = nativeInput(el)
      input.value = '8'
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(5)
      expect(changeEvents).toHaveLength(0)
      cleanupElement(el)
    })
  })
})
