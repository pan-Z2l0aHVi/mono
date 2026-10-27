import '..'
import '@/components/option'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiOption } from '@/components/option'
import { cleanupElement, pollUntil, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

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

// jsdom 中 portal panel 内容在 rAF 后的 _openOverlay 完成时才存在。
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
  describe('option 移除（非 portal）', () => {
    it('打开时移除键盘激活项后，激活索引按身份保持且 Enter 不误选相邻项', async () => {
      const el = createSelect(OPTIONS_HTML_THREE)
      await waitForUpdate(el)

      // 键盘打开：初始激活第一项；再次 ArrowDown 激活第二项（banana）
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]')
      // 非 portal 模式下「当前激活项」的公开通道是 combobox 的 aria-activedescendant
      // 指向的 option id（`option[active]` 是 select 写入的内部高亮标记，不是公开 API）。
      const resolveActive = (): WebUiOption | null => {
        const id = trigger?.getAttribute('aria-activedescendant')
        return id ? el.querySelector<WebUiOption>(`#${id}`) : null
      }

      expect(resolveActive()?.value, '前置：第二项应先成为激活项').toBe('banana')
      resolveActive()?.remove()
      await waitForUpdate(el)

      expect(resolveActive(), '激活索引不应偏移到相邻项').toBeNull()

      const [events] = spyEvents(el, 'input')
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      // Enter 只应选中用户可见的激活项；banana 已移除，不得误选 cherry。
      // 激活索引重置为 -1 时 panel 保持打开且无选中（与「无可激活项」的语义一致）。
      expect(events).toHaveLength(0)
      expect(el.value).toBe('')
      expect(resolveActive()).toBeNull()
      cleanupElement(el)
    })

    it('已选 option 被移除后 trigger 回退 placeholder 且 selected 反映清空', async () => {
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

    it('移除 wrapper 内全部 option 后打开 panel，Enter 不产生选中', async () => {
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

  describe('option 移除（portal）', () => {
    it('打开时移除已 option 后 trigger label 回退 placeholder', async () => {
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

      // portal 打开后 option 位于 overlay shadow root 内，从 panel 中移除
      const appleInPanel = getPortalPanel(el)?.querySelector('web-ui-option[value="apple"]') as WebUiOption | null
      expect(appleInPanel, '前置：panel 内应有已 option apple').not.toBeNull()
      appleInPanel?.remove()
      await new Promise<void>(resolve => queueMicrotask(resolve))
      await waitForUpdate(el)
      expect(trigger.textContent?.includes('Apple')).toBe(false)
      expect(trigger.textContent?.includes('Pick')).toBe(true)
      cleanupElement(el)
    })

    // 回归：portal 追踪列表仍持引用时，关闭 restoreContent 会把已删除的 option 复活回 light DOM
    it('打开时删除 option 后关闭，已删项不复活回 light DOM', async () => {
      const el = createSelect(OPTIONS_HTML_THREE, { portal: '' })
      await waitForUpdate(el)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await flushFrame(el)
      expect(el.open).toBe(true)

      const appleInPanel = getPortalPanel(el)?.querySelector('web-ui-option[value="apple"]') as WebUiOption | null
      expect(appleInPanel, '前置：panel 内应有 apple').not.toBeNull()
      appleInPanel?.remove()
      await new Promise<void>(resolve => queueMicrotask(resolve))
      await waitForUpdate(el)

      document.body.click()
      await waitForUpdate(el)
      await pollUntil(() => !el.open && !getPortalPanel(el), 'Expected deleted-option select to close and dispose')

      const values = [...el.querySelectorAll<WebUiOption>('web-ui-option')].map(o => o.value).sort()
      expect(values).toEqual(['banana', 'cherry'])
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
      await pollUntil(() => !el.open && !getPortalPanel(el), 'Expected select portal to dispose after close')
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
  })

  describe('option 新增（portal）', () => {
    it('关闭状态下插入新 option 不迁移，打开时随初始 moveContent 进入 panel', async () => {
      const el = createSelect(OPTIONS_HTML_THREE, { portal: '' })
      await waitForUpdate(el)

      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<web-ui-option value="elderberry" label="Elderberry"></web-ui-option>'
      el.appendChild(wrapper)
      await waitForUpdate(el)

      expect(el.querySelectorAll('web-ui-option').length).toBe(4)

      const trigger = queryA11y(el, '[role="combobox"]') as HTMLElement
      trigger.click()
      await flushFrame(el)
      expect(getPortalPanel(el)?.querySelectorAll('web-ui-option').length).toBe(4)
      cleanupElement(el)
    })

    it('打开期间新增 option 后可被键盘导航选中，且已选 label 不丢失', async () => {
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

      expect(trigger.textContent?.includes('Apple')).toBe(true)
      // 从已选 apple 出发 ArrowDown 确定性落到新增的 fig（portal 打开时 option 位于 panel 内），
      // 选中结果是「激活索引指向新增项」的公开可观察后果。
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)
      expect(el.value).toBe('fig')
      cleanupElement(el)
    })
  })

  describe('自定义 overlayContainer', () => {
    it('portal panel 挂载到指定容器并可正常选择', async () => {
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

      // portal host 是容器内的 div，option 位于其 shadow root 的 panel 中
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
