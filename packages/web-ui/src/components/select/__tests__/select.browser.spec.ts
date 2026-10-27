import '..'
import '../../theme'
import '@/components/option'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { getPortalPanel, pollUntil } from '@/shared/test-utils'

import type { WebUiSelect } from '..'

afterEach(() => document.body.replaceChildren())

// 无头浏览器的静止光标位于视口左上角；关闭或展开 overlay 时，Chrome 可能在光标下
// 重算 hover 并给 option 派发 pointerover，干扰纯键盘状态断言。这个用例不验证指针，
// 因此挂载点隔离真实指针命中，同时保留程序化聚焦与键盘输入。
const mountKeyboardIsolated = () => {
  const mountPoint = document.createElement('div')
  mountPoint.style.pointerEvents = 'none'
  document.body.append(mountPoint)
  return mountPoint
}

describe('WebUiSelect 组件（浏览器）', () => {
  it('host aria-label gives the combobox an accessible name', async () => {
    const select = document.createElement('web-ui-select')
    select.setAttribute('aria-label', 'Global theme')
    document.body.append(select)
    await select.updateComplete

    const root = page.elementLocator(select)
    expect(root.getByRole('combobox', { name: 'Global theme' }).length).toBe(1)
  })

  it('真实键盘输入可打开、导航、typeahead 并提交选择', async () => {
    const mountPoint = mountKeyboardIsolated()
    const select = document.createElement('web-ui-select')
    select.value = 'svelte'
    select.innerHTML = `
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    `
    mountPoint.append(select)
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
    const activeValue = () => {
      const activeId = trigger.getAttribute('aria-activedescendant')
      return Array.from(select.querySelectorAll('web-ui-option'))
        .find(option => option.id === activeId)
        ?.getAttribute('value')
    }

    trigger.focus()
    await userEvent.keyboard('{Enter}')
    await select.updateComplete
    expect(select.open).toBe(true)

    await userEvent.keyboard('{Home}')
    await select.updateComplete
    expect(activeValue()).toBe('vue')

    await userEvent.keyboard('{End}')
    await select.updateComplete
    expect(activeValue()).toBe('svelte')

    await userEvent.keyboard('r')
    await select.updateComplete
    expect(activeValue()).toBe('react')
    expect(select.value).toBe('svelte')

    await userEvent.keyboard('{Enter}')
    await select.updateComplete
    expect(select.value).toBe('react')
    expect(select.open).toBe(false)

    await userEvent.keyboard(' ')
    await select.updateComplete
    expect(select.open).toBe(true)

    await userEvent.keyboard(' ')
    await select.updateComplete
    expect(select.value).toBe('react')
    expect(select.open).toBe(false)
  })

  it.each([
    { name: 'Space', key: ' ' },
    { name: 'Enter', key: 'Enter' }
  ])('按住 $name 时忽略重复 keydown，不提交未选择的首项', async ({ key }) => {
    const mountPoint = mountKeyboardIsolated()
    const select = document.createElement('web-ui-select')
    select.innerHTML = `
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
    `
    mountPoint.append(select)
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
    const openEvents: CustomEvent<{ open: boolean }>[] = []
    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    select.addEventListener('open-change', event => openEvents.push(event as CustomEvent<{ open: boolean }>))
    select.addEventListener('input', event => inputEvents.push(event))
    select.addEventListener('change', event => changeEvents.push(event))

    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true }))
    await select.updateComplete

    expect(select.open).toBe(true)
    expect(select.value).toBe('')
    expect(openEvents.map(event => event.detail.open)).toEqual([true])

    const dispatchRepeatedKeydown = () =>
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, composed: true, repeat: true })
      )
    dispatchRepeatedKeydown()
    await select.updateComplete

    expect(select.open).toBe(true)
    expect(select.value).toBe('')

    for (let index = 1; index < 30; index++) dispatchRepeatedKeydown()
    await select.updateComplete

    expect(select.open).toBe(true)
    expect(select.value).toBe('')
    expect(openEvents.map(event => event.detail.open)).toEqual([true])
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
  })

  it('Portal panel 在 theme 作用域内挂载到 theme 自己的 overlay root', async () => {
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
    await pollUntil(
      () => Boolean(theme.getOverlayRoot()?.firstElementChild?.shadowRoot?.querySelector('[role="listbox"]')),
      'portal 面板没有挂载到 theme 的 overlay root'
    )
    await select.updateComplete

    expect(select.open).toBe(true)
    const host = theme.getOverlayRoot()?.firstElementChild as HTMLElement | null | undefined
    expect(host?.shadowRoot?.querySelector('[role="listbox"]'), 'panel 应挂在 theme 拥有的 overlay root').not.toBeNull()
  })

  it('退出过渡隐藏前重新打开 Portal panel', async () => {
    const select = document.createElement('web-ui-select')
    select.portal = true
    select.innerHTML = '<web-ui-option value="apple">Apple</web-ui-option>'
    document.body.append(select)
    await select.updateComplete

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
    trigger?.click()
    await pollUntil(() => Boolean(getPortalPanel('listbox')), '首次打开后 portal 面板没有挂载')

    document.body.click()
    await select.updateComplete
    trigger?.click()
    await pollUntil(
      () => getPortalPanel('listbox')?.hasAttribute('hidden') === false,
      '重新打开后 portal 面板仍处于隐藏态'
    )

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
