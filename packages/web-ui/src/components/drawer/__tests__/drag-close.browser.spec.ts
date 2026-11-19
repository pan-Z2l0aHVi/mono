import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'
import { waitForOpenTransition } from '@/shared/test-utils/real-gesture'

import type { WebUiDrawer } from '..'

// 轮询条件直至满足：WAAPI 动画在并行负载下完成时间不可预测，
// 固定 sleep 会偶发超时，这里以条件收敛代替固定等待。
async function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  await pollUntil(condition, `Expected the drawer state to settle (budget ${timeoutMs}ms)`, timeoutMs)
}

/** 等 dialog 上的动画全部收敛。 */
function settled(el: WebUiDrawer): Promise<void> {
  return waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0, 5000)
}

/**
 * dialog **自身**上在跑的动画（不含 subtree 后代）。
 *
 * 收尾是否还在进行，看的是本层的动画还在不在；后代自己的过渡与本层无关，
 * 混进来会把「已提前终结」误判成「仍在收尾」。
 */
function ownAnimations(el: WebUiDrawer): Animation[] {
  const dialog = getDialog(el)
  const motion = dialog.querySelector('.wui-drawer-motion')
  return dialog
    .getAnimations({ subtree: true })
    .filter(animation => (animation.effect as KeyframeEffect | null)?.target === motion)
}

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

/**
 * 关闭 button 按「有可访问名的 button」定位，不按名字字面量（对齐 dialog 套件政策与
 * drawer.spec.ts 的同名 helper）：具体文案走内置英文回退（ADR-0016）、可用
 * `aria-close-label` 覆盖，钉住 "Close" 字面量是假红类。要求是 button 形元素：
 * dialog 自身也可能带 `aria-label`（`aria-dialog-label`），只按「有可访问名」会拿错。
 */
function closeButton(el: WebUiDrawer): HTMLElement | null {
  return (
    [...(el.shadowRoot?.querySelectorAll<HTMLElement>('[aria-label]') ?? [])].find(
      node =>
        (node instanceof HTMLButtonElement ||
          node.tagName === 'WEB-UI-BUTTON' ||
          node.getAttribute('role') === 'button') &&
        node.getAttribute('aria-label')?.trim() !== ''
    ) ?? null
  )
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

// 定位器（非断言）：拖拽 drag zone 没有公开 role/aria，只能用内部 class 拿到它来派发指针事件（§12 C3）。
function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

type Delta = { x: number; y: number }

/**
 * 在拖拽区按下 → 移动 → 松手。合成事件直接派发到 drag zone，命中与起点坐标无关，
 * 只有**相对位移**参与判定。
 *
 * `steps` 默认 10：判定零点在 pointerdown（drag-controller.ts 的 `stageOrigin`），位移与
 * 甩动都自它起算。分多段的真正作用是压低手势层 100ms 滑窗的瞬时速度——每段位移小，
 * 「未达阈值须弹回」的用例才不会因段内速度被误判成 flick 而关闭。
 */
async function dragAndRelease(el: WebUiDrawer, delta: Delta, steps = 10) {
  const zone = getDragZone(el)
  const startX = 500
  const startY = 300
  // 判定读事件 timeStamp：逐段显式给 32ms 间隔，「慢拖」不依赖真实墙钟，
  // 也就不会因为负载把间隔拉长/压短而改变速度判定。
  const fire = (type: string, x: number, y: number, at: number) => {
    const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y })
    Object.defineProperty(event, 'timeStamp', { value: at, configurable: true })
    zone.dispatchEvent(event)
  }

  fire('pointerdown', startX, startY, 0)
  await el.updateComplete
  for (let step = 1; step <= steps; step += 1) {
    // 分多段走：单次合成 move 的整程速度会被判为 flick 而误关。
    fire('pointermove', startX + (delta.x * step) / steps, startY + (delta.y * step) / steps, step * 32)
    await el.updateComplete
  }
  fire('pointerup', startX + delta.x, startY + delta.y, steps * 32 + 32)
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
 * backdrop opacity 插值、橡皮筋钳位值、以及 `is-dragging` 状态类断言（§12 C1/C3）。
 *
 * `Element.animate` 的调用次数与 `fill: 'both'` option 属于实现细节打桩（不是公开契约），
 * 不做断言；「弹回后回到打开位」由 `el.open` + 原生 `dialog.open` 承担。
 */
