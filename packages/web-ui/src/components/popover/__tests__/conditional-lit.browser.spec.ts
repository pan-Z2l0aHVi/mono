import { html, nothing, render } from 'lit'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getPortalPanel, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiPopover } from '..'

afterEach(() => document.body.replaceChildren())

// Lit 条件渲染经 render() 直写 popover light DOM：ChildPart 的 marker 注释留在宿主，
// 已提交内容位于两个 marker 之间；portal 迁移后内容物理位置在面板。
function mountLitPopover(template: ReturnType<typeof html>) {
  const mountPoint = document.createElement('div')
  document.body.append(mountPoint)
  const popover = document.createElement('web-ui-popover') as WebUiPopover
  popover.setAttribute('trigger', 'manual')
  popover.setAttribute('portal', '')
  mountPoint.append(popover)
  render(template, popover)
  return popover
}

describe('WebUiPopover portal 条件渲染边界（Lit，浏览器）', () => {
  it('打开期 lit 条件内容实时迁入面板并在关闭后恢复', async () => {
    const show = true
    const popover = mountLitPopover(
      html`<button slot="trigger">t</button>${show ? html`<p class="probe-flag">flag</p>` : nothing}`
    )
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()
    expect(document.querySelectorAll('.probe-flag').length).toBe(0)

    // 关闭恢复后 lit marker 完好，宿主内容复位，可继续翻转
    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(getPortalPanel()).toBeNull()
    expect(document.querySelectorAll('.probe-flag').length).toBe(1)
  })

  it('打开期 lit 条件翻 false：内容从面板移除且关闭后不复活', async () => {
    let show = true
    const popover = mountLitPopover(
      html`<button slot="trigger">t</button>${show ? html`<p class="probe-flag">flag</p>` : nothing}`
    )
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()

    // lit _$clear 以宿主 marker 邻位遍历：已迁移元素不在宿主，portal 必须把
    // 「marker 被框架摘除」识别为框架删除语义，清掉滞留面板的内容
    show = false
    render(html`<button slot="trigger">t</button>${show ? html`<p class="probe-flag">flag</p>` : nothing}`, popover)
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    // 关闭恢复不得把已删除内容复活回宿主
    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(document.querySelectorAll('.probe-flag').length).toBe(0)
  })

  it('打开期 lit 三元换元素：旧元素不滞留面板，新元素实时迁入', async () => {
    let show = true
    const template = () =>
      html`<button slot="trigger">t</button>${show ? html`<p class="probe-a">a</p>` : html`<p class="probe-b">b</p>`}`
    const popover = mountLitPopover(template())
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-a')).not.toBeNull()

    show = false
    render(template(), popover)
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(getPortalPanel()?.querySelector('.probe-b')).not.toBeNull()
    expect(getPortalPanel()?.querySelector('.probe-a')).toBeNull()

    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(document.querySelectorAll('.probe-a').length).toBe(0)
    expect(document.querySelectorAll('.probe-b').length).toBe(1)
  })

  it('打开期 lit 条件翻 true：新内容按宿主 marker 位迁入并跨关闭周期存活', async () => {
    let show = false
    const popover = mountLitPopover(
      html`<button slot="trigger">t</button>${show ? html`<p class="probe-flag">flag</p>` : nothing}`
    )
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    show = true
    render(html`<button slot="trigger">t</button>${show ? html`<p class="probe-flag">flag</p>` : nothing}`, popover)
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()
    expect(document.querySelectorAll('.probe-flag').length).toBe(0)

    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 400))
    expect(getPortalPanel()).toBeNull()
    expect(document.querySelectorAll('.probe-flag').length).toBe(1)
  })
})
