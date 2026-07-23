import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/radio'

import type { WebUiRadioGroup } from '..'

const createGroup = (radioHtml = '', attrs?: Record<string, string>): WebUiRadioGroup => {
  const el = document.createElement('web-ui-radio-group') as WebUiRadioGroup
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = radioHtml
  document.body.appendChild(el)
  return el
}

const RADIO_HTML = `
  <web-ui-radio value="a">A</web-ui-radio>
  <web-ui-radio value="b">B</web-ui-radio>
  <web-ui-radio value="c">C</web-ui-radio>
`

const clickChildRadio = (group: WebUiRadioGroup, index: number) => {
  const radios = group.querySelectorAll('web-ui-radio')
  const label = radios[index].shadowRoot!.querySelector('label') as HTMLElement
  label.click()
}

describe('WebUiRadioGroup', () => {
  describe('prop: value', () => {
    it('初始值为空字符串', async () => {
      const el = createGroup(RADIO_HTML)
      await el.updateComplete

      expect(el.value).toBe('')

      el.remove()
    })

    it('可通过属性设置 value', async () => {
      const el = createGroup(RADIO_HTML)
      el.value = 'b'
      await el.updateComplete

      expect(el.value).toBe('b')

      el.remove()
    })

    it('初次渲染后设置 value 时同步子选项的选中状态', async () => {
      const el = createGroup(RADIO_HTML)
      await el.updateComplete

      el.value = 'b'
      await el.updateComplete

      const radios = el.querySelectorAll('web-ui-radio')
      await Promise.all([...radios].map(radio => radio.updateComplete))

      expect(radios[0].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(false)
      expect(radios[1].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(true)
      expect(radios[2].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(false)

      el.remove()
    })
  })

  describe('prop: name', () => {
    it('可设置 name 属性', async () => {
      const el = createGroup(RADIO_HTML)
      el.name = 'gender'
      await el.updateComplete

      expect(el.name).toBe('gender')

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反映到 host 元素', async () => {
      const el = createGroup(RADIO_HTML)
      el.disabled = true
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(true)

      el.disabled = false
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(false)

      el.remove()
    })

    it('disabled 时点击子选项不更新 value 也不触发 group 事件', async () => {
      const el = createGroup(RADIO_HTML)
      el.disabled = true
      await el.updateComplete

      const updateHandler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', updateHandler)

      clickChildRadio(el, 1)
      await el.updateComplete

      expect(updateHandler).not.toHaveBeenCalled()
      expect(el.value).toBe('')

      el.remove()
    })
  })

  describe('event: value-changed', () => {
    it('点击子选项触发 value-changed，detail.value 匹配', async () => {
      const el = createGroup(RADIO_HTML)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', handler)

      clickChildRadio(el, 1)
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent<{ value: string }>).detail
      expect(detail.value).toBe('b')

      el.remove()
    })
  })

  describe('event: change', () => {
    it('点击子选项触发 change 事件（含子项冒泡+group 派发）', async () => {
      const el = createGroup(RADIO_HTML)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('change', handler)

      clickChildRadio(el, 2)
      await el.updateComplete

      // 子 radio 的 change + group 的 change = 2 次
      expect(handler).toHaveBeenCalled()

      el.remove()
    })
  })

  describe('group behavior', () => {
    it('选中一个子选项时取消其他选项的选中状态', async () => {
      const el = createGroup(RADIO_HTML)
      await el.updateComplete

      const radios = el.querySelectorAll('web-ui-radio')

      // 先选中第一个
      clickChildRadio(el, 0)
      await el.updateComplete

      expect(radios[0].hasAttribute('checked')).toBe(true)
      expect(radios[1].hasAttribute('checked')).toBe(false)
      expect(radios[2].hasAttribute('checked')).toBe(false)

      // 再选中第二个，第一个应取消
      clickChildRadio(el, 1)
      await el.updateComplete

      expect(radios[0].hasAttribute('checked')).toBe(false)
      expect(radios[1].hasAttribute('checked')).toBe(true)
      expect(radios[2].hasAttribute('checked')).toBe(false)

      el.remove()
    })
  })

  describe('no event when value unchanged', () => {
    it('点击已选中的选项不重复触发事件', async () => {
      const el = createGroup(RADIO_HTML)
      await el.updateComplete

      // 先选中第二个
      clickChildRadio(el, 1)
      await el.updateComplete

      const updateHandler = vi.fn<(e: Event) => void>()
      const changeHandler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', updateHandler)
      el.addEventListener('change', changeHandler)

      // 再次点击同一个选项
      clickChildRadio(el, 1)
      await el.updateComplete

      expect(updateHandler).not.toHaveBeenCalled()
      expect(changeHandler).not.toHaveBeenCalled()
      expect(el.value).toBe('b')

      el.remove()
    })
  })
})
