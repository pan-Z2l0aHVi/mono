import '..'

import { describe, expect, it, vi } from 'vite-plus/test'

import {
  cleanupElement,
  contractReflection,
  expectReflected,
  queryA11y,
  spyEvents,
  waitForUpdate
} from '@/shared/test-utils'

import type { WebUiSlider } from '..'

describe('WebUiSlider 组件', () => {
  function createSlider(): WebUiSlider {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    return el
  }

  describe('host 属性', () => {
    contractReflection('数值属性与 name 反射到宿主', createSlider, [
      ['value', 20, 'value', '20'],
      ['min', 10, 'min', '10'],
      ['max', 30, 'max', '30'],
      ['step', 2, 'step', '2'],
      ['name', 'volume', 'name', 'volume']
    ])

    it('提供默认值', async () => {
      const el = createSlider()
      await waitForUpdate(el)

      expect([el.value, el.min, el.max, el.step]).toEqual([0, 0, 100, 1])

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
  })

  describe('accessible name', () => {
    it('将宿主 aria-label 转发给内部 slider', async () => {
      const el = createSlider()
      await waitForUpdate(el)

      el.setAttribute('aria-label', '音量')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')
      expect(slider?.getAttribute('aria-label')).toBe('音量')

      cleanupElement(el)
    })

    it('将宿主 aria-labelledby 的文本镜像到内部 slider 可引用的作用域', async () => {
      const label = document.createElement('span')
      label.id = 'slider-volume-label'
      label.textContent = '音量'
      document.body.append(label)

      const el = createSlider()
      await waitForUpdate(el)
      el.setAttribute('aria-labelledby', label.id)
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')
      const labelledby = slider?.getAttribute('aria-labelledby')
      expect(labelledby).toBeTruthy()
      expect(el.shadowRoot?.querySelector(`#${labelledby}`)?.textContent).toBe('音量')

      cleanupElement(el)
      label.remove()
    })

    it('从 aria-labelledby 引用元素的 accessible text alternative 取名', async () => {
      const button = document.createElement('button')
      button.id = 'slider-volume-label'
      button.setAttribute('aria-label', 'Master volume')
      const wrapper = document.createElement('span')
      wrapper.id = 'slider-channel-label'
      const image = document.createElement('img')
      image.alt = 'Left channel'
      wrapper.append(image)
      document.body.append(button, wrapper)

      const el = createSlider()
      await waitForUpdate(el)
      el.setAttribute('aria-labelledby', `${button.id} ${wrapper.id}`)
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')
      const labelledby = slider?.getAttribute('aria-labelledby')
      expect(labelledby).toBeTruthy()
      expect(el.shadowRoot?.querySelector(`#${labelledby}`)?.textContent).toBe('Master volume Left channel')

      cleanupElement(el)
      button.remove()
      wrapper.remove()
    })

    it('从 aria-labelledby 的文本中排除 aria-hidden 后代', async () => {
      const label = document.createElement('span')
      label.id = 'slider-volume-label'
      label.append(document.createTextNode('Volume'))
      const hiddenDescription = document.createElement('span')
      hiddenDescription.setAttribute('aria-hidden', 'true')
      hiddenDescription.textContent = ' hidden description'
      label.append(hiddenDescription)
      document.body.append(label)

      const el = createSlider()
      el.setAttribute('aria-labelledby', label.id)
      await waitForUpdate(el)

      const labelledby = queryA11y(el, '[role="slider"]')?.getAttribute('aria-labelledby')
      expect(el.shadowRoot?.querySelector(`#${labelledby}`)?.textContent).toBe('Volume')

      cleanupElement(el)
      label.remove()
    })

    it('更新 aria-labelledby 的引用文本', async () => {
      const label = document.createElement('span')
      label.id = 'slider-volume-label'
      label.textContent = 'Volume'
      document.body.append(label)

      const el = createSlider()
      el.setAttribute('aria-labelledby', label.id)
      await waitForUpdate(el)

      const labelledby = queryA11y(el, '[role="slider"]')?.getAttribute('aria-labelledby')
      expect(labelledby).toBeTruthy()
      const mirroredLabel = el.shadowRoot?.querySelector(`#${labelledby}`)
      expect(mirroredLabel?.textContent).toBe('Volume')

      label.textContent = 'Master volume'
      await vi.waitFor(() => expect(mirroredLabel?.textContent).toBe('Master volume'))

      cleanupElement(el)
      label.remove()
    })

    it('引用元素被移除后清除过期名称', async () => {
      const label = document.createElement('span')
      label.id = 'slider-volume-label'
      label.textContent = 'Volume'
      document.body.append(label)

      const el = createSlider()
      el.setAttribute('aria-labelledby', label.id)
      await waitForUpdate(el)
      const slider = queryA11y(el, '[role="slider"]')
      expect(slider?.hasAttribute('aria-labelledby')).toBe(true)

      label.remove()
      await vi.waitFor(() => expect(slider?.hasAttribute('aria-labelledby')).toBe(false))

      cleanupElement(el)
    })

    it('没有消费者名称时不生成共用的默认名称', async () => {
      const el = createSlider()
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')
      expect(slider?.hasAttribute('aria-label')).toBe(false)
      expect(slider?.hasAttribute('aria-labelledby')).toBe(false)

      cleanupElement(el)
    })

    it('忽略空白 aria-labelledby', async () => {
      const el = createSlider()
      el.setAttribute('aria-labelledby', '  ')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')
      expect(slider?.hasAttribute('aria-labelledby')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击 track 更新 value 并触发 input', async () => {
      const el = createSlider()
      const [events] = spyEvents(el, 'input')
      await waitForUpdate(el)

      const slider = queryA11y(el, '[role="slider"]')!
      vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 8))
      slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, pointerId: 1 }))
      slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, pointerId: 1 }))

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
      slider.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientY: 50, pointerId: 1 }))

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
    it('focus() 把焦点移入 role="slider" 元素', async () => {
      const el = createSlider()
      await waitForUpdate(el)

      el.focus()

      // shadow 内焦点在文档层会重定位到宿主；组件内活动元素用 ShadowRoot.activeElement 观察。
      expect(el.shadowRoot!.activeElement, 'focus() 应把焦点移到 slider').toBe(queryA11y(el, '[role="slider"]'))
      expect(document.activeElement, '宿主应成为文档级活动元素').toBe(el)

      cleanupElement(el)
    })

    it('blur() 移走焦点', async () => {
      const el = createSlider()
      await waitForUpdate(el)

      el.focus()
      el.blur()

      expect(el.shadowRoot!.activeElement, 'blur() 应清空组件内焦点').toBeNull()

      cleanupElement(el)
    })
  })
})
