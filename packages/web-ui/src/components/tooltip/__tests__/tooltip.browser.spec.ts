import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getPortalPanel, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

function createPortalTooltip(content: string): WebUiTooltip {
  const tooltip = document.createElement('web-ui-tooltip')
  tooltip.portal = true
  tooltip.content = content
  tooltip.innerHTML = '<button>Trigger</button>'
  document.body.append(tooltip)
  return tooltip
}

describe('WebUiTooltip 组件（浏览器）', () => {
  it('直接设置 open 时同步 Portal 面板', async () => {
    const tooltip = createPortalTooltip('Portal tooltip')
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    await waitForFrame()

    // 面板已迁到 overlay root，内容随投影进入面板。
    const panel = getPortalPanel('tooltip')
    expect(panel?.textContent).toContain('Portal tooltip')
    expect(tooltip.open).toBe(true)

    tooltip.open = false
    await tooltip.updateComplete
    expect(tooltip.open).toBe(false)
  })

  it('退出过渡中重新打开时保持 Portal 面板可见', async () => {
    const tooltip = createPortalTooltip('可中断提示')
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    tooltip.open = false
    await tooltip.updateComplete
    tooltip.open = true
    await tooltip.updateComplete
    await waitForFrame()

    // 退场被重新打开中断的后果：面板仍在文档中且可见（不是 hidden）。
    const panel = getPortalPanel('tooltip')
    expect(panel).not.toBeNull()
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('reconfigure 帧回调前卸载不重建 portal 面板', async () => {
    const tooltip = document.createElement('web-ui-tooltip')
    tooltip.content = 'Portal tooltip'
    tooltip.innerHTML = '<button>Trigger</button>'
    document.body.append(tooltip)
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    tooltip.portal = true
    await tooltip.updateComplete
    tooltip.remove()
    await waitForFrame()
    await waitForFrame()

    // 宿主卸载后不得留下孤儿面板。
    expect(getPortalPanel('tooltip')).toBeNull()
  })
})
