import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/segmented-trigger'
import {
  waitForUpdate,
  spyEvents,
  spyHostEvents,
  expectReflected,
  cleanupElement,
  queryA11y
} from '@/shared/test-utils'

import type { WebUiSegmented } from '..'
import type { WebUiSegmentedTrigger } from '../../segmented-trigger'

const TRIGGER_HTML = `
  <web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="b">B</web-ui-segmented-trigger>
  <web-ui-segmented-trigger value="c">C</web-ui-segmented-trigger>
`

const createSegmented = (triggerHtml = '', attrs?: Record<string, string>): WebUiSegmented => {
  const el = document.createElement('web-ui-segmented')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = triggerHtml
  document.body.appendChild(el)
  return el
}

// 通过 role 点击子 trigger 的内部元素
const clickTrigger = (group: WebUiSegmented, index: number) => {
  const triggers = group.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')
  const inner = queryA11y(triggers[index], '[role="option"]')
  if (inner instanceof HTMLElement) inner.click()
}

describe('WebUiSegmented 组件', () => {
  describe('属性：value', () => {
    it('初始值为空字符串', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })

    it('连接前通过 property 设值（如 Vue :value）', async () => {
      const el = document.createElement('web-ui-segmented')
      el.innerHTML = TRIGGER_HTML
      const triggers = el.querySelectorAll('web-ui-segmented-trigger')

      // 模拟 Vue :value ——在 appendChild 之前设 property
      el.value = 'a'
      document.body.appendChild(el)
      await waitForUpdate(el)

      expect(el.value).toBe('a')
      await Promise.all([...triggers].map(t => t.updateComplete))
      expect(triggers[0].checked).toBe(true)
      expect(triggers[1].checked).toBe(false)

      cleanupElement(el)
    })

    it('可通过属性设置 value', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      el.value = 'b'
      await waitForUpdate(el)

      expect(el.value).toBe('b')

      cleanupElement(el)
    })

    it('设置 value 时同步子选项的 checked 状态', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      el.value = 'b'
      await waitForUpdate(el)

      const triggers = el.querySelectorAll('web-ui-segmented-trigger')
      await Promise.all([...triggers].map(t => t.updateComplete))
      expect(triggers[0].checked).toBe(false)
      expect(triggers[1].checked).toBe(true)
      expect(triggers[2].checked).toBe(false)

      cleanupElement(el)
    })

    it('切换 value 后更新子选项状态', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      el.value = 'b'
      await waitForUpdate(el)

      el.value = 'c'
      await waitForUpdate(el)

      const triggers = el.querySelectorAll('web-ui-segmented-trigger')
      await Promise.all([...triggers].map(t => t.updateComplete))
      expect(triggers[0].checked).toBe(false)
      expect(triggers[1].checked).toBe(false)
      expect(triggers[2].checked).toBe(true)

      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('disabled 属性反映到 host 元素', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(false)

      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      el.disabled = false
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(false)

      cleanupElement(el)
    })

    it('继承禁用不改写子 trigger 属性，并移出 Tab 序列', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      el.disabled = true
      await waitForUpdate(el)

      const triggers = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')
      await Promise.all([...triggers].map(trigger => trigger.updateComplete))
      for (const trigger of triggers) {
        const control = queryA11y(trigger, '[role="option"]')
        expect(trigger.disabled).toBe(false)
        expect(control?.getAttribute('aria-disabled')).toBe('true')
        expect(control?.getAttribute('tabindex')).toBe('-1')
      }

      cleanupElement(el)
    })

    it('disabled 时点击子选项不更新 value 也不触发事件', async () => {
      const el = createSegmented(TRIGGER_HTML)
      el.disabled = true
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      clickTrigger(el, 1)
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)
      expect(el.value).toBe('')

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('属性：name', () => {
    it('name 属性反映到 host 元素', async () => {
      const el = createSegmented(TRIGGER_HTML)
      el.name = 'test'
      await waitForUpdate(el)
      expect(el.getAttribute('name')).toBe('test')
      cleanupElement(el)
    })
  })

  describe('属性：required', () => {
    it('required 属性反映到 host 元素', async () => {
      const el = createSegmented(TRIGGER_HTML)
      expect(el.hasAttribute('required')).toBe(false)

      el.required = true
      await waitForUpdate(el)
      expect(el.hasAttribute('required')).toBe(true)

      cleanupElement(el)
    })
  })

  describe('用户交互', () => {
    it('点击子 trigger 后 value 更新为所选值', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      clickTrigger(el, 1)
      await waitForUpdate(el)

      expect(el.value).toBe('b')

      cleanupElement(el)
    })

    it('选中一个子 trigger 后同步 checked 状态', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      const triggers = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')

      clickTrigger(el, 0)
      await waitForUpdate(el)
      await Promise.all([...triggers].map(t => t.updateComplete))
      expect(triggers[0].checked).toBe(true)
      expect(triggers[1].checked).toBe(false)
      expect(triggers[2].checked).toBe(false)

      clickTrigger(el, 1)
      await waitForUpdate(el)
      await Promise.all([...triggers].map(t => t.updateComplete))
      expect(triggers[0].checked).toBe(false)
      expect(triggers[1].checked).toBe(true)
      expect(triggers[2].checked).toBe(false)

      cleanupElement(el)
    })

    it('点击已选中的选项不重复触发事件', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      clickTrigger(el, 1)
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      clickTrigger(el, 1)
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)
      expect(el.value).toBe('b')

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击子 trigger 只派发一次 input 事件，target/currentTarget 均为 group', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      const { events, targets, currentTargets, detach } = spyHostEvents(el, 'input')

      clickTrigger(el, 1)
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(targets[0]).toBe(el)
      expect(currentTargets[0]).toBe(el)
      detach()
      cleanupElement(el)
    })

    it('点击子 trigger 只派发一次 change 事件，target/currentTarget 均为 group', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      const { events, targets, currentTargets, detach } = spyHostEvents(el, 'change')

      clickTrigger(el, 2)
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(targets[0]).toBe(el)
      expect(currentTargets[0]).toBe(el)
      detach()
      cleanupElement(el)
    })

    it('子 trigger 的同名 change 不冒泡到 segmented 外部', async () => {
      const el = document.createElement('web-ui-segmented')
      el.innerHTML = TRIGGER_HTML
      const container = document.createElement('div')
      container.appendChild(el)
      document.body.appendChild(container)
      await waitForUpdate(el)

      const [events, detach] = spyEvents(container, 'change')

      clickTrigger(el, 0)
      await waitForUpdate(el)

      // 只收到 group 自身的一次 change，子项 change 未外泄
      expect(events).toHaveLength(1)
      expect(events[0].target).toBe(el)
      detach()
      cleanupElement(container)
    })

    it('group-managed 子 trigger 的直接监听器仍收到自身 change', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      const trigger = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')[1]
      const [events, detach] = spyEvents(trigger, 'change')

      clickTrigger(el, 1)
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(events[0].target).toBe(trigger)
      detach()
      cleanupElement(el)
    })

    it('独立子 trigger 的 change 仍冒泡且组合', async () => {
      const trigger = document.createElement('web-ui-segmented-trigger')
      trigger.setAttribute('value', 'solo')
      trigger.textContent = 'Solo'
      const container = document.createElement('div')
      container.appendChild(trigger)
      document.body.appendChild(container)
      await waitForUpdate(trigger)

      const [events, detach] = spyEvents(container, 'change')

      const inner = queryA11y(trigger, '[role="option"]')
      if (inner instanceof HTMLElement) inner.click()
      await waitForUpdate(trigger)

      expect(events).toHaveLength(1)
      expect(events[0].target).toBe(trigger)
      detach()
      cleanupElement(container)
    })

    it('设置属性不触发 input/change', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      el.value = 'b'
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('表单关联', () => {
    it('formResetCallback 重置 value 为空字符串', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      el.value = 'b'
      await waitForUpdate(el)

      el.formResetCallback()
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })

    it('formDisabledCallback 使用内部有效禁用状态', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      el.formDisabledCallback(true)
      await waitForUpdate(el)

      expect(el.disabled).toBe(false)
      const triggers = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')
      await Promise.all([...triggers].map(trigger => trigger.updateComplete))
      for (const trigger of triggers) {
        const control = queryA11y(trigger, '[role="option"]')
        expect(control?.getAttribute('aria-disabled')).toBe('true')
        expect(control?.getAttribute('tabindex')).toBe('-1')
      }

      cleanupElement(el)
    })
  })

  describe('slot 动态变化', () => {
    it('动态添加子 trigger 后保持同步', async () => {
      const el = createSegmented('')
      await waitForUpdate(el)

      el.value = 'new-option'
      await waitForUpdate(el)

      const newTrigger = document.createElement('web-ui-segmented-trigger')
      newTrigger.setAttribute('value', 'new-option')
      newTrigger.textContent = 'New'
      el.appendChild(newTrigger)
      await waitForUpdate(newTrigger)
      await waitForUpdate(el)

      // 新添加的 trigger 与当前 value 匹配时自动选中
      await Promise.all([newTrigger].map(t => t.updateComplete))
      expect(newTrigger.checked).toBe(true)

      cleanupElement(el)
    })

    it('初始状态无子 trigger 时 value 为空字符串', async () => {
      const el = createSegmented('')
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })
  })
})
