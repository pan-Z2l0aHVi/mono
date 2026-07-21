import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiInput } from '..'

const createInput = (attrs?: Record<string, string>): WebUiInput => {
  const el = document.createElement('web-ui-input') as WebUiInput
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiInput', () => {
  describe('基础渲染', () => {
    it('渲染原生 input 元素', async () => {
      const el = createInput()
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input')
      expect(input).toBeTruthy()

      el.remove()
    })

    it('默认 type 为 text', async () => {
      const el = createInput()
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('text')

      el.remove()
    })

    it('type 属性同步到原生 input', async () => {
      const el = createInput({ type: 'password' })
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.type).toBe('password')

      el.remove()
    })

    it('placeholder 渲染到原生 input', async () => {
      const el = createInput({ placeholder: '请输入' })
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.placeholder).toBe('请输入')

      el.remove()
    })

    it('value 渲染到原生 input', async () => {
      const el = createInput({ value: 'hello' })
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.value).toBe('hello')

      el.remove()
    })
  })

  describe('插槽', () => {
    it('prefix slot 始终存在于 shadow DOM', async () => {
      const el = createInput()
      await el.updateComplete

      const prefix = el.shadowRoot?.querySelector('slot[name=prefix]')
      expect(prefix).toBeTruthy()

      el.remove()
    })

    it('有 prefix 内容时 slot 非空', async () => {
      const el = createInput()
      el.innerHTML = '<span slot="prefix">Q</span>'
      await el.updateComplete

      const prefix = el.shadowRoot?.querySelector('slot[name=prefix]') as HTMLSlotElement
      expect(prefix.assignedElements().length).toBe(1)

      el.remove()
    })

    it('suffix slot 始终存在于 shadow DOM', async () => {
      const el = createInput()
      await el.updateComplete

      const suffix = el.shadowRoot?.querySelector('slot[name=suffix]')
      expect(suffix).toBeTruthy()

      el.remove()
    })

    it('有 suffix 内容时 slot 非空', async () => {
      const el = createInput()
      el.innerHTML = '<span slot="suffix">ok</span>'
      await el.updateComplete

      const suffix = el.shadowRoot?.querySelector('slot[name=suffix]') as HTMLSlotElement
      expect(suffix.assignedElements().length).toBe(1)

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 时原生 input 被 disabled', async () => {
      const el = createInput()
      el.disabled = true
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.disabled).toBe(true)

      el.remove()
    })

    it('disabled 属性反射到 host', async () => {
      const el = createInput()
      el.disabled = true
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(true)

      el.remove()
    })
  })

  describe('prop: closable', () => {
    it('closable 有值时显示清除按钮', async () => {
      const el = createInput()
      el.closable = true
      el.value = 'hello'
      await el.updateComplete

      const clear = el.shadowRoot?.querySelector('.clear')
      expect(clear).toBeTruthy()

      el.remove()
    })

    it('closable 无值时不显示清除按钮', async () => {
      const el = createInput()
      el.closable = true
      await el.updateComplete

      const clear = el.shadowRoot?.querySelector('.clear')
      expect(clear).toBeNull()

      el.remove()
    })

    it('非 closable 时不显示清除按钮', async () => {
      const el = createInput({ value: 'hello' })
      await el.updateComplete

      const clear = el.shadowRoot?.querySelector('.clear')
      expect(clear).toBeNull()

      el.remove()
    })

    it('点击清除按钮清空 value', async () => {
      const el = createInput()
      el.closable = true
      el.value = 'hello'
      await el.updateComplete

      const clear = el.shadowRoot?.querySelector('.clear') as HTMLElement
      clear.click()

      await el.updateComplete
      expect(el.value).toBe('')

      el.remove()
    })

    it('点击清除按钮触发 input 事件', async () => {
      const el = createInput()
      el.closable = true
      el.value = 'hello'
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('input', handler)

      const clear = el.shadowRoot?.querySelector('.clear') as HTMLElement
      clear.click()

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('清除后图标消失', async () => {
      const el = createInput()
      el.closable = true
      el.value = 'hello'
      await el.updateComplete

      const clearBefore = el.shadowRoot?.querySelector('.clear')
      expect(clearBefore).toBeTruthy()

      const clear = el.shadowRoot?.querySelector('.clear') as HTMLElement
      clear.click()
      await el.updateComplete

      const clearAfter = el.shadowRoot?.querySelector('.clear')
      expect(clearAfter).toBeNull()

      el.remove()
    })

    it('closable + suffix 同时显示', async () => {
      const el = createInput()
      el.closable = true
      el.value = 'hello'
      el.innerHTML = '<span slot="suffix">ok</span>'
      await el.updateComplete

      const suffix = el.shadowRoot?.querySelector('slot[name=suffix]') as HTMLSlotElement
      expect(suffix.assignedElements().length).toBe(1)

      const clear = el.shadowRoot?.querySelector('.clear')
      expect(clear).toBeTruthy()

      el.remove()
    })
  })

  describe('事件', () => {
    it('输入时触发 input 事件', async () => {
      const el = createInput()
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('input', handler)

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.value = 'test'
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('失焦时触发 change 事件', async () => {
      const el = createInput()
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('change', handler)

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('聚焦时触发 focus 事件', async () => {
      const el = createInput()
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('focus', handler)

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('失焦时触发 blur 事件', async () => {
      const el = createInput()
      await el.updateComplete

      const handler = vi.fn()
      el.addEventListener('blur', handler)

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })
  })

  describe('prop: value（双向同步）', () => {
    it('设置 value 属性后原生 input 同步', async () => {
      const el = createInput()
      el.value = 'hello'
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      expect(input.value).toBe('hello')

      el.remove()
    })

    it('输入后 value 属性同步更新', async () => {
      const el = createInput()
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.value = 'typed'
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      await el.updateComplete
      expect(el.value).toBe('typed')

      el.remove()
    })
  })

  describe('焦点状态', () => {
    it('聚焦时添加 focused 属性', async () => {
      const el = createInput()
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))

      await el.updateComplete
      expect(el.hasAttribute('focused')).toBe(true)

      el.remove()
    })

    it('失焦时移除 focused 属性', async () => {
      const el = createInput()
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))
      await el.updateComplete
      input.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))
      await el.updateComplete

      expect(el.hasAttribute('focused')).toBe(false)

      el.remove()
    })

    it('disabled 时不添加 focused 属性', async () => {
      const el = createInput()
      el.disabled = true
      await el.updateComplete

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement
      input.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))
      await el.updateComplete

      expect(el.hasAttribute('focused')).toBe(false)

      el.remove()
    })
  })

  describe('玻璃样式', () => {
    it('容器具有 wui-glass 类', async () => {
      const el = createInput()
      await el.updateComplete

      const wrapper = el.shadowRoot?.querySelector('.wui-glass')
      expect(wrapper).toBeTruthy()

      el.remove()
    })
  })

  describe('prop: full', () => {
    it('full 属性反射到 host', async () => {
      const el = createInput()
      el.full = true
      await el.updateComplete

      expect(el.hasAttribute('full')).toBe(true)

      el.remove()
    })
  })
})
