import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiSelect } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiSelect（浏览器）', () => {
  it('点击 option 的 prefix 装饰时选择所属 option', async () => {
    const select = document.createElement('web-ui-select')
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

  it('退出过渡隐藏前重新打开 Portal 面板', async () => {
    const select = document.createElement('web-ui-select')
    select.portal = true
    select.innerHTML = '<web-ui-option value="apple">Apple</web-ui-option>'
    document.body.append(select)
    await select.updateComplete

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
    trigger?.click()
    await new Promise(resolve => requestAnimationFrame(resolve))

    document.body.click()
    await select.updateComplete
    trigger?.click()
    await new Promise(resolve => requestAnimationFrame(resolve))

    const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
    const portalHost = root?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
    const panel = portalHost?.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]')
    expect(select.open).toBe(true)
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })
})
