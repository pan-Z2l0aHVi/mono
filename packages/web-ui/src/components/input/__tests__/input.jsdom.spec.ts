import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiInput } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiInput jsdom 契约', () => {
  it('通过公开 value 属性读取声明式 value 属性', async () => {
    const input = document.createElement('web-ui-input')
    input.setAttribute('value', 'foo')
    document.body.append(input)
    await input.updateComplete

    expect(input.value).toBe('foo')
  })
})
