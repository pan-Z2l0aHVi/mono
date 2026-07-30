import { afterEach, describe, expect, it } from 'vite-plus/test'

import '../../checkbox'
import '..'
import type { WebUiCheckboxGroup } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiCheckboxGroup form association', () => {
  it('submits one entry per selected value without child duplicates', async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <web-ui-checkbox-group name="feature" value="a,b">
        <web-ui-checkbox value="a">A</web-ui-checkbox>
        <web-ui-checkbox value="b">B</web-ui-checkbox>
      </web-ui-checkbox-group>
    `
    document.body.append(form)

    const group = form.querySelector('web-ui-checkbox-group') as WebUiCheckboxGroup
    await group.updateComplete

    expect(new FormData(form).getAll('feature')).toEqual(['a', 'b'])
  })

  it('restores inherited fieldset disabled state without changing the host attribute', async () => {
    const form = document.createElement('form')
    const fieldset = document.createElement('fieldset')
    fieldset.disabled = true
    fieldset.innerHTML = '<web-ui-checkbox-group name="feature" required></web-ui-checkbox-group>'
    form.append(fieldset)
    document.body.append(form)

    const group = fieldset.querySelector('web-ui-checkbox-group') as WebUiCheckboxGroup
    await group.updateComplete

    expect(group.hasAttribute('disabled')).toBe(false)
    expect(form.checkValidity()).toBe(true)

    fieldset.disabled = false
    await group.updateComplete

    expect(group.hasAttribute('disabled')).toBe(false)
    expect(form.checkValidity()).toBe(false)
  })
})
