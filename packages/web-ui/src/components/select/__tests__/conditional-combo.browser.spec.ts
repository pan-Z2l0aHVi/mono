import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/option'
import type { WebUiOption } from '@/components/option'

import type { WebUiSelect } from '..'

afterEach(() => document.body.replaceChildren())

const OPTIONS_HTML_THREE = `
  <web-ui-option value="apple" label="Apple"></web-ui-option>
  <web-ui-option value="banana" label="Banana"></web-ui-option>
  <web-ui-option value="cherry" label="Cherry"></web-ui-option>
`

function createSelect(optionsHtml: string, attrs?: Record<string, string>): WebUiSelect {
  const select = document.createElement('web-ui-select')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      select.setAttribute(k, v)
    }
  }
  select.innerHTML = optionsHtml
  document.body.append(select)
  return select
}

async function waitForFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 浏览器中 fallback overlay root 结构为 [data-wui-overlay-root]#shadow >
// [data-wui-overlay-container] > portal host div#shadow > listbox panel。
function getPortalPanel(): HTMLElement | null {
  const container = document
    .querySelector<HTMLElement>('[data-wui-overlay-root]')
    ?.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
  return (
    container
      ?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
      ?.shadowRoot?.querySelector<HTMLElement>('[role="listbox"]') ?? null
  )
}

describe('WebUiSelect 条件组合边界（浏览器）', () => {
  it('Portal 快速关闭再重新打开后内容完整恢复且可继续选择', async () => {
    const select = createSelect(OPTIONS_HTML_THREE, { portal: '' })
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!

    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(getPortalPanel()?.querySelectorAll('web-ui-option').length).toBe(3)

    document.body.click()
    await select.updateComplete
    // 真实浏览器有退出过渡；等过渡完成后 portal 才被 dispose
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(getPortalPanel()).toBeNull()
    expect(select.querySelectorAll('web-ui-option').length).toBe(3)

    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(getPortalPanel()?.querySelectorAll('web-ui-option').length).toBe(3)

    // 真实浏览器中 option 点击监听器必须挂在 option 元素上；
    // 宿主泄漏监听器会让这次点击清空 value 并立即关闭
    const banana = getPortalPanel()!.querySelector<WebUiOption>('web-ui-option[value="banana"]')!
    banana.click()
    await select.updateComplete

    expect(select.value).toBe('banana')
    expect(select.open).toBe(false)
  })

  it('Escape 关闭后再次点击 trigger 可重新打开且不误触发选项点击', async () => {
    const select = createSelect(OPTIONS_HTML_THREE, { portal: '' })
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!

    trigger.click()
    await waitForFrame()
    await select.updateComplete
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    await select.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(select.open).toBe(false)

    const inputEvents: Event[] = []
    select.addEventListener('input', e => inputEvents.push(e))

    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(inputEvents).toHaveLength(0)

    document.body.click()
    await select.updateComplete
    expect(select.value).toBe('')
  })

  it('打开时移除键盘激活项后 Enter 不误选相邻项', async () => {
    const select = createSelect(OPTIONS_HTML_THREE)
    await select.updateComplete

    // 键盘打开并激活第二项（banana）
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await select.updateComplete
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await select.updateComplete
    expect(select.querySelector('web-ui-option[active]')?.getAttribute('value')).toBe('banana')

    select.querySelector('web-ui-option[active]')!.remove()
    await select.updateComplete

    // 激活项已移除：不得静默偏移到 cherry
    expect(select.querySelector('web-ui-option[active]')).toBeNull()

    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    await select.updateComplete

    // 已断连的 banana 不得被选中；激活项失效时 Enter 仅关闭面板
    expect(select.value).toBe('')
    expect(select.open).toBe(false)
  })

  it('已选 option 被移除后触发器回退 placeholder 且面板内 selected 清空', async () => {
    const select = createSelect('<div><web-ui-option value="apple" label="Apple"></web-ui-option></div>', {
      portal: '',
      placeholder: 'Pick'
    })
    select.value = 'apple'
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)

    const apple = getPortalPanel()!.querySelector<WebUiOption>('web-ui-option[value="apple"]')!
    apple.remove()
    await new Promise(resolve => setTimeout(resolve, 0))
    await select.updateComplete

    expect(trigger.textContent?.includes('Apple')).toBe(false)
    expect(trigger.textContent?.includes('Pick')).toBe(true)
    expect(select.querySelectorAll('web-ui-option[selected]').length).toBe(0)
  })

  it('打开期间向 light DOM 插入新 option 后同步进面板并可选择', async () => {
    const select = createSelect(OPTIONS_HTML_THREE, { portal: '' })
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(getPortalPanel()?.querySelectorAll('web-ui-option').length).toBe(3)

    // 模拟框架条件渲染：异步数据到达后插入新选项
    const wrapper = document.createElement('div')
    wrapper.innerHTML = '<web-ui-option value="durian" label="Durian"></web-ui-option>'
    select.appendChild(wrapper)
    await new Promise(resolve => setTimeout(resolve, 0))
    await select.updateComplete

    const panel = getPortalPanel()!
    expect(panel.querySelectorAll('web-ui-option').length).toBe(4)
    expect(select.querySelectorAll('web-ui-option').length).toBe(0)

    const durian = panel.querySelector<WebUiOption>('web-ui-option[value="durian"]')!
    durian.click()
    await select.updateComplete
    expect(select.value).toBe('durian')
    expect(select.open).toBe(false)
  })

  it('自定义 overlayContainer 时 Portal 面板挂载到指定容器且可选择', async () => {
    const container = document.createElement('div')
    container.id = 'overlay-target-browser'
    document.body.append(container)

    const select = createSelect(OPTIONS_HTML_THREE)
    select.overlayContainer = container
    select.portal = true
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(container.querySelector('div')?.shadowRoot?.querySelector('[role="listbox"] web-ui-option')).toBeTruthy()

    const banana = container
      .querySelector('div')!
      .shadowRoot!.querySelector<WebUiOption>('web-ui-option[value="banana"]')!
    banana.click()
    await select.updateComplete

    expect(select.value).toBe('banana')
    expect(select.open).toBe(false)
  })
})
