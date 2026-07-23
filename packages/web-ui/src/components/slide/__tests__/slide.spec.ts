import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiSlide } from '..'

const createSlide = (): WebUiSlide => {
  const el = document.createElement('web-ui-slide') as WebUiSlide
  document.body.appendChild(el)
  return el
}

const getSlider = (el: WebUiSlide): HTMLDivElement => el.shadowRoot!.querySelector('[role="slider"]')!

describe('WebUiSlide', () => {
  describe('props', () => {
    it('提供默认值并反射数值属性', async () => {
      const el = createSlide()
      el.value = 20
      el.min = 10
      el.max = 30
      el.step = 2
      await el.updateComplete

      expect([el.value, el.min, el.max, el.step]).toEqual([20, 10, 30, 2])
      expect(el.getAttribute('value')).toBe('20')
      expect(el.getAttribute('min')).toBe('10')
      expect(el.getAttribute('max')).toBe('30')
      expect(el.getAttribute('step')).toBe('2')

      el.remove()
    })

    it('根据范围和步长规整 value', async () => {
      const el = createSlide()
      el.min = 0
      el.max = 10
      el.step = 0.5
      el.value = 12.2
      await el.updateComplete

      expect(el.value).toBe(10)

      el.remove()
    })

    it('marks 启用时渲染中间刻度', async () => {
      const el = createSlide()
      el.max = 4
      el.marks = true
      await el.updateComplete

      expect(el.shadowRoot!.querySelectorAll('.wui-slide-mark')).toHaveLength(5)

      el.remove()
    })

    it('disabled 和 glass 反射到宿主并改变可访问状态', async () => {
      const el = createSlide()
      el.disabled = true
      el.glass = true
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(true)
      expect(el.hasAttribute('glass')).toBe(true)
      expect(getSlider(el).tabIndex).toBe(-1)
      expect(el.shadowRoot!.querySelector('.wui-slide-thumb')!.classList).toContain('wui-glass')

      el.remove()
    })
  })

  describe('events', () => {
    it('点击轨道更新 value 并触发 input', async () => {
      const el = createSlide()
      const input = vi.fn<(event: Event) => void>()
      el.addEventListener('input', input)
      await el.updateComplete

      const slider = getSlider(el)
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 8))
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 1 }))
      await el.updateComplete

      expect(el.value).toBe(50)
      expect(input).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('结束拖拽触发 change', async () => {
      const el = createSlide()
      const change = vi.fn<(event: Event) => void>()
      el.addEventListener('change', change)
      await el.updateComplete

      const slider = getSlider(el)
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 8))
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 20, pointerId: 1 }))
      slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 20, pointerId: 1 }))

      expect(change).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('禁用时不响应指针事件', async () => {
      const el = createSlide()
      el.disabled = true
      const input = vi.fn<(event: Event) => void>()
      el.addEventListener('input', input)
      await el.updateComplete

      getSlider(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 1 }))

      expect(el.value).toBe(0)
      expect(input).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('keyboard', () => {
    it('箭头键按 step 调整并触发 input 和 change', async () => {
      const el = createSlide()
      el.value = 10
      el.step = 5
      const input = vi.fn<(event: Event) => void>()
      const change = vi.fn<(event: Event) => void>()
      el.addEventListener('input', input)
      el.addEventListener('change', change)
      await el.updateComplete

      getSlider(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await el.updateComplete

      expect(el.value).toBe(15)
      expect(input).toHaveBeenCalledTimes(1)
      expect(change).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('Home 和 End 跳至范围边界', async () => {
      const el = createSlide()
      el.min = 10
      el.max = 90
      el.value = 50
      await el.updateComplete

      getSlider(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
      await el.updateComplete
      expect(el.value).toBe(10)

      getSlider(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      await el.updateComplete
      expect(el.value).toBe(90)

      el.remove()
    })
  })

  describe('exported APIs', () => {
    it('focus() 和 blur() 代理至滑块', async () => {
      const el = createSlide()
      await el.updateComplete

      el.focus()
      expect(el.shadowRoot!.activeElement).toBe(getSlider(el))

      el.blur()
      expect(el.shadowRoot!.activeElement).toBeNull()

      el.remove()
    })
  })
})
