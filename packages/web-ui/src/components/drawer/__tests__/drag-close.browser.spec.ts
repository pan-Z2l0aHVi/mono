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
 *
 * `steps` 默认 10：判定零点在首个 pointermove（基准校准），单次 move 的
 * 整程位移会被它整体吸收，所以必须至少分两段才可能累积出位移。
 */
async function dragAndRelease(el: WebUiDrawer, delta: Delta, steps = 10) {
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

/**
 * 沿自定义轨迹拖拽：逐段显式给定 clientX 与事件 `timeStamp`。
 * 合成事件的时间戳可覆盖（`timeStamp` 是 Event 原型上的只读属性，实例上可遮蔽），
 * 于是「拖出 → 回扫」各段的间隔与整段时长都是确定的——判定只依赖「位移 + 整段时长」，
 * 用例因此与真实墙钟无关。`dragAndRelease` 走真实耗时，只覆盖单向匀速轨迹。
 */
async function dragPath(el: WebUiDrawer, path: { x: number; at: number }[]) {
  const zone = getDragZone(el)
  const y = 300
  const fire = (type: string, x: number, at: number) => {
    const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y })
    Object.defineProperty(event, 'timeStamp', { value: at, configurable: true })
    zone.dispatchEvent(event)
  }

  fire('pointerdown', path[0].x, path[0].at)
  await el.updateComplete
  for (const step of path.slice(1)) {
    fire('pointermove', step.x, step.at)
    await el.updateComplete
  }
  const last = path[path.length - 1]
  fire('pointerup', last.x, last.at)
  await el.updateComplete
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

    // 悬停窗口内的重复关闭意图：不再派发第二次请求。
    // 遮罩关闭是「pointerdown 落在遮罩 + 近静止 click」的指针链路；detail 为 0 的
    // dialog.click() 不来自指针，会被 drawer 忽略（对齐 image-preview 的守卫）。
    const dialog = getDialog(el)
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    dialog.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 20, clientY: 20 })
    )
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 20, clientY: 20 }))
    await el.updateComplete
    expect(events).toHaveLength(1)

    await settled(el)
    expect(el.open).toBe(true)
    expect(events).toHaveLength(1)
    theme.removeChild(el)
  })

  it('悬停等待期间原地重新抓取后松手：净位移为 0，不重复派发 open-change(false)', async () => {
    // theme motion=reduced 走即时终态路径，稳定停住悬停态（面板此时停在闭合位附近）。
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
    expect(events).toHaveLength(1)

    /*
     * 面板此刻停在「已越过距离阈值」的位置上。在原位重新抓取（不做任何拖动）再松手：
     * 判定用的是**净位移**（自抓取瞬间起算），
     * 所以这次松手既不满足距离判据也不满足甩动判据 → 弹回。
     * 若按绝对位置判（`_dragOffset > 阈值`，本仓旧行为），抓取瞬间的位置本身就过阈值，
     * 会立刻再派发一次 open-change(false)。
     */
    const zone = getDragZone(el)
    zone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 500, clientY: 300 })
    )
    await el.updateComplete
    zone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 500, clientY: 300 })
    )
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

  /*
   * 拖拽关闭判定的行为锁：判定零点与时钟都在首个 pointermove（基准校准），
   * 甩动看**整段手势**的平均速度（净位移 ÷ 时长、分母下限 50ms，时长为 0 则
   * 速度取 0），并在发生反向回撤后按「改主意」守卫拒绝甩动关闭。
   * 下面六条是该模型的锁：反向回扫不得关闭（被守卫拦下、净位移反向、折返点跟随、
   * 时长不可测四条路径），朝闭合方向的真甩动仍须关闭，且按下到首个 move 的位移不参与判定。
   */
  it('拖出后反向回扫松手：净速度达到甩动阈值但被「改主意」守卫拒绝，弹回打开位', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 复现「往边缘反向快速拖拽」（right 抽屉：向左拖出 = 打开方向，向右 = 闭合方向）。
     * 第一个 move 先向左拖出 120px（同时建立校准点），随后向右回扫到 +132px 松手。
     * 净位移 132px < 距离阈值（尺寸的一半 = 160px），整段平均速度 = 132px / 66ms =
     * 2000px/s ≥ 500px/s，单看甩动判据会关闭；但回扫让「自折返点起的位移」（42px）比
     * 方向确认时的位移（90px）少 48px ≥ 10px，本次手势被标记为「改主意」→ 弹回。
     * 旧实现用的是释放瞬间的 100ms 滑窗速度（16ms 内回扫 42px ⇒ 2600px/s）同样会误关。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 380, at: 1150 },
      { x: 470, at: 1200 },
      { x: 512, at: 1216 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('回扫到按下点附近：净位移仍朝闭合方向，但已反向回撤，弹回打开位', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 首个 move（520）只建立判定零点，随后向右拖到 700（净 +180px，方向就此确认），
     * 再向左回扫到 600 松手（净 +80px）。
     * 回撤使「自折返点起的位移」归零，比方向确认时的 180px 少 180px ≥ 10px → 标记
     * 「改主意」；净位移 80px 远未过 160px 的距离阈值，清理条件不会把它清掉。
     * 净位移 +80px 朝闭合方向、平均速度 80px / 20ms（分母下限 50ms）= 1600px/s，
     * 若没有「改主意」守卫拦下这次甩动，这条轨迹会关闭。
     * 本条不锁定折返点的跟随行为——禁用跟随后它仍为绿（结局由「自折返点起的位移」的取值
     * 决定），那条锁在下一用例。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 520, at: 1010 },
      { x: 700, at: 1020 },
      { x: 600, at: 1030 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('回撤把折返点一并带走：折返点跟随是「改主意」判定的前提', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 折返点的跟随行为只由这条钉住。
     * 净位移 150px < 距离阈值（尺寸的一半 = 160px），整段 15ms（按下限 50ms 计）⇒ 3000px/s
     * ≥ 500px/s，甩动判据本身成立，结局完全由「自折返点起的位移」决定：
     *   跟随（现状）：回撤到 560 时折返点一起过去，此刻自折返点起的位移为 0，比方向确认
     *     时的 60px 少 60px ≥ 10px ⇒ 标记「改主意」；松手时自折返点起 110px 仍未过 160px，
     *     清理条件不触发 ⇒ 弹回。
     *   不跟随：折返点恒为按下的 500，回撤时自折返点起 60px（差 0，不置位），松手时 170px
     *     > 160px ⇒ 清除标记 ⇒ 甩动关闭。
     * 所以折返点一旦停止跟随回撤，这条轨迹会从「弹回」翻成「关闭」。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 520, at: 1005 },
      { x: 580, at: 1010 },
      { x: 560, at: 1015 },
      { x: 670, at: 1020 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('朝闭合方向的快速甩动：位移不足距离阈值也仍按甩动关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 60px < 距离阈值（尺寸的一半 = 160px），唯一可能关闭的路径就是甩动：
     * 第一个 move 建立校准点，第二个 move 在 5ms 内再走 60px，分母按下限 50ms 计
     * 仍是 1200px/s ≥ 500px/s。单向无回撤，因此不触发「改主意」守卫。
     * 注意首个 move 到按下点的位移整体不参与判定（基准校准），
     * 所以一次手势至少要两个 move 才可能累积出位移。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 560, at: 1005 },
      { x: 620, at: 1010 }
    ])
    await waitFor(() => !el.open)

    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('位移零点在首个 move：按下到首个 move 的位移不计入距离判据', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 按下点在 500、首个 move 已到 560：这 60px 被基准校准吸收，判定只认
     * 560 → 700 的 140px < 160px。
     * 若从按下点起算（本仓旧行为），位移 200px 会越过阈值而关闭。
     * 整段耗时 400ms ⇒ 平均速度 350px/s < 500px/s，排除甩动分支的干扰。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 560, at: 1100 },
      { x: 700, at: 1500 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('时长不可测（首尾时间戳相同）：速度取 0，不得被读成甩动', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 判定时长为 0：首个 move（校准点）与松手取同一个 timeStamp。位移 100px 落在
     * 「能以甩动关闭、但不足以过距离阈值」的区间（尺寸的一半 = 160px）。
     * durationMs === 0 时速度算作 0；本仓旧写法用
     * 50ms 兜底做分母，会把 100px 放大成 2000px/s 而误关。本用例只构造了「首尾 timeStamp
     * 相同」这一种不可测来源；倒退会先在共享层被钳到 0（`Math.max(0, …)`）再走同一条
     * 守卫，属同一分支，故不再另立用例。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 560, at: 1010 },
      { x: 660, at: 1010 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
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

  /*
   * issue #123：释放后的收尾（弹回打开位 / 滑出到闭合位）已从 WAAPI 弹簧迁移为
   * CSS transition。下面三条是该迁移的验收锁，只认公开 DOM 面（transitionstart、
   * getAnimations、内联样式），不对 `element.animate` 打桩（§12 C1）。
   */
  it('收尾期间后代冒泡的 transform transitionend 不提前终结收尾', async () => {
    const el = createDrawer()
    // slot 内容：非 composed 的 transitionend 会经 slot 宿主链冒泡到本层 dialog。
    const slotted = document.createElement('div')
    el.append(slotted)
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    // 小位移慢速松手 → 弹回收尾（≥180ms）刚开始。
    await dragAndRelease(el, { x: 30, y: 0 }, 10)
    const dialog = getDialog(el)
    const settleDuration = dialog.style.getPropertyValue('--wui-internal-settle-duration')
    expect(dialog.classList.contains('is-settling')).toBe(true)

    // 后代自己的 transform 过渡结束：不能把本层收尾判定为完成（否则内联终值与
    // 收尾参数被提前清除，抽屉在半途瞬移回打开位）。
    slotted.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'transform' }))

    expect(dialog.classList.contains('is-settling')).toBe(true)
    expect(dialog.style.transform).not.toBe('')
    expect(dialog.style.getPropertyValue('--wui-internal-settle-duration')).toBe(settleDuration)

    await settled(el)
    expect(el.open).toBe(true)
  })

  it('释放后的收尾是 CSS transition，且不再创建 WAAPI 动画', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const dialog = getDialog(el)
    let snapshot: Animation[] = []
    dialog.addEventListener('transitionstart', event => {
      // 在回调内同步抓取：收尾是单次 CSS 过渡，等 waitFor 轮询到（帧边界）时它可能已经结束，
      // 那时 getAnimations() 为空，断言就退化成永不失败的常绿。
      if ((event as TransitionEvent).propertyName === 'transform') snapshot = dialog.getAnimations({ subtree: true })
    })

    // 小位移慢速松手 → 弹回路径，收尾过渡在弹回期间可观察（不进入关闭管线）。
    await dragAndRelease(el, { x: 30, y: 0 }, 10)
    await waitFor(() => snapshot.length > 0, 1000)

    // 收尾期间 dialog 上只有 CSS transition：没有 element.animate() 创建的动画对象。
    expect(snapshot.length).toBeGreaterThan(0)
    expect(snapshot.filter(animation => !(animation instanceof CSSTransition))).toHaveLength(0)

    await settled(el)
    expect(el.open).toBe(true)
  })

  it('弹回结束后交还 CSS 管辖：内联 transform 与收尾参数都被清除', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await dragAndRelease(el, { x: 30, y: 0 }, 10)
    // 等收尾真正交还 CSS：`getAnimations()` 为空发生在过渡结束的那一刻，可能早于
    // transitionend 被派发处理，直接等被断言的终态（内联样式被清除）才不会偶发抢跑。
    const dialog = getDialog(el)
    await waitFor(() => dialog.style.transform === '', 5000)

    expect(dialog.style.transform).toBe('')
    expect(dialog.style.getPropertyValue('--wui-internal-drag-backdrop-opacity')).toBe('')
    // 收尾时长/缓动是一次性的，不能残留到下一次开关。
    expect(dialog.style.getPropertyValue('--wui-internal-settle-duration')).toBe('')
  })

  it('弹回后走普通关闭路径仍触发 transform 过渡（内联残留回归锁）', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await dragAndRelease(el, { x: 30, y: 0 }, 10)

    // 弹回若残留 translateX(0px) 内联，会盖住闭合态 CSS transform：之后用
    // 按钮/遮罩/Esc 关闭时计算值恒为 0，开关都不再触发过渡。
    // 同上，等内联样式真正被清除再验证下一次关闭（getAnimations 为空会抢跑）。
    const dialog = getDialog(el)
    await waitFor(() => dialog.style.transform === '', 5000)
    const started: string[] = []
    dialog.addEventListener('transitionstart', event => started.push((event as TransitionEvent).propertyName))

    el.close()
    await waitFor(() => !el.open, 5000)
    // 程序化关闭时 `open` 先落 false，transform 过渡在下一帧才启动，所以必须等
    // transitionstart 真正派发后再断言（直接在 `!el.open` 后断言会读到空数组）。
    await waitFor(() => started.includes('transform'), 1000)
    expect(started).toContain('transform')
  })

  /*
   * 遮罩点击的按-放链路回溯：浏览器对「按下 → 拖动 → 松手」生成的 click 落在
   * 起点与松手点的**共同祖先** dialog 上，与真正的轻点遮罩从 click 自身无法区分
   * （真实指针下必现的误关路径，§C1/C2）。组件在 dialog 的 pointerdown 记录按下
   * 起点与坐标，click 只有「起点在遮罩上且位移在轻点量级内」才关闭。
   */
  describe('遮罩点击链路回溯', () => {
    function backdropDialog(el: WebUiDrawer): HTMLDialogElement {
      return getDialog(el)
    }
    function pressOn(el: WebUiDrawer, target: HTMLElement, x: number, y: number) {
      target.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y })
      )
      return el.updateComplete
    }

    it('从面板内容开始的 press–release 链路补发到 dialog 的 click：不关闭', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      const body = el.shadowRoot?.querySelector('.wui-drawer-body') as HTMLElement
      const dialog = backdropDialog(el)
      const rect = dialog.getBoundingClientRect()
      // 按下起点在面板内容上，click 带遮罩区域的松手坐标到达 dialog（浏览器按
      // 共同祖先派发的真实行为）：起点不在遮罩上，不得关闭。
      await pressOn(el, body, rect.left + 40, rect.top + 60)
      dialog.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, clientX: rect.left - 80, clientY: rect.top + 60 })
      )
      await el.updateComplete
      await settled(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
    })

    it('从遮罩开始的拖拽链路（位移超过轻点量级）的 click：不关闭', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      const dialog = backdropDialog(el)
      const rect = dialog.getBoundingClientRect()
      // 按下在遮罩上、拖出 100px 后松手：拖拽松手不是点遮罩。
      await pressOn(el, dialog, rect.left - 60, rect.top + 60)
      dialog.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, clientX: rect.left - 160, clientY: rect.top + 60 })
      )
      await el.updateComplete
      await settled(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
    })

    it('遮罩轻点（pointerdown 起点在遮罩 + 近静止 click）：仍关闭', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      const dialog = backdropDialog(el)
      const rect = dialog.getBoundingClientRect()
      await pressOn(el, dialog, rect.left - 60, rect.top + 60)
      dialog.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, clientX: rect.left - 58, clientY: rect.top + 61 })
      )
      await el.updateComplete
      // 关闭管线带退出过渡：等 open 落 false。
      await waitFor(() => !el.open && !dialog.open)

      expect(events.map(event => event.detail.open)).toEqual([false])
    })

    it('detail 为 0 的 click（程序化/键盘来源）不当作遮罩点击', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      const dialog = backdropDialog(el)
      const rect = dialog.getBoundingClientRect()
      // 有 pointerdown 记录在先，但 detail 0 的 click 不来自指针：
      // 若无该守卫，残留记录会被这类 click 消费而误关。
      await pressOn(el, dialog, rect.left - 60, rect.top + 60)
      dialog.click()
      await el.updateComplete
      await settled(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
    })
  })
})
