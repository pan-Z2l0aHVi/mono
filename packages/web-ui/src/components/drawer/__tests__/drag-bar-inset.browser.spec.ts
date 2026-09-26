import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { DrawerPlacement, WebUiDrawer } from '..'

const PLACEMENTS: DrawerPlacement[] = ['right', 'left', 'top', 'bottom']

/** 视口与 inset 在 CI 上可能是分数值，断言留半个像素容差。 */
const EPS = 0.5

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve))
}

/**
 * 等打开过渡收敛到终态几何。
 *
 * 不能只 `Promise.all(getAnimations().finished)`：presence 在 rAF 后才翻转开启动画，
 * 调用点上动画可能还没注册，`Promise.all([])` 立刻 resolve，于是量到中间帧。
 * bottom placement 的闭合位移是 `translateY(100% + inset)`，中间帧会把内缘读成负值。
 *
 * 判据取「dialog 矩形连续两次采样不再变化」而不是读 `getComputedStyle().transform`
 * 矩阵分量（§10 S2）：本用例量的就是几何本身，按几何收敛即可。
 */
async function waitForStableGeometry(el: WebUiDrawer, timeoutMs = 5000) {
  const dialog = getDialog(el)
  const start = performance.now()
  let previous = dialog.getBoundingClientRect()
  let stableSamples = 0
  while (stableSamples < 2) {
    await nextFrame()
    await new Promise(resolve => setTimeout(resolve, 32))
    const current = dialog.getBoundingClientRect()
    stableSamples =
      Math.abs(current.top - previous.top) < 0.01 &&
      Math.abs(current.bottom - previous.bottom) < 0.01 &&
      Math.abs(current.left - previous.left) < 0.01 &&
      Math.abs(current.right - previous.right) < 0.01
        ? stableSamples + 1
        : 0
    previous = current
    if (performance.now() - start > timeoutMs) throw new Error('drawer geometry did not settle')
  }
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragBar(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-bar') as HTMLElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

/**
 * 面板内缘到胶囊**近侧**的距离。负值表示胶囊有一截落在面板之外——
 * dialog 是 `overflow: visible`，这截不会被裁掉，而是骑在遮罩上被用户看成「把手跑到边缘外面」。
 */
function insetFromInnerEdge(placement: DrawerPlacement, bar: DOMRect, dialog: DOMRect): number {
  switch (placement) {
    case 'right':
      return bar.left - dialog.left
    case 'left':
      return dialog.right - bar.right
    case 'top':
      return dialog.bottom - bar.bottom
    case 'bottom':
      return bar.top - dialog.top
  }
}

interface Measurement {
  inset: number
  dialog: string
  bar: string
  center: string
  padding: string
}

async function measureInset(placement: DrawerPlacement, contentPadding?: string, thickness?: string) {
  const el = document.createElement('web-ui-drawer')
  // top/bottom placement 的 dialog 高度是 auto，没有内容时高度为 0，量不到有意义的胶囊几何。
  el.innerHTML = '<div style="width:240px;height:160px"></div>'
  if (contentPadding !== undefined) el.style.setProperty('--wui-drawer-content-padding', contentPadding)
  if (thickness !== undefined) el.style.setProperty('--wui-drawer-drag-bar-thickness', thickness)
  el.placement = placement
  el.draggable = true
  document.body.appendChild(el)
  el.open = true
  await el.updateComplete
  await waitForStableGeometry(el)
  const bar = getDragBar(el)
  const zone = getDragZone(el)
  const barRect = bar.getBoundingClientRect()
  const dialogRect = getDialog(el).getBoundingClientRect()
  const measurement: Measurement = {
    inset: insetFromInnerEdge(placement, barRect, dialogRect),
    dialog: `top=${dialogRect.top.toFixed(1)} bottom=${dialogRect.bottom.toFixed(1)} h=${dialogRect.height.toFixed(1)}`,
    bar: `top=${barRect.top.toFixed(1)} bottom=${barRect.bottom.toFixed(1)} h=${barRect.height.toFixed(1)}`,
    center: getComputedStyle(zone).getPropertyValue('--wui-internal-drag-bar-center').trim(),
    padding: getComputedStyle(el).getPropertyValue('--wui-drawer-content-padding').trim() || '(unset)'
  }
  el.remove()
  return measurement
}

// `vitest/valid-expect` 只放行字面量与模板字面量形式的 message，动态诊断串必须包一层模板字面量。
function explain(placement: DrawerPlacement, m: Measurement) {
  return `${placement}: 内缩 ${m.inset.toFixed(2)}px（center=${m.center} padding=${m.padding} dialog ${m.dialog} / bar ${m.bar}）`
}

afterEach(() => document.body.replaceChildren())

/*
 * drag bar 的视觉中线跟随 `--wui-drawer-content-padding`（取半值），并以半个胶囊厚度兜底。
 *
 * 回归的是共享组件缺陷：consumer 把 content padding 归零让媒体贴边铺满时，中线一度归零，
 * 4px 胶囊被算成 `left: -2px`，一半落在面板外。断言只取**行为后果**（胶囊相对面板内缘的位置），
 * 不读 `--wui-internal-drag-bar-center` 这类内部变量——jsdom 无布局，这类断言本来就只能在浏览器跑。
 */
describe('WebUiDrawer drag bar 内缘内缩（浏览器）', () => {
  it('content padding 归零时，胶囊仍完整落在面板内缘之内', async () => {
    for (const placement of PLACEMENTS) {
      const m = await measureInset(placement, '0px')
      expect(m.inset, `${explain(placement, m)}`).toBeGreaterThanOrEqual(-EPS)
    }
  })

  it('默认 content padding 下内缩保持 10px 中线（4px 胶囊 → 近侧 8px）', async () => {
    for (const placement of PLACEMENTS) {
      const m = await measureInset(placement)
      expect(Math.abs(m.inset - 8), `${explain(placement, m)}`).toBeLessThanOrEqual(EPS)
    }
  })

  it('下限跟随 --wui-drawer-drag-bar-thickness，不是写死的半个默认厚度', async () => {
    // 12px 胶囊 + 8px padding：半值 4px 小于下限 6px，下限应当兜住（内缩 0px）。
    const clamped = await measureInset('right', '8px', '12px')
    expect(Math.abs(clamped.inset), `${explain('right', clamped)}`).toBeLessThanOrEqual(EPS)
    // 同一胶囊 + 20px padding：半值 10px 大于下限 6px，仍走半值（内缩 10 - 6 = 4px）。
    const half = await measureInset('right', '20px', '12px')
    expect(Math.abs(half.inset - 4), `${explain('right', half)}`).toBeLessThanOrEqual(EPS)
  })

  it('热区厚度不受 content padding 影响，触控命中面积保持不变', async () => {
    for (const contentPadding of ['0px', undefined]) {
      const el = document.createElement('web-ui-drawer')
      el.placement = 'right'
      el.draggable = true
      el.style.setProperty('--wui-drawer-content-padding', contentPadding ?? '20px')
      document.body.appendChild(el)
      el.open = true
      await el.updateComplete
      await waitForStableGeometry(el)
      expect(Math.abs(getDragZone(el).getBoundingClientRect().width - 20)).toBeLessThanOrEqual(EPS)
      document.body.replaceChildren()
    }
  })
})
