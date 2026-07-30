import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiPopover } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiPopover（浏览器）', () => {
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
})
