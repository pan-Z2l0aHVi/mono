import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiSelect } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiSelect browser', () => {
  it('点击 option 的 prefix 装饰时选择所属 option', async () => {
    const select = document.createElement('web-ui-select') as WebUiSelect
    select.innerHTML = '<web-ui-option value="apple" label="Apple"><span slot="prefix">P</span></web-ui-option>'
    document.body.append(select)
    await select.updateComplete

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
    expect(trigger).toBeTruthy()
    trigger?.click()
    await select.updateComplete

    const prefix = select.querySelector<HTMLElement>('[slot="prefix"]')!
    prefix.click()
    await select.updateComplete

    expect(select.value).toBe('apple')
    expect(select.open).toBe(false)
  })
})
