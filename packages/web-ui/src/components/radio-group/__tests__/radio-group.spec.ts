import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/radio'
import { waitForUpdate, spyEvents, spyHostEvents, cleanupElement, queryA11y } from '@/shared/test-utils'

import type { WebUiRadioGroup } from '..'
import type { WebUiRadio } from '../../radio'

const RADIO_HTML = `
  <web-ui-radio value="a">A</web-ui-radio>
  <web-ui-radio value="b">B</web-ui-radio>
  <web-ui-radio value="c">C</web-ui-radio>
`

const createGroup = (radioHtml = RADIO_HTML, attrs?: Record<string, string>): WebUiRadioGroup => {
  const el = document.createElement('web-ui-radio-group')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = radioHtml
  document.body.appendChild(el)
  return el
}

// 点击子 radio 触发用户交互
const clickChild = (group: WebUiRadioGroup, index: number) => {
  const radio = group.querySelectorAll<WebUiRadio>('web-ui-radio')[index]
  const label = radio.shadowRoot!.querySelector('label')!
  label.click()
}

describe('WebUiRadioGroup 组件', () => {
  describe('属性: value', () => {
    it('初始值为空字符串', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })

    it('设置 value 后同步子选项的 checked 状态', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      el.value = 'b'
      await waitForUpdate(el)

      const radios = el.querySelectorAll<WebUiRadio>('web-ui-radio')
      expect(radios[0].checked).toBe(false)
      expect(radios[1].checked).toBe(true)
      expect(radios[2].checked).toBe(false)

      cleanupElement(el)
    })

    it('切换 value 后更新子选项状态', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      el.value = 'b'
      await waitForUpdate(el)

      el.value = 'c'
      await waitForUpdate(el)

      const radios = el.querySelectorAll<WebUiRadio>('web-ui-radio')
      expect(radios[0].checked).toBe(false)
      expect(radios[1].checked).toBe(false)
      expect(radios[2].checked).toBe(true)

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

    it('继承禁用不改写子项属性，移出 Tab 序列，并保留单项禁用', async () => {
      const el = createGroup(`
        <web-ui-radio value="a" disabled>A</web-ui-radio>
        <web-ui-radio value="b">B</web-ui-radio>
        <web-ui-radio value="c">C</web-ui-radio>
      `)
      await waitForUpdate(el)

      el.disabled = true
      await waitForUpdate(el)

      const radios = el.querySelectorAll<WebUiRadio>('web-ui-radio')
      await Promise.all([...radios].map(radio => radio.updateComplete))
      expect(radios[0].disabled).toBe(true)
      expect(radios[1].disabled).toBe(false)
      expect(radios[2].disabled).toBe(false)
      for (const radio of radios) {
        const control = queryA11y(radio, '[role="radio"]')
        expect(control?.getAttribute('aria-disabled')).toBe('true')
        expect(control?.getAttribute('tabindex')).toBe('-1')
      }

      el.disabled = false
      await waitForUpdate(el)
      await Promise.all([...radios].map(radio => radio.updateComplete))

      expect(queryA11y(radios[0], '[role="radio"]')?.getAttribute('aria-disabled')).toBe('true')
      expect(queryA11y(radios[0], '[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
      for (const radio of [...radios].slice(1)) {
        const control = queryA11y(radio, '[role="radio"]')
        expect(control?.getAttribute('aria-disabled')).toBe('false')
        expect(control?.getAttribute('tabindex')).toBe('0')
      }

      cleanupElement(el)
    })

    it('disabled 为 true 时点击子选项不更新 value', async () => {
      const el = createGroup()
      el.disabled = true
      await waitForUpdate(el)

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })
  })

  describe('属性: name', () => {
    it('name 反映到 host 元素', async () => {
      const el = createGroup()
      el.name = 'gender'
      await waitForUpdate(el)

      expect(el.getAttribute('name')).toBe('gender')

      cleanupElement(el)
    })

    it('设置 name 不会让子 radio 重复参与表单提交', async () => {
      const el = createGroup()
      el.name = 'gender'
      await waitForUpdate(el)

      const radios = el.querySelectorAll<WebUiRadio>('web-ui-radio')
      expect(radios[0].name).toBe('')
      expect(radios[1].name).toBe('')
      expect(radios[2].name).toBe('')

      cleanupElement(el)
    })
  })

  describe('用户交互', () => {
    it('点击子 radio 后 value 更新为所选值', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(el.value).toBe('b')

      cleanupElement(el)
    })

    it('选中一个子 radio 后取消其他选项的选中状态', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const radios = el.querySelectorAll<WebUiRadio>('web-ui-radio')

      clickChild(el, 0)
      await waitForUpdate(el)
      expect(radios[0].checked).toBe(true)
      expect(radios[1].checked).toBe(false)
      expect(radios[2].checked).toBe(false)

      clickChild(el, 1)
      await waitForUpdate(el)
      expect(radios[0].checked).toBe(false)
      expect(radios[1].checked).toBe(true)
      expect(radios[2].checked).toBe(false)

      cleanupElement(el)
    })

    it('点击已选中的选项不重复触发事件', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      clickChild(el, 1)
      await waitForUpdate(el)

      const [inputEvents, detachInput] = spyEvents(el, 'input')
      const [changeEvents, detachChange] = spyEvents(el, 'change')

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)

      detachInput()
      detachChange()
      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('点击子 radio 只派发一次 input 事件，target/currentTarget 均为 group', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const { events, targets, currentTargets, detach } = spyHostEvents(el, 'input')

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(targets[0]).toBe(el)
      expect(currentTargets[0]).toBe(el)
      detach()
      cleanupElement(el)
    })

    it('点击子 radio 只派发一次 change 事件，target/currentTarget 均为 group', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const { events, targets, currentTargets, detach } = spyHostEvents(el, 'change')

      clickChild(el, 2)
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(targets[0]).toBe(el)
      expect(currentTargets[0]).toBe(el)
      detach()
      cleanupElement(el)
    })

    it('子 radio 的同名 change 不冒泡到 group 外部', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const container = document.createElement('div')
      container.appendChild(el)
      document.body.appendChild(container)
      const [events, detach] = spyEvents(container, 'change')

      clickChild(el, 0)
      await waitForUpdate(el)

      // 只收到 group 自身的一次 change，子项 change 未外泄
      expect(events).toHaveLength(1)
      expect(events[0].target).toBe(el)
      detach()
      cleanupElement(container)
    })

    it('group-managed 子 radio 的直接监听器仍收到自身 input/change', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const radio = el.querySelectorAll<WebUiRadio>('web-ui-radio')[1]
      const [inputEvents, detachInput] = spyEvents(radio, 'input')
      const [changeEvents, detachChange] = spyEvents(radio, 'change')

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      expect(inputEvents[0].target).toBe(radio)
      expect(changeEvents[0].target).toBe(radio)
      detachInput()
      detachChange()
      cleanupElement(el)
    })

    it('独立子 radio 的 input/change 仍冒泡且组合', async () => {
      const radio = document.createElement('web-ui-radio')
      radio.setAttribute('value', 'solo')
      const container = document.createElement('div')
      container.appendChild(radio)
      document.body.appendChild(container)
      await waitForUpdate(radio)

      const [inputEvents, detachInput] = spyEvents(container, 'input')
      const [changeEvents, detachChange] = spyEvents(container, 'change')

      const label = radio.shadowRoot!.querySelector('label')!
      label.click()
      await waitForUpdate(radio)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      expect(inputEvents[0].target).toBe(radio)
      expect(changeEvents[0].target).toBe(radio)
      detachInput()
      detachChange()
      cleanupElement(container)
    })

    it('disabled 时点击子 radio 不触发 input 事件', async () => {
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

    it('disabled 时点击子 radio 不触发 change 事件', async () => {
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

  describe('动态成员：模拟 v-if / && 条件渲染', () => {
    it('v-if 插入的子项应继承当前 value 的选中态', async () => {
      const el = createGroup('<web-ui-radio value="a">A</web-ui-radio>')
      await waitForUpdate(el)
      el.value = 'c'
      await waitForUpdate(el)

      const newRadio = document.createElement('web-ui-radio') as WebUiRadio
      newRadio.setAttribute('value', 'c')
      newRadio.textContent = 'C'
      el.appendChild(newRadio)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([newRadio.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(newRadio.checked).toBe(true)
      cleanupElement(el)
    })

    it('v-if 插入的子项应继承 group 的 disabled（不改写子项 disabled 属性）', async () => {
      const el = createGroup('<web-ui-radio value="a">A</web-ui-radio>')
      await waitForUpdate(el)
      el.disabled = true
      await waitForUpdate(el)

      const newRadio = document.createElement('web-ui-radio') as WebUiRadio
      newRadio.setAttribute('value', 'b')
      newRadio.textContent = 'B'
      el.appendChild(newRadio)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([newRadio.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(newRadio.disabled).toBe(false)
      const control = queryA11y(newRadio, '[role="radio"]')
      expect(control?.getAttribute('aria-disabled')).toBe('true')
      expect(control?.getAttribute('tabindex')).toBe('-1')
      cleanupElement(el)
    })

    it('v-if 移除子项后应清理上下文且不再受 group value 影响', async () => {
      const el = createGroup()
      await waitForUpdate(el)
      el.value = 'a'
      await waitForUpdate(el)

      const radioA = el.querySelectorAll<WebUiRadio>('web-ui-radio')[0]
      await radioA.updateComplete
      expect(radioA.checked).toBe(true)

      const container = document.createElement('div')
      container.append(el)
      document.body.append(container)
      await waitForUpdate(el)
      const slot = el.shadowRoot!.querySelector('slot')!
      const slotChanged = new Promise<void>(resolve =>
        slot.addEventListener('slotchange', () => resolve(), { once: true })
      )
      container.append(radioA)
      await slotChanged
      await Promise.all([radioA.updateComplete, waitForUpdate(el)])

      el.value = 'b'
      await waitForUpdate(el)
      await radioA.updateComplete
      expect(radioA.checked).toBe(true)

      radioA.checked = false
      await radioA.updateComplete
      const [events, detach] = spyEvents(container, 'change')
      queryA11y(radioA, '[role="radio"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      await radioA.updateComplete
      expect(events).toHaveLength(1)
      expect(events[0].target).toBe(radioA)
      detach()
      cleanupElement(container)
      cleanupElement(el)
    })

    it('连续插入多个子项后 value 同步保持一致', async () => {
      const el = createGroup('')
      await waitForUpdate(el)
      el.value = 'y'
      await waitForUpdate(el)

      const ra = document.createElement('web-ui-radio') as WebUiRadio
      ra.setAttribute('value', 'x')
      const rb = document.createElement('web-ui-radio') as WebUiRadio
      rb.setAttribute('value', 'y')
      const rc = document.createElement('web-ui-radio') as WebUiRadio
      rc.setAttribute('value', 'z')
      el.append(ra, rb, rc)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([ra.updateComplete, rb.updateComplete, rc.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(ra.checked).toBe(false)
      expect(rb.checked).toBe(true)
      expect(rc.checked).toBe(false)
      cleanupElement(el)
    })
  })

  describe('slot 动态变化', () => {
    it('动态添加子 radio 后 value 状态同步', async () => {
      const el = createGroup('')
      await waitForUpdate(el)

      el.value = 'new-option'
      await waitForUpdate(el)

      const newRadio = document.createElement('web-ui-radio')
      newRadio.setAttribute('value', 'new-option')
      newRadio.textContent = 'New'
      el.appendChild(newRadio)
      await waitForUpdate(newRadio)
      await waitForUpdate(el)

      // 新添加的 radio 值匹配当前 value，应自动选中
      expect(newRadio.checked).toBe(true)

      cleanupElement(el)
    })

    it('添加不匹配的 radio 时不会自动选中', async () => {
      const el = createGroup('')
      await waitForUpdate(el)

      el.value = 'existing'
      await waitForUpdate(el)

      const newRadio = document.createElement('web-ui-radio')
      newRadio.setAttribute('value', 'different')
      newRadio.textContent = 'Other'
      el.appendChild(newRadio)
      await waitForUpdate(newRadio)
      await waitForUpdate(el)

      expect(newRadio.checked).toBe(false)

      cleanupElement(el)
    })

    it('初始状态无子 radio 时 value 为空字符串', async () => {
      const el = createGroup('')
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })
  })

  it('子 radio 离组后恢复独立事件行为', async () => {
    const el = createGroup()
    await waitForUpdate(el)

    const radio = el.querySelectorAll<WebUiRadio>('web-ui-radio')[0]
    const container = document.createElement('div')
    container.append(el)
    document.body.append(container)
    await waitForUpdate(el)

    const slot = el.shadowRoot!.querySelector('slot')!
    const slotChanged = new Promise<void>(resolve =>
      slot.addEventListener('slotchange', () => resolve(), { once: true })
    )
    container.append(radio)
    await slotChanged
    await radio.updateComplete

    radio.checked = false
    await radio.updateComplete
    const [events, detach] = spyEvents(container, 'change')
    queryA11y(radio, '[role="radio"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await radio.updateComplete

    expect(events).toHaveLength(1)
    expect(events[0].target).toBe(radio)
    detach()
    cleanupElement(container)
  })
})
