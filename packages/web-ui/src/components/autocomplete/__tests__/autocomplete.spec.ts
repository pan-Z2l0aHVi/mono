import { describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/option'
import type { WebUiOption } from '@/components/option'
import { cleanupElement, expectReflected, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiAutocomplete } from '..'

function createAutocomplete(optionsHtml = '', attrs?: Record<string, string>): WebUiAutocomplete {
  const el = document.createElement('web-ui-autocomplete')
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

// 在 shadow 内输入框上模拟用户键入：设置 value 后派发 composed input 事件，
// 原生 input 事件会冒泡到宿主成为组件的公共 input 事件。
function typeText(el: WebUiAutocomplete, text: string) {
  const input = queryA11y(el, '[role="combobox"]') as HTMLInputElement
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

function comboboxInput(el: WebUiAutocomplete): HTMLInputElement {
  return queryA11y(el, '[role="combobox"]') as HTMLInputElement
}

describe('WebUiAutocomplete 组件', () => {
  describe('宿主属性', () => {
    it('value 默认为空字符串', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(el.value).toBe('')

      cleanupElement(el)
    })

    it('初始 value attribute 作为默认值，属性变更不回写 attribute', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { value: 'Apple' })
      await waitForUpdate(el)
      expect(el.value).toBe('Apple')

      el.value = 'Banana'
      await waitForUpdate(el)
      // value 不反射：attribute 保留初始默认值，供表单重置使用
      expect(el.getAttribute('value')).toBe('Apple')

      cleanupElement(el)
    })

    it('value 设置后同步输入框文本', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'Apple'
      await waitForUpdate(el)

      expect(comboboxInput(el).value).toBe('Apple')

      cleanupElement(el)
    })

    it('文本精确匹配 option label 时派生 selected-value', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'Apple'
      await waitForUpdate(el)

      expect(el.selectedValue).toBe('apple')
      expect(el.getAttribute('selected-value')).toBe('apple')

      cleanupElement(el)
    })

    it('selected-value 大小写不敏感', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'apple'
      await waitForUpdate(el)

      expect(el.selectedValue).toBe('apple')

      cleanupElement(el)
    })

    it('文本无匹配时 selected-value 为空', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'zzz'
      await waitForUpdate(el)

      expect(el.selectedValue).toBe('')

      cleanupElement(el)
    })

    it('selectedValue 是只读派生状态', () => {
      const el = createAutocomplete()
      expect(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'selectedValue')?.set).toBeUndefined()

      cleanupElement(el)
    })

    it('外部修改 selected-value attribute 后恢复为派生值', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'Apple'
      await waitForUpdate(el)

      el.setAttribute('selected-value', 'wrong')
      await Promise.resolve()
      await waitForUpdate(el)

      expect(el.selectedValue).toBe('apple')
      expect(el.getAttribute('selected-value')).toBe('apple')

      cleanupElement(el)
    })

    it('将 aria-label 转发给内部 combobox', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { 'aria-label': '搜索水果' })
      await waitForUpdate(el)

      expect(comboboxInput(el).getAttribute('aria-label')).toBe('搜索水果')

      cleanupElement(el)
    })

    it('将 aria-labelledby 镜像到内部 combobox 的同一 Shadow DOM 作用域', async () => {
      const label = document.createElement('span')
      label.id = 'fruit-label'
      label.textContent = '水果'
      document.body.append(label)
      const el = createAutocomplete(OPTIONS_HTML, { 'aria-labelledby': 'fruit-label' })
      await waitForUpdate(el)

      const labelledby = comboboxInput(el).getAttribute('aria-labelledby')
      expect(labelledby).toBeTruthy()
      expect(el.shadowRoot?.querySelector(`#${labelledby}`)?.textContent).toBe('水果')

      cleanupElement(el)
      label.remove()
    })

    it('placeholder/disabled/name/filter 反射到宿主', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.placeholder = '搜索'
      el.disabled = true
      el.name = 'fruit'
      await waitForUpdate(el)

      expect(el.getAttribute('placeholder')).toBe('搜索')
      expectReflected(el, 'disabled', true)
      expect(el.getAttribute('name')).toBe('fruit')
      expect(el.getAttribute('filter')).toBe('contains')

      cleanupElement(el)
    })

    it('filter 非法值回退 contains', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.setAttribute('filter', 'fuzzy')
      await waitForUpdate(el)

      expect(el.filter).toBe('contains')

      cleanupElement(el)
    })

    it('filter 为 none/prefix/contains 时接受合法值', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.setAttribute('filter', 'none')
      await waitForUpdate(el)
      expect(el.filter).toBe('none')

      el.setAttribute('filter', 'prefix')
      await waitForUpdate(el)
      expect(el.filter).toBe('prefix')

      cleanupElement(el)
    })
  })

  describe('过滤', () => {
    it('默认 contains 过滤非匹配候选', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)
      typeText(el, 'ap')
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      expect(options.find(o => o.value === 'apple')?.hasAttribute('data-filtered')).toBe(false)
      expect(options.find(o => o.value === 'banana')?.hasAttribute('data-filtered')).toBe(true)
      expect(options.find(o => o.value === 'cherry')?.hasAttribute('data-filtered')).toBe(true)

      cleanupElement(el)
    })

    it('filter=none 时不过滤', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { filter: 'none' })
      await waitForUpdate(el)
      typeText(el, 'zzz')
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      expect(options.every(o => !o.hasAttribute('data-filtered'))).toBe(true)

      cleanupElement(el)
    })

    it('filter=prefix 匹配前缀', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { filter: 'prefix' })
      await waitForUpdate(el)
      typeText(el, 'app')
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      expect(options.find(o => o.value === 'apple')?.hasAttribute('data-filtered')).toBe(false)
      expect(options.find(o => o.value === 'banana')?.hasAttribute('data-filtered')).toBe(true)

      cleanupElement(el)
    })

    it('filter=prefix 不匹配非前缀', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { filter: 'prefix' })
      await waitForUpdate(el)
      typeText(el, 'pple')
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      expect(options.every(o => o.hasAttribute('data-filtered'))).toBe(true)

      cleanupElement(el)
    })

    it('清空文本后全部候选可见', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)
      typeText(el, 'ap')
      await waitForUpdate(el)
      typeText(el, '')
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      expect(options.every(o => !o.hasAttribute('data-filtered'))).toBe(true)

      cleanupElement(el)
    })
  })

  describe('打开/关闭', () => {
    it('输入框 focus 打开面板', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      comboboxInput(el).focus()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(comboboxInput(el).getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('ArrowDown 打开面板', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      expect(el.open).toBe(true)

      cleanupElement(el)
    })

    it('键入打开面板', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      typeText(el, 'ap')
      await waitForUpdate(el)

      expect(el.open).toBe(true)

      cleanupElement(el)
    })

    it('点击外部关闭面板', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      comboboxInput(el).focus()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('Escape 关闭面板', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      comboboxInput(el).focus()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('打开时 aria-controls 指向 listbox', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      const controls = comboboxInput(el).getAttribute('aria-controls')
      expect(controls).toBeTruthy()
      const listbox = queryA11y(el, '[role="listbox"]')
      expect(listbox?.id).toBe(controls)

      cleanupElement(el)
    })
  })

  describe('事件', () => {
    it('键入触发 input 事件，target.value 为当前文本', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [events] = spyEvents<InputEvent>(el, 'input')
      await waitForUpdate(el)

      typeText(el, 'ap')
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect((events[0].target as WebUiAutocomplete).value).toBe('ap')

      cleanupElement(el)
    })

    it('键入不触发 change', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      typeText(el, 'ap')
      await waitForUpdate(el)

      expect(changeEvents).toHaveLength(0)

      cleanupElement(el)
    })

    it('聚焦和失焦时冒泡 focus/blur 事件', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [focusEvents] = spyEvents<FocusEvent>(el, 'focus')
      const [blurEvents] = spyEvents<FocusEvent>(el, 'blur')
      await waitForUpdate(el)

      const input = comboboxInput(el)
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }))
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }))

      expect(focusEvents).toHaveLength(1)
      expect(blurEvents).toHaveLength(1)

      cleanupElement(el)
    })

    it('点击 option 触发 input+change 并回填文本', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      comboboxInput(el).focus()
      await waitForUpdate(el)
      ;(el.querySelector('web-ui-option') as HTMLElement).click()
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      expect(el.value).toBe('Apple')
      expect(el.selectedValue).toBe('apple')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('Enter 选中活动项触发 input+change', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      expect(el.value).toBe('Apple')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('开闭时触发 open-change', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      await waitForUpdate(el)

      comboboxInput(el).focus()
      await waitForUpdate(el)
      expect(events[0].detail.open).toBe(true)

      document.body.click()
      await waitForUpdate(el)
      expect(events[1].detail.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('键盘导航', () => {
    it('ArrowDown 打开并激活首项，aria-activedescendant 指向 option', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const activeId = comboboxInput(el).getAttribute('aria-activedescendant')
      expect(activeId).toBeTruthy()
      expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Apple')

      cleanupElement(el)
    })

    it('ArrowUp 打开后再次按下循环到末尾', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      const activeId = comboboxInput(el).getAttribute('aria-activedescendant')
      expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Apple')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await waitForUpdate(el)
      const loopedId = comboboxInput(el).getAttribute('aria-activedescendant')
      expect(el.shadowRoot?.querySelector(`#${loopedId}`)?.textContent?.trim()).toBe('Cherry')

      cleanupElement(el)
    })

    it('过滤后 ArrowDown 跳过非匹配候选', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      typeText(el, 'ap')
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const activeId = comboboxInput(el).getAttribute('aria-activedescendant')
      expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Apple')

      cleanupElement(el)
    })

    it('禁用 option 被键盘导航跳过', async () => {
      const el = createAutocomplete(
        '<web-ui-option value="a" label="A"></web-ui-option><web-ui-option value="b" label="B" disabled></web-ui-option><web-ui-option value="c" label="C"></web-ui-option>'
      )
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const first = comboboxInput(el).getAttribute('aria-activedescendant')
      expect(el.shadowRoot?.querySelector(`#${first}`)?.textContent?.trim()).toBe('A')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const second = comboboxInput(el).getAttribute('aria-activedescendant')
      expect(el.shadowRoot?.querySelector(`#${second}`)?.textContent?.trim()).toBe('C')

      cleanupElement(el)
    })

    it('无匹配候选时 ArrowDown 不产生 activedescendant', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      typeText(el, 'zzz')
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      expect(comboboxInput(el).getAttribute('aria-activedescendant')).toBeFalsy()

      cleanupElement(el)
    })

    it('option 具备 role=option 与 aria-selected', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'Apple'
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      expect(options.every(o => o.getAttribute('role') === 'option')).toBe(true)
      expect(options.find(o => o.value === 'apple')?.getAttribute('aria-selected')).toBe('true')
      expect(options.find(o => o.value === 'banana')?.getAttribute('aria-selected')).toBe('false')

      cleanupElement(el)
    })

    it('option remove/register/reorder 后自动 ID 稳定且唯一', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      const options = [...el.querySelectorAll<WebUiOption>('web-ui-option')]
      const initialIds = new Map(options.map(option => [option.value, option.id]))
      el.append(options[0])
      await waitForUpdate(el)

      expect(el.querySelector<WebUiOption>('web-ui-option[value="apple"]')?.id).toBe(initialIds.get('apple'))
      expect(el.querySelector<WebUiOption>('web-ui-option[value="banana"]')?.id).toBe(initialIds.get('banana'))

      options[1].remove()
      const inserted = document.createElement('web-ui-option') as WebUiOption
      inserted.value = 'durian'
      inserted.label = 'Durian'
      el.append(inserted)
      await waitForUpdate(el)

      const ids = [...el.querySelectorAll<WebUiOption>('web-ui-option')].map(option => option.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(inserted.id).not.toBe(initialIds.get('banana'))

      cleanupElement(el)
    })

    it('多个 autocomplete 生成互不重复的 option 和 listbox id', async () => {
      const first = createAutocomplete(OPTIONS_HTML)
      const second = createAutocomplete(OPTIONS_HTML)
      await Promise.all([waitForUpdate(first), waitForUpdate(second)])

      const ids = [...first.querySelectorAll('web-ui-option'), ...second.querySelectorAll('web-ui-option')].map(
        option => option.id
      )
      const listboxIds = [
        comboboxInput(first).getAttribute('aria-controls'),
        comboboxInput(second).getAttribute('aria-controls')
      ]
      expect(new Set(ids).size).toBe(ids.length)
      expect(new Set(listboxIds).size).toBe(listboxIds.length)

      cleanupElement(first)
      cleanupElement(second)
    })

    it('删除活动 option 后清理 active、selected-value 与 aria-activedescendant', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'Apple'
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const active = el.querySelector<WebUiOption>('web-ui-option[active]')!
      active.remove()
      await waitForUpdate(el)

      expect(el.selectedValue).toBe('')
      expect(el.querySelector('[active]')).toBeNull()
      expect(comboboxInput(el).getAttribute('aria-activedescendant')).toBeFalsy()

      cleanupElement(el)
    })
  })

  describe('表单关联', () => {
    it('恢复表单状态时同步 value 与 selected-value', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      el.formStateRestoreCallback('Banana')
      await waitForUpdate(el)

      expect(el.value).toBe('Banana')
      expect(el.selectedValue).toBe('banana')

      cleanupElement(el)
    })
  })

  describe('禁用状态', () => {
    it('disabled 时不可打开', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.disabled = true
      await waitForUpdate(el)

      comboboxInput(el).focus()
      await waitForUpdate(el)

      expect(el.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('portal 模式', () => {
    it('portal 为 true 时仍可正常交互', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { portal: '' })
      await waitForUpdate(el)

      comboboxInput(el).focus()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      // portal 打开后 options 被移入浮层，键盘选择不依赖 light DOM 查询
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('Apple')
      expect(el.selectedValue).toBe('apple')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })
  })
})
