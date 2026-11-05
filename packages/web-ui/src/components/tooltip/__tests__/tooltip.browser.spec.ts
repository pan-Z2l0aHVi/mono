import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getPortalPanel, pollUntil, waitForFrame } from '@/shared/test-utils'

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
  it('直接设置 open 时同步 Portal panel', async () => {
    const tooltip = createPortalTooltip('Portal tooltip')
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    // portal panel 经 rAF 挂载；等它真的带上内容，而不是赌固定帧数。
    await pollUntil(
      () => Boolean(getPortalPanel('tooltip')?.textContent?.includes('Portal tooltip')),
      'tooltip portal panel 未挂载内容'
    )

    const panel = getPortalPanel('tooltip')
    expect(panel?.textContent).toContain('Portal tooltip')
    expect(tooltip.open).toBe(true)

    tooltip.open = false
    await tooltip.updateComplete
    expect(tooltip.open).toBe(false)
  })

  it('退出过渡中重新打开时保持 Portal panel 可见', async () => {
    const tooltip = createPortalTooltip('可中断提示')
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    tooltip.open = false
    await tooltip.updateComplete
    tooltip.open = true
    await tooltip.updateComplete
    await pollUntil(() => {
      const panel = getPortalPanel('tooltip')
      return panel !== null && !panel.hasAttribute('hidden')
    }, 'tooltip portal panel 未重新可见')

    const panel = getPortalPanel('tooltip')
    expect(panel).not.toBeNull()
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('reconfigure 帧回调前卸载不重建 portal panel', async () => {
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

    // 宿主卸载后不得留下孤儿 panel。
    expect(getPortalPanel('tooltip')).toBeNull()
  })

  it('内容清空时立即隐藏 panel，不播空盒退场过渡', async () => {
    const tooltip = document.createElement('web-ui-tooltip')
    tooltip.innerHTML = '<button>Trigger</button><span slot="content">Tip</span>'
    document.body.append(tooltip)
    await tooltip.updateComplete

    tooltip.show({ instant: true })
    await tooltip.updateComplete
    await waitForFrame()

    const panel = tooltip.shadowRoot!.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(panel.hidden).toBe(false)

    tooltip.querySelector('[slot="content"]')!.remove()
    // 一帧远短于退场过渡：此刻仍可见就说明走了动画，而不是内容已空就落隐藏态。
    await waitForFrame()

    expect(tooltip.open).toBe(false)
    expect(panel.hidden).toBe(true)
  })
})
