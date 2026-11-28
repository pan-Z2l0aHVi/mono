import '../index'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiDrawer } from '../index'

const mounted: WebUiDrawer[] = []

afterEach(() => {
  for (const el of mounted.splice(0)) el.remove()
})

async function mountDrawer(attrs: Record<string, string | boolean>): Promise<WebUiDrawer> {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  for (const [key, value] of Object.entries(attrs)) {
    if (value === true) el.setAttribute(key, '')
    else if (typeof value === 'string') el.setAttribute(key, value)
  }
  el.style.setProperty('--wui-drawer-width', '480px')
  el.style.setProperty('--wui-drawer-content-padding', '0px')
  el.style.setProperty('--wui-drawer-drag-zone-size', '32px')
  document.body.append(el)
  mounted.push(el)
  await el.updateComplete
  const motion = el.shadowRoot?.querySelector<HTMLElement>('.wui-drawer-motion')
  if (motion) motion.style.transition = 'none'
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => requestAnimationFrame(resolve))
  return el
}

describe('web-ui-drawer drag-handle-only（真实浏览器）', () => {
  it('默认（dragHandleOnly=false）时拖拽热区覆盖整条内缘，开启后仅收敛在 handle 胶囊附近且不遮挡底部控件', async () => {
    const fullEdge = await mountDrawer({ open: true, placement: 'right', draggable: true })
    const fullZone = fullEdge.shadowRoot!.querySelector<HTMLElement>('.wui-drawer-drag-zone')!
    const fullPanel = fullEdge.shadowRoot!.querySelector<HTMLElement>('.wui-drawer-motion')!
    expect(fullEdge.dragHandleOnly).toBe(false)
    expect(Math.round(fullZone.getBoundingClientRect().height)).toBe(
      Math.round(fullPanel.getBoundingClientRect().height)
    )
    expect(getComputedStyle(fullZone).cursor).toBe('grab')
    fullEdge.remove()

    const handleOnly = await mountDrawer({
      open: true,
      placement: 'right',
      draggable: true,
      'drag-handle-only': true
    })
    const bottomLeftButton = document.createElement('button')
    bottomLeftButton.type = 'button'
    bottomLeftButton.textContent = 'Play'
    bottomLeftButton.style.cssText = 'position:absolute;left:0;bottom:0;width:36px;height:44px;cursor:pointer;'
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:relative;width:100%;height:100%;'
    wrapper.append(bottomLeftButton)
    handleOnly.append(wrapper)
    await handleOnly.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const zone = handleOnly.shadowRoot!.querySelector<HTMLElement>('.wui-drawer-drag-zone')!
    const bar = handleOnly.shadowRoot!.querySelector<HTMLElement>('.wui-drawer-drag-bar')!
    const zoneRect = zone.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    const btnRect = bottomLeftButton.getBoundingClientRect()

    expect(handleOnly.dragHandleOnly).toBe(true)
    // 热区高度收敛到胶囊 56px + 上下各 8px = 72px，完整包裹胶囊且远小于整条抽屉高度
    expect(Math.round(zoneRect.height)).toBe(72)
    expect(zoneRect.top).toBeLessThanOrEqual(barRect.top)
    expect(zoneRect.bottom).toBeGreaterThanOrEqual(barRect.bottom)
    expect(getComputedStyle(zone).cursor).toBe('grab')

    // 左下角按钮不被热区遮挡，命中测试直接落在按钮上且 cursor 为 pointer
    const hitAtButton = document.elementFromPoint(btnRect.left + 12, btnRect.top + 12)
    expect(hitAtButton).toBe(bottomLeftButton)
    expect(getComputedStyle(bottomLeftButton).cursor).toBe('pointer')

    // 中部 handle 处仍落在 shadow 内 .wui-drawer-drag-zone 上
    const hitAtHandle = handleOnly.shadowRoot!.elementFromPoint(
      zoneRect.left + zoneRect.width / 2,
      zoneRect.top + zoneRect.height / 2
    )
    expect(hitAtHandle).toBe(zone)
  })
})
