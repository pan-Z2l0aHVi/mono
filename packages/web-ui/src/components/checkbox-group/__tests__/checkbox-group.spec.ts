import { describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/checkbox'
import { waitForUpdate, spyEvents, spyHostEvents, cleanupElement, queryA11y } from '@/shared/test-utils'

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

// 点击子 checkbox 触发用户交互
const clickChild = (group: WebUiCheckboxGroup, index: number) => {
  const checkbox = group.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')[index]
  const label = checkbox.shadowRoot!.querySelector('label')!
  label.click()
}

describe('WebUiCheckboxGroup 组件', () => {
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

    it('继承禁用不改写子项属性，移出 Tab 序列，并保留单项禁用', async () => {
      const el = createGroup(`
        <web-ui-checkbox value="a" disabled>A</web-ui-checkbox>
        <web-ui-checkbox value="b">B</web-ui-checkbox>
        <web-ui-checkbox value="c">C</web-ui-checkbox>
      `)
      await waitForUpdate(el)

      el.disabled = true
      await waitForUpdate(el)

      const checkboxes = el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')
      await Promise.all([...checkboxes].map(checkbox => checkbox.updateComplete))
      expect(checkboxes[0].disabled).toBe(true)
      expect(checkboxes[1].disabled).toBe(false)
      expect(checkboxes[2].disabled).toBe(false)
      for (const checkbox of checkboxes) {
        const control = queryA11y(checkbox, '[role="checkbox"]')
        expect(control?.getAttribute('aria-disabled')).toBe('true')
        expect(control?.getAttribute('tabindex')).toBe('-1')
      }

      el.disabled = false
      await waitForUpdate(el)
      await Promise.all([...checkboxes].map(checkbox => checkbox.updateComplete))

      expect(queryA11y(checkboxes[0], '[role="checkbox"]')?.getAttribute('aria-disabled')).toBe('true')
      expect(queryA11y(checkboxes[0], '[role="checkbox"]')?.getAttribute('tabindex')).toBe('-1')
      for (const checkbox of [...checkboxes].slice(1)) {
        const control = queryA11y(checkbox, '[role="checkbox"]')
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
    it('点击子 checkbox 只派发一次 input 事件，target/currentTarget 均为 group', async () => {
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

    it('点击子 checkbox 只派发一次 change 事件，target/currentTarget 均为 group', async () => {
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

    it('子 checkbox 的同名 change 不冒泡到 group 外部', async () => {
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

    it('group-managed 子 checkbox 的直接监听器仍收到自身 input/change', async () => {
      const el = createGroup()
      await waitForUpdate(el)

      const checkbox = el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')[1]
      const [inputEvents, detachInput] = spyEvents(checkbox, 'input')
      const [changeEvents, detachChange] = spyEvents(checkbox, 'change')

      clickChild(el, 1)
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      expect(inputEvents[0].target).toBe(checkbox)
      expect(changeEvents[0].target).toBe(checkbox)
      detachInput()
      detachChange()
      cleanupElement(el)
    })

    it('独立子 checkbox 的 input/change 仍冒泡且组合', async () => {
      const checkbox = document.createElement('web-ui-checkbox')
      checkbox.setAttribute('value', 'solo')
      checkbox.textContent = 'Solo'
      const container = document.createElement('div')
      container.appendChild(checkbox)
      document.body.appendChild(container)
      await waitForUpdate(checkbox)

      const [inputEvents, detachInput] = spyEvents(container, 'input')
      const [changeEvents, detachChange] = spyEvents(container, 'change')

      const label = checkbox.shadowRoot!.querySelector('label')!
      label.click()
      await waitForUpdate(checkbox)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      expect(inputEvents[0].target).toBe(checkbox)
      expect(changeEvents[0].target).toBe(checkbox)
      detachInput()
      detachChange()
      cleanupElement(container)
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

  describe('动态成员：模拟 v-if / && 条件渲染', () => {
    it('v-if 插入的子项应继承当前 value 的选中态', async () => {
      const el = createGroup('<web-ui-checkbox value="a">A</web-ui-checkbox>')
      await waitForUpdate(el)
      el.value = ['a', 'c']
      await waitForUpdate(el)

      // 模拟 Vue v-if / React && 插入：直接在 light DOM 追加子节点
      const newCheckbox = document.createElement('web-ui-checkbox') as WebUiCheckbox
      newCheckbox.setAttribute('value', 'c')
      newCheckbox.textContent = 'C'
      el.appendChild(newCheckbox)
      // 等待 microtask + Lit 更新（不手动触发 group sync）
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([newCheckbox.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(newCheckbox.checked).toBe(true)
      cleanupElement(el)
    })

    it('v-if 插入的子项应继承 group 的 disabled（不改写子项 disabled 属性）', async () => {
      const el = createGroup('<web-ui-checkbox value="a">A</web-ui-checkbox>')
      await waitForUpdate(el)
      el.disabled = true
      await waitForUpdate(el)

      const newCheckbox = document.createElement('web-ui-checkbox') as WebUiCheckbox
      newCheckbox.setAttribute('value', 'b')
      newCheckbox.textContent = 'B'
      el.appendChild(newCheckbox)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([newCheckbox.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(newCheckbox.disabled).toBe(false)
      const control = queryA11y(newCheckbox, '[role="checkbox"]')
      expect(control?.getAttribute('aria-disabled')).toBe('true')
      expect(control?.getAttribute('tabindex')).toBe('-1')
      cleanupElement(el)
    })

    it('v-if 移除子项后应清理上下文且不再受 group value 影响', async () => {
      const el = createGroup()
      await waitForUpdate(el)
      el.value = ['a']
      await waitForUpdate(el)

      const checkboxA = el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')[0]
      await checkboxA.updateComplete
      expect(checkboxA.checked).toBe(true)

      // 模拟 v-if=false：从 group 移除并挂到外部容器
      const container = document.createElement('div')
      container.append(el)
      document.body.append(container)
      await waitForUpdate(el)
      const slot = el.shadowRoot!.querySelector('slot')!
      const slotChanged = new Promise<void>(resolve =>
        slot.addEventListener('slotchange', () => resolve(), { once: true })
      )
      container.append(checkboxA)
      await slotChanged
      await Promise.all([checkboxA.updateComplete, waitForUpdate(el)])

      // 移除后改变 group value，被移除项不应再同步
      el.value = ['b']
      await waitForUpdate(el)
      await checkboxA.updateComplete
      expect(checkboxA.checked).toBe(true)

      // 被移除项恢复独立事件：点击应冒泡到容器
      checkboxA.checked = false
      await checkboxA.updateComplete
      const [events, detach] = spyEvents(container, 'change')
      queryA11y(checkboxA, '[role="checkbox"]')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true })
      )
      await checkboxA.updateComplete
      expect(events).toHaveLength(1)
      expect(events[0].target).toBe(checkboxA)
      detach()
      cleanupElement(container)
      cleanupElement(el)
    })

    it('连续插入多个子项后 value 同步保持一致', async () => {
      const el = createGroup('')
      await waitForUpdate(el)
      el.value = ['x', 'y']
      await waitForUpdate(el)

      const cx = document.createElement('web-ui-checkbox') as WebUiCheckbox
      cx.setAttribute('value', 'x')
      const cy = document.createElement('web-ui-checkbox') as WebUiCheckbox
      cy.setAttribute('value', 'y')
      const cz = document.createElement('web-ui-checkbox') as WebUiCheckbox
      cz.setAttribute('value', 'z')
      el.append(cx, cy, cz)
      await new Promise(r => setTimeout(r, 0))
      await Promise.all([cx.updateComplete, cy.updateComplete, cz.updateComplete, waitForUpdate(el)])
      await new Promise(r => setTimeout(r, 0))

      expect(cx.checked).toBe(true)
      expect(cy.checked).toBe(true)
      expect(cz.checked).toBe(false)
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

  it('子 checkbox 离组后恢复独立事件行为', async () => {
    const el = createGroup()
    await waitForUpdate(el)

    const checkbox = el.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')[0]
    const container = document.createElement('div')
    container.append(el)
    document.body.append(container)
    await waitForUpdate(el)

    const slot = el.shadowRoot!.querySelector('slot')!
    const slotChanged = new Promise<void>(resolve =>
      slot.addEventListener('slotchange', () => resolve(), { once: true })
    )
    container.append(checkbox)
    await slotChanged
    await checkbox.updateComplete

    checkbox.checked = false
    await checkbox.updateComplete
    const [events, detach] = spyEvents(container, 'change')
    queryA11y(checkbox, '[role="checkbox"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await checkbox.updateComplete

    expect(events).toHaveLength(1)
    expect(events[0].target).toBe(checkbox)
    detach()
    cleanupElement(container)
  })
})
