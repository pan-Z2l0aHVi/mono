import { describe, expect, it, vi } from 'vite-plus/test'

import type { WebUiOption } from '@/components/option'

import '..'
import '@/components/option'
import { waitForUpdate, spyEvents, expectReflected, cleanupElement, queryA11y } from '@/shared/test-utils'

import type { WebUiSelect } from '..'

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true, composed: true })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

describe('WebUiSelect 组件', () => {
  function createSelect(optionsHtml = '', attrs?: Record<string, string>): WebUiSelect {
    const el = document.createElement('web-ui-select')
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v)
      }
    }
    el.innerHTML = optionsHtml
    document.body.append(el)
    return el
  }

  const OPTIONS_HTML = `
    <web-ui-option value="apple" label="Apple"></web-ui-option>
    <web-ui-option value="banana" label="Banana"></web-ui-option>
    <web-ui-option value="cherry" label="Cherry"></web-ui-option>
  `

  describe('宿主属性', () => {
    it('value 默认为空字符串', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })

    it('设置 value 后通过 combobox 文本反映选中标签', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'banana'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Banana')).toBe(true)

      cleanupElement(el)
    })

    it('未设置 option label 时使用默认 slot 文本作为选中标签', async () => {
      const el = createSelect('<web-ui-option value="apple">Apple</web-ui-option>', { value: 'apple' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Apple')).toBe(true)

      cleanupElement(el)
    })

    it('已选 option 的 label 更新后同步触发器文本', async () => {
      const el = createSelect(OPTIONS_HTML, { value: 'apple' })
      await waitForUpdate(el)

      const option = el.querySelector<WebUiOption>('web-ui-option')!
      option.label = 'Updated Apple'
      await option.updateComplete
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Updated Apple')).toBe(true)

      cleanupElement(el)
    })

    it('选项在连接后插入时同步标签', async () => {
      const el = createSelect('', { value: 'banana' })
      await waitForUpdate(el)

      const option = document.createElement('web-ui-option')
      option.setAttribute('value', 'banana')
      option.label = 'Banana'
      el.append(option)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Banana')).toBe(true)

      cleanupElement(el)
    })

    it('无选中值时显示 placeholder', async () => {
      const el = createSelect(OPTIONS_HTML, { placeholder: '请选择' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.trim()).toBe('请选择')

      cleanupElement(el)
    })

    it('disabled 反射到宿主', async () => {
      const el = createSelect(OPTIONS_HTML)
      expect(el.hasAttribute('disabled')).toBe(false)
      el.disabled = true
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)

      cleanupElement(el)
    })

    it('portal 反射到宿主', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.portal = true
      await waitForUpdate(el)

      expect(el.hasAttribute('portal')).toBe(true)

      cleanupElement(el)
    })

    it('name 反射到宿主', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.name = 'fruit'
      await waitForUpdate(el)

      expect(el.getAttribute('name')).toBe('fruit')

      cleanupElement(el)
    })

    it('open getter 反映浮层状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('isOpen 别名反映浮层状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('打开/关闭', () => {
    it('点击触发器打开浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('打开时 aria-expanded 为 true', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('点击选项后关闭浮层并更新 value', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      const options = el.querySelectorAll('web-ui-option')
      ;(options[1] as HTMLElement).click()
      await waitForUpdate(el)

      expect(el.value).toBe('banana')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('点击 option 的 prefix 装饰仍选择所属 option', async () => {
      const el = createSelect('<web-ui-option value="apple" label="Apple"><span slot="prefix">P</span></web-ui-option>')
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      ;(el.querySelector('[slot="prefix"]') as HTMLElement).click()
      await waitForUpdate(el)

      expect(el.value).toBe('apple')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('点击禁用 option 的 suffix 装饰不改变选中值', async () => {
      const el = createSelect(
        '<web-ui-option value="apple" label="Apple"></web-ui-option><web-ui-option value="banana" label="Banana" disabled><span slot="suffix">S</span></web-ui-option>'
      )
      el.value = 'apple'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      ;(el.querySelector('[slot="suffix"]') as HTMLElement).click()
      await waitForUpdate(el)

      expect(el.value).toBe('apple')
      expect(el.open).toBe(true)

      cleanupElement(el)
    })

    it('点击外部关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('焦点移出组件后关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      const external = document.createElement('button')
      document.body.append(external)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.focus()
      trigger.click()
      await waitForUpdate(el)

      external.focus()
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      expect(el.open).toBe(false)

      cleanupElement(el)
      external.remove()
    })
  })

  describe('属性：no-scroll-lock', () => {
    it('打开时锁定页面滚动，关闭时恢复', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('fixed')

      document.body.click()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')

      cleanupElement(el)
    })

    it('no-scroll-lock 为 true 时打开不锁定页面滚动', async () => {
      const el = createSelect(OPTIONS_HTML, { 'no-scroll-lock': '' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')

      cleanupElement(el)
    })

    it('打开期间启用 no-scroll-lock 立即恢复页面滚动', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)
      el.setAttribute('no-scroll-lock', '')
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')

      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('选择时触发 input 和 change', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      const options = el.querySelectorAll('web-ui-option')
      ;(options[1] as HTMLElement).click()
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)

      cleanupElement(el)
    })

    it('开闭时触发 open-change', async () => {
      const el = createSelect(OPTIONS_HTML)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect(events[0].detail.open).toBe(true)

      document.body.click()
      await waitForUpdate(el)

      expect(events).toHaveLength(2)
      expect(events[1].detail.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('键盘导航', () => {
    it('ArrowDown 激活选项', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.getAttribute('aria-activedescendant')).toBeTruthy()

      cleanupElement(el)
    })

    it('ArrowUp 打开后再次按下循环到末尾', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      const trigger = queryA11y(el, '[role="combobox"]')!
      const activeId = trigger.getAttribute('aria-activedescendant')
      // 第一次打开定位到初始项（第一个）
      expect(el.querySelector(`#${activeId}`)?.getAttribute('value')).toBe('apple')

      // 第二次 ArrowUp 向上导航，从首项循环到末尾
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await waitForUpdate(el)
      const loopedId = trigger.getAttribute('aria-activedescendant')
      expect(el.querySelector(`#${loopedId}`)?.getAttribute('value')).toBe('cherry')

      cleanupElement(el)
    })

    it('打开时 aria-activedescendant 指向激活选项', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')!
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const activeId = trigger.getAttribute('aria-activedescendant')
      expect(activeId).toBeTruthy()
      expect(el.querySelector(`#${activeId}`)?.tagName.toLowerCase()).toBe('web-ui-option')

      cleanupElement(el)
    })

    it('指针进入选项后清除键盘激活状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const option = el.querySelector<HTMLElement>('web-ui-option')
      option?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }))
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.getAttribute('aria-activedescendant')).toBeFalsy()

      cleanupElement(el)
    })

    it('触摸指针进入选项时保留键盘激活状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const option = el.querySelector<HTMLElement>('web-ui-option')
      option?.dispatchEvent(touchPointerEvent('pointerover'))

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.getAttribute('aria-activedescendant')).toBeTruthy()

      cleanupElement(el)
    })

    it('Escape 关闭浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('Enter 选中高亮项并关闭', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'apple'
      await waitForUpdate(el)

      // 第一次 ArrowDown 打开浮层并定位到已选项
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      // 第二次 ArrowDown 移动到下一项
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('banana')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('Enter 触发 input 事件', async () => {
      const el = createSelect(OPTIONS_HTML)
      const [events] = spyEvents(el, 'input')
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(events).toHaveLength(1)

      cleanupElement(el)
    })
  })

  describe('禁用状态', () => {
    it('disabled 时不可打开', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.disabled = true
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('portal 模式', () => {
    it('未打开时 trigger 显示已选值', async () => {
      const el = createSelect(OPTIONS_HTML, { portal: '' })
      el.value = 'banana'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Banana')).toBe(true)

      cleanupElement(el)
    })

    it('portal 为 true 时仍可正常交互', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.portal = true
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)

      cleanupElement(el)
    })
  })

  describe('条件渲染边界', () => {
    it('注释锚点替换为包含 option 的 wrapper 后同步选中标签', async () => {
      const el = createSelect('<!--options-->', { value: 'banana' })
      await waitForUpdate(el)

      const comment = el.firstChild as Comment
      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<web-ui-option value="banana" label="Banana"></web-ui-option>'
      el.replaceChild(wrapper, comment)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Banana')).toBe(true)

      cleanupElement(el)
    })

    it('portal 打开时删除整个 wrapper 不再激活已删除选项', async () => {
      const el = createSelect(`
        <div>
          <web-ui-option value="banana" label="Banana"></web-ui-option>
        </div>
      `)
      el.portal = true
      el.value = ''
      await waitForUpdate(el)

      const wrapper = el.querySelector('div')!
      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await waitForUpdate(el)

      expect(wrapper).toBeTruthy()
      wrapper.remove()
      await new Promise(resolve => requestAnimationFrame(resolve))
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      expect(el.value).toBe('')

      cleanupElement(el)
    })
  })

  describe('触发器插槽', () => {
    it('提供 trigger slot 时渲染 slot 内容', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.innerHTML = `
        <span slot="trigger">Custom Trigger</span>
        ${OPTIONS_HTML}
      `
      await waitForUpdate(el)

      // slot 投影内容在 light DOM 中，不在 shadow root 内
      const slotEl = el.querySelector('[slot="trigger"]') as HTMLElement | null
      expect(slotEl).toBeTruthy()
      expect(slotEl!.textContent?.trim()).toBe('Custom Trigger')

      cleanupElement(el)
    })

    it('提供 trigger slot 时隐藏默认 label', async () => {
      const el = createSelect(OPTIONS_HTML, { placeholder: '请选择' })
      el.innerHTML = `
        <span slot="trigger">Custom Trigger</span>
        ${OPTIONS_HTML}
      `
      await waitForUpdate(el)

      // 自定义 trigger slot 替代默认 label：combobox 不应再渲染 placeholder 文本
      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('请选择')).toBe(false)

      cleanupElement(el)
    })

    it('不提供 trigger slot 时显示默认 label', async () => {
      const el = createSelect(OPTIONS_HTML, { placeholder: '请选择' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.trim()).toBe('请选择')

      cleanupElement(el)
    })

    it('点击 trigger slot 内容打开浮层', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.innerHTML = `
        <span slot="trigger">Click me</span>
        ${OPTIONS_HTML}
      `
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('trigger slot 模式下选择选项仍更新 value', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.innerHTML = `
        <span slot="trigger">Pick one</span>
        ${OPTIONS_HTML}
      `
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      const options = el.querySelectorAll('web-ui-option')
      ;(options[0] as HTMLElement).click()
      await waitForUpdate(el)

      expect(el.value).toBe('apple')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('trigger slot 模式下 open 属性正确反映状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.innerHTML = `
        <span slot="trigger">Trigger</span>
        ${OPTIONS_HTML}
      `
      await waitForUpdate(el)

      expect(el.hasAttribute('open')).toBe(false)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.hasAttribute('open')).toBe(true)

      document.body.click()
      await waitForUpdate(el)

      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })
  })
})
