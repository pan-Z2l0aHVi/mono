import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiTextarea } from '..'

const createTextarea = (attrs?: Record<string, string>): WebUiTextarea => {
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
  describe('基础渲染', () => {
    it('渲染原生 textarea 元素', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea')
      expect(textarea).toBeTruthy()

      el.remove()
    })

    it('默认 rows 为 3', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.rows).toBe(3)

      el.remove()
    })

    it('rows 属性同步到原生 textarea', async () => {
      const el = createTextarea({ rows: '5' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.rows).toBe(5)

      el.remove()
    })

    it('placeholder 渲染到原生 textarea', async () => {
      const el = createTextarea({ placeholder: '请输入' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.placeholder).toBe('请输入')

      el.remove()
    })

    it('value 渲染到原生 textarea', async () => {
      const el = createTextarea({ value: 'hello' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.value).toBe('hello')

      el.remove()
    })

    it('name 属性同步到原生 textarea', async () => {
      const el = createTextarea({ name: 'bio' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.name).toBe('bio')

      el.remove()
    })

    it('minlength 属性同步到原生 textarea', async () => {
      const el = createTextarea({ minlength: '10' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.getAttribute('minlength')).toBe('10')

      el.remove()
    })

    it('maxlength 属性同步到原生 textarea', async () => {
      const el = createTextarea({ maxlength: '200' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.getAttribute('maxlength')).toBe('200')

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 时原生 textarea 被 disabled', async () => {
      const el = createTextarea()
      el.disabled = true
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.disabled).toBe(true)

      el.remove()
    })

    it('disabled 属性反射到 host', async () => {
      const el = createTextarea()
      el.disabled = true
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(true)

      el.remove()
    })
  })

  describe('prop: readonly', () => {
    it('readonly 时原生 textarea 为 readonly', async () => {
      const el = createTextarea()
      el.readonly = true
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.readOnly).toBe(true)

      el.remove()
    })

    it('readonly 属性反射到 host', async () => {
      const el = createTextarea()
      el.readonly = true
      await el.updateComplete

      expect(el.hasAttribute('readonly')).toBe(true)

      el.remove()
    })
  })

  describe('prop: required', () => {
    it('required 时原生 textarea 为 required', async () => {
      const el = createTextarea()
      el.required = true
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.required).toBe(true)

      el.remove()
    })

    it('required 属性反射到 host', async () => {
      const el = createTextarea()
      el.required = true
      await el.updateComplete

      expect(el.hasAttribute('required')).toBe(true)

      el.remove()
    })
  })

  describe('prop: full', () => {
    it('full 属性反射到 host', async () => {
      const el = createTextarea()
      el.full = true
      await el.updateComplete

      expect(el.hasAttribute('full')).toBe(true)

      el.remove()
    })
  })

  describe('事件', () => {
    it('输入时触发 input 事件', async () => {
      const el = createTextarea()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('input', handler)

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.value = 'test'
      textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('失焦时触发 change 事件', async () => {
      const el = createTextarea()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('change', handler)

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('聚焦时触发 focus 事件', async () => {
      const el = createTextarea()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('focus', handler)

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })

    it('失焦时触发 blur 事件', async () => {
      const el = createTextarea()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('blur', handler)

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))

      expect(handler).toHaveBeenCalledTimes(1)

      el.remove()
    })
  })

  describe('prop: value（双向同步）', () => {
    it('设置 value 属性后原生 textarea 同步', async () => {
      const el = createTextarea()
      el.value = 'hello'
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.value).toBe('hello')

      el.remove()
    })

    it('输入后 value 属性同步更新', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.value = 'typed'
      textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      await el.updateComplete
      expect(el.value).toBe('typed')

      el.remove()
    })
  })

  describe('焦点状态', () => {
    it('聚焦时添加 focused 属性', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))

      await el.updateComplete
      expect(el.hasAttribute('focused')).toBe(true)

      el.remove()
    })

    it('失焦时移除 focused 属性', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))
      await el.updateComplete
      textarea.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))
      await el.updateComplete

      expect(el.hasAttribute('focused')).toBe(false)

      el.remove()
    })

    it('disabled 时不添加 focused 属性', async () => {
      const el = createTextarea()
      el.disabled = true
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      textarea.dispatchEvent(new Event('focus', { bubbles: true, composed: true }))
      await el.updateComplete

      expect(el.hasAttribute('focused')).toBe(false)

      el.remove()
    })
  })

  describe('公开 API', () => {
    it('focus() 聚焦原生 textarea', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'focus')
      el.focus()

      expect(spy).toHaveBeenCalled()

      el.remove()
    })

    it('blur() 移焦原生 textarea', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'blur')
      el.blur()

      expect(spy).toHaveBeenCalled()

      el.remove()
    })

    it('select() 选中 textarea 内容', async () => {
      const el = createTextarea({ value: 'hello' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'select')
      el.select()

      expect(spy).toHaveBeenCalled()

      el.remove()
    })
  })

  describe('autosize', () => {
    it('autosize 时设置 textarea style.height', async () => {
      const el = createTextarea({ autosize: '' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      const styleSpy = vi.spyOn(textarea.style, 'height', 'set')

      textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

      expect(styleSpy).toHaveBeenCalled()

      el.remove()
    })

    it('运行时启用 autosize 后立即计算高度', async () => {
      const el = createTextarea()
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      const styleSpy = vi.spyOn(textarea.style, 'height', 'set')
      el.autosize = true
      await el.updateComplete

      expect(styleSpy).toHaveBeenCalled()

      el.remove()
    })

    it('运行时关闭 autosize 后移除内联高度', async () => {
      const el = createTextarea({ autosize: '' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      el.autosize = false
      await el.updateComplete

      expect(textarea.style.height).toBe('')

      el.remove()
    })
  })

  describe('点击容器聚焦', () => {
    it('点击容器时聚焦 textarea', async () => {
      const el = createTextarea()
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.wui-textarea-inner') as HTMLElement
      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'focus')
      inner.click()

      expect(spy).toHaveBeenCalled()

      el.remove()
    })

    it('disabled 时点击容器不聚焦', async () => {
      const el = createTextarea()
      el.disabled = true
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.wui-textarea-inner') as HTMLElement
      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      const spy = vi.spyOn(textarea, 'focus')
      inner.click()

      expect(spy).not.toHaveBeenCalled()

      el.remove()
    })
  })

  describe('a11y', () => {
    it('容器有 textarea-inner 语义类', async () => {
      const el = createTextarea()
      await el.updateComplete

      const inner = el.shadowRoot?.querySelector('.wui-textarea-inner')
      expect(inner).toBeTruthy()

      el.remove()
    })

    it('将 aria-label 转发给原生 textarea', async () => {
      const el = createTextarea({ 'aria-label': '个人简介' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.getAttribute('aria-label')).toBe('个人简介')

      el.remove()
    })

    it('将 aria-labelledby 转发给原生 textarea', async () => {
      const el = createTextarea({ 'aria-labelledby': 'bio-label' })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.getAttribute('aria-labelledby')).toBe('bio-label')

      el.remove()
    })

    it('声明为可关联表单控件', () => {
      const constructor = customElements.get('web-ui-textarea') as typeof WebUiTextarea
      expect(constructor.formAssociated).toBe(true)
    })

    it('原生 textarea 保留所有原生属性', async () => {
      const el = createTextarea({
        placeholder: '请输入',
        name: 'bio',
        rows: '5',
        required: '',
        readonly: '',
        minlength: '10',
        maxlength: '200'
      })
      await el.updateComplete

      const textarea = el.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
      expect(textarea.placeholder).toBe('请输入')
      expect(textarea.name).toBe('bio')
      expect(textarea.rows).toBe(5)
      expect(textarea.required).toBe(true)
      expect(textarea.readOnly).toBe(true)
      expect(textarea.getAttribute('minlength')).toBe('10')
      expect(textarea.getAttribute('maxlength')).toBe('200')

      el.remove()
    })
  })
})
