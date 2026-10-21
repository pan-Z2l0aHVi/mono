import '..'
import '@/components/segmented-trigger'

import { describe, expect, it } from 'vite-plus/test'

import {
  waitForUpdate,
  spyEvents,
  spyHostEvents,
  cleanupElement,
  flushSlotChange,
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

const clickTrigger = (group: WebUiSegmented, index: number) => {
  const triggers = group.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')
  const inner = queryA11y(triggers[index], '[role="option"]')
  if (inner instanceof HTMLElement) inner.click()
}

const pressOptionKey = (trigger: WebUiSegmentedTrigger, key: string): KeyboardEvent => {
  const option = queryA11y(trigger, '[role="option"]')
  if (!(option instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互元素')
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true })
  option.dispatchEvent(event)
  return event
}

const settleSegmented = async (group: WebUiSegmented) => {
  await waitForUpdate(group)
  await Promise.all(
    [...group.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')].map(t => t.updateComplete)
  )
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

      el.value = 'a'
      document.body.appendChild(el)
      await waitForUpdate(el)

      expect(el.value).toBe('a')
      await Promise.all([...triggers].map(t => t.updateComplete))
      expect(triggers[0].checked).toBe(true)
      expect(triggers[1].checked).toBe(false)

      cleanupElement(el)
    })

    it('设置并切换 value 时子 option checked 唯一且与 value 一致', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)

      const triggers = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')

      el.value = 'b'
      await waitForUpdate(el)
      await Promise.all([...triggers].map(t => t.updateComplete))
      expect(triggers[0].checked).toBe(false)
      expect(triggers[1].checked).toBe(true)
      expect(triggers[2].checked).toBe(false)

      el.value = 'c'
      await waitForUpdate(el)
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

    it('disabled 时点击子 option 不更新 value 也不触发事件', async () => {
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

  describe('属性：variant', () => {
    // README 明文承诺「Illegal values fall back to `inset`」。回退链一旦被摘掉，
    // 非法值会透传进 `:host([variant=...])` 选择器，track 与 indicator 双双失配样式。
    it('默认 inset，非法值回退 inset，attribute 驱动 property', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)
      expect(el.variant).toBe('inset')
      expect(el.getAttribute('variant'), '默认值应反射到宿主').toBe('inset')

      el.variant = 'bogus'
      await waitForUpdate(el)
      expect(el.variant, '非法值应回退到 inset').toBe('inset')
      expect(el.getAttribute('variant'), '回退值应反射到宿主').toBe('inset')

      el.setAttribute('variant', 'raised')
      await waitForUpdate(el)
      expect(el.variant, 'attribute 应驱动 property').toBe('raised')
      expect(el.getAttribute('variant')).toBe('raised')

      cleanupElement(el)
    })
  })

  describe('用户交互', () => {
    it('只将当前选中项或首个启用项放入 Tab 序列', async () => {
      const el = createSegmented(`
        <web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="b" disabled>B</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="c">C</web-ui-segmented-trigger>
      `)
      await settleSegmented(el)

      const triggers = [...el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]
      const tabIndexes = () => triggers.map(trigger => queryA11y(trigger, '[role="option"]')?.getAttribute('tabindex'))
      expect(tabIndexes()).toEqual(['0', '-1', '-1'])

      el.value = 'c'
      await settleSegmented(el)
      expect(tabIndexes()).toEqual(['-1', '-1', '0'])

      cleanupElement(el)
    })

    it('左右方向键跳过禁用项、循环移动并同步选中值', async () => {
      const el = createSegmented(
        `
          <web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="b" disabled>B</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="c">C</web-ui-segmented-trigger>
        `,
        { value: 'a' }
      )
      await settleSegmented(el)
      const triggers = [...el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]
      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      expect(pressOptionKey(triggers[0], 'ArrowRight').defaultPrevented).toBe(true)
      await settleSegmented(el)
      expect(el.value).toBe('c')
      expect(triggers.map(trigger => trigger.checked)).toEqual([false, false, true])
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)

      pressOptionKey(triggers[2], 'ArrowRight')
      await settleSegmented(el)
      expect(el.value).toBe('a')

      pressOptionKey(triggers[0], 'ArrowLeft')
      await settleSegmented(el)
      expect(el.value).toBe('c')
      expect(queryA11y(triggers[2], '[role="option"]')?.getAttribute('tabindex')).toBe('0')

      detachInput()
      detachChange()
      cleanupElement(el)
    })

    it('Home / End 跳到首尾，垂直方向键不导航', async () => {
      const el = createSegmented(TRIGGER_HTML, { value: 'b' })
      await settleSegmented(el)
      const triggers = [...el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]

      pressOptionKey(triggers[1], 'Home')
      await settleSegmented(el)
      expect(el.value).toBe('a')

      pressOptionKey(triggers[0], 'End')
      await settleSegmented(el)
      expect(el.value).toBe('c')

      expect(pressOptionKey(triggers[2], 'ArrowDown').defaultPrevented).toBe(false)
      expect(pressOptionKey(triggers[2], 'ArrowUp').defaultPrevented).toBe(false)
      await settleSegmented(el)
      expect(el.value).toBe('c')
      expect(queryA11y(triggers[2], '[role="option"]')?.getAttribute('tabindex')).toBe('0')

      cleanupElement(el)
    })

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

    it('点击已选中的 option 不重复触发事件', async () => {
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

      await Promise.all([newTrigger].map(t => t.updateComplete))
      expect(newTrigger.checked).toBe(true)

      cleanupElement(el)
    })
  })

  describe('动态成员：模拟 v-if / && 条件渲染', () => {
    it('v-if 插入的子项应继承当前 value 的选中态', async () => {
      const el = createSegmented('<web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger>')
      await waitForUpdate(el)
      el.value = 'c'
      await waitForUpdate(el)

      const newTrigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
      newTrigger.setAttribute('value', 'c')
      newTrigger.textContent = 'C'
      el.appendChild(newTrigger)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([newTrigger.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(newTrigger.checked).toBe(true)
      const triggers = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')
      expect([...triggers].filter(t => t.checked)).toHaveLength(1)
      cleanupElement(el)
    })

    it('v-if 插入的子项应继承 group 的 disabled', async () => {
      const el = createSegmented('<web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger>')
      await waitForUpdate(el)
      el.disabled = true
      await waitForUpdate(el)

      const newTrigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
      newTrigger.setAttribute('value', 'b')
      newTrigger.textContent = 'B'
      el.appendChild(newTrigger)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([newTrigger.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      const control = queryA11y(newTrigger, '[role="option"]')
      expect(control?.getAttribute('aria-disabled')).toBe('true')
      expect(control?.getAttribute('tabindex')).toBe('-1')
      cleanupElement(el)
    })

    it('v-if 移除子项后应清理上下文且不再受 group value 影响', async () => {
      const el = createSegmented(TRIGGER_HTML)
      await waitForUpdate(el)
      el.value = 'a'
      await waitForUpdate(el)

      const triggerA = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')[0]
      await triggerA.updateComplete
      expect(triggerA.checked).toBe(true)

      const container = document.createElement('div')
      container.append(el)
      document.body.append(container)
      await waitForUpdate(el)
      // 用 flushSlotChange 等待组件消费 slotchange，不必触碰 shadowRoot 内部 slot 元素。
      container.append(triggerA)
      await flushSlotChange(el)
      await triggerA.updateComplete

      el.value = 'b'
      await waitForUpdate(el)
      await triggerA.updateComplete
      expect(triggerA.checked).toBe(true)

      triggerA.checked = false
      await triggerA.updateComplete
      const [events, detach] = spyEvents(container, 'change')
      queryA11y(triggerA, '[role="option"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      await triggerA.updateComplete
      expect(events).toHaveLength(1)
      expect(events[0].target).toBe(triggerA)
      detach()
      cleanupElement(container)
      cleanupElement(el)
    })

    it('连续插入多个子项后 value 同步保持一致', async () => {
      const el = createSegmented('')
      await waitForUpdate(el)
      el.value = 'y'
      await waitForUpdate(el)

      const ta = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
      ta.setAttribute('value', 'x')
      const tb = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
      tb.setAttribute('value', 'y')
      const tc = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
      tc.setAttribute('value', 'z')
      el.append(ta, tb, tc)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([ta.updateComplete, tb.updateComplete, tc.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(ta.checked).toBe(false)
      expect(tb.checked).toBe(true)
      expect(tc.checked).toBe(false)
      cleanupElement(el)
    })
  })

  it('子 trigger 离组后恢复独立事件行为', async () => {
    const el = createSegmented(TRIGGER_HTML)
    await waitForUpdate(el)

    const trigger = el.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')[0]
    const container = document.createElement('div')
    container.append(el)
    document.body.append(container)
    await waitForUpdate(el)

    // 用 flushSlotChange 等待组件消费 slotchange，不必触碰 shadowRoot 内部 slot 元素。
    container.append(trigger)
    await flushSlotChange(el)
    await trigger.updateComplete

    trigger.checked = false
    await trigger.updateComplete
    const [events, detach] = spyEvents(container, 'change')
    queryA11y(trigger, '[role="option"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await trigger.updateComplete

    expect(events).toHaveLength(1)
    expect(events[0].target).toBe(trigger)
    detach()
    cleanupElement(container)
  })
})