describe('WebUiDrawer 拖拽关闭（浏览器）', () => {
  it('drawer panel 自身不夺焦，内置关闭 button 仍可聚焦', async () => {
    const el = createDrawer()
    el.closable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    getDialog(el).focus()
    // 焦点归宿是公开契约（§3 白名单）：panel 自身不抢焦点。
    expect(document.activeElement).not.toBe(getDialog(el))

    const close = closeButton(el)
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

    // 用户手势关闭与点击关闭 button 同语义：派发一次 open-change(false)
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
    const fire = (type: string, x: number, at: number) => {
      const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: 300 })
      Object.defineProperty(event, 'timeStamp', { value: at, configurable: true })
      zone.dispatchEvent(event)
    }
    fire('pointerdown', 500, 0)
    await el.updateComplete
    for (let step = 1; step <= 10; step += 1) {
      // 与 dragAndRelease 同一时序：32ms 一段的慢拖。
      fire('pointermove', 500 + step * 3, step * 32)
    }
    await el.updateComplete
    fire('pointercancel', 530, 352)
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

  it('controlled 悬停等待期间：Escape/backdrop 不重复派发 open-change(false)', async () => {
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

    expect(el.open).toBe(true)
    expect(events).toHaveLength(1)

    // 悬停窗口内的重复关闭意图：不再派发第二次请求。
    // backdrop 关闭是「pointerdown 落在 backdrop + 近静止 click」的指针链路；detail 为 0 的
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
    // theme motion=reduced 走即时终态路径，稳定停住悬停态（panel 此时停在闭合位附近）。
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
     * panel 此刻停在「已越过距离阈值」的位置上。在原位重新抓取（不做任何拖动）再松手：
     * 判定用的是**净位移**（自抓取瞬间起算），
     * 所以这次松手既不满足距离判据也不满足甩动判据 → 弹回。
     * 若按绝对位置判（`_dragOffset > 阈值`），抓取瞬间的位置本身就过阈值，
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

    el.open = false
    await el.updateComplete
    expect(el.open).toBe(false)

    await waitFor(() => !getDialog(el).open)
    expect(el.open).toBe(false)

    // 迟到的 pointerup 不触发收尾或事件（内部状态类不作断言）
    zone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 560, clientY: 300 })
    )
    await el.updateComplete
    expect(events).toHaveLength(0)
  })

  /*
   * 拖拽关闭判定的行为锁：判定零点与时钟都在 pointerdown（drag-controller.ts 的
   * `stageOrigin` / `dragInitialOffset`，`calibrateOnFirstMove` 为 false），甩动看
   * **整段手势**的平均速度（净位移 ÷ 时长、分母下限 50ms，时长为 0 则速度取 0），
   * 并在发生反向回撤后按「改主意」守卫拒绝甩动关闭。
   * 下面六条是该模型的锁：反向回扫不得关闭（被守卫拦下、净位移反向、折返点跟随、
   * 时长不可测四条路径），朝闭合方向的真甩动仍须关闭，且按下到首个 move 的位移计入判定。
   * 距离阈值 = 尺寸 × 0.35（320px 默认宽 → 112px，下限 10px）；甩动速度阈值 350px/s。
   */
  it('拖出后反向回扫松手：净速度达到甩动阈值但被「改主意」守卫拒绝，弹回打开位', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 复现「往边缘反向快速拖拽」（right drawer：向左拖出 = 打开方向，向右 = 闭合方向）。
     * 首段 move 向左拖出 120px（越过 10px 反向外拉阈值 → `swipeSawOutward` 置位），
     * 随后向右回扫到 512px 松手（自按下点 500 起净位移 +12px）。
     * 单看甩动判据会关闭：净速度 12px / 216ms ≈ 55px/s，但 100ms 滑窗与末次 move
     * 速度（16ms 内回扫 42px ⇒ 2600px/s）都远超 350px/s；距离阈值 112px 未过。
     * 净位移仍朝闭合方向（+12px > 0）+ `swipeSawOutward` → 「改主意」守卫置位 → 弹回。
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
     * 首个 move（520）朝闭合方向（净 +20px），随后拖到 700（净 +200px，峰值位移），
     * 再向左回扫到 600 松手（净 +100px）。
     * 自峰值回撤 100px ≥ 10px → 标记「改主意」；净位移 100px 未过 112px 的距离阈值，
     * 清理条件不会把它清掉。
     * 净位移 +100px 朝闭合方向、平均速度 100px / 30ms（分母下限 50ms）= 2000px/s ≥
     * 350px/s——若没有「改主意」守卫拦下这次甩动，这条轨迹会关闭。
     * 本条不锁定折返点的跟随行为——禁用跟随后它仍为绿（结局由「自峰值起的回撤」的取值
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

  it('回撤触发改主意：从关闭峰值回撤满 10px 后仍未过距离阈值，弹回打开位', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 净位移 90px < 距离阈值（320 * 0.35 = 112px），整段速度 >= 350px/s；
     * 中途从 +80px 峰值回撤 20px（>= 10px）触发「改主意」守卫，松手不得按甩动关闭。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 580, at: 1005 },
      { x: 560, at: 1010 },
      { x: 590, at: 1015 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('末段微抖 2px 不误判改主意：短距快甩正常关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 560, at: 1020 },
      { x: 558, at: 1030 }
    ])
    await waitFor(() => !el.open)

    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('朝闭合方向的快速甩动：位移不足距离阈值也仍按甩动关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    /*
     * 净位移 100px < 距离阈值（320 × 0.35 = 112px），唯一可能关闭的路径就是甩动：
     * 自按下点 500 起算，5ms 内两段共走 100px，整段平均速度按分母下限 50ms 计
     * = 2000px/s ≥ 350px/s（滑窗瞬时速度更高）。单向无回撤（峰值 = 位移），
     * 因此不触发「改主意」守卫。
     * 位移必须留在阈值之下：一旦越过 112px，距离判据自己就能关闭，
     * 这条就不再隔离甩动分支（删掉甩动判定它照样绿）。
     */
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 560, at: 1005 },
      { x: 600, at: 1010 }
    ])
    await waitFor(() => !el.open)

    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  /*
   * 按住后停顿/慢拖再快速甩出：末段 100ms 滑窗速度或释放前 120ms 移动速度达到阈值
   * 即可按甩动关闭（同时受「改主意」守卫约束，防止先往打开方向拉出再回扫误关）。
   */
  it('慢拖后末段快 flick：滑窗瞬时速度达到阈值，触发关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 500, at: 1400 },
      { x: 515, at: 1900 },
      { x: 530, at: 2400 },
      { x: 590, at: 2450 },
      { x: 590, at: 2460 }
    ])
    await waitFor(() => !el.open)

    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('位移从 pointerdown 起算：按下到首个 move 的短距位移计入判据，未达阈值仍弹回', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    // 总位移 90px < 112px（320 * 0.35），总时长 500ms ⇒ 速度 180px/s < 350px/s，弹回。
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 540, at: 1200 },
      { x: 590, at: 1500 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('时长不可测（首尾时间戳相同）：速度取 0，未达距离阈值不得被读成甩动', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    // 总位移 90px < 112px，首尾同时间戳 → duration = 0 → 速度取 0，弹回不关闭。
    await dragPath(el, [
      { x: 500, at: 1000 },
      { x: 540, at: 1000 },
      { x: 590, at: 1000 }
    ])
    await settled(el)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
  })

  it.each([
    { placement: 'right', close: { x: 600, y: 0 } },
    { placement: 'left', close: { x: -600, y: 0 } },
    { placement: 'bottom', close: { x: 0, y: 600 } },
    { placement: 'top', close: { x: 0, y: -600 } }
  ] as const)('闭合方向随 $placement：沿闭合方向拖过阈值关闭，反向拖弹回不关闭', async ({ placement, close }) => {
    const closing = createDrawer()
    closing.placement = placement
    closing.draggable = true
    closing.open = true
    await closing.updateComplete
    await waitForOpenTransition(closing)
    await dragAndRelease(closing, close, 8)
    await waitFor(() => !closing.open, 5000)
    expect(closing.open).toBe(false)
    closing.remove()

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
  })

  it('capture 提前丢失后：window 捕获层接管拖拽，松手收尾仍能关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const dialog = getDialog(el)

    // pointerdown 仍落在 drag zone（命中由事件派发目标决定，与坐标无关）
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
    // 先真正向 dragZone 派发 lostpointercapture，再把后续 move/up 派发到 body。
    getDragZone(el).dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }))
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
    await waitForFrame()
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
   * issue #123：释放后的收尾（弹回打开位 / 滑出到闭合位）由 CSS transition 承担。
   * 判据只取公开 DOM 面（transitionstart / getAnimations）与最终的
   * open 归宿 —— `is-settling`、内联 `transform`、`--wui-internal-settle-*` 这些
   * 收尾参数与状态类是内部实现，断言它们等于把实现抄回测试（政策第 6 条）。
   *
   * 可观察的失败形态是「panel 在半途瞬移」或「松手后没有回到打开位」，都由
   * `open` 与 transitionstart 承担。
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

    // 小位移慢速松手 → 弹回收尾刚开始。
    await dragAndRelease(el, { x: 30, y: 0 }, 10)
    expect(ownAnimations(el).length, '弹回收尾没有跑起来').toBeGreaterThan(0)

    // 后代自己的 transform 过渡结束：不能把本层收尾判定为完成。
    slotted.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'transform' }))

    // 提前终结的表现是内联终值被清掉、panel 瞬移回打开位 —— 即收尾动画当场消失。
    expect(ownAnimations(el).length, '后代 transitionend 提前终结了本层收尾').toBeGreaterThan(0)

    await settled(el)
    expect(el.open).toBe(true)
  })

  it('释放后的收尾是一条 CSS transition，不是脚本逐帧驱动的动画', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const dialog = getDialog(el)
    let snapshot: Animation[] = []
    dialog.addEventListener('transitionstart', event => {
      // 在回调内同步抓取：收尾是单次 CSS 过渡，等轮询到（帧边界）时它可能已经结束，
      // 那时 getAnimations() 为空，断言就退化成永不失败的常绿。
      if ((event as TransitionEvent).propertyName === 'transform') {
        snapshot = ownAnimations(el)
      }
    })

    await dragAndRelease(el, { x: 30, y: 0 }, 10)
    // 等 transitionstart 真正派发：这是「事件会不会来」的轮询，收紧预算只会让并行负载下
    // 偶发迟到的派发变成假红，用默认预算。
    await waitFor(() => snapshot.length > 0)

    // 收尾由 CSS transition 驱动时不会有 WAAPI 动画参与；若实现退回逐帧脚本动画，
    // 这里会看到非 CSSTransition 的条目。
    expect(snapshot.length).toBeGreaterThan(0)
    expect(snapshot.filter(animation => !(animation instanceof CSSTransition))).toHaveLength(0)

    await settled(el)
    expect(el.open).toBe(true)
  })

  it('弹回后走普通关闭路径仍触发 transform 过渡（内联残留回归锁）', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await dragAndRelease(el, { x: 30, y: 0 }, 10)

    // 弹回若残留 translateX(0px) 内联，会盖住闭合态 CSS transform：之后用
    // button/backdrop/Esc 关闭时计算值恒为 0，toggle 都不再触发过渡。
    // 等收尾真的结束（动画归零）再验证下一次关闭 —— 内联样式是否清干净不是判据，
    // 「下一次关闭还有没有过渡」才是。
    await settled(el)
    const started: string[] = []
    getDialog(el).addEventListener('transitionstart', event => started.push((event as TransitionEvent).propertyName))

    el.close()
    await waitFor(() => !el.open, 5000)
    // 程序化关闭时 `open` 先落 false，transform 过渡在下一帧才启动，所以必须等
    // transitionstart 真正派发后再断言（直接在 `!el.open` 后断言会读到空数组）。
    await waitFor(() => started.includes('transform'))
    expect(started).toContain('transform')
  })

  /*
   * backdrop 点击的按-放链路回溯：浏览器对「按下 → 拖动 → 松手」生成的 click 落在
   * 起点与松手点的**共同祖先** dialog 上，与真正的轻点 backdrop 从 click 自身无法区分
   * （真实指针下必现的误关路径，§C1/C2）。组件在 dialog 的 pointerdown 记录按下
   * 起点与坐标，click 只有「起点在 backdrop 上且位移在轻点量级内」才关闭。
   */
  describe('backdrop 点击链路回溯', () => {
    function backdropDialog(el: WebUiDrawer): HTMLDialogElement {
      return getDialog(el)
    }
    function pressOn(el: WebUiDrawer, target: HTMLElement, x: number, y: number) {
      target.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y })
      )
      return el.updateComplete
    }

    it('从 panel 内容开始的 press–release 链路补发到 dialog 的 click：不关闭', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      const body = el.shadowRoot?.querySelector('.wui-drawer-body') as HTMLElement
      const dialog = backdropDialog(el)
      const rect = dialog.getBoundingClientRect()
      // 按下起点在 panel 内容上，click 带 backdrop 区域的松手坐标到达 dialog（浏览器按
      // 共同祖先派发的真实行为）：起点不在 backdrop 上，不得关闭。
      await pressOn(el, body, rect.left + 40, rect.top + 60)
      dialog.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, clientX: rect.left - 80, clientY: rect.top + 60 })
      )
      await el.updateComplete
      await settled(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
    })

    it('从 backdrop 开始的拖拽链路（位移超过轻点量级）的 click：不关闭', async () => {
      const el = createDrawer()
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      const events = openChangeEvents(el)
      const dialog = backdropDialog(el)
      const rect = dialog.getBoundingClientRect()
      await pressOn(el, dialog, rect.left - 60, rect.top + 60)
      dialog.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, clientX: rect.left - 160, clientY: rect.top + 60 })
      )
      await el.updateComplete
      await settled(el)

      expect(el.open).toBe(true)
      expect(events).toHaveLength(0)
    })

    it('backdrop 轻点（pointerdown 起点在 backdrop + 近静止 click）：仍关闭', async () => {
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

    it('detail 为 0 的 click（程序化/键盘来源）不当作 backdrop 点击', async () => {
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
