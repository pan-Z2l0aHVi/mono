import { afterEach, describe, expect, it } from 'vite-plus/test'

import '../checkbox'
import '../checkbox-group'
import '../input'
import '../input-number'
import '../option'
import '../radio'
import '../radio-group'
import '../segmented'
import '../segmented-trigger'
import '../select'
import '../slider'
import '../switch'
import '../textarea'
import type { WebUiCheckbox } from '../checkbox'
import type { WebUiInput } from '../input'
import type { WebUiInputNumber } from '../input-number'
import type { WebUiRadio } from '../radio'
import type { WebUiSelect } from '../select'
import type { WebUiSwitch } from '../switch'

afterEach(() => document.body.replaceChildren())

const appendFormControl = <T extends HTMLElement>(tagName: string): [HTMLFormElement, T] => {
  const form = document.createElement('form')
  const control = document.createElement(tagName) as T
  form.append(control)
  document.body.append(form)
  return [form, control]
}

type FormAssociatedControl = HTMLElement & { updateComplete: Promise<unknown> }

describe('表单关联组件（浏览器）', () => {
  it('仅在提供 name 时提交文本和数值', async () => {
    const cases: Array<[string, string, string | number]> = [
      ['web-ui-input', 'query', 'search'],
      ['web-ui-textarea', 'bio', 'hello world'],
      ['web-ui-input-number', 'age', 25]
    ]

    for (const [tagName, name, value] of cases) {
      const [form, control] = appendFormControl<
        HTMLElement & { name: string; value: string | number; updateComplete: Promise<unknown> }
      >(tagName)
      control.name = name
      control.value = value
      await control.updateComplete

      expect(new FormData(form).get(name)).toBe(String(value))
    }

    const [form, input] = appendFormControl<WebUiInput>('web-ui-input')
    input.value = 'not-submitted'
    await input.updateComplete

    expect([...new FormData(form).keys()]).toHaveLength(0)
  })

  it('仅在选中时提交可勾选控件值，并恢复声明初始状态', async () => {
    const cases: Array<[string, string]> = [
      ['web-ui-checkbox', 'agree'],
      ['web-ui-radio', 'gender'],
      ['web-ui-switch', 'enabled']
    ]

    for (const [tagName, name] of cases) {
      const [form, control] = appendFormControl<
        HTMLElement & { name: string; value: string; checked: boolean; updateComplete: Promise<unknown> }
      >(tagName)
      control.name = name
      control.value = 'yes'
      control.checked = true
      await control.updateComplete

      expect(new FormData(form).get(name)).toBe('yes')

      control.checked = false
      await control.updateComplete
      expect(new FormData(form).get(name)).toBeNull()
    }

    const resetCases: Array<[HTMLFormElement, WebUiCheckbox | WebUiRadio | WebUiSwitch]> = [
      appendFormControl<WebUiCheckbox>('web-ui-checkbox'),
      appendFormControl<WebUiRadio>('web-ui-radio'),
      appendFormControl<WebUiSwitch>('web-ui-switch')
    ]

    for (const [form, control] of resetCases) {
      control.setAttribute('checked', '')
      await control.updateComplete
      control.checked = false
      await control.updateComplete

      form.reset()
      await control.updateComplete
      expect(control.checked).toBe(true)
    }
  })

  it('未提供 value 的已选控件使用原生 on 回退值', async () => {
    const [form, checkbox] = appendFormControl<WebUiCheckbox>('web-ui-checkbox')
    checkbox.name = 'agree'
    checkbox.checked = true
    await checkbox.updateComplete

    expect(new FormData(form).get('agree')).toBe('on')
  })

  it('Checkbox Group 和 Radio Group 提交值时不产生子项重复条目', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-checkbox-group name="hobbies" value="a,b">
        <web-ui-checkbox value="a"></web-ui-checkbox>
        <web-ui-checkbox value="b"></web-ui-checkbox>
      </web-ui-checkbox-group>
      <web-ui-radio-group name="gender" value="b">
        <web-ui-radio value="a"></web-ui-radio>
        <web-ui-radio value="b"></web-ui-radio>
      </web-ui-radio-group>
    `
    document.body.append(form)

    const checkboxGroup = form.querySelector('web-ui-checkbox-group')!
    const radioGroup = form.querySelector('web-ui-radio-group')!
    await Promise.all([checkboxGroup.updateComplete, radioGroup.updateComplete])

    const data = new FormData(form)
    expect(data.getAll('hobbies')).toEqual(['a', 'b'])
    expect(data.get('gender')).toBe('b')
    expect(data.get('a')).toBeNull()
  })

  it('fieldset 禁用变化不改写 Group 的公开 disabled 属性', async () => {
    const cases = [
      ['web-ui-checkbox-group', 'feature'],
      ['web-ui-radio-group', 'choice']
    ] as const

    for (const [tagName, name] of cases) {
      const form = document.createElement('form')
      const fieldset = document.createElement('fieldset')
      const group = document.createElement(tagName) as FormAssociatedControl
      fieldset.disabled = true
      group.setAttribute('name', name)
      group.setAttribute('required', '')
      fieldset.append(group)
      form.append(fieldset)
      document.body.append(form)
      await group.updateComplete

      expect(group.hasAttribute('disabled')).toBe(false)
      expect(form.checkValidity()).toBe(true)

      fieldset.disabled = false
      await group.updateComplete

      expect(group.hasAttribute('disabled')).toBe(false)
      expect(form.checkValidity()).toBe(false)

      form.remove()
    }
  })

  it('提交 Select、Slider 和 Segmented 的值', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-select name="fruit"><web-ui-option value="banana">Banana</web-ui-option></web-ui-select>
      <web-ui-slider name="volume"></web-ui-slider>
      <web-ui-segmented name="choice"><web-ui-segmented-trigger value="b">B</web-ui-segmented-trigger></web-ui-segmented>
    `
    document.body.append(form)

    const select = form.querySelector('web-ui-select')!
    const slider = form.querySelector('web-ui-slider')!
    const segmented = form.querySelector('web-ui-segmented')!
    select.value = 'banana'
    slider.value = 42
    segmented.value = 'b'
    await Promise.all([select.updateComplete, slider.updateComplete, segmented.updateComplete])

    const data = new FormData(form)
    expect(data.get('fruit')).toBe('banana')
    expect(data.get('volume')).toBe('42')
    expect(data.get('choice')).toBe('b')
  })

  it('通过原生表单生命周期将 Select 重置为初始值', async () => {
    const [form, select] = appendFormControl<WebUiSelect>('web-ui-select')
    select.name = 'fruit'
    select.innerHTML = '<web-ui-option value="banana">Banana</web-ui-option>'
    select.value = 'banana'
    await select.updateComplete

    form.reset()
    await select.updateComplete

    expect(select.value).toBe('')
  })

  it('不提交未提供 name 的控件', async () => {
    const [form, input] = appendFormControl<WebUiInputNumber>('web-ui-input-number')
    input.value = 42
    await input.updateComplete

    expect([...new FormData(form).keys()]).toHaveLength(0)
  })
  it('离开 Checkbox Group 的子项恢复自身表单提交', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-checkbox-group name="hobbies" value="a">
        <web-ui-checkbox name="solo" value="a"></web-ui-checkbox>
      </web-ui-checkbox-group>
    `
    document.body.append(form)

    const group = form.querySelector('web-ui-checkbox-group')!
    const checkbox = form.querySelector<WebUiCheckbox>('web-ui-checkbox')!
    await Promise.all([group.updateComplete, checkbox.updateComplete])

    const slot = group.shadowRoot!.querySelector('slot')!
    const slotChanged = new Promise<void>(resolve =>
      slot.addEventListener('slotchange', () => resolve(), { once: true })
    )
    form.append(checkbox)
    await slotChanged
    await checkbox.updateComplete

    expect(new FormData(form).get('solo')).toBe('a')
  })
})
