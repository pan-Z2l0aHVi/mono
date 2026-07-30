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

describe('form-associated components', () => {
  it('submits text and numeric values only when a name is provided', async () => {
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

  it('submits checkable values only when checked and restores their declarative initial state', async () => {
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

  it('uses the native on fallback for checked controls without a value', async () => {
    const [form, checkbox] = appendFormControl<WebUiCheckbox>('web-ui-checkbox')
    checkbox.name = 'agree'
    checkbox.checked = true
    await checkbox.updateComplete

    expect(new FormData(form).get('agree')).toBe('on')
  })

  it('submits checkbox and radio group values without child entries', async () => {
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

    const checkboxGroup = form.querySelector('web-ui-checkbox-group') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    const radioGroup = form.querySelector('web-ui-radio-group') as HTMLElement & { updateComplete: Promise<unknown> }
    await Promise.all([checkboxGroup.updateComplete, radioGroup.updateComplete])

    const data = new FormData(form)
    expect(data.getAll('hobbies')).toEqual(['a', 'b'])
    expect(data.get('gender')).toBe('b')
    expect(data.get('a')).toBeNull()
  })

  it('submits select, slider, and segmented values', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-select name="fruit"><web-ui-option value="banana">Banana</web-ui-option></web-ui-select>
      <web-ui-slider name="volume"></web-ui-slider>
      <web-ui-segmented name="choice"><web-ui-segmented-trigger value="b">B</web-ui-segmented-trigger></web-ui-segmented>
    `
    document.body.append(form)

    const select = form.querySelector('web-ui-select') as WebUiSelect
    const slider = form.querySelector('web-ui-slider') as HTMLElement & {
      value: number
      updateComplete: Promise<unknown>
    }
    const segmented = form.querySelector('web-ui-segmented') as HTMLElement & {
      value: string
      updateComplete: Promise<unknown>
    }
    select.value = 'banana'
    slider.value = 42
    segmented.value = 'b'
    await Promise.all([select.updateComplete, slider.updateComplete, segmented.updateComplete])

    const data = new FormData(form)
    expect(data.get('fruit')).toBe('banana')
    expect(data.get('volume')).toBe('42')
    expect(data.get('choice')).toBe('b')
  })

  it('resets a select to its initial value through the native form lifecycle', async () => {
    const [form, select] = appendFormControl<WebUiSelect>('web-ui-select')
    select.name = 'fruit'
    select.innerHTML = '<web-ui-option value="banana">Banana</web-ui-option>'
    select.value = 'banana'
    await select.updateComplete

    form.reset()
    await select.updateComplete

    expect(select.value).toBe('')
  })

  it('does not submit controls without a name', async () => {
    const [form, input] = appendFormControl<WebUiInputNumber>('web-ui-input-number')
    input.value = 42
    await input.updateComplete

    expect([...new FormData(form).keys()]).toHaveLength(0)
  })
})
