import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'
import { realDoubleClick, waitForOpenTransition } from '@/shared/test-utils/real-gesture'

import type { WebUiDrawer } from '..'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const STEP_MS = 32
const OUTWARD_SIGN: Record<Placement, number> = { right: -1, left: 1, top: 1, bottom: -1 }

async function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  await pollUntil(condition, `Expected the drawer state to settle (budget ${timeoutMs}ms)`, timeoutMs)
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

function getDragEdge(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-edge') as HTMLElement
}

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

function openChangeEvents(el: WebUiDrawer): CustomEvent<{ open: boolean }>[] {
  const events: CustomEvent<{ open: boolean }>[] = []
  el.addEventListener('open-change', event => events.push(event as CustomEvent<{ open: boolean }>))
  return events
}

function fullAxisSize(placement: Placement): number {
  return (placement === 'left' || placement === 'right' ? window.innerWidth : window.innerHeight) - 16
}

function baseAxisSize(placement: Placement): number {
  return placement === 'left' || placement === 'right' ? 320 : 300
}

function currentAxisSize(el: WebUiDrawer, placement: Placement): number {
  const dialog = getDialog(el)
  return placement === 'left' || placement === 'right' ? dialog.offsetWidth : dialog.offsetHeight
}

async function waitForFullSize(el: WebUiDrawer, placement: Placement): Promise<void> {
  await waitFor(() => currentAxisSize(el, placement) >= fullAxisSize(placement) - 1)
}

async function waitForBaseSize(el: WebUiDrawer, placement: Placement): Promise<void> {
  const base = baseAxisSize(placement)
  await waitFor(() => Math.abs(currentAxisSize(el, placement) - base) < 2)
}

function outwardPoint(placement: Placement, x: number, y: number, amount: number) {
  const sign = OUTWARD_SIGN[placement]
  return placement === 'left' || placement === 'right' ? { x: x + sign * amount, y } : { x, y: y + sign * amount }
}

function firePointer(el: WebUiDrawer, type: string, x: number, y: number, at: number) {
  const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'timeStamp', { value: at, configurable: true })
  getDragZone(el).dispatchEvent(event)
}

async function dragPoints(el: WebUiDrawer, points: { x: number; y: number; at: number }[]) {
  const [first, ...rest] = points
  firePointer(el, 'pointerdown', first.x, first.y, first.at)
  await el.updateComplete
  for (const point of rest) {
    firePointer(el, 'pointermove', point.x, point.y, point.at)
    await el.updateComplete
  }
  const last = points[points.length - 1]
  firePointer(el, 'pointerup', last.x, last.y, last.at + STEP_MS)
  await el.updateComplete
}

afterEach(() => {
  document.getSelection()?.removeAllRanges()
  document.body.replaceChildren()
})

