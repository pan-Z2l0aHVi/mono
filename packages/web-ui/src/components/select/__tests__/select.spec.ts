import '..'
import '@/components/option'

import { describe, expect, it } from 'vite-plus/test'

import type { WebUiOption } from '@/components/option'
import { cleanupElement, queryA11y, spyEvents, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSelect } from '..'

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true, composed: true })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

/** 具名 slot 实际投影到的节点数——slot 投影是公开契约（ADR-0005 §5）。 */
function projectedCount(el: WebUiSelect, slotName: string): number {
  const slot = queryA11y(el, `slot[name="${slotName}"]`) as HTMLSlotElement | null
  return slot?.assignedNodes().length ?? 0
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

    it('trigger 默认为 label，icon 生效，非法值回退', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)
      expect(el.trigger).toBe('label')

      el.trigger = 'icon'
      await waitForUpdate(el)
      expect(el.getAttribute('trigger')).toBe('icon')

      ;(el as any).trigger = 'popover'
      await waitForUpdate(el)
      expect(el.trigger).toBe('label')

      cleanupElement(el)
    })

    it('placement 默认 bottom-start，切换后反射为 attribute，非法值回退', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)
      expect(el.placement).toBe('bottom-start')

      el.placement = 'bottom'
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('bottom')

      ;(el as any).placement = 'sideways'
      await waitForUpdate(el)
      expect(el.placement).toBe('bottom-start')

      cleanupElement(el)
    })

    it('设置 value 后通过 combobox 文本反映选中 label', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'banana'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Banana')).toBe(true)

      cleanupElement(el)
    })

    it('未设置 option label 时使用默认 slot 文本作为选中 label', async () => {
      const el = createSelect('<web-ui-option value="apple">Apple</web-ui-option>', { value: 'apple' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.includes('Apple')).toBe(true)

      cleanupElement(el)
    })

    it('已选 option 的 label 更新后同步 trigger 文本', async () => {
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

    it('option 在连接后插入时同步 label', async () => {
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

    it('open 与 isOpen 初始均反映未打开状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(el.isOpen, 'isOpen 是 open 的公开别名').toBe(false)

      cleanupElement(el)
    })
  })

  describe('可访问名称', () => {
    it('将 aria-label 转发到 combobox，并响应更新和移除', async () => {
      const el = createSelect(OPTIONS_HTML, { 'aria-label': '全局主题' })
      await waitForUpdate(el)

      expect(queryA11y(el, '[role="combobox"]')?.getAttribute('aria-label')).toBe('全局主题')

      el.setAttribute('aria-label', '主题偏好')
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="combobox"]')?.getAttribute('aria-label')).toBe('主题偏好')

      el.removeAttribute('aria-label')
      await waitForUpdate(el)
      expect(queryA11y(el, '[role="combobox"]')?.hasAttribute('aria-label')).toBe(false)

      cleanupElement(el)
    })

    it('未提供命名属性时不添加空的 ARIA 名称', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)
      const trigger = queryA11y(el, '[role="combobox"]')

      expect(trigger?.hasAttribute('aria-label')).toBe(false)

      cleanupElement(el)
    })
  })

  describe('打开/关闭', () => {
    it('点击 trigger 打开 overlay', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('点击 option 后关闭 overlay 并更新 value', async () => {
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

    it('点击外部关闭 overlay', async () => {
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

    it('焦点移出组件后关闭 overlay', async () => {
      const el = createSelect(OPTIONS_HTML)
      const external = document.createElement('button')
      document.body.append(external)
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.focus()
      trigger.click()
      await waitForUpdate(el)

      external.focus()
      await waitForFrame()

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

      expect(document.documentElement.style.overflow).toBe('hidden')

      document.body.click()
      await waitForUpdate(el)

      expect(document.documentElement.style.overflow).toBe('')

      cleanupElement(el)
    })

    it('no-scroll-lock 为 true 时打开不锁定页面滚动', async () => {
      const el = createSelect(OPTIONS_HTML, { 'no-scroll-lock': '' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await waitForUpdate(el)

      expect(document.documentElement.style.overflow).toBe('')

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

      expect(document.documentElement.style.overflow).toBe('')

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

  describe('无障碍语义', () => {
    it('空字符串 value 不将 option 标记为已选中', async () => {
      const el = createSelect('<web-ui-option value="" label="No selection"></web-ui-option>')
      await waitForUpdate(el)

      const option = el.querySelector<WebUiOption>('web-ui-option')!
      expect(option.selected).toBe(false)
      expect(option.getAttribute('aria-selected')).toBe('false')

      cleanupElement(el)
    })

    it('option 角色与 aria-selected 反映当前 value', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.value = 'banana'
      el.querySelectorAll<WebUiOption>('web-ui-option')[2]!.disabled = true
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      expect(options.map(option => option.getAttribute('role'))).toEqual(['option', 'option', 'option'])
      expect(options.map(option => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false'])
      expect(options.map(option => option.getAttribute('aria-disabled'))).toEqual(['false', 'false', 'true'])

      cleanupElement(el)
    })
  })

  describe('键盘导航', () => {
    it.each([
      { name: 'Space', key: ' ' },
      { name: 'Enter', key: 'Enter' }
    ])('$name 在关闭态打开 overlay', async ({ key }) => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(queryA11y(el, '[role="combobox"]')?.getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('ArrowDown 打开 overlay 并把 aria-activedescendant 指向首个 option', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      const activeId = queryA11y(el, '[role="combobox"]')?.getAttribute('aria-activedescendant')
      const active = activeId ? el.querySelector(`#${activeId}`) : null
      expect(active?.tagName.toLowerCase()).toBe('web-ui-option')
      expect(active?.getAttribute('role')).toBe('option')
      expect(active?.getAttribute('value')).toBe('apple')

      cleanupElement(el)
    })

    it('展开态 Home、End 与首字母输入移动激活项但不提交 value', async () => {
      const el = createSelect(`
        <web-ui-option value="disabled-start" label="Disabled start" disabled></web-ui-option>
        <web-ui-option value="apple" label="Apple"></web-ui-option>
        <web-ui-option value="elm" label="Elm"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="raspberry" label="Raspberry"></web-ui-option>
        <web-ui-option value="cherry" label="Cherry"></web-ui-option>
        <web-ui-option value="disabled-end" label="Disabled end" disabled></web-ui-option>
      `)
      el.value = 'cherry'
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      const activeValue = () => {
        const activeId = trigger.getAttribute('aria-activedescendant')
        return activeId ? el.querySelector<WebUiOption>(`#${activeId}`)?.value : undefined
      }

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }))
      await waitForUpdate(el)
      expect(activeValue()).toBe('apple')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }))
      await waitForUpdate(el)
      expect(activeValue()).toBe('cherry')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true }))
      await waitForUpdate(el)
      expect(activeValue()).toBe('react')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true }))
      await waitForUpdate(el)
      expect(activeValue()).toBe('react')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      await waitForUpdate(el)
      expect(activeValue()).toBe('raspberry')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }))
      await waitForUpdate(el)
      expect(activeValue()).toBe('apple')
      expect(el.value).toBe('cherry')

      cleanupElement(el)
    })

    it('typeahead 将带点大写 I 与 i 匹配', async () => {
      const dottedI = String.fromCharCode(0x130)
      const el = createSelect(`
        <web-ui-option value="alpha" label="Alpha"></web-ui-option>
        <web-ui-option value="dotted-i" label="${dottedI}tem"></web-ui-option>
      `)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      const activeValue = () => {
        const activeId = trigger.getAttribute('aria-activedescendant')
        return activeId ? el.querySelector<WebUiOption>(`#${activeId}`)?.value : undefined
      }
      expect(activeValue()).toBe('alpha')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true, cancelable: true }))
      await waitForUpdate(el)

      expect(activeValue()).toBe('dotted-i')
      expect(el.value).toBe('')

      cleanupElement(el)
    })

    it.each([
      { state: 'disabled', invalidate: (option: WebUiOption) => (option.disabled = true) },
      { state: 'removed', invalidate: (option: WebUiOption) => option.remove() }
    ])('多字符 typeahead 不延续到已 $state 的激活项', async ({ invalidate }) => {
      const el = createSelect(`
        <web-ui-option value="apple" label="Apple"></web-ui-option>
        <web-ui-option value="elm" label="Elm"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="raspberry" label="Raspberry"></web-ui-option>
      `)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      const activeValue = () => {
        const activeId = trigger.getAttribute('aria-activedescendant')
        return activeId ? el.querySelector<WebUiOption>(`#${activeId}`)?.value : undefined
      }

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))
      await waitForUpdate(el)
      expect(activeValue()).toBe('react')

      invalidate(el.querySelector<WebUiOption>('[value="react"]')!)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }))
      await waitForUpdate(el)

      expect(activeValue()).toBe('elm')
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
      expect(el.querySelector(`#${activeId}`)?.getAttribute('value')).toBe('apple')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await waitForUpdate(el)
      const loopedId = trigger.getAttribute('aria-activedescendant')
      expect(el.querySelector(`#${loopedId}`)?.getAttribute('value')).toBe('cherry')

      cleanupElement(el)
    })

    it('指针进入 option 后清除键盘激活状态', async () => {
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

    it('触摸指针进入 option 时保留键盘激活状态', async () => {
      const el = createSelect(OPTIONS_HTML)
      await waitForUpdate(el)

      // 激活项与触摸目标要错开：都在同一项时，「保留」与「被改写」量出同一个 id，
      // 判据就退化成 truthy。ArrowDown 两次 → 激活 banana，触摸滑过 apple。
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const trigger = queryA11y(el, '[role="combobox"]')!
      const activated = trigger.getAttribute('aria-activedescendant')
      expect(el.querySelector(`#${activated}`)?.getAttribute('value'), '前置：第二项应为激活项').toBe('banana')

      el.querySelector<HTMLElement>('web-ui-option')!.dispatchEvent(touchPointerEvent('pointerover'))
      await waitForUpdate(el)

      // 与上一条（鼠标 hover 清除激活）互为对照：触摸不该改写键盘激活项。
      expect(trigger.getAttribute('aria-activedescendant'), '触摸 pointerover 改写了键盘激活项').toBe(activated)

      cleanupElement(el)
    })

    it('Escape 关闭 overlay', async () => {
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

      // 第一次 ArrowDown 打开 overlay 并定位到已 option
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

    it('portal 打开时不迁移 trigger slot 内容，关闭后仍是宿主第一个子元素', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.portal = true
      el.innerHTML = `
        <span slot="trigger">Custom Trigger</span>
        ${OPTIONS_HTML}
      `
      await waitForUpdate(el)

      const triggerEl = el.querySelector('[slot="trigger"]') as HTMLElement
      const combobox = queryA11y(el, '[role="combobox"]') as HTMLElement
      combobox.click()
      await waitForUpdate(el)
      await waitForFrame()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(triggerEl.parentElement).toBe(el)
      expect(el.firstElementChild).toBe(triggerEl)

      document.body.click()
      await waitForUpdate(el)
      await waitForFrame()
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(triggerEl.parentElement).toBe(el)
      expect(el.firstElementChild).toBe(triggerEl)

      cleanupElement(el)
    })
  })

  describe('条件渲染边界', () => {
    it('注释锚点替换为包含 option 的 wrapper 后同步选中 label', async () => {
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

    it('portal 打开时删除整个 wrapper 不再激活已删除 option', async () => {
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
      await waitForFrame()
      await waitForUpdate(el)

      wrapper.remove()
      await waitForFrame()
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

  describe('trigger 插槽', () => {
    it('提供 trigger slot 时按 name 投影该 slot', async () => {
      const el = createSelect(OPTIONS_HTML)
      el.innerHTML = `
        <span slot="trigger">Custom Trigger</span>
        ${OPTIONS_HTML}
      `
      await waitForUpdate(el)

      expect(projectedCount(el, 'trigger')).toBe(1)

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

    it('点击 trigger slot 内容打开 overlay', async () => {
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

    it('trigger slot 模式下选择 option 仍更新 value', async () => {
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

  /*
   * 禁用态下 Escape 必须被吞掉（Q14 语义）：既不关掉本层，也不落到下层 overlay。
   * 本用例是全套 select 测试里**唯一**覆盖这条契约的 —— 把 `_syncOverlayInert()` 的方法体
   * 整条停掉后，只有它转红（其余 61 例全绿）。
   *
   * 特意走 trigger slot 变更而非 portal 变更：portal 只登记一帧 rAF，链路更长；
   * slotchange 是直接调用 `_reconfigureOverlay()` 的短路径。
   *
   * 附带实测结论：`_reconfigureOverlay()` 末尾那次重推目前是**冗余**的（摘掉那行本用例仍绿）
   * —— 这条路径后面跟着一轮渲染，而 `updated()` 每次渲染都会调 `_syncOverlayInert()`。
   * 保留它是为了不依赖「这条路径必然跟着一次渲染」这个隐含前提。
   */
  it('禁用中 trigger slot 变更后 Escape 仍不关闭：reconfigure 换会话不得丢掉禁用态', async () => {
    const el = createSelect(OPTIONS_HTML)
    await waitForUpdate(el)

    // 先开后禁用：可开性只在打开那一刻判定，禁用后保持开启态但不再可被 Escape 关闭。
    ;(queryA11y(el, '[role="combobox"]') as HTMLElement).click()
    await waitForUpdate(el)
    expect(el.open).toBe(true)

    el.disabled = true
    await waitForUpdate(el)

    const custom = document.createElement('span')
    custom.slot = 'trigger'
    custom.textContent = 'Custom'
    el.append(custom)
    await waitForUpdate(el)
    await waitForFrame()
    await waitForUpdate(el)
    expect(el.open).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await waitForUpdate(el)
    expect(el.open).toBe(true)

    cleanupElement(el)
  })
})
