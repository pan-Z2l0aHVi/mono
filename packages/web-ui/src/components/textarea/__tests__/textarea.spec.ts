import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiTextarea } from '..'

function createTextarea(attrs?: Record<string, string>): WebUiTextarea {
  const el = document.createElement('web-ui-textarea') as WebUiTextarea
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  document.body.appendChild(el)
  return el
}

describe('WebUiTextarea', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('默认值', () => {
    it('value 默认空字符串', () => {
      const el = createTextarea()
      expect(el.value).toBe('')
      cleanupElement(el)
    })

    it('rows 默认 3', async () => {
      const el = createTextarea()
      await waitForUpdate(el)
      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      expect(textarea.rows).toBe(3)
      cleanupElement(el)
    })

    it('disabled 默认 false', () => {
      const el = createTextarea()
      expect(el.disabled).toBe(false)
      cleanupElement(el)
    })

    it('formAssociated 已声明', () => {
      expect((customElements.get('web-ui-textarea') as typeof WebUiTextarea).formAssociated).toBe(true)
    })
  })

  describe('属性反射', () => {
    it('disabled 属性反射', async () => {
      const el = createTextarea()
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('required 属性反射', async () => {
      const el = createTextarea()
      el.required = true
      await waitForUpdate(el)
      expect(el.hasAttribute('required')).toBe(true)
      cleanupElement(el)
    })

    it('readonly 属性反射', async () => {
      const el = createTextarea()
      el.readonly = true
      await waitForUpdate(el)
      expect(el.hasAttribute('readonly')).toBe(true)
      cleanupElement(el)
    })

    it('placeholder 属性反射', async () => {
      const el = createTextarea({ placeholder: '请输入' })
      await waitForUpdate(el)
      expect(el.getAttribute('placeholder')).toBe('请输入')
      cleanupElement(el)
    })

    it('name 属性反射', async () => {
      const el = createTextarea({ name: 'bio' })
      await waitForUpdate(el)
      expect(el.getAttribute('name')).toBe('bio')
      cleanupElement(el)
    })

    it('rows 属性反射', async () => {
      const el = createTextarea({ rows: '5' })
      await waitForUpdate(el)
      expect(el.getAttribute('rows')).toBe('5')
      cleanupElement(el)
    })

    it('full 属性反射', async () => {
      const el = createTextarea()
      el.full = true
      await waitForUpdate(el)
      expect(el.hasAttribute('full')).toBe(true)
      cleanupElement(el)
    })

    it('borderless 属性反射', async () => {
      const el = createTextarea({ borderless: '' })
      await waitForUpdate(el)
      expect(el.hasAttribute('borderless')).toBe(true)
      cleanupElement(el)
    })
  })

  describe('disabled', () => {
    it('disabled 时点击容器不聚焦原生 textarea', async () => {
      const el = createTextarea()
      el.disabled = true
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'focus')
      const wrapper = el.shadowRoot?.querySelector('.wui-textarea-inner') as HTMLElement
      wrapper.click()

      expect(spy).not.toHaveBeenCalled()
      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('输入时触发 input 事件', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      textarea.value = 'test'
      textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('失焦时触发 change 事件', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'change')
      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('聚焦时触发 focus 事件', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'focus')
      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('失焦时触发 blur 事件', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'blur')
      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))

      expect(events).toHaveLength(1)
      cleanupElement(el)
    })

    it('设置属性时不派发 input 事件', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      el.value = 'hello'
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      cleanupElement(el)
    })
  })

  describe('value 双向同步', () => {
    it('设置 value 后原生 textarea 值同步', async () => {
      const el = createTextarea()
      el.value = 'hello'
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      expect(textarea.value).toBe('hello')
      cleanupElement(el)
    })

    it('输入后组件 value 属性同步更新', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      textarea.value = 'typed'
      textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('typed')
      cleanupElement(el)
    })
  })

  describe('clearable', () => {
    it('clearable 有值时触发 input 事件', async () => {
      const el = createTextarea()
      el.clearable = true
      el.value = 'hello'
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      const clear = el.shadowRoot?.querySelector('.clear') as HTMLElement
      clear.click()

      expect(events).toHaveLength(1)
      expect(el.value).toBe('')
      cleanupElement(el)
    })
  })

  describe('公开 API', () => {
    it('focus() 聚焦原生 textarea', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'focus')
      el.focus()

      expect(spy).toHaveBeenCalled()
      cleanupElement(el)
    })

    it('blur() 移焦原生 textarea', async () => {
      const el = createTextarea()
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'blur')
      el.blur()

      expect(spy).toHaveBeenCalled()
      cleanupElement(el)
    })

    it('select() 选中 textarea 内容', async () => {
      const el = createTextarea({ value: 'hello' })
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'select')
      el.select()

      expect(spy).toHaveBeenCalled()
      cleanupElement(el)
    })
  })

  describe('autosize', () => {
    it('autosize 启用后同步高度', async () => {
      const el = createTextarea({ autosize: '' })
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea.style, 'height', 'set')
      textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      expect(spy).toHaveBeenCalled()
      cleanupElement(el)
    })

    it('运行时关闭 autosize 后移除内联高度', async () => {
      const el = createTextarea({ autosize: '' })
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      el.autosize = false
      await waitForUpdate(el)

      expect(textarea.style.height).toBe('')
      cleanupElement(el)
    })
  })

  describe('slot 投影', () => {
    it('prefix 内容投影', async () => {
      const el = createTextarea()
      el.innerHTML = '<span slot="prefix">Q</span>'
      await waitForUpdate(el)

      const slot = queryA11y(el, 'slot[name="prefix"]') as HTMLSlotElement
      expect(slot.assignedElements().length).toBe(1)
      cleanupElement(el)
    })

    it('suffix 内容投影', async () => {
      const el = createTextarea()
      el.innerHTML = '<span slot="suffix">ok</span>'
      await waitForUpdate(el)

      const slot = queryA11y(el, 'slot[name="suffix"]') as HTMLSlotElement
      expect(slot.assignedElements().length).toBe(1)
      cleanupElement(el)
    })
  })

  describe('a11y', () => {
    it('将 aria-label 转发给原生 textarea', async () => {
      const el = createTextarea({ 'aria-label': '个人简介' })
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      expect(textarea.getAttribute('aria-label')).toBe('个人简介')
      cleanupElement(el)
    })

    it('将 aria-labelledby 转发给原生 textarea', async () => {
      const el = createTextarea({ 'aria-labelledby': 'bio-label' })
      await waitForUpdate(el)

      const textarea = queryA11y(el, 'textarea') as HTMLTextAreaElement
      expect(textarea.getAttribute('aria-labelledby')).toBe('bio-label')
      cleanupElement(el)
    })
  })
})
