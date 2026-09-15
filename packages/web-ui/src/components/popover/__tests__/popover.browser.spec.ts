import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getPortalPanel, getPortalPanels, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiPopover } from '..'

afterEach(() => document.body.replaceChildren())

function createPopover(innerHtml = '<button slot="trigger">Trigger</button><div>Content</div>'): WebUiPopover {
  const popover = document.createElement('web-ui-popover')
  popover.innerHTML = innerHtml
  document.body.append(popover)
  return popover
}

describe('WebUiPopover 组件（浏览器）', () => {
  it('show() 以即时状态打开面板', async () => {
    const popover = createPopover()
    await popover.updateComplete

    popover.show()
    await popover.updateComplete
    await waitForFrame()

    // 「即时」指 show() 不经过入场过渡；可观察后果是面板已就位且可见。
    const panel = popover.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]')
    expect(popover.open).toBe(true)
    expect(panel?.getAttribute('role')).toBe('dialog')
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('退出过渡中重新打开时保持 Portal 面板可见', async () => {
    const popover = createPopover()
    popover.portal = true
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    popover.open = false
    await popover.updateComplete
    popover.open = true
    await popover.updateComplete
    await waitForFrame()

    // 退场被重新打开中断的后果：面板仍在文档中且可见（不是 hidden）。
    const panel = getPortalPanel('dialog')
    expect(panel).not.toBeNull()
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('键盘语义 click 触发时立即打开', async () => {
    const popover = createPopover()
    await popover.updateComplete

    // detail=0 的 click 是键盘激活（Enter/Space）的语义等价物。
    popover.querySelector<HTMLButtonElement>('button')?.click()
    await popover.updateComplete
    await waitForFrame()
    await waitForFrame()

    const panel = popover.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]')
    expect(popover.open).toBe(true)
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('受控 open 在帧回调前翻回 false 后不遗留空 portal 面板', async () => {
    const popover = createPopover()
    popover.portal = true
    await popover.updateComplete

    // 受控状态在同一帧内开合：open 分支已登记 rAF，false 分支必须先执行关闭清理。
    popover.open = true
    await popover.updateComplete
    popover.open = false
    await popover.updateComplete
    await waitForFrame()
    await waitForFrame()

    expect(getPortalPanel('dialog')).toBeNull()
    expect(popover.querySelector('div')?.textContent).toBe('Content')
  })

  it('初始 open 在帧回调前翻回 false 后不遗留空 portal 面板', async () => {
    const popover = createPopover()
    popover.portal = true
    popover.open = true
    await popover.updateComplete

    // firstUpdated 已登记打开帧回调；关闭分支必须在回调消费前完成清理。
    popover.open = false
    await popover.updateComplete
    await waitForFrame()
    await waitForFrame()

    expect(getPortalPanel('dialog')).toBeNull()
    expect(popover.querySelector('div')?.textContent).toBe('Content')
  })

  it('打开帧回调前卸载 popover 不重建 portal 面板', async () => {
    const popover = createPopover()
    popover.portal = true
    popover.open = true
    await popover.updateComplete

    popover.remove()
    await waitForFrame()
    await waitForFrame()

    expect(getPortalPanel('dialog')).toBeNull()
    expect(popover.querySelector('div')?.textContent).toBe('Content')
  })

  it('temporary disconnect 后 reconnect 仍可打开', async () => {
    const popover = createPopover()
    await popover.updateComplete

    popover.remove()
    document.body.append(popover)
    await popover.updateComplete
    popover.show()
    await popover.updateComplete
    await waitForFrame()

    expect(popover.open).toBe(true)
    const panel = popover.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]')
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('同帧 open + portal reconfigure 只保留一个 portal 面板', async () => {
    const popover = createPopover()
    await popover.updateComplete

    // Lit 会把同一轮属性修改合并进一次 updated：reconfigure 必须先 invalidate，
    // 避免和 open 事务叠成两个 frame 回调。
    popover.portal = true
    popover.open = true
    await popover.updateComplete
    await waitForFrame()

    const panel = getPortalPanel('dialog')
    expect(panel?.textContent).toBe('Content')
    expect(popover.querySelector('div')).toBeNull()
  })

  it('focusout 帧回调前卸载不派发 open-change', async () => {
    const popover = createPopover()
    await popover.updateComplete

    const changes: CustomEvent[] = []
    popover.addEventListener('open-change', event => changes.push(event as CustomEvent))
    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    popover.dispatchEvent(new FocusEvent('focusout'))
    popover.remove()
    await waitForFrame()
    await waitForFrame()

    expect(changes).toHaveLength(0)
  })

  it('嵌套 portal 子 popover 打开时父面板不误判 outside', async () => {
    const parent = createPopover(`
      <button slot="trigger">Parent</button>
      <web-ui-popover portal>
        <button slot="trigger">Child</button>
        <div>Child content</div>
      </web-ui-popover>
    `)
    parent.portal = true
    await parent.updateComplete
    const diagnostics: string[] = []
    parent.addEventListener('focusout', () => diagnostics.push('focusout'))
    parent.addEventListener('open-change', event =>
      diagnostics.push(`open-change:${(event as CustomEvent).detail.open}`)
    )

    parent.open = true
    await parent.updateComplete
    await waitForFrame()

    const child = getPortalPanels('dialog')
      .map(panel => panel.querySelector<WebUiPopover>('web-ui-popover'))
      .find((element): element is WebUiPopover => element?.localName === 'web-ui-popover')
    expect(child).toBeTruthy()
    if (!child) throw new Error('Expected nested popover')
    child.open = true
    await child.updateComplete
    await waitForFrame()

    const childPanel = getPortalPanels('dialog').find(panel => panel.textContent?.includes('Child content'))
    expect(childPanel).toBeTruthy()
    expect(diagnostics, 'diagnostics before interaction').toEqual([])
    expect(parent.open, 'before child panel interaction').toBe(true)
    childPanel?.click()
    await parent.updateComplete
    await child.updateComplete

    expect(parent.open).toBe(true)
    expect(child.open).toBe(true)

    document.body.click()
    await parent.updateComplete
    await child.updateComplete

    expect(parent.open).toBe(false)
    expect(child.open).toBe(false)
  })

  it('focusout 落入嵌套子 portal 面板时不关闭父 popover', async () => {
    const parent = createPopover(`
      <button slot="trigger">Parent</button>
      <web-ui-popover portal trigger="manual">
        <button slot="trigger">Child</button>
        <div>Child content</div>
      </web-ui-popover>
    `)
    parent.portal = true
    await parent.updateComplete

    parent.open = true
    await parent.updateComplete
    await waitForFrame()

    const child = getPortalPanels('dialog')
      .map(panel => panel.querySelector<WebUiPopover>('web-ui-popover'))
      .find((element): element is WebUiPopover => element?.localName === 'web-ui-popover')
    expect(child).toBeTruthy()
    if (!child) throw new Error('Expected nested popover')
    child.open = true
    await child.updateComplete
    await waitForFrame()

    const childPanel = getPortalPanels('dialog').find(panel => panel.textContent?.includes('Child content'))
    childPanel?.focus()
    parent.dispatchEvent(new FocusEvent('focusout'))
    await new Promise(resolve => requestAnimationFrame(resolve))
    await parent.updateComplete

    expect(parent.open).toBe(true)
  })
})
