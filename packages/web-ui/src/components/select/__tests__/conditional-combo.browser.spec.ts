import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue/dist/vue.esm-bundler.js'

import type { WebUiOption } from '@/components/option'

import '..'
import '@/components/option'
import { getPortalPanel, pollUntil, waitForFrame } from '@/shared/test-utils'

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

describe('WebUiSelect 条件组合边界（浏览器）', () => {
  it('Portal 快速关闭再重新打开后内容完整恢复且可继续选择', async () => {
    const select = createSelect(OPTIONS_HTML_THREE, { portal: '' })
    await select.updateComplete

    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!

    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(getPortalPanel('listbox')?.querySelectorAll('web-ui-option').length).toBe(3)

    document.body.click()
    await select.updateComplete
    // 真实浏览器有退出过渡；轮询 portal 真正 dispose，不依赖过渡时长
    await pollUntil(() => !getPortalPanel('listbox'), 'Expected select portal to dispose after close')
    expect(select.querySelectorAll('web-ui-option').length).toBe(3)

    trigger.click()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(getPortalPanel('listbox')?.querySelectorAll('web-ui-option').length).toBe(3)

    // 真实浏览器中 option 点击监听器必须挂在 option 元素上；
    // 宿主泄漏监听器会让这次点击清空 value 并立即关闭
    const banana = getPortalPanel('listbox')!.querySelector<WebUiOption>('web-ui-option[value="banana"]')!
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
    await pollUntil(() => !select.open && !getPortalPanel('listbox'), 'Expected Escape to close and dispose select')

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

    const apple = getPortalPanel('listbox')!.querySelector<WebUiOption>('web-ui-option[value="apple"]')!
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
    expect(getPortalPanel('listbox')?.querySelectorAll('web-ui-option').length).toBe(3)

    // 模拟框架条件渲染：异步数据到达后插入新选项
    const wrapper = document.createElement('div')
    wrapper.innerHTML = '<web-ui-option value="durian" label="Durian"></web-ui-option>'
    select.appendChild(wrapper)
    await pollUntil(
      () => getPortalPanel('listbox')?.querySelectorAll('web-ui-option').length === 4,
      'Expected asynchronously added option to migrate into the panel'
    )
    await select.updateComplete

    const panel = getPortalPanel('listbox')!
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

  it('打开期 v-if 删除中段 option 后跨关闭重开：占位注释归还宿主，重开保模板序', async () => {
    const mountPoint = document.createElement('div')
    document.body.append(mountPoint)
    const show = ref(false)
    const app = createApp({
      setup: () => ({ show }),
      template: `
        <web-ui-select :portal="true">
          <web-ui-option value="apple" label="Apple"></web-ui-option>
          <web-ui-option v-if="show" value="banana" label="Banana"></web-ui-option>
          <web-ui-option value="cherry" label="Cherry"></web-ui-option>
        </web-ui-select>
      `
    })
    app.mount(mountPoint)

    const select = mountPoint.querySelector('web-ui-select') as WebUiSelect
    await select.updateComplete
    const trigger = select.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!

    // 打开与 v-if 同 flush：banana 实时迁入面板（option 内容位于面板的嵌套内容容器）
    show.value = true
    trigger.click()
    await nextTick()
    await waitForFrame()
    await select.updateComplete
    expect(select.open).toBe(true)
    expect(getPortalPanel('listbox')?.querySelectorAll('web-ui-option').length).toBe(3)

    // 打开期 v-if 删除中段 option：占位注释被框架插进面板嵌套容器，portal 必须
    // 归还宿主 banana 的 marker 位（apple/cherry 的 marker 之间），否则注释随面板
    // 销毁，重开时 Vue 会把 banana 插进已脱离文档的旧面板
    show.value = false
    await nextTick()
    await select.updateComplete
    await pollUntil(
      () => getPortalPanel('listbox')?.querySelectorAll('web-ui-option').length === 2,
      'Expected removed option to leave the select panel'
    )
    const hostSkeleton = [...select.childNodes].map(node => node.nodeType)
    expect(hostSkeleton.some(type => type === Node.COMMENT_NODE)).toBe(true)

    // 关闭销毁面板，注释在宿主存活
    document.body.click()
    await select.updateComplete
    await pollUntil(() => !getPortalPanel('listbox'), 'Expected select portal to dispose after close')
    expect([...select.childNodes].some(node => node.nodeType === Node.COMMENT_NODE)).toBe(true)

    // 重开与 v-if 同 flush：banana 按模板序实时迁入面板（apple/banana/cherry）
    show.value = true
    trigger.click()
    await nextTick()
    await waitForFrame()
    await select.updateComplete
    const panel = getPortalPanel('listbox')
    expect(panel?.querySelectorAll('web-ui-option').length).toBe(3)
    const values = [...panel!.querySelectorAll('web-ui-option')].map(option => option.getAttribute('value'))
    expect(values).toEqual(['apple', 'banana', 'cherry'])
    app.unmount()
  })
})
