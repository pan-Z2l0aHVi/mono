import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 等待打开过渡（280ms）完成，dialog 进入 is-visible 稳定态。
async function waitForOpenTransition() {
  await new Promise(resolve => setTimeout(resolve, 350))
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

// 读取 dialog 的闭合方向位移（px）：闭合方向位移 = 轴向分量 × 闭合符号。
function getCloseOffset(el: WebUiDrawer): number {
  const transform = getComputedStyle(getDialog(el)).transform
  if (!transform || transform === 'none') return 0
  const matrix = new DOMMatrixReadOnly(transform)
  const horizontal = el.placement === 'left' || el.placement === 'right'
  const sign = el.placement === 'left' || el.placement === 'top' ? -1 : 1
  return (horizontal ? matrix.m41 : matrix.m42) * sign
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDrawer 拖拽关闭（浏览器）', () => {
  it('pointermove 实时跟手：transform 位移随指针变化', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dragZone = getDragZone(el)
    const startTransform = getComputedStyle(getDialog(el)).transform

    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    expect(getDialog(el).classList.contains('is-dragging')).toBe(true)

    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 160, clientY: 300 })
    )
    await el.updateComplete

    const draggedTransform = getComputedStyle(getDialog(el)).transform
    expect(draggedTransform).not.toBe(startTransform)
    // 右侧抽屉向右拖 60px，闭合位移应为 60
    expect(getCloseOffset(el)).toBeCloseTo(60, 0)

    // 遮罩跟手淡出：变量写入 dialog 并被 ::backdrop 继承（注册属性必须 inherits:true，
    // 否则到不了 backdrop —— H1 回归守卫）。60/320 拖拽进度 → 期望 ≈0.81。
    const backdropOpacity = Number.parseFloat(getComputedStyle(getDialog(el), '::backdrop').opacity)
    expect(backdropOpacity).toBeGreaterThan(0.6)
    expect(backdropOpacity).toBeLessThan(0.99)
  })

  it('超过阈值松手：弹簧关闭并走标准关闭管线', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const openChangeEvents: CustomEvent<{ open: boolean }>[] = []
    el.addEventListener('open-change', event => openChangeEvents.push(event as CustomEvent<{ open: boolean }>))

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    // 拖出 200px（> 320/3），松手
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )

    // 等待弹簧动画触发 onfinish → 关闭管线（轮询直至收敛）
    await waitFor(() => !el.open)
    // 用户手势关闭与点击关闭按钮同语义：派发一次 open-change(false)
    expect(openChangeEvents.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('未达阈值松手：弹回打开位，open 保持 true', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    // 小位移 30px（< 320/3）
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 130, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 130, clientY: 300 })
    )
    await el.updateComplete

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)

    // 等弹回完成：finishRebound 移除 is-dragging 才算收敛
    //（欠阻尼弹簧会穿过 2px，位移条件可能在中途提前满足）
    await waitFor(() => !getDialog(el).classList.contains('is-dragging'))
    await nextFrame()
    expect(getCloseOffset(el)).toBeLessThan(2)
  })

  it('controlled 拒绝回写：等待窗口超时后弹回打开位', async () => {
    const el = createDrawer()
    el.draggable = true
    el.controlled = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const openChangeEvents: CustomEvent<{ open: boolean }>[] = []
    el.addEventListener('open-change', event => openChangeEvents.push(event as CustomEvent<{ open: boolean }>))

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )

    // 等待弹簧动画完成 → onfinish 派发 open-change 请求（轮询直至收敛）
    await waitFor(() => openChangeEvents.length > 0)
    await el.updateComplete

    // 只派发请求，不修改 open
    expect(el.open).toBe(true)
    expect(openChangeEvents.map(event => event.detail.open)).toEqual([false])

    // Consumer 拒绝回写：等待窗口（120ms）+ 弹簧弹回。悬停建立时 is-dragging
    // 已移除、弹回期间重新加上，因此收敛条件用位移归零（轮询直到真正回位）。
    await waitFor(() => getCloseOffset(el) < 2, 4000)
    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
  })

  it('controlled 消费者回写 open=false：确认关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.controlled = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    el.addEventListener('open-change', event => {
      if (!(event as CustomEvent<{ open: boolean }>).detail.open) el.open = false
    })

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )
    await el.updateComplete

    // 等待弹簧动画触发 onfinish → open-change 请求 → 消费者回写 → 关闭管线（轮询直至收敛）
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
    await waitForOpenTransition()

    const openChangeEvents: CustomEvent<{ open: boolean }>[] = []
    el.addEventListener('open-change', event => openChangeEvents.push(event as CustomEvent<{ open: boolean }>))

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 200, clientY: 400 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 420, clientY: 400 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 420, clientY: 400 })
    )
    await el.updateComplete

    // 悬停态已建立且派发过一次请求
    expect(el.open).toBe(true)
    expect(openChangeEvents).toHaveLength(1)

    // 悬停窗口内的重复关闭意图：不再派发第二次请求
    const dialog = getDialog(el)
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    dialog.click()
    await el.updateComplete
    expect(openChangeEvents).toHaveLength(1)

    // 超时弹回后恢复正常的请求语义（仍 open，未被二次请求污染；reduced-motion
    // 下即时回位，无弹簧）
    await waitFor(() => getCloseOffset(el) < 2, 4000)
    expect(el.open).toBe(true)
    expect(openChangeEvents).toHaveLength(1)
    theme.removeChild(el)
  })

  it('拖拽进行中受控置 open=false：立即终结手势并走标准关闭管线', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dialog = getDialog(el)
    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 160, clientY: 300 })
    )
    await el.updateComplete
    expect(dialog.classList.contains('is-dragging')).toBe(true)

    // 拖拽中途 Consumer 写入 open=false：手势立即终止，不再等待 pointerup
    el.open = false
    await el.updateComplete
    expect(el.open).toBe(false)
    expect(dialog.classList.contains('is-dragging')).toBe(false)

    // 关闭管线照常收敛，迟到的 pointerup 不再触发弹簧或事件
    await waitFor(() => !dialog.open)
    expect(el.open).toBe(false)
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 160, clientY: 300 })
    )
    await el.updateComplete
    expect(dialog.classList.contains('is-dragging')).toBe(false)
  })

  it('left placement：闭合方向为向左拖', async () => {
    const el = createDrawer()
    el.draggable = true
    el.placement = 'left'
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    // 左侧抽屉向左拖 60px
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 40, clientY: 300 })
    )
    await el.updateComplete

    expect(getCloseOffset(el)).toBeCloseTo(60, 0)
  })

  it('top placement：沿 Y 轴闭合方向为向上拖', async () => {
    const el = createDrawer()
    el.draggable = true
    el.placement = 'top'
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dragZone = getDragZone(el)
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 200, clientY: 100 })
    )
    await el.updateComplete
    // 顶部抽屉向上拖 40px
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 200, clientY: 60 })
    )
    await el.updateComplete

    const transform = getComputedStyle(getDialog(el)).transform
    const matrix = new DOMMatrixReadOnly(transform)
    expect(-matrix.m42).toBeCloseTo(40, 0)
  })

  it('浮动卡片几何：静止态四周留边且圆角生效（right/bottom 抽查，非 draggable 也生效）', async () => {
    const el = createDrawer()
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const assertInsetCard = (rect: DOMRect) => {
      // 行为契约：四周存在可见留边（非贴边），具体数值不锁像素
      expect(rect.left).toBeGreaterThan(0)
      expect(rect.top).toBeGreaterThan(0)
      expect(window.innerWidth - rect.right).toBeGreaterThan(0)
      expect(window.innerHeight - rect.bottom).toBeGreaterThan(0)
    }

    const body = el.shadowRoot?.querySelector('.wui-drawer-body') as HTMLElement
    assertInsetCard(body.getBoundingClientRect())
    expect(getComputedStyle(body).borderRadius).not.toBe('0px')

    const bottom = createDrawer()
    bottom.placement = 'bottom'
    bottom.open = true
    await bottom.updateComplete
    await waitForOpenTransition()

    const bottomBody = bottom.shadowRoot?.querySelector('.wui-drawer-body') as HTMLElement
    assertInsetCard(bottomBody.getBoundingClientRect())
    expect(getComputedStyle(bottomBody).borderRadius).not.toBe('0px')
  })

  it('capture 提前丢失后：window 捕获层接管拖拽，跟手与松手收尾均不悬挂', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dialog = getDialog(el)
    const dragZone = getDragZone(el)

    dragZone.dispatchEvent(
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
    expect(dialog.classList.contains('is-dragging')).toBe(true)

    // 复现 Chromium 快速拖拽下 lostpointercapture 早于 up 的场景：
    // 事件按普通 hit-test 派发，不再经过 zone —— 直接派发到 body。
    // 向左甩 230px（打开方向），橡皮筋应触底钳制在 -32px（抽屉尺寸的 10%）。
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
    const clamped = getCloseOffset(el)
    expect(clamped).toBeLessThanOrEqual(-31.5)
    expect(clamped).toBeGreaterThanOrEqual(-32.5)

    // 松手同样落在 body：window 层收尾 —— 甩回关闭方向超阈值后弹簧关闭
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
    await waitFor(() => !el.open)

    expect(el.open).toBe(false)
    expect(dialog.classList.contains('is-dragging')).toBe(false)
    expect(dialog.open).toBe(false)
  })

  it('controlled 悬停闭合位越过留边补偿：dialog 完全位于视口之外', async () => {
    // theme motion=reduced 走即时终态路径，避免与回写等待窗口竞争（窗口仅 120ms）。
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    for (const placement of ['right', 'bottom'] as const) {
      const el = document.createElement('web-ui-drawer')
      theme.append(el)
      el.controlled = true
      el.placement = placement
      el.draggable = true
      el.open = true
      await el.updateComplete
      await waitForOpenTransition()

      const dragZone = getDragZone(el)
      dragZone.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 200, clientY: 400 })
      )
      await el.updateComplete
      // 闭合方向拖出 200px（> 尺寸/3），触发关闭判定
      const closeX = placement === 'right' ? 400 : 200
      const closeY = placement === 'bottom' ? 600 : 400
      dragZone.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: closeX,
          clientY: closeY
        })
      )
      await el.updateComplete
      dragZone.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: closeX,
          clientY: closeY
        })
      )
      await el.updateComplete

      // controlled 仅派发请求：状态仍 open，组件悬停在闭合位等待回写
      expect(el.open).toBe(true)
      const rect = getDialog(el).getBoundingClientRect()
      const horizontal = placement === 'right'
      const viewportEdge = horizontal ? window.innerWidth : window.innerHeight
      expect(horizontal ? rect.left : rect.top).toBeGreaterThanOrEqual(viewportEdge - 0.5)

      theme.removeChild(el)
    }
  })
})
