import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'
import { queryA11y } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 等待打开过渡完成；固定 sleep 在 CI 高负载下会把未收敛的位移抓进拖拽起点。
async function waitForOpenTransition(el: WebUiDrawer) {
  await nextFrame()
  await Promise.all(
    getDialog(el)
      .getAnimations({ subtree: true })
      .map(animation => animation.finished)
  )
}

// 轮询条件直至满足：弹簧等 WAAPI 动画在并行负载下完成时间不可预测，
// 固定 sleep 会偶发超时，这里以条件收敛代替固定等待。
async function waitFor(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = performance.now()
  while (!condition()) {
    if (performance.now() - start > timeoutMs) throw new Error(`waitFor timeout after ${timeoutMs}ms`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

/** 等 dialog 上的动画全部收敛（替代原先「读位移是否归零」的几何轮询）。 */
function settled(el: WebUiDrawer): Promise<void> {
  return waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0, 5000)
}

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

// 定位器（非断言）：拖拽热区没有公开 role/aria，只能用内部 class 拿到它来派发指针事件（§12 C3）。
function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

type Delta = { x: number; y: number }

/**
 * 在拖拽区按下 → 移动 → 松手。合成事件直接派发到热区，命中与起点坐标无关，
 * 只有**相对位移**参与判定。
 */
async function dragAndRelease(el: WebUiDrawer, delta: Delta, steps = 1) {
  const zone = getDragZone(el)
  const startX = 500
  const startY = 300
  zone.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: startX, clientY: startY })
  )
  await el.updateComplete
  for (let step = 1; step <= steps; step += 1) {
    zone.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        isPrimary: true,
        // 分多段走：单次合成 move 的整程速度会被判为 flick 而误关（CI 慢环境）。
        clientX: startX + (delta.x * step) / steps,
        clientY: startY + (delta.y * step) / steps
      })
    )
    await new Promise(resolve => setTimeout(resolve, 32))
  }
  await el.updateComplete
  zone.dispatchEvent(
    new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      clientX: startX + delta.x,
      clientY: startY + delta.y
    })
  )
  await el.updateComplete
}

function openChangeEvents(el: WebUiDrawer): CustomEvent<{ open: boolean }>[] {
  const events: CustomEvent<{ open: boolean }>[] = []
  el.addEventListener('open-change', event => events.push(event as CustomEvent<{ open: boolean }>))
  return events
}

afterEach(() => document.body.replaceChildren())

/*
 * WebUiDrawer 拖拽关闭（浏览器）。
 *
 * 判据是 §12 C2：手势断言只留**阈值行为**（拖过阈值 → `open=false` + `open-change`）与
 * **归宿**（焦点、原生 dialog 的 open、事件次数），删掉拖动过程中的 `transform` 位移量、
 * 遮罩 opacity 插值、橡皮筋钳位值、以及 `is-dragging` 状态类断言（§12 C1/C3）。
 *
 * 原先还用 `vi.spyOn(dialog, 'animate')` 断言弹簧的调用次数与 `fill: 'both'` 选项——
 * 那是对 `Element.animate` 这一 DOM 方法的实现细节打桩（不是公开契约），删；
 * 「弹回后回到打开位」由 `el.open` + 原生 `dialog.open` 承担。
 */