describe('WebUiDrawer fullable 双击 handle 切换全屏（浏览器）', () => {
  it.each([{ placement: 'right' }, { placement: 'left' }, { placement: 'top' }, { placement: 'bottom' }] as const)(
    '$placement：真实双击 drag zone 在全屏与默认尺寸间来回切换，且不派发 open-change',
    async ({ placement }) => {
      const el = createDrawer()
      el.placement = placement
      el.draggable = true
      el.fullable = true
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      await waitForBaseSize(el, placement)

      await realDoubleClick(getDragZone(el))
      await waitForFullSize(el, placement)
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
      expect(el.open).toBe(true)
      expect(getDialog(el).open).toBe(true)
      expect(events).toHaveLength(0)

      await realDoubleClick(getDragZone(el))
      await waitForBaseSize(el, placement)
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
      expect(el.open).toBe(true)
      expect(getDialog(el).open).toBe(true)
      expect(events).toHaveLength(0)
    }
  )

  it('bottom（带 header）与 top（带 footer）：真实双击端头 drag edge（胶囊区域）切换全屏与默认尺寸', async () => {
    for (const placement of ['bottom', 'top'] as const) {
      const el = createDrawer()
      el.placement = placement
      el.draggable = true
      el.fullable = true
      if (placement === 'bottom') {
        el.heading = 'Bottom drawer'
      } else {
        const footer = document.createElement('div')
        footer.slot = 'footer'
        footer.textContent = 'Footer'
        el.appendChild(footer)
      }
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      await realDoubleClick(getDragEdge(el))
      await waitForFullSize(el, placement)
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

      await realDoubleClick(getDragEdge(el))
      await waitForBaseSize(el, placement)
      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)

      el.remove()
    }
  })

  it('fullable=false 时双击 handle 不展开全屏，保持默认尺寸与打开态', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = false
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await realDoubleClick(getDragZone(el))
    await waitForFrame()
    await waitForFrame()

    expect(currentAxisSize(el, 'right')).toBeCloseTo(320, 0)
    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('fullable=true 时单击 handle 不触发全屏切换', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 500, clientY: 300 })
    )
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 500, clientY: 300 })
    )
    dragZone.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, detail: 1, clientX: 500, clientY: 300 }))
    await el.updateComplete
    await waitForFrame()

    expect(currentAxisSize(el, 'right')).toBeCloseTo(320, 0)
    expect(el.open).toBe(true)
  })

  it('与拖拽手势互通：双击进 full 后内拉回退到默认尺寸不误关；拖拽进 full 后双击恢复，再内拉可正常关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)

    // 1. 双击进入 full，再向闭合方向拖过恢复阈值（96px）：回到默认尺寸且不关闭。
    await realDoubleClick(getDragZone(el))
    await waitForFullSize(el, 'right')
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    await dragPoints(el, [
      { x: 100, y: 300, at: 0 },
      { x: 150, y: 300, at: STEP_MS },
      { x: 220, y: 300, at: 2 * STEP_MS }
    ])
    await waitForBaseSize(el, 'right')
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
    expect(el.open).toBe(true)
    expect(events).toHaveLength(0)

    // 2. 拖拽进入 full，再双击 handle 恢复默认尺寸。
    const origin = { x: 500, y: 300 }
    const outwardPoints = [{ ...origin, at: 0 }]
    for (const amount of [30, 60, 90, 150]) {
      outwardPoints.push({ ...outwardPoint('right', origin.x, origin.y, amount), at: outwardPoints.length * STEP_MS })
    }
    await dragPoints(el, outwardPoints)
    await waitForFullSize(el, 'right')
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    await realDoubleClick(getDragZone(el))
    await waitForBaseSize(el, 'right')
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
    expect(el.open).toBe(true)
    expect(events).toHaveLength(0)

    // 3. 恢复后新起手势向闭合方向拖过 35%（> 112px）应正常关闭。
    await dragPoints(el, [
      { x: 500, y: 300, at: 0 },
      { x: 580, y: 300, at: STEP_MS },
      { x: 660, y: 300, at: 2 * STEP_MS }
    ])
    await waitFor(() => !el.open && !getDialog(el).open)
    expect(events).toHaveLength(1)
    expect(events[0].detail.open).toBe(false)
  })

  it('嵌套下层 drawer 收到双击时不切换全屏，顶层双击正常切换', async () => {
    const parent = createDrawer()
    parent.draggable = true
    parent.fullable = true
    const child = document.createElement('web-ui-drawer') as WebUiDrawer
    child.draggable = true
    child.fullable = true
    parent.appendChild(child)

    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)

    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)

    // 合成 dblclick 直接打到下层 drag zone 也必须被守卫拦截。
    getDragZone(parent).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }))
    await parent.updateComplete
    await waitForFrame()
    expect(currentAxisSize(parent, 'right')).toBeCloseTo(320, 0)

    // 顶层真实双击正常切换全屏与恢复。
    await realDoubleClick(getDragZone(child))
    await waitForFullSize(child, 'right')
    await waitFor(() => getDialog(child).getAnimations({ subtree: true }).length === 0)

    await realDoubleClick(getDragZone(child))
    await waitForBaseSize(child, 'right')
    expect(child.open).toBe(true)
  })

  it('reduced-motion 下双击 handle 仍可立即切换全屏与默认尺寸', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduce')
    document.body.append(theme)

    const el = document.createElement('web-ui-drawer') as WebUiDrawer
    el.draggable = true
    el.fullable = true
    theme.append(el)

    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await realDoubleClick(getDragZone(el))
    await waitForFullSize(el, 'right')

    await realDoubleClick(getDragZone(el))
    await waitForBaseSize(el, 'right')
    expect(el.open).toBe(true)
  })
})
