import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/checkbox'

import type { WebUiCheckboxGroup } from '..'

const createGroup = (checkboxHtml = '', attrs?: Record<string, string>): WebUiCheckboxGroup => {
  const el = document.createElement('web-ui-checkbox-group') as WebUiCheckboxGroup
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = checkboxHtml
  document.body.appendChild(el)
  return el
}

const CHECKBOX_HTML = `
  <web-ui-checkbox value="a">A</web-ui-checkbox>
  <web-ui-checkbox value="b">B</web-ui-checkbox>
  <web-ui-checkbox value="c">C</web-ui-checkbox>
`

const clickChildCheckbox = (group: WebUiCheckboxGroup, index: number) => {
  const checkboxes = group.querySelectorAll('web-ui-checkbox')
  const label = checkboxes[index].shadowRoot!.querySelector('label') as HTMLElement
  label.click()
}

describe('WebUiCheckboxGroup', () => {
  describe('prop: value', () => {
    it('初始值为空数组', async () => {
      const el = createGroup(CHECKBOX_HTML)
      await el.updateComplete

      expect(el.value).toEqual([])

      el.remove()
    })

    it('可通过属性设置 value', async () => {
      const el = createGroup(CHECKBOX_HTML)
      el.value = ['b']
      await el.updateComplete

      expect(el.value).toEqual(['b'])

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 属性反映到 host 元素', async () => {
      const el = createGroup(CHECKBOX_HTML)
      el.disabled = true
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(true)

      el.disabled = false
      await el.updateComplete

      expect(el.hasAttribute('disabled')).toBe(false)

      el.remove()
    })

    it('disabled 时点击子选项不更新 value 也不触发 group 事件', async () => {
      const el = createGroup(CHECKBOX_HTML)
      el.disabled = true
      await el.updateComplete

      const updateHandler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', updateHandler)

      clickChildCheckbox(el, 1)
      await el.updateComplete

      expect(updateHandler).not.toHaveBeenCalled()
      expect(el.value).toEqual([])

      el.remove()
    })
  })

  describe('event: value-changed', () => {
    it('子选项切换时触发 value-changed，detail.value 为数组', async () => {
      const el = createGroup(CHECKBOX_HTML)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('value-changed', handler)

      clickChildCheckbox(el, 1)
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      const detail = (handler.mock.calls[0][0] as CustomEvent<{ value: string[] }>).detail
      expect(detail.value).toEqual(['b'])

      el.remove()
    })
  })

  describe('event: change', () => {
    it('子选项切换时触发 change 事件（含子项冒泡+group 派发）', async () => {
      const el = createGroup(CHECKBOX_HTML)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('change', handler)

      clickChildCheckbox(el, 2)
      await el.updateComplete

      // 子 checkbox 的 change + group 的 change
      expect(handler).toHaveBeenCalled()

      el.remove()
    })
  })

  describe('multi-select', () => {
    it('可同时选中多个值', async () => {
      const el = createGroup(CHECKBOX_HTML)
      await el.updateComplete

      clickChildCheckbox(el, 0)
      await el.updateComplete
      expect(el.value).toEqual(['a'])

      clickChildCheckbox(el, 1)
      await el.updateComplete
      expect(el.value).toEqual(['a', 'b'])

      clickChildCheckbox(el, 2)
      await el.updateComplete
      expect(el.value).toEqual(['a', 'b', 'c'])

      el.remove()
    })
  })

  describe('unselect', () => {
    it('点击已选中的选项将其移除', async () => {
      const el = createGroup(CHECKBOX_HTML)
      await el.updateComplete

      // 先选中 a 和 b
      clickChildCheckbox(el, 0)
      await el.updateComplete
      clickChildCheckbox(el, 1)
      await el.updateComplete
      expect(el.value).toEqual(['a', 'b'])

      // 取消 a
      clickChildCheckbox(el, 0)
      await el.updateComplete
      expect(el.value).toEqual(['b'])

      el.remove()
    })
  })
})