describe('WebUiDrawer 拖拽关闭（浏览器）', () => {
  it('drawer 面板自身不夺焦，内置关闭按钮仍可聚焦', async () => {
    const el = createDrawer()
    el.closable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    getDialog(el).focus()
    // 焦点归宿是公开契约（§3 白名单）：面板自身不抢焦点。
    expect(document.activeElement).not.toBe(getDialog(el))

    const close = queryA11y(el, '[aria-label="关闭"]') as HTMLElement | null
    const nativeButton = close?.shadowRoot?.querySelector('button') as HTMLButtonElement | null
    nativeButton?.focus()
    expect(close?.shadowRoot?.activeElement).toBe(nativeButton)
  })

  it('超过阈值松手：走标准关闭管线（一次 open-change，原生 dialog 退出 top layer）', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await dragAndRelease(el, { x: 400, y: 0 })

    // 用户手势关闭与点击关闭按钮同语义：派发一次 open-change(false)
    await waitFor(() => !el.open)
    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('未达阈值松手：弹回打开位，open 保持 true', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    // 小位移 30px（< 尺寸/3），分 10 段慢拖避免被判 flick。
    await dragAndRelease(el, { x: 30, y: 0 }, 10)
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('pointercancel 未达阈值松手：弹回打开位，open 保持 true', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    const zone = getDragZone(el)
    zone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 500, clientY: 300 })
    )
    await el.updateComplete
    for (let step = 1; step <= 10; step += 1) {
      zone.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: 500 + step * 3,
          clientY: 300
        })
      )
      await new Promise(resolve => setTimeout(resolve, 32))
    }
    await el.updateComplete
    // 系统接管导致 pointercancel：与松手同语义，未达阈值则弹回。
    zone.dispatchEvent(
      new PointerEvent('pointercancel', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 530, clientY: 300 })
    )
    await el.updateComplete
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('controlled 拒绝回写：只派发 open-change 请求，open 与原生 dialog 都不变', async () => {
    const el = createDrawer()
    el.draggable = true
    el.controlled = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await dragAndRelease(el, { x: 400, y: 0 })
    await waitFor(() => events.length > 0)
    await settled(el)

    expect(el.open).toBe(true)
    expect(events).toHaveLength(1)
    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(true)
  })

  it('controlled 消费者回写 open=false：确认关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.controlled = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    el.addEventListener('open-change', event => {
      if (!(event as CustomEvent<{ open: boolean }>).detail.open) el.open = false
    })

    await dragAndRelease(el, { x: 400, y: 0 })
    await waitFor(() => !el.open)
    expect(getDialog(el).open).toBe(false)
  })

  it('controlled 悬停等待期间：Escape/遮罩不重复派发 open-change(false)', async () => {
    // theme motion=reduced 走即时终态路径，稳定进入悬停态
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    const el = document.createElement('web-ui-drawer')
    theme.append(el)
    el.controlled = true
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await dragAndRelease(el, { x: 400, y: 0 })

    // 悬停态已建立且派发过一次请求
    expect(el.open).toBe(true)
    expect(events).toHaveLength(1)

    // 悬停窗口内的重复关闭意图：不再派发第二次请求
    const dialog = getDialog(el)
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    dialog.click()
    await el.updateComplete
    expect(events).toHaveLength(1)

    await settled(el)
    expect(el.open).toBe(true)
    expect(events).toHaveLength(1)
    theme.removeChild(el)
  })

  it('拖拽进行中受控置 open=false：立即终结手势，迟到的 pointerup 不再触发事件', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    const zone = getDragZone(el)
    zone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 500, clientY: 300 })
    )
    await el.updateComplete
    zone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 560, clientY: 300 })
    )
    await el.updateComplete

    // 拖拽中途 Consumer 写入 open=false：手势立即终止，不再等待 pointerup
    el.open = false
    await el.updateComplete
    expect(el.open).toBe(false)

    // 关闭管线照常收敛
    await waitFor(() => !getDialog(el).open)
    expect(el.open).toBe(false)

    // 迟到的 pointerup 不再触发弹簧或事件（原实现断言 `is-dragging` 内部状态类）
    zone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 560, clientY: 300 })
    )
    await el.updateComplete
    expect(events).toHaveLength(0)
  })

  it('闭合方向随 placement：沿闭合方向拖过阈值关闭，反向拖弹回不关闭', async () => {
    const cases = [
      { placement: 'right', close: { x: 600, y: 0 } },
      { placement: 'left', close: { x: -600, y: 0 } },
      { placement: 'bottom', close: { x: 0, y: 600 } },
      { placement: 'top', close: { x: 0, y: -600 } }
    ] as const

    for (const { placement, close } of cases) {
      // 沿闭合方向：越过阈值 → 关闭
      const closing = createDrawer()
      closing.placement = placement
      closing.draggable = true
      closing.open = true
      await closing.updateComplete
      await waitForOpenTransition(closing)
      await dragAndRelease(closing, close, 8)
      await waitFor(() => !closing.open, 5000)
      expect(closing.open).toBe(false)

      // 反向：橡皮筋钳制在打开方向，松手弹回 → 仍打开
      const opening = createDrawer()
      opening.placement = placement
      opening.draggable = true
      opening.open = true
      await opening.updateComplete
      await waitForOpenTransition(opening)
      await dragAndRelease(opening, { x: -close.x, y: -close.y }, 8)
      await settled(opening)
      expect(opening.open).toBe(true)
      expect(getDialog(opening).open).toBe(true)
    }
  })

  it('capture 提前丢失后：window 捕获层接管拖拽，松手收尾仍能关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const dialog = getDialog(el)

    // pointerdown 仍落在热区（命中由事件派发目标决定，与坐标无关）
    getDragZone(el).dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        pointerId: 1,
        isPrimary: true,
        clientX: 1070,
        clientY: 393
      })
    )
    await el.updateComplete

    // 复现 Chromium 快速拖拽下 lostpointercapture 早于 up 的场景：
    // 事件按普通 hit-test 派发，不再经过 zone —— 直接派发到 body。
    // 先向打开方向甩（橡皮筋钳制），再向关闭方向甩过阈值。
    document.body.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        composed: true,
        pointerId: 1,
        isPrimary: true,
        clientX: 840,
        clientY: 393
      })
    )
    await nextFrame()
    document.body.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        composed: true,
        pointerId: 1,
        isPrimary: true,
        clientX: 1300,
        clientY: 393
      })
    )
    document.body.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        composed: true,
        pointerId: 1,
        isPrimary: true,
        clientX: 1300,
        clientY: 393
      })
    )

    // 若 window 层没接管，后续 move/up 全被忽略 → 不会关闭。
    await waitFor(() => !el.open, 5000)
    expect(el.open).toBe(false)
    expect(dialog.open).toBe(false)
  })
})
