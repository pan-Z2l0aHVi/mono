import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '../../theme'
import { getPortalPanel } from '@/shared/test-utils'

import type { WebUiSelect } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiSelect 组件（浏览器）', () => {
  it('Portal 面板在 theme 作用域内挂载到 theme 自己的 overlay root', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.className = 'block'
    const select = document.createElement('web-ui-select')
    select.portal = true
    select.innerHTML = '<web-ui-option value="apple">Apple</web-ui-option>'
    theme.append(select)
    document.body.append(theme)
    await theme.updateComplete
    await select.updateComplete

    select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')?.click()
    await new Promise(resolve => requestAnimationFrame(resolve))
    await select.updateComplete

    expect(select.open).toBe(true)
    const host = theme.getOverlayRoot()?.firstElementChild as HTMLElement | null | undefined
    expect(host?.shadowRoot?.querySelector('[role="listbox"]'), '面板应挂在 theme 拥有的 overlay root').not.toBeNull()
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

    const panel = getPortalPanel('listbox')
    expect(select.open).toBe(true)
    expect(panel?.hasAttribute('hidden')).toBe(false)
    expect(panel?.querySelector('web-ui-option')).not.toBeNull()
  })

  it('required 且无值时 checkValidity 应为 false，选中后为 true', async () => {
    const select = document.createElement('web-ui-select')
    select.required = true
    select.name = 'fruit'
    select.innerHTML = '<web-ui-option value="apple">Apple</web-ui-option>'
    const form = document.createElement('form')
    form.append(select)
    document.body.append(form)
    await select.updateComplete

    expect(form.checkValidity()).toBe(false)

    select.value = 'apple'
    await select.updateComplete
    expect(form.checkValidity()).toBe(true)
  })

  it('disabled 时 required 不阻塞有效性', async () => {
    const select = document.createElement('web-ui-select')
    select.required = true
    select.disabled = true
    const form = document.createElement('form')
    form.append(select)
    document.body.append(form)
    await select.updateComplete

    expect(form.checkValidity()).toBe(true)
  })
})
