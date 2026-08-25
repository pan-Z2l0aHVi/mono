import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/autocomplete'
import '@/components/checkbox'
import '@/components/checkbox-group'
import '@/components/input'
import '@/components/input-number'
import '@/components/option'
import '@/components/radio'
import '@/components/radio-group'
import '@/components/segmented'
import '@/components/segmented-trigger'
import '@/components/select'
import '@/components/slider'
import '@/components/switch'
import '@/components/textarea'
import type { WebUiCheckbox } from '@/components/checkbox'
import type { WebUiInput } from '@/components/input'
import type { WebUiInputNumber } from '@/components/input-number'
import type { WebUiRadio } from '@/components/radio'
import type { WebUiSelect } from '@/components/select'
import type { WebUiSwitch } from '@/components/switch'

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

    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-checkbox checked></web-ui-checkbox>
      <web-ui-radio checked></web-ui-radio>
      <web-ui-switch checked></web-ui-switch>
    `
    document.body.append(form)
    const resetCases = [
      form.querySelector<WebUiCheckbox>('web-ui-checkbox')!,
      form.querySelector<WebUiRadio>('web-ui-radio')!,
      form.querySelector<WebUiSwitch>('web-ui-switch')!
    ]
    await Promise.all(resetCases.map(control => control.updateComplete))

    for (const control of resetCases) control.checked = false
    await Promise.all(resetCases.map(control => control.updateComplete))

    form.reset()
    await Promise.all(resetCases.map(control => control.updateComplete))
    for (const control of resetCases) expect(control.checked).toBe(true)
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

  it('在首次连接后为全部表单控件保留声明式默认值', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-input value="initial input"></web-ui-input>
      <web-ui-textarea value="initial textarea"></web-ui-textarea>
      <web-ui-input-number value="7"></web-ui-input-number>
      <web-ui-select value="apple"><web-ui-option value="apple">Apple</web-ui-option></web-ui-select>
      <web-ui-autocomplete value="initial autocomplete"></web-ui-autocomplete>
      <web-ui-slider value="8"></web-ui-slider>
      <web-ui-checkbox checked></web-ui-checkbox>
      <web-ui-radio checked></web-ui-radio>
      <web-ui-switch checked></web-ui-switch>
      <web-ui-checkbox-group value="a"><web-ui-checkbox value="a"></web-ui-checkbox></web-ui-checkbox-group>
      <web-ui-radio-group value="a"><web-ui-radio value="a"></web-ui-radio></web-ui-radio-group>
      <web-ui-segmented value="a"><web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger></web-ui-segmented>
    `
    document.body.append(form)

    const input = form.querySelector<WebUiInput>('web-ui-input')!
    const textarea = form.querySelector<HTMLElement & { value: string; updateComplete: Promise<unknown> }>(
      'web-ui-textarea'
    )!
    const inputNumber = form.querySelector<WebUiInputNumber>('web-ui-input-number')!
    const select = form.querySelector<WebUiSelect>('web-ui-select')!
    const autocomplete = form.querySelector<HTMLElement & { value: string; updateComplete: Promise<unknown> }>(
      'web-ui-autocomplete'
    )!
    const slider = form.querySelector<HTMLElement & { value: number; updateComplete: Promise<unknown> }>(
      'web-ui-slider'
    )!
    const checkbox = form.querySelector<WebUiCheckbox>('web-ui-checkbox')!
    const radio = form.querySelector<WebUiRadio>('web-ui-radio')!
    const switchControl = form.querySelector<WebUiSwitch>('web-ui-switch')!
    const checkboxGroup = form.querySelector<HTMLElement & { value: string[]; updateComplete: Promise<unknown> }>(
      'web-ui-checkbox-group'
    )!
    const radioGroup = form.querySelector<HTMLElement & { value: string; updateComplete: Promise<unknown> }>(
      'web-ui-radio-group'
    )!
    const segmented = form.querySelector<HTMLElement & { value: string; updateComplete: Promise<unknown> }>(
      'web-ui-segmented'
    )!
    const controls = [
      input,
      textarea,
      inputNumber,
      select,
      autocomplete,
      slider,
      checkbox,
      radio,
      switchControl,
      checkboxGroup,
      radioGroup,
      segmented
    ]
    await Promise.all(controls.map(control => control.updateComplete))

    input.value = 'changed input'
    textarea.value = 'changed textarea'
    inputNumber.value = 9
    select.value = 'pear'
    autocomplete.value = 'changed autocomplete'
    slider.value = 10
    checkbox.checked = false
    radio.checked = false
    switchControl.checked = false
    checkboxGroup.value = []
    radioGroup.value = ''
    segmented.value = ''
    await Promise.all(controls.map(control => control.updateComplete))

    form.reset()
    await Promise.all(controls.map(control => control.updateComplete))

    expect(input.value).toBe('initial input')
    expect(textarea.value).toBe('initial textarea')
    expect(inputNumber.value).toBe(7)
    expect(select.value).toBe('apple')
    expect(autocomplete.value).toBe('initial autocomplete')
    expect(slider.value).toBe(8)
    expect(checkbox.checked).toBe(true)
    expect(radio.checked).toBe(true)
    expect(switchControl.checked).toBe(true)
    expect(checkboxGroup.value).toEqual(['a'])
    expect(radioGroup.value).toBe('a')
    expect(segmented.value).toBe('a')
  })

  it('通过表单状态恢复回调恢复全部控件的序列化状态', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-input></web-ui-input><web-ui-textarea></web-ui-textarea><web-ui-input-number></web-ui-input-number>
      <web-ui-select><web-ui-option value="apple">Apple</web-ui-option></web-ui-select><web-ui-autocomplete></web-ui-autocomplete><web-ui-slider></web-ui-slider>
      <web-ui-checkbox></web-ui-checkbox><web-ui-radio></web-ui-radio><web-ui-switch></web-ui-switch>
      <web-ui-checkbox-group><web-ui-checkbox value="a"></web-ui-checkbox></web-ui-checkbox-group>
      <web-ui-radio-group><web-ui-radio value="a"></web-ui-radio></web-ui-radio-group>
      <web-ui-segmented><web-ui-segmented-trigger value="a">A</web-ui-segmented-trigger></web-ui-segmented>
    `
    document.body.append(form)

    const controls = Array.from(form.children) as Array<
      HTMLElement & {
        formStateRestoreCallback(state: string): void
        updateComplete: Promise<unknown>
      }
    >
    await Promise.all(controls.map(control => control.updateComplete))

    const states = ['input', 'textarea', '12', 'apple', 'autocomplete', '14', 'true', 'true', 'true', '["a"]', 'a', 'a']
    controls.forEach((control, index) => control.formStateRestoreCallback(states[index]!))
    await Promise.all(controls.map(control => control.updateComplete))

    const restored = controls.map(control => {
      const formControl = control as HTMLElement & { value?: unknown; checked?: unknown }
      return { value: formControl.value, checked: formControl.checked }
    })

    expect((controls[0] as WebUiInput).value).toBe('input')
    expect(restored[1]?.value).toBe('textarea')
    expect((controls[2] as WebUiInputNumber).value).toBe(12)
    expect((controls[3] as WebUiSelect).value).toBe('apple')
    expect(restored[4]?.value).toBe('autocomplete')
    expect(restored[5]?.value).toBe(14)
    expect((controls[6] as WebUiCheckbox).checked).toBe(true)
    expect((controls[7] as WebUiRadio).checked).toBe(true)
    expect((controls[8] as WebUiSwitch).checked).toBe(true)
    expect(restored[9]?.value).toEqual(['a'])
    expect(restored[10]?.value).toBe('a')
    expect(restored[11]?.value).toBe('a')
  })

  it('重连不重复 attachInternals，也不覆盖首次连接后的当前值或默认值', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-input value="initial"></web-ui-input>'
    document.body.append(form)
    const input = form.querySelector<WebUiInput>('web-ui-input')!
    await input.updateComplete

    input.value = 'current'
    await input.updateComplete
    const fieldset = document.createElement('fieldset')
    form.append(fieldset)
    fieldset.append(input)
    await input.updateComplete

    expect(input.value).toBe('current')
    form.reset()
    await input.updateComplete
    expect(input.value).toBe('initial')
  })

  it('由 Group 管理的 checkbox 和 radio 忽略独立状态恢复', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-checkbox-group value="a"><web-ui-checkbox value="a"></web-ui-checkbox></web-ui-checkbox-group>
      <web-ui-radio-group value="a"><web-ui-radio value="a"></web-ui-radio></web-ui-radio-group>
    `
    document.body.append(form)
    const checkbox = form.querySelector<WebUiCheckbox>('web-ui-checkbox')!
    const radio = form.querySelector<WebUiRadio>('web-ui-radio')!
    await Promise.all([checkbox.updateComplete, radio.updateComplete])

    checkbox.formStateRestoreCallback('false')
    radio.formStateRestoreCallback('false')
    await Promise.all([checkbox.updateComplete, radio.updateComplete])

    expect(checkbox.checked).toBe(true)
    expect(radio.checked).toBe(true)
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
