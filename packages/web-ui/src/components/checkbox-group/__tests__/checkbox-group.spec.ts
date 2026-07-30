import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/checkbox'
import { waitForUpdate, spyEvents, cleanupElement } from '@/shared/test-utils'

import type { WebUiCheckboxGroup } from '..'
import type { WebUiCheckbox } from '../../checkbox'

const GROUP_HTML = `
  <web-ui-checkbox value="a">A</web-ui-checkbox>
  <web-ui-checkbox value="b">B</web-ui-checkbox>
  <web-ui-checkbox value="c">C</web-ui-checkbox>
`

const createGroup = (checkboxHtml = GROUP_HTML, attrs?: Record<string, string>): WebUiCheckboxGroup => {
  const el = document.createElement('web-ui-checkbox-group')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = checkboxHtml
  document.body.appendChild(el)
  return el
}

/** 点击子 checkbox 触发用户交互 */
const clickChild = (group: WebUiCheckboxGroup, index: number) => {
  const checkbox = group.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')[index]
  const label = checkbox.shadowRoot!.querySelector('label')!
  label.click()
}

describe('WebUiCheckboxGroup', () => {
  describe('属性: value', () => {
    it('初始值为空数组', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      expect(el.value).toEqual([])

      cleanupElement(el)
    })

    it('设置 value 后同步子选项的 checked 状态', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      el.value = ['a', 'c']
      await waitForUpdate(el)

      const checkboxes = el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')
      expect(checkboxes[0].checked).toBe(true)
      expect(checkboxes[1].checked).toBe(false)
      expect(checkboxes[2].checked).toBe(true)

      cleanupElement(el)
    })

    it('再次设置 value 后更新子选项状态', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      el.value = ['b']
      await waitForUpdate(el)

      const checkboxes = el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')
      expect(checkboxes[0].checked).toBe(false)
      expect(checkboxes[1].checked).toBe(true)
      expect(checkboxes[2].checked).toBe(false)

      cleanupElement(el)
    })
  })

  describe('属性: disabled', () => {
    it('disabled 反映到 host 元素', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      el.disabled = false
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(false)

      cleanupElement(el)
    })

    it('disabled 为 true 时不改写子 checkbox 的声明式 disabled 属性', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      el.disabled = true
      await waitForUpdate(el)

      const checkboxes = el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')
      expect(checkboxes[0].disabled).toBe(false)
      expect(checkboxes[1].disabled).toBe(false)
      expect(checkboxes[2].disabled).toBe(false)

      cleanupElement(el)
    })

    it('disabled 为 true 时点击子选项不更新 value', async () => {
      const el = createGroup()
      el.disabled = true
      await waitForUpdate(el)

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(el.value).toEqual([])

      cleanupElement(el)
    })
  })

  describe('属性: name', () => {
    it('name 反映到 host 元素', async () => {
      const el = createGroup()
      el.name = 'hobbies'
      await waitForUpdate(el)

      expect(el.getAttribute('name')).toBe('hobbies')

      cleanupElement(el)
    })
  })

  describe('用户交互', () => {
    it('点击子 checkbox 后 value 数组中包含该值', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(el.value).toEqual(['b'])

      cleanupElement(el)
    })

    it('可同时选中多个值', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      clickChild(el, 0)
      await waitForUpdate(el)
      expect(el.value).toEqual(['a'])

      clickChild(el, 1)
      await waitForUpdate(el)
      expect(el.value).toEqual(['a', 'b'])

      clickChild(el, 2)
      await waitForUpdate(el)
      expect(el.value).toEqual(['a', 'b', 'c'])

      cleanupElement(el)
    })

    it('重复点击已选项将其从 value 数组中移除', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      clickChild(el, 0)
      await waitForUpdate(el)
      clickChild(el, 1)
      await waitForUpdate(el)
      expect(el.value).toEqual(['a', 'b'])

      clickChild(el, 0)
      await waitForUpdate(el)
      expect(el.value).toEqual(['b'])

      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击子 checkbox 触发 input 事件', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'input')

      clickChild(el, 1)
      await waitForUpdate(el)

      // 子 checkbox 的 input 冒泡 + group 自身派发
      expect(events.length).toBeGreaterThanOrEqual(1)
      detach()
      cleanupElement(el)
    })

    it('点击子 checkbox 触发 change 事件', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      clickChild(el, 2)
      await waitForUpdate(el)

      expect(events.length).toBeGreaterThanOrEqual(1)
      detach()
      cleanupElement(el)
    })

    it('disabled 时点击子 checkbox 不触发 input 事件', async () => {
      const el = createGroup()
      el.disabled = true
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'input')

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      detach()
      cleanupElement(el)
    })

    it('disabled 时点击子 checkbox 不触发 change 事件', async () => {
      const el = createGroup()
      el.disabled = true
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'change')

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      detach()
      cleanupElement(el)
    })
  })

  describe('slot 动态变化', () => {
    it('动态添加子 checkbox 后 value 状态同步', async () => {
      const el = createGroup('')
      await waitForUpdate(el)

      el.value = ['y']
      await waitForUpdate(el)

      const newCheckbox = document.createElement('web-ui-checkbox')
      newCheckbox.setAttribute('value', 'y')
      newCheckbox.textContent = 'Y'
      el.appendChild(newCheckbox)
      await waitForUpdate(newCheckbox)
      await waitForUpdate(el)

      // 新添加的 checkbox 值匹配当前 value，应自动选中
      expect(newCheckbox.checked).toBe(true)

      cleanupElement(el)
    })

    it('初始状态无子 checkbox 时 value 为空数组', async () => {
      const el = createGroup('')
      await waitForUpdate(el)

      expect(el.value).toEqual([])

      cleanupElement(el)
    })
  })
})
