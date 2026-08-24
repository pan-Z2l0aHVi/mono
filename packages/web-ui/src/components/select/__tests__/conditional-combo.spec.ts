import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/option'
import type { WebUiOption } from '@/components/option'
import { cleanupElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSelect } from '..'

afterEach(() => document.body.replaceChildren())

function createSelect(optionsHtml = '', attrs?: Record<string, string>): WebUiSelect {
  const el = document.createElement('web-ui-select')
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = optionsHtml
  document.body.append(el)
  return el
}

// jsdom 中 portal 面板内容在 rAF 后的 _openOverlay 完成时才存在。
async function flushFrame(el: WebUiSelect) {
  await new Promise(resolve => requestAnimationFrame(resolve))
  await waitForUpdate(el)
}

// jsdom 中 portal 结构为 [data-wui-overlay-root]#shadow > [data-wui-overlay-container] >
// portal host div#shadow > panel（自定义 overlayContainer 时容器本身就是 container）。
// 测试只断言公开的 DOM 归属，不依赖内部 class。jsdom 对 :scope 选择器支持不可靠，
// 用直接子元素遍历代替。
function getPortalPanel(el: WebUiSelect): HTMLElement | null {
  const container: HTMLElement | null | undefined =
    (el.overlayContainer as HTMLElement | undefined) ??
    document
      .querySelector<HTMLElement>('[data-wui-overlay-root]')
      ?.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
  for (const host of Array.from(container?.children ?? [])) {
    const panel = (host as HTMLElement).shadowRoot?.querySelector<HTMLElement>('[role="listbox"]')
    if (panel) return panel
  }
  return null
}

const OPTIONS_HTML_THREE = `
  <web-ui-option value="apple" label="Apple"></web-ui-option>
  <web-ui-option value="banana" label="Banana"></web-ui-option>
  <web-ui-option value="cherry" label="Cherry"></web-ui-option>
`

