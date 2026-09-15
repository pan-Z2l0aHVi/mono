import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'

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

  it('浮层面板单层玻璃：面板自身 opacity + backdrop-filter 插值过渡', async () => {
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
    expect(panel).toBeTruthy()
    // 单层玻璃：wui-glass 在面板自身，背景/阴影/blur 都由面板承担，
    // opacity + backdrop-filter（blur(0px)↔blur(4px)）+ transform 一起过渡。
    expect(panel!.classList.contains('wui-glass')).toBe(true)
    expect(getComputedStyle(panel!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(panel!).transitionProperty).toContain('opacity')
    expect(getComputedStyle(panel!).transitionProperty).toContain('backdrop-filter')
    expect(getComputedStyle(panel!).transitionProperty).toContain('transform')
    // blur 从 0px 插值到 4px：轮询到收敛再断言目标态。
    await pollUntil(() => getComputedStyle(panel!).backdropFilter.includes('blur(4px)'), 'blur did not converge')
    expect(getComputedStyle(panel!).backdropFilter).toContain('blur(4px)')
  })
})
