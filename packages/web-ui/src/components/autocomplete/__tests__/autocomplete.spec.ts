import { describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/option'
import '@/components/textarea'
import type { WebUiInput } from '@/components/input'
import type { WebUiOption } from '@/components/option'
import {
  cleanupElement,
  expectReflected,
  flushSlotChange,
  queryA11y,
  spyEvents,
  waitForUpdate
} from '@/shared/test-utils'

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

// 默认触发器是 web-ui-input（README 契约）：在它上面模拟用户键入——
// 原生 input 事件从内部 input 冒泡到包装 div 时，target 会 retarget 成这个 host
function defaultTrigger(el: WebUiAutocomplete): WebUiInput {
  return el.shadowRoot!.querySelector<WebUiInput>('web-ui-input')!
}

// combobox ARIA 承载在 trigger 包装 div 上（跟随 select 的 wrapper div 模式）
function comboboxTrigger(el: WebUiAutocomplete): HTMLElement {
  return queryA11y(el, '[role="combobox"]') as HTMLElement
}

function typeText(el: WebUiAutocomplete, text: string) {
  const trigger = defaultTrigger(el)
  trigger.value = text
  trigger.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

function focusTriggerInput(el: WebUiAutocomplete) {
  triggerInput(el).focus()
}

function clickTrigger(el: WebUiAutocomplete) {
  defaultTrigger(el).click()
}

function triggerInput(el: WebUiAutocomplete): HTMLInputElement {
  return defaultTrigger(el).shadowRoot!.querySelector<HTMLInputElement>('input')!
}

// 自定义触发器位于 light DOM（跟随 select 的 wrapper div 模式）
type EditableTrigger = HTMLElement & { value: string; shadowRoot: ShadowRoot | null }

function customTrigger(el: WebUiAutocomplete): EditableTrigger {
  return el.querySelector<EditableTrigger>('[slot="trigger"]')!
}

function createCustomTrigger(triggerHtml: string, optionsHtml = OPTIONS_HTML): WebUiAutocomplete {
  const el = document.createElement('web-ui-autocomplete')
  el.innerHTML = `${triggerHtml}${optionsHtml}`
  document.body.append(el)
  return el
}

function typeIntoCustomTrigger(el: WebUiAutocomplete, text: string) {
  const trigger = customTrigger(el)
  trigger.value = text
  trigger.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

// 键盘事件从触发器内部的真实可编辑元素派发：Enter 是否接管取决于它是 input 还是 textarea
function pressKeyOnCustomTrigger(el: WebUiAutocomplete, key: string) {
  const inner = customTrigger(el).shadowRoot!.querySelector<HTMLElement>('input, textarea')!
  inner.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }))
}