describe('WebUiSelect 条件组合边界', () => {
  describe('选项移除（非 portal）', () => {
    it('打开时移除键盘激活项后，激活索引按身份保持且 Enter 不误选相邻项', async () => {
      const el = createSelect(OPTIONS_HTML_THREE)
      await waitForUpdate(el)

      // 键盘打开：初始激活第一项；再次 ArrowDown 激活第二项（banana）
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const active = el.querySelector<WebUiOption>('web-ui-option[active]')!
      expect(active.value).toBe('banana')
      active.remove()
      await waitForUpdate(el)

      // 激活项已移除：不得把索引静默偏移到 cherry 并保持高亮
      expect(el.querySelector('web-ui-option[active]')).toBeNull()

      const [events] = spyEvents(el, 'input')
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      // Enter 只应选中用户可见的激活项；banana 已移除，不得误选 cherry。
      // 激活索引重置为 -1 时面板保持打开且无选中（与「无可激活项」的语义一致）。
      expect(events).toHaveLength(0)
      expect(el.value).toBe('')
      expect(el.querySelector('web-ui-option[active]')).toBeNull()
      cleanupElement(el)
    })

    it('已选 option 被移除后触发器回退 placeholder 且 selected 反映清空', async () => {
      const el = createSelect('<web-ui-option value="apple" label="Apple"></web-ui-option>', { placeholder: '请选择' })
      el.value = 'apple'
      await waitForUpdate(el)

      el.querySelector('web-ui-option')!.remove()
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      expect(trigger?.textContent?.trim()).toBe('请选择')
      expect(el.querySelector('web-ui-option[selected]')).toBeNull()

      cleanupElement(el)
    })

    it('移除 wrapper 内全部 option 后打开面板，Enter 不产生选中', async () => {
      const el = createSelect(`
        <div class="group">
          <web-ui-option value="apple" label="Apple"></web-ui-option>
          <web-ui-option value="banana" label="Banana"></web-ui-option>
        </div>
      `)
      await waitForUpdate(el)

      el.querySelector('div.group')!.remove()
      await waitForUpdate(el)

      const [events] = spyEvents(el, 'input')
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      expect(el.value).toBe('')
      cleanupElement(el)
    })
  })

  describe('选项移除（portal）', () => {
    it('打开时移除已选项后触发器标签回退 placeholder', async () => {
      const el = createSelect(
        `
        <div>
          <web-ui-option value="apple" label="Apple"></web-ui-option>
          <web-ui-option value="banana" label="Banana"></web-ui-option>
        </div>
      `,
        { portal: '', placeholder: 'Pick' }
      )
      el.value = 'apple'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await flushFrame(el)
      expect(el.open).toBe(true)

      // portal 打开后 option 位于浮层 shadow root 内，从面板中移除
      const appleInPanel = getPortalPanel(el)?.querySelector('web-ui-option[value="apple"]') as WebUiOption | null
      expect(appleInPanel).toBeTruthy()
      appleInPanel?.remove()
      await new Promise<void>(resolve => queueMicrotask(resolve))
      await waitForUpdate(el)
      expect(trigger.textContent?.includes('Apple')).toBe(false)
      expect(trigger.textContent?.includes('Pick')).toBe(true)
      cleanupElement(el)
    })

    it('快速关闭再重新打开后 portal 内容完整恢复且可继续选择', async () => {
      const el = createSelect(OPTIONS_HTML_THREE, { portal: '' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement

      trigger.click()
      await flushFrame(el)
      expect(el.open).toBe(true)
      expect(getPortalPanel(el)?.querySelectorAll('web-ui-option').length).toBe(3)

      document.body.click()
      await waitForUpdate(el)
      await new Promise(resolve => setTimeout(resolve, 300))
      expect(el.open).toBe(false)
      expect(el.querySelectorAll('web-ui-option').length).toBe(3)

      trigger.click()
      await flushFrame(el)
      expect(el.open).toBe(true)
      expect(getPortalPanel(el)?.querySelectorAll('web-ui-option').length).toBe(3)

      const banana = getPortalPanel(el)!.querySelector<HTMLElement>('web-ui-option[value="banana"]')!
      banana.click()
      await waitForUpdate(el)
      expect(el.value).toBe('banana')
      expect(el.open).toBe(false)
      cleanupElement(el)
    })

    it('Escape 关闭后再次点击 trigger 可重新打开且不误触发选项点击', async () => {
      const el = createSelect(OPTIONS_HTML_THREE, { portal: '' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement

      trigger.click()
      await flushFrame(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)
      await new Promise(resolve => setTimeout(resolve, 300))
      expect(el.open).toBe(false)

      // 回归：Portal 迁移触发的 composed register 曾把 option 监听器挂到宿主上，
      // 第二次点击会以宿主为 currentTarget 误清空 value 并立即关闭
      const [events] = spyEvents(el, 'input')
      trigger.click()
      await flushFrame(el)
      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)

      document.body.click()
      await waitForUpdate(el)
      expect(el.value).toBe('')
      cleanupElement(el)
    })
  })

  describe('选项新增（portal）', () => {
    it('打开期间向 light DOM 插入新 option 后同步进面板并可选择', async () => {
      const el = createSelect(OPTIONS_HTML_THREE, { portal: '' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await flushFrame(el)
      expect(el.open).toBe(true)
      expect(getPortalPanel(el)?.querySelectorAll('web-ui-option').length).toBe(3)

      // 模拟框架条件渲染：异步数据到达后插入新选项（含 wrapper 包裹形态）
      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<web-ui-option value="durian" label="Durian"></web-ui-option>'
      el.appendChild(wrapper)
      await new Promise<void>(resolve => queueMicrotask(resolve))
      await waitForUpdate(el)

      const panel = getPortalPanel(el)!
      expect(panel.querySelectorAll('web-ui-option').length).toBe(4)
      expect(el.querySelectorAll('web-ui-option').length).toBe(0)
      expect(wrapper.children.length).toBe(0)

      const durian = panel.querySelector<WebUiOption>('web-ui-option[value="durian"]')!
      durian.click()
      await waitForUpdate(el)
      expect(el.value).toBe('durian')
      expect(el.open).toBe(false)
      cleanupElement(el)
    })

    it('关闭状态下插入新 option 不迁移，打开时随初始 moveContent 进入面板', async () => {
      const el = createSelect(OPTIONS_HTML_THREE, { portal: '' })
      await waitForUpdate(el)

      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<web-ui-option value="elderberry" label="Elderberry"></web-ui-option>'
      el.appendChild(wrapper)
      await waitForUpdate(el)

      // 关闭态 light DOM 保持原位
      expect(el.querySelectorAll('web-ui-option').length).toBe(4)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await flushFrame(el)
      expect(getPortalPanel(el)?.querySelectorAll('web-ui-option').length).toBe(4)
      cleanupElement(el)
    })

    it('打开期间新增 option 后触发器标签与激活索引保持一致', async () => {
      const el = createSelect('<web-ui-option value="apple" label="Apple"></web-ui-option>', {
        portal: '',
        placeholder: 'Pick'
      })
      el.value = 'apple'
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await flushFrame(el)

      el.insertAdjacentHTML('beforeend', '<web-ui-option value="fig" label="Fig"></web-ui-option>')
      await new Promise<void>(resolve => queueMicrotask(resolve))
      await waitForUpdate(el)

      // 已选标签不因新增项丢失；键盘导航能看到新增项
      expect(trigger.textContent?.includes('Apple')).toBe(true)
      // 从已选 apple 出发 ArrowDown 确定性落到新增的 fig(portal 打开时 option 位于面板内)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      expect(getPortalPanel(el)?.querySelector('web-ui-option[active]')?.getAttribute('value')).toBe('fig')
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)
      expect(el.value).toBe('fig')
      cleanupElement(el)
    })
  })

  describe('自定义 overlayContainer', () => {
    it('portal 面板挂载到指定容器并可正常选择', async () => {
      const container = document.createElement('div')
      container.id = 'overlay-target'
      document.body.append(container)

      const el = createSelect(OPTIONS_HTML_THREE)
      el.overlayContainer = container
      el.portal = true
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await flushFrame(el)

      // portal host 是容器内的 div，option 位于其 shadow root 的面板中
      const panelOptions = [...container.children].flatMap(host => [
        ...((host as HTMLElement).shadowRoot?.querySelectorAll<WebUiOption>('web-ui-option') ?? [])
      ])
      expect(panelOptions.length).toBe(3)

      ;(panelOptions[1] as HTMLElement).click()
      await waitForUpdate(el)

      expect(el.value).toBe('banana')
      expect(el.open).toBe(false)
      container.remove()
      cleanupElement(el)
    })
  })
})
