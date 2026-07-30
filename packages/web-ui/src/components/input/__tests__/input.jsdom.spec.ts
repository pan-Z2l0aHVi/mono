import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiInput } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiInput jsdom contract', () => {
  it('reads the declarative value attribute through the public value property', async () => {
    const input = document.createElement('web-ui-input') as WebUiInput
    input.setAttribute('value', 'foo')
    document.body.append(input)
    await input.updateComplete

    expect(input.value).toBe('foo')
  })
})
