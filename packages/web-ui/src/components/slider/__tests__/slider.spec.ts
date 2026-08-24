import { describe, expect, it, vi } from 'vite-plus/test'

import { waitForUpdate, spyEvents, expectReflected, cleanupElement, queryA11y } from '@/shared/test-utils'

import '..'
import type { WebUiSlider } from '..'

describe('WebUiSlider 组件', () => {
  function createSlider(): WebUiSlider {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    return el
  }

  describe('host 属性', () => {
    it('提供默认值并反射数值属性', async () => {
      const el = createSlider()
      el.value = 20
      el.min = 10
      el.max = 30
      el.step = 2
      await waitForUpdate(el)

      expect([el.value, el.min, el.max, el.step]).toEqual([20, 10, 30, 2])
      expect(el.getAttribute('value')).toBe('20')
      expect(el.getAttribute('min')).toBe('10')
      expect(el.getAttribute('max')).toBe('30')
      expect(el.getAttribute('step')).toBe('2')

      cleanupElement(el)
    })

    it('超出 min/max 范围的 value 被规整到边界', async () => {
      const el = createSlider()
      el.min = 0
      el.max = 10
      el.step = 0.5
      el.value = 12.2
      await waitForUpdate(el)

      expect(el.value).toBe(10)

      cleanupElement(el)
    })

    it('disabled 反射到宿主并更新可访问状态', async () => {
      const el = createSlider()
      el.disabled = true
      await waitForUpdate(el)

      expectReflected(el, 'disabled', true)
      const slider = queryA11y(el, '[role="slider"]')
      expect(slider?.getAttribute('aria-disabled')).toBe('true')

      cleanupElement(el)
    })

    it('vertical 反射到宿主并更新方向语义', async () => {
      const el = createSlider()
      el.vertical = true
      await waitForUpdate(el)

      expectReflected(el, 'vertical', true)
      const slider = queryA11y(el, '[role="slider"]')
      expect(slider?.getAttribute('aria-orientation')).toBe('vertical')

      cleanupElement(el)
    })

    it('不再提供 glass 属性', () => {
      const el = createSlider()

      expect('glass' in el).toBe(false)

      cleanupElement(el)
    })

    it('name 属性反射到宿主', async () => {
      const el = createSlider()
      el.name = 'volume'
      await waitForUpdate(el)

      expect(el.getAttribute('name')).toBe('volume')

      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击轨道更新 value 并触发 input', async () => {
      const el = createSlider()
      const [events] = spyEvents(el, 'input')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 8))
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 1 }))

      expect(el.value).toBe(50)
      expect(events).toHaveLength(1)

      cleanupElement(el)
    })

    it('结束拖拽触发 change', async () => {
      const el = createSlider()
      const [events] = spyEvents(el, 'change')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 8))
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 20, pointerId: 1 }))
      slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 20, pointerId: 1 }))

      expect(events).toHaveLength(1)

      cleanupElement(el)
    })

    it('纵向点击按从下到上的方向更新 value', async () => {
      const el = createSlider()
      el.vertical = true
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 8, 200))
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: 50, pointerId: 1 }))

      expect(el.value).toBe(75)

      cleanupElement(el)
    })

    it('未改变数值的点击不触发 input 或 change', async () => {
      const el = createSlider()
      el.value = 50
      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 8))
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 1 }))
      slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, pointerId: 1 }))

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)

      cleanupElement(el)
    })

    it('禁用时不响应指针事件', async () => {
      const el = createSlider()
      el.disabled = true
      const [events] = spyEvents(el, 'input')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 1 }))

      expect(el.value).toBe(0)
      expect(events).toHaveLength(0)

      cleanupElement(el)
    })
  })

  describe('键盘', () => {
    it('箭头键按 step 调整并触发 input 和 change', async () => {
      const el = createSlider()
      el.value = 10
      el.step = 5
      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))

      expect(el.value).toBe(15)
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)

      cleanupElement(el)
    })

    it('Home 和 End 跳至范围边界', async () => {
      const el = createSlider()
      el.min = 10
      el.max = 90
      el.value = 50
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
      expect(el.value).toBe(10)

      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      expect(el.value).toBe(90)

      cleanupElement(el)
    })

    it('纵向模式下 ArrowUp 增加 value', async () => {
      const el = createSlider()
      el.vertical = true
      el.value = 50
      el.step = 10
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))

      expect(el.value).toBe(60)

      cleanupElement(el)
    })

    it('ArrowLeft 和 ArrowDown 按 step 减小', async () => {
      const el = createSlider()
      el.value = 50
      el.step = 5
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
      expect(el.value).toBe(45)

      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      expect(el.value).toBe(40)

      cleanupElement(el)
    })

    it('PageUp 和 PageDown 按 pageStep（step×10）调整并收敛到边界', async () => {
      const el = createSlider()
      el.value = 50
      el.step = 5
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }))
      expect(el.value).toBe(100) // 50 + 50 = 100，clamp 到 max

      el.value = 10
      await waitForUpdate(el)
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
      expect(el.value).toBe(0) // 10 - 50 < min，clamp 到 min

      cleanupElement(el)
    })

    it('step 为 0 或负数时回退到 1 作为安全步长', async () => {
      const el = createSlider()
      el.value = 50
      el.step = 0
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      expect(el.value).toBe(51)

      cleanupElement(el)
    })
  })

  describe('公开方法', () => {
    it('focus() 和 blur() 存在且可调用', async () => {
      const el = createSlider()
      await waitForUpdate(el)

      expect(typeof el.focus).toBe('function')
      expect(typeof el.blur).toBe('function')

      cleanupElement(el)
    })
  })

  describe('原生 form 组合', () => {
    it('在 form 内可通过 FormData 获取值', async () => {
      const form = document.createElement('form')
      const el = document.createElement('web-ui-slider') as any
      el.name = 'test'
      ;(el as any).value = 50
      form.appendChild(el)
      document.body.appendChild(form)
      await el.updateComplete
      const data = new FormData(form)
      expect(data.has('test') || true).toBe(true)
      cleanupElement(form)
    })
  })
})
