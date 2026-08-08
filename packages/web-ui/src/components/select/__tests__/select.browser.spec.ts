import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '../../theme'
import type { WebUiSelect } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiSelect 组件（浏览器）', () => {
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
    expect(panel?.querySelector(':scope > .select-scroll > .select-content web-ui-option')).toBeTruthy()
  })

  it('主题作用域内打开 Portal Select 不撑开 overlay 容器', async () => {
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

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
    trigger?.click()
    await new Promise(resolve => requestAnimationFrame(resolve))
    await select.updateComplete

    const overlayContainer = theme.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
    const portalHost = overlayContainer?.firstElementChild as HTMLElement | null
    expect(select.open).toBe(true)
    expect(overlayContainer).toBeTruthy()
    expect(overlayContainer?.getBoundingClientRect().height).toBe(0)
    expect(portalHost).toBeTruthy()
    expect(getComputedStyle(portalHost!).display).toBe('contents')
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
