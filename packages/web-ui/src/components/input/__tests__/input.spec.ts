import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiInput } from '..'

function createInput(attrs?: Record<string, string>): WebUiInput {
  const el = document.createElement('web-ui-input')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiInput 组件', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('默认值', () => {
    it('type 默认 text', async () => {
      const el = createInput()
      await waitForUpdate(el)
      expect(el.type).toBe('text')
      cleanupElement(el)
    })

    it('value 默认空字符串', () => {
      const el = createInput()
      expect(el.value).toBe('')
      cleanupElement(el)
    })

    it('disabled 默认 false', () => {
      const el = createInput()
      expect(el.disabled).toBe(false)
      cleanupElement(el)
    })

    it('formAssociated 已声明', () => {
      expect((customElements.get('web-ui-input') as typeof WebUiInput).formAssociated).toBe(true)
    })
  })

  describe('属性反射', () => {
    it('type 属性反射', async () => {
      const el = createInput({ type: 'password' })
      await waitForUpdate(el)
      expect(el.getAttribute('type')).toBe('password')
      cleanupElement(el)
    })

    it('disabled 属性反射', async () => {
      const el = createInput()
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('placeholder 属性反射', async () => {
      const el = createInput({ placeholder: '请输入' })
      await waitForUpdate(el)
      expect(el.getAttribute('placeholder')).toBe('请输入')
      cleanupElement(el)
    })

    it('name 属性反射', async () => {
      const el = createInput({ name: 'username' })
      await waitForUpdate(el)
      expect(el.getAttribute('name')).toBe('username')
      cleanupElement(el)
    })

    it('required 属性反射', async () => {
      const el = createInput()
      el.required = true
      await waitForUpdate(el)
      expect(el.hasAttribute('required')).toBe(true)
      cleanupElement(el)
    })

    it('clearable 属性反射', async () => {
      const el = createInput()
      el.clearable = true
      await waitForUpdate(el)
      expect(el.hasAttribute('clearable')).toBe(true)
      cleanupElement(el)
    })

    it('full 属性反射', async () => {
      const el = createInput()
      el.full = true
      await waitForUpdate(el)
      expect(el.hasAttribute('full')).toBe(true)
      cleanupElement(el)
    })

    it('borderless 属性反射', async () => {
      const el = createInput({ borderless: '' })
      await waitForUpdate(el)
      expect(el.hasAttribute('borderless')).toBe(true)
      cleanupElement(el)
    })

    it('readonly 属性反射并同步到原生 input', async () => {
      const el = createInput()
      el.readonly = true
      await waitForUpdate(el)
      expect(el.hasAttribute('readonly')).toBe(true)
      expect(queryA11y(el, 'input')?.hasAttribute('readonly')).toBe(true)
      cleanupElement(el)
    })

    it('aria-label 映射到内部输入元素', async () => {
      const el = createInput({ 'aria-label': 'Search' })
      await waitForUpdate(el)
      expect(queryA11y(el, 'input')?.getAttribute('aria-label')).toBe('Search')
      cleanupElement(el)
    })
  })

  describe('禁用状态', () => {
    it('disabled 时点击容器不聚焦原生 input', async () => {
      const el = createInput()
      el.disabled = true
      await waitForUpdate(el)

      const input = queryA11y(el, 'input') as HTMLInputElement
      const spy = vi.spyOn(input, 'focus')
      // input 的直接父容器即点击区域，用结构关系而非内部 class 定位
      input.parentElement!.click()

      expect(spy).not.toHaveBeenCalled()
      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('输入时触发 input 事件', async () => {
      const el = createInput()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      const input = queryA11y(el, 'input') as HTMLInputElement
      input.value = 'test'
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('失焦时原生 change 事件转发为宿主 change', async () => {
      const el = createInput()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'change')
      const input = queryA11y(el, 'input') as HTMLInputElement
      // 真实浏览器派发的 change 不 composed，被 shadow root 挡住；
      // 组件捕获后补发 composed change，宿主监听器收到一次
      input.dispatchEvent(new Event('change', { bubbles: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('readonly 时原生 change 不转发', async () => {
      const el = createInput()
      el.value = 'hello'
      el.readonly = true
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'change')
      const input = queryA11y(el, 'input') as HTMLInputElement
      input.value = 'changed'
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('hello')
      expect(events).toHaveLength(0)
      cleanupElement(el)
    })

    it('聚焦时触发 focus 事件', async () => {
      const el = createInput()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'focus')
      const input = queryA11y(el, 'input') as HTMLInputElement
      input.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('失焦时触发 blur 事件', async () => {
      const el = createInput()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'blur')
      const input = queryA11y(el, 'input') as HTMLInputElement
      input.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('设置属性时不派发 input 事件', async () => {
      const el = createInput()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      el.value = 'hello'
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('value 双向同步', () => {
    it('设置 value 后原生 input 值同步', async () => {
      const el = createInput()
      el.value = 'hello'
      await waitForUpdate(el)

      const input = queryA11y(el, 'input') as HTMLInputElement
      expect(input.value).toBe('hello')
      cleanupElement(el)
    })

    it('输入后组件 value 属性同步更新', async () => {
      const el = createInput()
      await waitForUpdate(el)

      const input = queryA11y(el, 'input') as HTMLInputElement
      input.value = 'typed'
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('typed')
      cleanupElement(el)
    })
  })

  describe('可清除', () => {
    it('clearable 有值时触发 input 事件', async () => {
      const el = createInput()
      el.clearable = true
      el.value = 'hello'
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      const clear = queryA11y(el, '[aria-label="清除"]') as HTMLElement
      clear.click()

      expect(events).toHaveLength(1)
      expect(el.value).toBe('')
      cleanupElement(el)
    })

    it('readonly 时不渲染清除按钮', async () => {
      const el = createInput()
      el.clearable = true
      el.readonly = true
      el.value = 'hello'
      await waitForUpdate(el)

      expect(queryA11y(el, '[aria-label="清除"]')).toBeNull()
      cleanupElement(el)
    })
  })

  describe('插槽投影', () => {
    it('prefix 内容投影', async () => {
      const el = createInput()
      el.innerHTML = '<span slot="prefix">Q</span>'
      await waitForUpdate(el)

      const slot = queryA11y(el, 'slot[name="prefix"]') as HTMLSlotElement
      expect(slot.assignedElements().length).toBe(1)
      cleanupElement(el)
    })

    it('suffix 内容投影', async () => {
      const el = createInput()
      el.innerHTML = '<span slot="suffix">ok</span>'
      await waitForUpdate(el)

      const slot = queryA11y(el, 'slot[name="suffix"]') as HTMLSlotElement
      expect(slot.assignedElements().length).toBe(1)
      cleanupElement(el)
    })
  })
})
