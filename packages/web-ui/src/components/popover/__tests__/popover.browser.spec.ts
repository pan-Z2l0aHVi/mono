import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getPortalPanel, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiPopover } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiPopover 组件（浏览器）', () => {
  it('show() 以即时状态打开面板', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    popover.show()
    await popover.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const panel = popover.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]')
    expect(panel?.dataset.wuiPresence).toBe('open')
  })

  it('退出过渡中重新打开时保持 Portal 面板可见', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.portal = true
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    popover.open = false
    await popover.updateComplete
    popover.open = true
    await popover.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
    const portalHost = root?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
    const panel = portalHost?.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]')
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('键盘语义 click 触发时立即打开', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    popover.querySelector<HTMLButtonElement>('button')?.click()
    await popover.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))

    const panel = popover.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]')
    expect(popover.open).toBe(true)
    expect(getComputedStyle(panel!).opacity).toBe('1')
  })

  it('受控 open 在帧回调前翻回 false 后不遗留空 portal 面板', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.portal = true
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    // 受控状态在同一帧内开合：open 分支已登记 rAF，false 分支必须先执行关闭清理。
    popover.open = true
    await popover.updateComplete
    popover.open = false
    await popover.updateComplete
    await waitForFrame()
    await waitForFrame()

    expect(getPortalPanel()).toBeNull()
    expect(popover.querySelector('div')?.textContent).toBe('Content')
  })

  it('初始 open 在帧回调前翻回 false 后不遗留空 portal 面板', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.portal = true
    popover.open = true
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    // firstUpdated 已登记打开帧回调；关闭分支必须在回调消费前完成清理。
    popover.open = false
    await popover.updateComplete
    await waitForFrame()
    await waitForFrame()

    expect(getPortalPanel()).toBeNull()
    expect(popover.querySelector('div')?.textContent).toBe('Content')
  })

  it('打开帧回调前卸载 popover 不重建 portal 面板', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.portal = true
    popover.open = true
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    popover.remove()
    await waitForFrame()
    await waitForFrame()

    expect(getPortalPanel()).toBeNull()
    expect(popover.querySelector('div')?.textContent).toBe('Content')
  })

  it('temporary disconnect 后 reconnect 仍可打开', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    popover.remove()
    document.body.append(popover)
    await popover.updateComplete
    popover.show()
    await popover.updateComplete
    await waitForFrame()

    const panel = popover.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]')
    expect(panel?.dataset.wuiPresence).toBe('open')
  })

  it('同帧 open + portal reconfigure 只保留一个 portal 面板', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
    await popover.updateComplete

    // Lit 会把同一轮属性修改合并进一次 updated：reconfigure 必须先 invalidate，
    // 避免和 open 事务叠成两个 frame 回调。
    popover.portal = true
    popover.open = true
    await popover.updateComplete
    await waitForFrame()

    const panel = getPortalPanel()
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toBe('Content')
    expect(popover.querySelector('div')).toBeNull()
  })

  it('focusout 帧回调前卸载不派发 open-change', async () => {
    const popover = document.createElement('web-ui-popover')
    popover.innerHTML = '<button slot="trigger">Trigger</button><div>Content</div>'
    document.body.append(popover)
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
})
