import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiTooltip（浏览器）', () => {
  it('直接设置 open 时同步 Portal 面板', async () => {
    const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
    tooltip.portal = true
    tooltip.content = 'Portal tooltip'
    tooltip.innerHTML = '<button>Trigger</button>'
    document.body.append(tooltip)
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
    const portalHost = root?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
    const panel = portalHost?.shadowRoot?.querySelector<HTMLElement>('[role="tooltip"]')
    expect(panel?.textContent).toContain('Portal tooltip')
    expect(panel?.dataset.wuiPresence).toBe('open')

    tooltip.open = false
    await tooltip.updateComplete
    expect(tooltip.open).toBe(false)
  })

  it('退出过渡中重新打开时保持 Portal 面板可见', async () => {
    const tooltip = document.createElement('web-ui-tooltip') as WebUiTooltip
    tooltip.portal = true
    tooltip.content = '可中断提示'
    tooltip.innerHTML = '<button>Trigger</button>'
    document.body.append(tooltip)
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    tooltip.open = false
    await tooltip.updateComplete
    tooltip.open = true
    await tooltip.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
    const portalHost = root?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
    const panel = portalHost?.shadowRoot?.querySelector<HTMLElement>('[role="tooltip"]')
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })
})
