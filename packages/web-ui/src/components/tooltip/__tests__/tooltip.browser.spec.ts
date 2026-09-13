import { afterEach, describe, expect, it } from 'vite-plus/test'

import { waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiTooltip 组件（浏览器）', () => {
  it('直接设置 open 时同步 Portal 面板', async () => {
    const tooltip = document.createElement('web-ui-tooltip')
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
    const tooltip = document.createElement('web-ui-tooltip')
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

    const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
    const portalHost = root?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
    const panel = portalHost?.shadowRoot?.querySelector<HTMLElement>('[role="tooltip"]')
    expect(panel).toBeUndefined()
  })

  it('浮层面板双层玻璃：blur + surface 各自 opacity 过渡，玻璃背景落在 surface 层', async () => {
    const tooltip = document.createElement('web-ui-tooltip')
    tooltip.content = 'Tooltip'
    tooltip.innerHTML = '<button>Trigger</button>'
    document.body.append(tooltip)
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))

    const panel = tooltip.shadowRoot?.querySelector<HTMLElement>('[role="tooltip"]')
    const blur = panel?.querySelector('.wui-floating-panel-blur') as HTMLElement
    const surface = panel?.querySelector('.wui-floating-panel-surface') as HTMLElement
    expect(blur).toBeTruthy()
    expect(surface).toBeTruthy()
    expect(getComputedStyle(panel!).transitionProperty).not.toContain('opacity')
    expect(getComputedStyle(blur).backdropFilter).not.toBe('none')
    expect(getComputedStyle(blur).transitionProperty).toContain('opacity')
    expect(getComputedStyle(surface).transitionProperty).toContain('opacity')

    // 玻璃背景迁移：面板自身透明（blur 层采样纯页面、白底随 surface 淡出），
    // 背景与 wui-glass 描边落在 surface 层。
    expect(getComputedStyle(panel!).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(surface.classList.contains('wui-glass')).toBe(true)
    expect(getComputedStyle(surface).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  })
})