describe('WebUiAutocomplete 组件', () => {
  describe('宿主属性', () => {
    it('默认触发器原生 input 有稳定且实例唯一的 id', async () => {
      const first = createAutocomplete(OPTIONS_HTML)
      const second = createAutocomplete(OPTIONS_HTML)
      await Promise.all([waitForUpdate(first), waitForUpdate(second)])

      const firstId = triggerInput(first).id
      const secondId = triggerInput(second).id
      expect(firstId).not.toBe('')
      expect(secondId).not.toBe('')
      expect(secondId).not.toBe(firstId)

      first.value = 'Apple'
      await waitForUpdate(first)
      expect(triggerInput(first).id).toBe(firstId)

      cleanupElement(first)
      cleanupElement(second)
    })

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

      expect(defaultTrigger(el).value).toBe('Apple')

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

      expect(comboboxTrigger(el).getAttribute('aria-label')).toBe('搜索水果')

      cleanupElement(el)
    })

    it('将 aria-labelledby 镜像到内部 combobox 的同一 Shadow DOM 作用域', async () => {
      const label = document.createElement('span')
      label.id = 'fruit-label'
      label.textContent = '水果'
      document.body.append(label)
      const el = createAutocomplete(OPTIONS_HTML, { 'aria-labelledby': 'fruit-label' })
      await waitForUpdate(el)

      const labelledby = comboboxTrigger(el).getAttribute('aria-labelledby')
      expect(el.shadowRoot?.querySelector(`#${labelledby}`)?.textContent).toBe('水果')

      cleanupElement(el)
      label.remove()
    })

    it('placeholder/disabled/name/filter 反射到宿主', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.placeholder = '搜索'
      el.disabled = true
      el.name = 'fruit'
      el.allowCustomValue = true
      await waitForUpdate(el)

      expect(el.getAttribute('placeholder')).toBe('搜索')
      expectReflected(el, 'disabled', true)
      expect(el.getAttribute('name')).toBe('fruit')
      expect(el.getAttribute('filter')).toBe('contains')
      expectReflected(el, 'allow-custom-value', true)

      cleanupElement(el)
    })

    it('borderless 属性反射', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { borderless: '' })
      await waitForUpdate(el)
      expect(el.borderless).toBe(true)
      expect(el.hasAttribute('borderless')).toBe(true)

      el.borderless = false
      await waitForUpdate(el)
      expect(el.hasAttribute('borderless')).toBe(false)

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
    it('点击输入框打开面板，仅 focus 不打开', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      focusTriggerInput(el)
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      clickTrigger(el)
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(comboboxTrigger(el).getAttribute('aria-expanded')).toBe('true')

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

      focusTriggerInput(el)
      await waitForUpdate(el)
      clickTrigger(el)
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

      focusTriggerInput(el)
      await waitForUpdate(el)
      clickTrigger(el)
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

      const controls = comboboxTrigger(el).getAttribute('aria-controls')
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

      const input = triggerInput(el)
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

      focusTriggerInput(el)
      await waitForUpdate(el)
      clickTrigger(el)
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

    it('Enter 选择无活动项时的精确匹配候选', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      typeText(el, ' apple ')
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('Apple')
      expect(el.selectedValue).toBe('apple')
      expect(el.open).toBe(false)
      expect(changeEvents).toHaveLength(1)

      cleanupElement(el)
    })

    it('allow-custom-value 时 Enter 提交未匹配原文且 selected-value 为空', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { 'allow-custom-value': '' })
      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      typeText(el, '  Custom Tag  ')
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('  Custom Tag  ')
      expect(el.selectedValue).toBe('')
      expect(el.open).toBe(false)
      expect(inputEvents).toHaveLength(2)
      expect(changeEvents).toHaveLength(1)

      cleanupElement(el)
    })

    it('allow-custom-value 不绕过 disabled 精确匹配候选', async () => {
      const el = createAutocomplete('<web-ui-option value="react" label="React" disabled></web-ui-option>', {
        'allow-custom-value': ''
      })
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      typeText(el, 'React')
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('React')
      expect(el.selectedValue).toBe('')
      expect(el.open).toBe(true)
      expect(changeEvents).toHaveLength(0)

      cleanupElement(el)
    })

    it('未开启 allow-custom-value 时无匹配 Enter 不提交', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      typeText(el, 'Custom Tag')
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.value).toBe('Custom Tag')
      expect(el.selectedValue).toBe('')
      expect(el.open).toBe(true)
      expect(changeEvents).toHaveLength(0)

      cleanupElement(el)
    })

    it('开闭时触发 open-change', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')
      await waitForUpdate(el)

      focusTriggerInput(el)
      await waitForUpdate(el)
      clickTrigger(el)
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

      const activeId = comboboxTrigger(el).getAttribute('aria-activedescendant')
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

      const activeId = comboboxTrigger(el).getAttribute('aria-activedescendant')
      expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Apple')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await waitForUpdate(el)
      const loopedId = comboboxTrigger(el).getAttribute('aria-activedescendant')
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

      const activeId = comboboxTrigger(el).getAttribute('aria-activedescendant')
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
      const first = comboboxTrigger(el).getAttribute('aria-activedescendant')
      expect(el.shadowRoot?.querySelector(`#${first}`)?.textContent?.trim()).toBe('A')

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      const second = comboboxTrigger(el).getAttribute('aria-activedescendant')
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

      expect(comboboxTrigger(el).getAttribute('aria-activedescendant')).toBeFalsy()

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
        comboboxTrigger(first).getAttribute('aria-controls'),
        comboboxTrigger(second).getAttribute('aria-controls')
      ]
      expect(new Set(ids).size).toBe(ids.length)
      expect(new Set(listboxIds).size).toBe(listboxIds.length)

      cleanupElement(first)
      cleanupElement(second)
    })

    it('删除活动 option 后清理 selected-value 与 aria-activedescendant', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'Apple'
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      // 激活项只通过公开通道（aria-activedescendant → shadow 内 role=option 镜像）暴露
      const input = comboboxTrigger(el)
      const activeId = input.getAttribute('aria-activedescendant')
      const activeLabel = el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()
      expect(activeLabel).toBe('Apple')

      // 断言候选唯一：避免 label 重名时静默选到错误的节点（fixture 的 label 本就唯一）
      const active = [...el.querySelectorAll<WebUiOption>('web-ui-option')].filter(
        option => option.label === activeLabel
      )
      expect(active).toHaveLength(1)
      active[0]!.remove()
      await waitForUpdate(el)

      expect(el.selectedValue).toBe('')
      expect(input.getAttribute('aria-activedescendant')).toBeFalsy()

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

      focusTriggerInput(el)
      await waitForUpdate(el)

      expect(el.open).toBe(false)

      cleanupElement(el)
    })
  })

  describe('只读状态', () => {
    it('readonly 属性反射并同步到原生 input 与 aria-readonly', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.readonly = true
      await waitForUpdate(el)

      expect(el.hasAttribute('readonly')).toBe(true)
      expect(defaultTrigger(el).hasAttribute('readonly')).toBe(true)
      expect(comboboxTrigger(el).getAttribute('aria-readonly')).toBe('true')
      cleanupElement(el)
    })

    it('非只读时不渲染 aria-readonly', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(comboboxTrigger(el).hasAttribute('aria-readonly')).toBe(false)
      cleanupElement(el)
    })

    it('readonly 时聚焦不打开面板', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.readonly = true
      await waitForUpdate(el)

      focusTriggerInput(el)
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      cleanupElement(el)
    })

    it('readonly 时 ArrowDown 不打开面板', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.readonly = true
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      cleanupElement(el)
    })

    it('readonly 时键入不改变 value', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      el.value = 'Apple'
      el.readonly = true
      await waitForUpdate(el)

      typeText(el, 'Banana')
      await waitForUpdate(el)

      expect(el.value).toBe('Apple')
      expect(el.selectedValue).toBe('apple')
      cleanupElement(el)
    })
  })

  describe('portal 模式', () => {
    it('portal 为 true 时仍可正常交互', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { portal: '' })
      await waitForUpdate(el)

      focusTriggerInput(el)
      await waitForUpdate(el)
      clickTrigger(el)
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

  /*
   * 自定义 trigger slot（issue #144）。默认触发器是 shadow 内的 web-ui-input，
   * 提供 slot[name="trigger"] 后它让位给消费者组件（如 web-ui-textarea），
   * 两者共用同一份委托层：value/input/click/focus/blur 语义不收窄。
   */
  describe('trigger slot', () => {
    const INPUT_TRIGGER = '<web-ui-input slot="trigger"></web-ui-input>'
    const TEXTAREA_TRIGGER = '<web-ui-textarea slot="trigger"></web-ui-textarea>'

    it('提供 trigger slot 时按 name 投影并标记 data-custom-trigger', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      const slot = queryA11y(el, 'slot[name="trigger"]') as HTMLSlotElement
      expect(slot?.assignedElements()).toHaveLength(1)

      const trigger = comboboxTrigger(el)
      expect(trigger.hasAttribute('data-custom-trigger')).toBe(true)

      cleanupElement(el)
    })

    it('默认用法不标记 data-custom-trigger，回退到默认 web-ui-input', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      expect(comboboxTrigger(el).hasAttribute('data-custom-trigger')).toBe(false)
      expect(defaultTrigger(el)).not.toBeNull()

      cleanupElement(el)
    })

    it('提供 trigger slot 时不再渲染默认 web-ui-input', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      expect(defaultTrigger(el)).toBeNull()

      cleanupElement(el)
    })

    it('wrapper 不占 tab 位：顺序焦点归触发器自身', async () => {
      const custom = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(custom)
      const fallback = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(fallback)

      // 默认触发器自带 tab 位（内部 input），自定义触发器的可聚焦性由消费者提供，
      // （README 契约）。包装 div 恒为 -1 只保留程序化聚焦：若在自定义触发器场景
      // 给 0，Tab 会先停在 wrapper 上、键入无处可去，再 Tab 才进触发器（双 tab 位）。
      expect(comboboxTrigger(custom).getAttribute('tabindex')).toBe('-1')
      expect(comboboxTrigger(fallback).getAttribute('tabindex')).toBe('-1')

      custom.disabled = true
      await waitForUpdate(custom)
      expect(comboboxTrigger(custom).getAttribute('tabindex')).toBe('-1')

      cleanupElement(custom)
      cleanupElement(fallback)
    })

    it('点击自定义触发器打开面板', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      customTrigger(el).click()
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      expect(comboboxTrigger(el).getAttribute('aria-expanded')).toBe('true')

      cleanupElement(el)
    })

    it('自定义触发器键入过滤候选并同步 value', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      typeIntoCustomTrigger(el, 'ban')
      await waitForUpdate(el)

      expect(el.value).toBe('ban')
      expect(el.open).toBe(true)
      expect(el.querySelectorAll('web-ui-option[data-filtered]')).toHaveLength(2)

      cleanupElement(el)
    })

    it('选择 option 后文本回写到自定义触发器', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      customTrigger(el).click()
      await waitForUpdate(el)
      ;(el.querySelector('web-ui-option') as HTMLElement).click()
      await waitForUpdate(el)

      expect(el.value).toBe('Apple')
      expect(el.selectedValue).toBe('apple')
      expect(el.open).toBe(false)
      expect(customTrigger(el).value).toBe('Apple')

      cleanupElement(el)
    })

    it('自定义触发器聚焦与失焦派发冒泡 focus/blur', async () => {
      const el = createCustomTrigger(TEXTAREA_TRIGGER)
      const [focusEvents] = spyEvents<FocusEvent>(el, 'focus')
      const [blurEvents] = spyEvents<FocusEvent>(el, 'blur')
      await waitForUpdate(el)

      const trigger = customTrigger(el)
      trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
      await waitForUpdate(el)
      expect(el.hasAttribute('focused')).toBe(true)

      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
      await waitForUpdate(el)
      expect(el.hasAttribute('focused')).toBe(false)

      // light DOM 触发器不跨 shadow 边界冒泡原生 focus/blur，宿主按契约补发
      expect(focusEvents).toHaveLength(1)
      expect(blurEvents).toHaveLength(1)

      cleanupElement(el)
    })

    it('自定义触发器补发的 focus/blur 透传 relatedTarget', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      const [focusEvents] = spyEvents<FocusEvent>(el, 'focus')
      const [blurEvents] = spyEvents<FocusEvent>(el, 'blur')
      await waitForUpdate(el)

      const outside = document.createElement('button')
      document.body.append(outside)

      const trigger = customTrigger(el)
      trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true, relatedTarget: outside }))
      await waitForUpdate(el)
      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: outside }))
      await waitForUpdate(el)

      expect(focusEvents).toHaveLength(1)
      expect(focusEvents[0].relatedTarget).toBe(outside)
      expect(blurEvents).toHaveLength(1)
      expect(blurEvents[0].relatedTarget).toBe(outside)

      cleanupElement(el)
      cleanupElement(outside)
    })

    it('键入不触发 change：触发器自身的补发 change 被拦在委托层', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      const [changeEvents] = spyEvents(el, 'change')
      await waitForUpdate(el)

      customTrigger(el).dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      await waitForUpdate(el)

      // 组件的 change 只表示「选中提交」，失焦即报 change 会误导消费端
      expect(changeEvents).toHaveLength(0)

      cleanupElement(el)
    })

    it('Escape 关闭自定义触发器面板', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      customTrigger(el).click()
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)

      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('多行触发器 Enter 保留换行语义，不选中高亮项', async () => {
      const el = createCustomTrigger(TEXTAREA_TRIGGER)
      await waitForUpdate(el)

      typeIntoCustomTrigger(el, 'Ap')
      await waitForUpdate(el)

      // 面板打开时方向键归 textarea 光标移动：不 preventDefault、不导航列表
      const arrowDown = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
        cancelable: true
      })
      customTrigger(el).shadowRoot!.querySelector<HTMLElement>('textarea')!.dispatchEvent(arrowDown)
      await waitForUpdate(el)
      expect(arrowDown.defaultPrevented).toBe(false)
      expect(comboboxTrigger(el).getAttribute('aria-activedescendant')).toBeFalsy()
      expect(el.open).toBe(true)

      pressKeyOnCustomTrigger(el, 'Enter')
      await waitForUpdate(el)

      // 面板保持打开、文本未被回填成候选 label：换行权归 textarea
      expect(el.open).toBe(true)
      expect(el.value).toBe('Ap')
      expect(el.selectedValue).toBe('')

      cleanupElement(el)
    })

    it('多行触发器面板关闭时方向键仍打开面板（键盘入口不依赖指针）', async () => {
      const el = createCustomTrigger(TEXTAREA_TRIGGER)
      await waitForUpdate(el)

      pressKeyOnCustomTrigger(el, 'ArrowDown')
      await waitForUpdate(el)
      expect(el.open).toBe(true)
      // 键盘入口打开时激活首项，aria-activedescendant 按契约回写
      expect(comboboxTrigger(el).getAttribute('aria-activedescendant')).toBeTruthy()

      pressKeyOnCustomTrigger(el, 'Escape')
      await waitForUpdate(el)
      expect(el.open).toBe(false)

      pressKeyOnCustomTrigger(el, 'ArrowUp')
      await waitForUpdate(el)
      expect(el.open).toBe(true)

      cleanupElement(el)
    })

    it('单行自定义触发器 Enter 仍选中高亮项', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      typeIntoCustomTrigger(el, 'Ap')
      await waitForUpdate(el)
      pressKeyOnCustomTrigger(el, 'ArrowDown')
      await waitForUpdate(el)
      pressKeyOnCustomTrigger(el, 'Enter')
      await waitForUpdate(el)

      expect(el.value).toBe('Apple')
      expect(el.selectedValue).toBe('apple')
      expect(el.open).toBe(false)

      cleanupElement(el)
    })

    it('portal 打开时不迁移 trigger slot 内容，关闭后仍是宿主第一个子元素', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      el.portal = true
      await waitForUpdate(el)

      customTrigger(el).click()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await waitForUpdate(el)

      expect(el.open).toBe(true)
      const triggerEl = customTrigger(el)
      expect(triggerEl.parentElement).toBe(el)
      expect(el.firstElementChild).toBe(triggerEl)

      document.body.click()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await waitForUpdate(el)

      expect(el.open).toBe(false)
      expect(triggerEl.parentElement).toBe(el)
      expect(el.firstElementChild).toBe(triggerEl)

      cleanupElement(el)
    })
  })

  /*
   * 公共 focus()/blur()（README Methods 契约）：焦点必须落到当前生效的触发器，
   * 而不是停在宿主或包装 div。默认触发器经 web-ui-input 的公共 focus() 落到内部
   * input；自定义触发器按其自身能力聚焦（web-ui-textarea 落到内部 textarea）。
   * jsdom 与真实浏览器口径一致：聚焦 shadow 内元素后 document.activeElement
   * retarget 成宿主，因此默认触发器额外断言内部 input 真的拿到焦点。
   */
  describe('公共 focus()/blur() 委托', () => {
    const INPUT_TRIGGER = '<web-ui-input slot="trigger"></web-ui-input>'
    const TEXTAREA_TRIGGER = '<web-ui-textarea slot="trigger"></web-ui-textarea>'
    const customTriggerInner = (el: WebUiAutocomplete): HTMLElement =>
      customTrigger(el).shadowRoot!.querySelector<HTMLElement>('input, textarea')!

    it('默认触发器：focus() 落到内部 input，blur() 后失焦', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      el.focus()
      await waitForUpdate(el)

      expect(defaultTrigger(el).shadowRoot?.activeElement).toBe(triggerInput(el))
      expect(document.activeElement).toBe(el)
      expect(el.hasAttribute('focused')).toBe(true)

      el.blur()
      await waitForUpdate(el)

      expect(defaultTrigger(el).shadowRoot?.activeElement).toBeNull()
      expect(document.activeElement).not.toBe(el)
      expect(el.hasAttribute('focused')).toBe(false)

      cleanupElement(el)
    })

    it('input 自定义触发器：focus() 落到触发器内部 input', async () => {
      const el = createCustomTrigger(INPUT_TRIGGER)
      await waitForUpdate(el)

      el.focus()
      await waitForUpdate(el)

      expect(document.activeElement).toBe(customTrigger(el))
      expect(customTrigger(el).shadowRoot?.activeElement).toBe(customTriggerInner(el))
      expect(el.hasAttribute('focused')).toBe(true)

      el.blur()
      await waitForUpdate(el)

      expect(customTrigger(el).shadowRoot?.activeElement).toBeNull()
      expect(el.hasAttribute('focused')).toBe(false)

      cleanupElement(el)
    })

    it('textarea 自定义触发器：focus() 落到触发器内部 textarea', async () => {
      const el = createCustomTrigger(TEXTAREA_TRIGGER)
      await waitForUpdate(el)

      el.focus()
      await waitForUpdate(el)

      expect(document.activeElement).toBe(customTrigger(el))
      expect(customTriggerInner(el).tagName).toBe('TEXTAREA')
      expect(el.hasAttribute('focused')).toBe(true)

      el.blur()
      await waitForUpdate(el)

      expect(el.hasAttribute('focused')).toBe(false)

      cleanupElement(el)
    })

    it('触发器切换后 focus() 委托跟随当前生效触发器', async () => {
      const el = createAutocomplete(OPTIONS_HTML)
      await waitForUpdate(el)

      el.focus()
      await waitForUpdate(el)
      expect(defaultTrigger(el).shadowRoot?.activeElement).toBe(triggerInput(el))

      el.innerHTML = `${TEXTAREA_TRIGGER}${OPTIONS_HTML}`
      await flushSlotChange(el)

      el.focus()
      await waitForUpdate(el)
      expect(document.activeElement).toBe(customTrigger(el))
      expect(customTriggerInner(el).tagName).toBe('TEXTAREA')

      el.innerHTML = OPTIONS_HTML
      await flushSlotChange(el)

      el.focus()
      await waitForUpdate(el)
      expect(document.activeElement).toBe(el)
      expect(defaultTrigger(el).shadowRoot?.activeElement).toBe(triggerInput(el))

      cleanupElement(el)
    })

    it('disabled 时 focus() 不移动焦点', async () => {
      const el = createAutocomplete(OPTIONS_HTML, { disabled: '' })
      await waitForUpdate(el)

      el.focus()
      await waitForUpdate(el)

      expect(document.activeElement).not.toBe(el)
      expect(defaultTrigger(el).shadowRoot?.activeElement).toBeNull()
      expect(el.hasAttribute('focused')).toBe(false)

      cleanupElement(el)
    })
  })

  /*
   * 只读/禁用态下 Escape 必须被吞掉（Q14 语义）：既不关掉本层，也不落到下层浮层。
   * 本用例是全套 autocomplete 测试里**唯一**覆盖这条契约的 —— 把 `_syncOverlayInert()`
   * 的方法体整条停掉后，只有它转红（其余 96 例全绿）。
   *
   * 附带实测结论：`_reconfigureOverlay()` 末尾那次重推目前是**冗余**的（摘掉那行本用例仍绿）
   * —— 这条路径后面跟着一轮渲染，而 `updated()` 每次渲染都会调 `_syncOverlayInert()`。
   * 保留它是为了不依赖「这条路径必然跟着一次渲染」这个隐含前提。
   */
  it('只读中 portal 变更后 Escape 仍不关闭：reconfigure 换会话不得丢掉只读态', async () => {
    const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

    const el = createAutocomplete(OPTIONS_HTML)
    await waitForUpdate(el)
    focusTriggerInput(el)
    await waitForUpdate(el)
    clickTrigger(el)
    await waitForUpdate(el)
    expect(el.open).toBe(true)

    el.readonly = true
    await waitForUpdate(el)

    el.portal = true
    await waitForUpdate(el)
    await nextFrame()
    await nextFrame()
    await waitForUpdate(el)
    expect(el.open).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await waitForUpdate(el)
    expect(el.open).toBe(true)

    cleanupElement(el)
  })
})
