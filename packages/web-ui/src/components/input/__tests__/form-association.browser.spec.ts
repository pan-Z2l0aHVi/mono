import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiInput } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiInput form association', () => {
  it('uses the declarative value for rendering and FormData', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-input name="title" value="foo"></web-ui-input>'
    document.body.append(form)

    const input = form.querySelector('web-ui-input')!
    await input.updateComplete

    expect(input.value).toBe('foo')
    expect(new FormData(form).get('title')).toBe('foo')
  })
})
