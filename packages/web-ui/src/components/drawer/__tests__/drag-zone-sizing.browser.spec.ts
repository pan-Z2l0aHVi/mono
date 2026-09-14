import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 等待打开过渡完成；固定 sleep 在 CI 高负载下会抓到未收敛的几何。
async function waitForOpenTransition(el: WebUiDrawer) {
  await nextFrame()
  await Promise.all(
    getDialog(el)
      .getAnimations({ subtree: true })
      .map(animation => animation.finished)
  )
}

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

function getDragBar(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-bar') as HTMLElement
}

function px(value: string): number {
  return Number.parseFloat(value)
}

// zone 与 dialog 内缘（面向屏幕中心的一侧）的贴合间隙，恒为非负的小数值。
function innerEdgeGap(placement: WebUiDrawer['placement'], zoneRect: DOMRect, dialogRect: DOMRect): number {
  if (placement === 'right') return zoneRect.left - dialogRect.left
  if (placement === 'left') return dialogRect.right - zoneRect.right
  if (placement === 'top') return zoneRect.bottom - dialogRect.bottom
  return dialogRect.top - zoneRect.top
}

function innerEdgeBarCenter(placement: WebUiDrawer['placement'], barRect: DOMRect, dialogRect: DOMRect): number {
  if (placement === 'right') return barRect.left + barRect.width / 2 - dialogRect.left
  if (placement === 'left') return dialogRect.right - (barRect.left + barRect.width / 2)
  if (placement === 'top') return dialogRect.bottom - (barRect.top + barRect.height / 2)
  return barRect.top + barRect.height / 2 - dialogRect.top
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer drag zone 尺寸与 token（浏览器）', () => {
  it('默认规格：zone 20px、bar 4×56px、胶囊圆角', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const zoneStyle = getComputedStyle(getDragZone(el))
    expect(px(zoneStyle.width)).toBeCloseTo(20, 0)

    const barStyle = getComputedStyle(getDragBar(el))
    expect(px(barStyle.width)).toBeCloseTo(4, 0)
    expect(px(barStyle.height)).toBeCloseTo(56, 0)
    // 胶囊形：圆角不小于一半厚度（calc(infinity * 1px) 计算为天文数字长度）
    expect(px(barStyle.borderRadius)).toBeGreaterThanOrEqual(2)
    // 视觉中线位于 --wui-drawer-content-padding（默认 20px）的中央
    expect(
      innerEdgeBarCenter('right', getDragBar(el).getBoundingClientRect(), getDialog(el).getBoundingClientRect())
    ).toBeCloseTo(10, 1)
  })

  it('三个 token 均可覆盖默认值', async () => {
    const el = createDrawer()
    el.draggable = true
    el.style.setProperty('--wui-drawer-drag-zone-size', '48px')
    el.style.setProperty('--wui-drawer-drag-bar-thickness', '10px')
    el.style.setProperty('--wui-drawer-drag-bar-length', '90px')
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    expect(px(getComputedStyle(getDragZone(el)).width)).toBeCloseTo(48, 0)
    const barStyle = getComputedStyle(getDragBar(el))
    expect(px(barStyle.width)).toBeCloseTo(10, 0)
    expect(px(barStyle.height)).toBeCloseTo(90, 0)
  })

  it('四 placement：zone 贴内缘、bar 靠边缘且横纵轴向尺寸正确', async () => {
    for (const placement of ['right', 'left', 'top', 'bottom'] as const) {
      const el = createDrawer()
      el.draggable = true
      el.placement = placement
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const zone = getDragZone(el)
      const bar = getDragBar(el)
      const horizontal = placement === 'right' || placement === 'left'
      const zoneStyle = getComputedStyle(zone)
      const barStyle = getComputedStyle(bar)

      // 闭合方向轴上的热区厚度 = zone size；另一轴铺满抽屉
      expect(px(horizontal ? zoneStyle.width : zoneStyle.height)).toBeCloseTo(20, 0)
      // bar 长边沿抽屉边缘方向，短边沿闭合方向
      expect(px(horizontal ? barStyle.width : barStyle.height)).toBeCloseTo(4, 0)
      expect(px(horizontal ? barStyle.height : barStyle.width)).toBeCloseTo(56, 0)

      // 命中区域贴在抽屉内缘（面向屏幕中心的一侧）
      const gap = innerEdgeGap(placement, zone.getBoundingClientRect(), getDialog(el).getBoundingClientRect())
      expect(gap).toBeLessThanOrEqual(0.5)
      expect(gap).toBeGreaterThanOrEqual(-0.5)
      expect(
        innerEdgeBarCenter(placement, bar.getBoundingClientRect(), getDialog(el).getBoundingClientRect())
      ).toBeCloseTo(10, 1)
    }
  })

  it('token 覆盖在 top placement 下作用于高度轴', async () => {
    const el = createDrawer()
    el.draggable = true
    el.placement = 'top'
    el.style.setProperty('--wui-drawer-drag-zone-size', '40px')
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const zoneStyle = getComputedStyle(getDragZone(el))
    expect(px(zoneStyle.height)).toBeCloseTo(40, 0)
    expect(px(zoneStyle.width)).toBeCloseTo(getDialog(el).getBoundingClientRect().width, 0)
  })
})
