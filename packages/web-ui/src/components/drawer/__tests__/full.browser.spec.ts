import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'
import { waitForOpenTransition } from '@/shared/test-utils/real-gesture'
import { setViewport } from '@/shared/test-utils/viewport'

import type { WebUiDrawer } from '..'

// 轮询条件直至满足：尺寸过渡 280ms 在并行负载下完成时间不可预测，
// 以条件收敛代替固定等待。
async function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  await pollUntil(condition, `Expected the drawer state to settle (budget ${timeoutMs}ms)`, timeoutMs)
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

function getMotionLayer(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-motion') as HTMLElement
}

function visibleCloseAxisSize(el: WebUiDrawer, placement: Placement): number {
  const rect = getMotionLayer(el).getBoundingClientRect()
  if (placement === 'left' || placement === 'right') {
    return Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0))
  }
  return Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0))
}

function dragAxisTranslate(el: WebUiDrawer, placement: Placement): number {
  const transform = getComputedStyle(getMotionLayer(el)).transform
  if (!transform || transform === 'none') return 0
  const matrix = new DOMMatrixReadOnly(transform)
  return placement === 'left' || placement === 'right' ? matrix.m41 : matrix.m42
}

function backdropOpacity(el: WebUiDrawer): number {
  return Number.parseFloat(getComputedStyle(getDialog(el), '::backdrop').opacity)
}

function pressEscape(dialog: HTMLDialogElement) {
  dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, key: 'Escape' }))
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

/** 在 web-ui-theme 作用域内挂载 drawer；motion 传 'reduce' 时吸附无尺寸动画。 */
function mountDrawer(motion: string | null): WebUiDrawer {
  let parent: HTMLElement = document.body
  if (motion) {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', motion)
    document.body.append(theme)
    parent = theme
  }
  const el = document.createElement('web-ui-drawer')
  parent.append(el)
  return el
}

type Placement = 'right' | 'left' | 'top' | 'bottom'

async function withViewport(width: number, height: number, run: () => Promise<void>) {
  const before = { width: window.innerWidth, height: window.innerHeight }
  try {
    await setViewport(width, height)
    await run()
  } finally {
    await setViewport(before.width, before.height)
  }
}

/** 释放后立即暂停 rebound 的 transform 过渡，并将其推进到指定区间。 */
async function pauseReboundAfterRelease(
  el: WebUiDrawer,
  x: number,
  y: number,
  at: number,
  accepts: (translate: number) => boolean
) {
  // 先强制读取当前 transform，让 CSS transition 以拖拽帧为 before-change style。
  void getComputedStyle(getMotionLayer(el)).transform
  firePointer(el, 'pointerup', x, y, at)
  const transition = getMotionLayer(el)
    .getAnimations()
    .find(animation => (animation as Animation & { transitionProperty?: string }).transitionProperty === 'transform')
  if (!transition) throw new Error('Expected an active rebound transform transition')
  transition.pause()
  const duration = Number(transition.effect?.getComputedTiming().duration)
  for (let step = 1; step <= 20; step++) {
    transition.currentTime = (duration * step) / 20
    await waitForFrame()
    if (accepts(dragAxisTranslate(el, 'right'))) return
  }
  throw new Error(`Rebound transform ${dragAxisTranslate(el, 'right')}px did not enter the expected range`)
}

// 外拉方向系数：外拉 = 背离闭合方向。正量 = 向外。
const OUTWARD_SIGN: Record<Placement, number> = { right: -1, left: 1, top: 1, bottom: -1 }

function outwardPoint(placement: Placement, x: number, y: number, amount: number) {
  const sign = OUTWARD_SIGN[placement]
  return placement === 'left' || placement === 'right' ? { x: x + sign * amount, y } : { x, y: y + sign * amount }
}

// full 态的公开几何：视口 − 2×留边（默认 inset 8px）。左右看宽、上下看高。
function fullAxisSize(placement: Placement): number {
  return (placement === 'left' || placement === 'right' ? window.innerWidth : window.innerHeight) - 16
}

function currentAxisSize(el: WebUiDrawer, placement: Placement): number {
  const dialog = getDialog(el)
  return placement === 'left' || placement === 'right' ? dialog.offsetWidth : dialog.offsetHeight
}

const STEP_MS = 32

/*
 * 合成指针事件（与 drag-close.browser.spec 同一约定）：直接派发到 drag zone，
 * 命中与起点坐标无关，只有相对位移与时间戳参与判定；timeStamp 逐段显式给定，
 * 用例与真实墙钟无关。`holdAndMove` 不派发 pointerup——「不松手即吸附」与
 * 「同一按住的两段式」需要保持按住状态。
 *
 * 判定零点在 **pointerdown**（drag-controller.ts 的 `stageOrigin`，`calibrateOnFirstMove`
 * 为 false）：所有行程坐标按「自按下点的相对位移」推算；enter-full 吸附时零点重定到
 * 吸附那一段的 move 位置。
 */
function firePointer(el: WebUiDrawer, type: string, x: number, y: number, at: number) {
  const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'timeStamp', { value: at, configurable: true })
  getDragZone(el).dispatchEvent(event)
}

async function holdAndMove(el: WebUiDrawer, points: { x: number; y: number; at: number }[]) {
  const [first, ...rest] = points
  firePointer(el, 'pointerdown', first.x, first.y, first.at)
  await el.updateComplete
  for (const point of rest) {
    firePointer(el, 'pointermove', point.x, point.y, point.at)
    await el.updateComplete
  }
}

/** 按住状态下追加 move（不派发 pointerdown）：两段式用例在中途断言后继续同一手势。 */
async function continueMove(el: WebUiDrawer, points: { x: number; y: number; at: number }[]) {
  for (const point of points) {
    firePointer(el, 'pointermove', point.x, point.y, point.at)
    await el.updateComplete
  }
}

async function releaseAt(el: WebUiDrawer, x: number, y: number, at: number) {
  firePointer(el, 'pointerup', x, y, at)
  await el.updateComplete
}

/**
 * 拉到 full 并松手（各测试的公共前置）：零点在按下点，随后外拉
 * 30/60/90/150px（32ms 步距），最后一段越过 96px 行程阈值触发吸附；松手后
 * full 态弹回即保持。
 */
async function pullToFullAndRelease(el: WebUiDrawer, placement: Placement): Promise<void> {
  const origin = { x: 500, y: 300 }
  const points: { x: number; y: number; at: number }[] = [{ ...origin, at: 0 }]
  for (const amount of [30, 60, 90, 150]) {
    const point = outwardPoint(placement, origin.x, origin.y, amount)
    points.push({ ...point, at: points.length * STEP_MS })
  }
  await holdAndMove(el, points)
  const last = points[points.length - 1]
  await releaseAt(el, last.x, last.y, points.length * STEP_MS)
  // full 态弹回（translate 归零）+ 宽度展开收敛。
  await waitFor(() => currentAxisSize(el, placement) >= fullAxisSize(placement) - 1)
}

/** 等尺寸回到 base（--wui-drawer-width 默认 320 / 高度 300）：exit-full 或关闭重开后用。 */
async function waitForBaseSize(el: WebUiDrawer, placement: Placement): Promise<void> {
  const base = placement === 'left' || placement === 'right' ? 320 : 300
  await waitFor(() => Math.abs(currentAxisSize(el, placement) - base) < 2)
}

/*
 * 下层 motion 层的露边偏移期望值：`peekBase`（CSS 注册的 `--wui-drawer-nested-peek-base`，
 * JS 常量钉进 initialValue）× `Math.log(depth + 1)`——公式镜像
 * shared/overlay/nested-drawer-layers.ts 的 `readPeekBase(dialog) * Math.log(depth + 1)`；
 * 本文件的下层恒为第 1 层，故 ln(2)。改公式/换 retreat 曲线时这里同步。
 */
function expectedNestedMotionLeft(el: WebUiDrawer): number {
  const dialog = getDialog(el)
  const peekBase = Number.parseFloat(getComputedStyle(dialog).getPropertyValue('--wui-drawer-nested-peek-base'))
  return dialog.getBoundingClientRect().left - peekBase * Math.log(2)
}

afterEach(() => document.body.replaceChildren())

/*
 * WebUiDrawer fullable 两段手势（浏览器）。
 *
 * 判据沿用 drag-close 的裁剪纪律：断言公开几何（dialog 的 offsetWidth/Height 贴满
 * 视口减留边、回到 base 尺寸）与归宿（open、原生 dialog、open-change 次数），
 * 不锁 is-full 状态类。吸附是否发生、是否恢复原尺寸、是否误关，主要由尺寸与
 * open 承载；非零 initial 的连续性只在受控 raw 点采样 computed transform。
 */
describe('WebUiDrawer fullable 拖拽全屏（浏览器）', () => {
  it.each([{ placement: 'right' }, { placement: 'left' }, { placement: 'top' }, { placement: 'bottom' }] as const)(
    '$placement：外拉过行程阈值不松手即吸附全屏（视口 − 2×留边）',
    async ({ placement }) => {
      const el = createDrawer()
      el.placement = placement
      el.draggable = true
      el.fullable = true
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)

      // 零点在按下点，随后外拉 30/60/90/150px：第 4 段越过 96px 阈值，此时仍按住。
      const origin = { x: 500, y: 300 }
      const points: { x: number; y: number; at: number }[] = [{ ...origin, at: 0 }]
      for (const amount of [30, 60, 90, 150]) {
        const point = outwardPoint(placement, origin.x, origin.y, amount)
        points.push({ ...point, at: points.length * STEP_MS })
      }
      await holdAndMove(el, points)

      await waitFor(() => currentAxisSize(el, placement) >= fullAxisSize(placement) - 1)
      expect(el.open).toBe(true)
      expect(getDialog(el).open).toBe(true)

      // 按住状态下松手前的回拉归零由 pointerup 路径收尾，这里直接弹开。
      const last = points[points.length - 1]
      await releaseAt(el, last.x, last.y, points.length * STEP_MS)
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
      expect(el.open).toBe(true)
      expect(currentAxisSize(el, placement)).toBeGreaterThanOrEqual(fullAxisSize(placement) - 1)
    }
  )

  it('同一按住的两段式：base → full → 回拉 220px 后松手停在 base', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    // 零点 = 首个 move（500）。外拉 30/60/90/150（第 4 段越 96 阈值 → 吸附，
    // 原点重定到 350）。
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS },
      { x: 440, y: 300, at: 2 * STEP_MS },
      { x: 410, y: 300, at: 3 * STEP_MS },
      { x: 350, y: 300, at: 4 * STEP_MS }
    ])

    // 中途吸附确已发生（此时仍按住）。
    await waitFor(() => currentAxisSize(el, 'right') >= fullAxisSize('right') - 1)

    // 同一按住内拉 120px 越恢复阈值，继续到 220px 也只按阻尼跟手，不关闭。
    await continueMove(el, [
      { x: 470, y: 300, at: 5 * STEP_MS },
      { x: 530, y: 300, at: 6 * STEP_MS },
      { x: 570, y: 300, at: 7 * STEP_MS }
    ])
    await waitForBaseSize(el, 'right')
    expect(el.open).toBe(true)
    await releaseAt(el, 570, 300, 600)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
    await waitForBaseSize(el, 'right')
  })

  it('full 态松手：保持 open 与 full，无收尾残留', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await pullToFullAndRelease(el, 'right')
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
    expect(currentAxisSize(el, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)
  })

  it('headless：吸附为精确 100vw（inset 归零）', async () => {
    const el = createDrawer()
    el.headless = true
    el.draggable = true
    el.fullable = true
    // headless 宽度 auto 由内容撑出，给一块固定内容作为 base 尺寸。
    const content = document.createElement('div')
    content.style.width = '300px'
    content.style.height = '200px'
    el.append(content)
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await pullToFullAndRelease(el, 'right')
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(Math.abs(getDialog(el).offsetWidth - window.innerWidth)).toBeLessThanOrEqual(1)
    expect(el.open).toBe(true)
  })

  it('theme motion=reduced：吸附与恢复无尺寸动画（token 归零的公开契约）', async () => {
    const el = mountDrawer('reduced')
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const sizeTransitions: string[] = []
    getDialog(el).addEventListener('transitionstart', event => {
      const property = (event as TransitionEvent).propertyName
      if (property === 'width' || property === 'height') sizeTransitions.push(property)
    })

    // 按住状态吸附：token 归零 → 宽度当帧就位。断言读 computed transition-duration
    // 与 transitionstart 事件，两个都是无时序竞态的确定性观察面——先等宽度到位再
    // 查动画会撞上「过渡已结束」的假绿，不这么断。
    const points = [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS },
      { x: 440, y: 300, at: 2 * STEP_MS },
      { x: 410, y: 300, at: 3 * STEP_MS },
      { x: 350, y: 300, at: 4 * STEP_MS }
    ]
    await holdAndMove(el, points)
    await waitFor(() => currentAxisSize(el, 'right') >= fullAxisSize('right') - 1)

    const durations = getComputedStyle(getDialog(el))
      .transitionDuration.split(',')
      .map(value => Number.parseFloat(value))
    expect(durations.length).toBeGreaterThan(0)
    expect(durations.every(value => value === 0)).toBe(true)
    expect(sizeTransitions).toHaveLength(0)
    expect(el.open).toBe(true)
  })

  it('默认负例：draggable 未开 fullable，外拉与快甩都不吸附', async () => {
    const el = createDrawer()
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    // 外拉 600px（远超行程阈值，但未开 fullable → 行为与现状一致：橡皮筋 + 弹回）。
    const points = [{ x: 500, y: 300, at: 0 }]
    for (let step = 1; step <= 6; step++) {
      points.push({ x: 500 - step * 100, y: 300, at: step * STEP_MS })
    }
    await holdAndMove(el, points)
    await releaseAt(el, 0, 300, 7 * STEP_MS)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).offsetWidth).toBe(320)
    expect(events).toHaveLength(0)

    // 快甩外拉（16ms 步距，释放速度远超 350px/s 甩动阈值）：未 armed → 普通弹回。
    const flick = [
      { x: 500, y: 300, at: 1000 },
      { x: 470, y: 300, at: 1016 },
      { x: 440, y: 300, at: 1032 }
    ]
    await holdAndMove(el, flick)
    await releaseAt(el, 440, 300, 1048)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).offsetWidth).toBe(320)
  })

  it('full 态 Escape 直接关闭：退出全程无 width/height 过渡，重开为 base 尺寸', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await pullToFullAndRelease(el, 'right')

    const events = openChangeEvents(el)
    const sizeTransitions: string[] = []
    getDialog(el).addEventListener('transitionstart', event => {
      const property = (event as TransitionEvent).propertyName
      if (property === 'width' || property === 'height') sizeTransitions.push(property)
    })

    pressEscape(getDialog(el))
    await waitFor(() => !el.open)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    // 退出动画全程保持 full 宽度（闭合基线百分比随自身宽度解析）：期间无尺寸过渡。
    expect(sizeTransitions).toHaveLength(0)
    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)

    // stage 已复位：重开为 base 宽度，且可再次吸附。
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)
    await waitForBaseSize(el, 'right')
    expect(el.open).toBe(true)

    await pullToFullAndRelease(el, 'right')
    expect(currentAxisSize(el, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)
  })

  it('controlled：Escape 只派发请求且保持 full，回写 false 才关闭', async () => {
    const el = createDrawer()
    el.controlled = true
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    await pullToFullAndRelease(el, 'right')

    pressEscape(getDialog(el))
    // 请求已派发、组件不自行关闭（受控语义）：Escape 路径不经拖拽回写窗口，
    // 未获回写前视觉就是静止的 full 态。
    await waitFor(() => events.length > 0)
    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(el.open).toBe(true)

    await waitForFrame()
    await waitForFrame()
    expect(el.open).toBe(true)
    expect(currentAxisSize(el, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)

    // 回写 false → 走标准关闭管线。
    el.open = false
    await el.updateComplete
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
    expect(getDialog(el).open).toBe(false)
  })

  it('full 态 pointercancel：保持 open 与 full，无手势残留', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const points = [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS },
      { x: 440, y: 300, at: 2 * STEP_MS },
      { x: 350, y: 300, at: 3 * STEP_MS }
    ]
    await holdAndMove(el, points)
    await waitFor(() => currentAxisSize(el, 'right') >= fullAxisSize('right') - 1)

    firePointer(el, 'pointercancel', 350, 300, 4 * STEP_MS)
    await el.updateComplete
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(currentAxisSize(el, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)
  })

  it('静止 full 回拉 120px 松手：恢复 base 并停住', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await pullToFullAndRelease(el, 'right')
    const events = openChangeEvents(el)

    // 静止 full 上重新抓取：零点 = 按下点（500）。内拉至 684（自按下点 +184px）
    // 越过 96px 恢复阈值 → 本段手势已 exit-full，松手只能恢复 base、不得关闭。
    // 收尾放慢，整段平均速度低于甩动阈值。
    const points = [
      { x: 500, y: 300, at: 0 },
      { x: 560, y: 300, at: STEP_MS },
      { x: 680, y: 300, at: 2 * STEP_MS },
      { x: 682, y: 300, at: 120 },
      { x: 684, y: 300, at: 200 }
    ]
    await holdAndMove(el, points)
    await waitForBaseSize(el, 'right')
    await releaseAt(el, 684, 300, 320)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(events).toHaveLength(0)
    await waitForBaseSize(el, 'right')
  })

  it('静止 full 回拉 200px 松手：仍停 base，不关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await pullToFullAndRelease(el, 'right')
    const events = openChangeEvents(el)

    // 零点 = 按下点（500）：内拉至 800（+300px，远超 96px 恢复阈值）；
    // 本段手势在 raw=96 时 exit-full，之后只能恢复 base，不能在原手势内关闭。
    const points = [
      { x: 500, y: 300, at: 0 },
      { x: 600, y: 300, at: STEP_MS },
      { x: 720, y: 300, at: 2 * STEP_MS },
      { x: 800, y: 300, at: 3 * STEP_MS }
    ]
    await holdAndMove(el, points)
    await waitForBaseSize(el, 'right')
    await releaseAt(el, 800, 300, 1000)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
    await waitForBaseSize(el, 'right')
  })

  it('拖拽进行中上层新开：松手保持 full 态并按 full 尺寸重算层叠，关闭上层后恢复完整 full', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer()
    theme.append(parent)
    parent.draggable = true
    parent.fullable = true
    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)

    // 按住外拉吸附 full（手势进行中），此时上层新开一层。
    await holdAndMove(parent, [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS },
      { x: 440, y: 300, at: 2 * STEP_MS },
      { x: 410, y: 300, at: 3 * STEP_MS },
      { x: 350, y: 300, at: 4 * STEP_MS }
    ])
    await waitFor(() => currentAxisSize(parent, 'right') >= fullAxisSize('right') - 1)

    const child = createDrawer()
    theme.append(child)
    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)
    expect(currentAxisSize(parent, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)

    // 松手：拖拽终结 → 保持 full 态与 is-nested-lower，并按 full 尺寸重算层叠退缩。
    await releaseAt(parent, 350, 300, 5 * STEP_MS)
    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)
    expect(parent.open).toBe(true)
    expect(child.open).toBe(true)
    expect(currentAxisSize(parent, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)

    const parentDialog = getDialog(parent)
    expect(parentDialog.classList.contains('is-full')).toBe(true)
    expect(parentDialog.classList.contains('is-nested-lower')).toBe(true)
    const motionRect = parentDialog.querySelector('.wui-drawer-motion')!.getBoundingClientRect()
    expect(motionRect.left).toBeCloseTo(expectedNestedMotionLeft(parent), 0)

    // 关闭上层后，下层撤掉 nested-lower 退缩并恢复完整 full。
    child.open = false
    await child.updateComplete
    await waitFor(() => !getDialog(parent).classList.contains('is-nested-lower'))
    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)
    expect(parentDialog.classList.contains('is-full')).toBe(true)
    expect(currentAxisSize(parent, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)
  })

  it('拖拽中上层新开（尚未吸附）：行程触发与外甩展开都被嵌套排除拦下', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer()
    theme.append(parent)
    parent.draggable = true
    parent.fullable = true
    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)

    // 外拉 30px（未越阈值，仍是 base）时上层新开：parent 变 nested-lower。
    await holdAndMove(parent, [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS }
    ])
    const child = createDrawer()
    theme.append(child)
    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)

    // 继续快甩外拉（自按下点净行程 170px 越过 96px 行程阈值、释放速度远超甩动阈值）：
    // 行程触发与甩动展开都被嵌套排除拦下 → 普通弹回，不得切入 full。
    await continueMove(parent, [
      { x: 350, y: 300, at: 2 * STEP_MS },
      { x: 330, y: 300, at: 3 * STEP_MS }
    ])
    await releaseAt(parent, 330, 300, 4 * STEP_MS)
    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)

    expect(parent.open).toBe(true)
    expect(getDialog(parent).offsetWidth).toBe(320)
    expect(child.open).toBe(true)
  })

  it('嵌套：full 态的 drawer 上层新开一层 → 保持 full 态并按深度退缩，关闭上层后恢复完整 full', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer()
    theme.append(parent)
    parent.draggable = true
    parent.fullable = true
    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)
    await pullToFullAndRelease(parent, 'right')

    const child = createDrawer()
    theme.append(child)
    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)

    // 上层注册后父层保持 full 态并作为下层退缩。
    const parentDialog = getDialog(parent)
    expect(parent.open).toBe(true)
    expect(child.open).toBe(true)
    expect(parentDialog.open).toBe(true)
    expect(parentDialog.classList.contains('is-full')).toBe(true)
    expect(parentDialog.classList.contains('is-nested-lower')).toBe(true)
    expect(currentAxisSize(parent, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)

    // 关闭上层后，父层平滑恢复完整 full。
    child.open = false
    await child.updateComplete
    await waitFor(() => !parentDialog.classList.contains('is-nested-lower'))
    expect(parentDialog.classList.contains('is-full')).toBe(true)
    expect(currentAxisSize(parent, 'right')).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)
  })

  it('嵌套：吸附 full 后 280ms 过渡未完即打开子层 → 过渡结束后自动重算露边偏移', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer()
    theme.append(parent)
    parent.draggable = true
    parent.fullable = true
    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)

    // 触发 full 吸附（is-full 刚加上，280ms 宽度过渡还在进行中）立刻松手并打开子层。
    await holdAndMove(parent, [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS },
      { x: 440, y: 300, at: 2 * STEP_MS },
      { x: 410, y: 300, at: 3 * STEP_MS },
      { x: 350, y: 300, at: 4 * STEP_MS }
    ])
    const parentDialog = getDialog(parent)
    expect(parentDialog.classList.contains('is-full')).toBe(true)
    await releaseAt(parent, 350, 300, 5 * STEP_MS)

    const child = createDrawer()
    theme.append(child)
    child.open = true
    await child.updateComplete

    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)
    await waitFor(() => getDialog(child).getAnimations({ subtree: true }).length === 0)

    const finalWidth = parentDialog.offsetWidth
    expect(finalWidth).toBeGreaterThanOrEqual(fullAxisSize('right') - 1)
    const motionRect = parentDialog.querySelector('.wui-drawer-motion')!.getBoundingClientRect()
    expect(motionRect.left).toBeCloseTo(expectedNestedMotionLeft(parent), 0)
  })

  it('嵌套：full 态下层运行时关闭 fullable（无尺寸过渡）→ 立即按 base 宽度重算露边偏移', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer()
    theme.append(parent)
    parent.draggable = true
    parent.fullable = true
    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)
    await pullToFullAndRelease(parent, 'right')

    const child = createDrawer()
    theme.append(child)
    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)

    const parentDialog = getDialog(parent)
    const beforeMotionLeft = parentDialog.querySelector('.wui-drawer-motion')!.getBoundingClientRect().left

    // 运行时摘除 fullable：_drag.reset() 摘除 full 且过渡门失效（无 transitionend）。
    parent.fullable = false
    await parent.updateComplete
    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)

    expect(parentDialog.offsetWidth).toBe(320)
    const afterMotionLeft = parentDialog.querySelector('.wui-drawer-motion')!.getBoundingClientRect().left
    expect(afterMotionLeft).toBeCloseTo(expectedNestedMotionLeft(parent), 0)
    expect(afterMotionLeft).not.toBeCloseTo(beforeMotionLeft, 0)
  })

  it('嵌套：父层 base、子层 full 后触发 resize、子层退出 full → 父层自动重算并恢复 base 露边', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer()
    theme.append(parent)
    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)

    const child = createDrawer()
    theme.append(child)
    child.draggable = true
    child.fullable = true
    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)

    // 子层进入 full 后触发一次视口 resize，父层按子层 full 宽度算得大偏移。
    await pullToFullAndRelease(child, 'right')
    window.dispatchEvent(new Event('resize'))
    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)

    const parentDialog = getDialog(parent)
    const childFullMotionLeft = parentDialog.querySelector('.wui-drawer-motion')!.getBoundingClientRect().left

    // 子层通过手势或属性退出 full 后，整个栈应自动重算，父层恢复为按 base 宽度算的可见露边。
    child.fullable = false
    await child.updateComplete
    await waitFor(() => getDialog(child).getAnimations({ subtree: true }).length === 0)
    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)

    const restoredLeft = parentDialog.querySelector('.wui-drawer-motion')!.getBoundingClientRect().left
    expect(restoredLeft).toBeCloseTo(expectedNestedMotionLeft(parent), 0)
    expect(restoredLeft).toBeGreaterThan(childFullMotionLeft + 10)
  })

  it('快甩外拉松手：短行程也吸附 full（armed 正例）', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    // 零点 = 按下点（500）：净行程 60px（低于 96px 行程阈值，拖拽中不触发吸附），
    // 16ms 步距 → 释放速度远超 350px/s 甩动阈值 → 松手展开。
    const flick = [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: 16 },
      { x: 440, y: 300, at: 32 }
    ]
    await holdAndMove(el, flick)
    await releaseAt(el, 440, 300, 48)

    await waitFor(() => currentAxisSize(el, 'right') >= fullAxisSize('right') - 1)
    expect(el.open).toBe(true)
  })

  it('慢速外拉未过阈值松手：普通弹回，不吸附', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    // 32ms 步距慢拖 40px：行程未越 96px 阈值，步速 ~250px/s 低于甩动阈值。
    const points = [
      { x: 500, y: 300, at: 0 },
      { x: 492, y: 300, at: STEP_MS },
      { x: 484, y: 300, at: 2 * STEP_MS },
      { x: 476, y: 300, at: 3 * STEP_MS },
      { x: 468, y: 300, at: 4 * STEP_MS },
      { x: 460, y: 300, at: 5 * STEP_MS }
    ]
    await holdAndMove(el, points)
    await releaseAt(el, 460, 300, 6 * STEP_MS)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).offsetWidth).toBe(320)
    expect(events).toHaveLength(0)
  })

  it('改主意守卫对称：内拉后反悔快甩外拉，不吸附（与关闭甩动同拦）', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    // 零点 = 按下点（500）：内拉至 570（+70px，峰值位移）→ 反向外甩至 520/500
    //（自峰值回撤 50px ≥ 10px 置位改主意；净位移 0，低于吸附阈值）
    // → 快甩松手：展开被拦，照常弹回。
    const points = [
      { x: 500, y: 300, at: 1000 },
      { x: 550, y: 300, at: 1016 },
      { x: 570, y: 300, at: 1032 },
      { x: 520, y: 300, at: 1064 },
      { x: 500, y: 300, at: 1080 }
    ]
    await holdAndMove(el, points)
    await releaseAt(el, 500, 300, 1096)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).offsetWidth).toBe(320)
  })
  it('同一按住 exit-full 后快速内甩 220px：不关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    const events = openChangeEvents(el)
    // 零点 = 按下点（500）；外拉至 350（−150px）越 96px 行程阈值 → 吸附。
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS },
      { x: 440, y: 300, at: 2 * STEP_MS },
      { x: 410, y: 300, at: 3 * STEP_MS },
      { x: 350, y: 300, at: 4 * STEP_MS }
    ])
    await waitFor(() => currentAxisSize(el, 'right') >= fullAxisSize('right') - 1)

    // 同一按住内拉：自吸附点（350）起 50/100，100 越恢复阈值 → 恢复原尺寸。
    await continueMove(el, [
      { x: 400, y: 300, at: 5 * STEP_MS },
      { x: 450, y: 300, at: 6 * STEP_MS }
    ])
    await waitForBaseSize(el, 'right')
    expect(el.open).toBe(true)

    // 继续同向内拉至自吸附点净行程 150px，松手时整段平均速度 ≈520px/s 已越过甩动阈值。
    // 本段手势已经 exit-full，距离与甩动关闭都由 outer gate 否决。
    await continueMove(el, [
      { x: 480, y: 300, at: 7 * STEP_MS },
      { x: 500, y: 300, at: 8 * STEP_MS }
    ])
    await releaseAt(el, 500, 300, 9 * STEP_MS)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(events).toHaveLength(0)
    await waitForBaseSize(el, 'right')
  })
  it('大屏 right：full 回拉 400px 仍保留可用面板，松手停 base', async () => {
    await withViewport(1280, 720, async () => {
      const el = createDrawer()
      el.draggable = true
      el.fullable = true
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)
      await pullToFullAndRelease(el, 'right')

      const events = openChangeEvents(el)
      await holdAndMove(el, [
        { x: 500, y: 300, at: 0 },
        { x: 500, y: 300, at: STEP_MS }
      ])

      firePointer(el, 'pointermove', 595, 300, 2 * STEP_MS)
      await el.updateComplete
      const opacity95 = backdropOpacity(el)

      firePointer(el, 'pointermove', 596, 300, 3 * STEP_MS)
      const opacity96 = backdropOpacity(el)
      firePointer(el, 'pointermove', 900, 300, 4 * STEP_MS)
      const opacity400 = backdropOpacity(el)
      const earlySize = currentAxisSize(el, 'right')
      const initialExitCap = Math.min(fullAxisSize('right'), Math.round(window.innerWidth * 0.9))

      expect(Math.abs(opacity95 - opacity96)).toBeLessThan(0.02)
      expect(earlySize).toBeGreaterThan(initialExitCap - 64)
      expect(opacity400).toBeGreaterThan(0.5)
      expect(opacity400).toBeLessThan(0.75)

      await waitForBaseSize(el, 'right')
      expect(visibleCloseAxisSize(el, 'right')).toBeGreaterThan(64)
      await releaseAt(el, 900, 300, 1000)
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

      expect(el.open).toBe(true)
      expect(getDialog(el).open).toBe(true)
      expect(events).toHaveLength(0)
      await waitForBaseSize(el, 'right')
    })
  })

  it('停 base 后新起手势拖过半：关闭并派发一次 open-change', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)
    await pullToFullAndRelease(el, 'right')

    const events = openChangeEvents(el)
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 500, y: 300, at: STEP_MS },
      { x: 700, y: 300, at: 3 * STEP_MS }
    ])
    await waitForBaseSize(el, 'right')
    await releaseAt(el, 700, 300, 1000)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
    expect(el.open).toBe(true)
    expect(events).toHaveLength(0)

    await holdAndMove(el, [
      { x: 500, y: 300, at: 2000 },
      { x: 500, y: 300, at: 2032 },
      { x: 700, y: 300, at: 2400 }
    ])
    await releaseAt(el, 700, 300, 2600)
    await waitFor(() => !el.open)

    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('停 base 后新起手势快甩 100px：关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)
    await pullToFullAndRelease(el, 'right')

    const events = openChangeEvents(el)
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 500, y: 300, at: STEP_MS },
      { x: 700, y: 300, at: 3 * STEP_MS }
    ])
    await releaseAt(el, 700, 300, 1000)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
    await waitForBaseSize(el, 'right')

    await holdAndMove(el, [
      { x: 500, y: 300, at: 2000 },
      { x: 500, y: 300, at: 2032 },
      { x: 600, y: 300, at: 2048 }
    ])
    await releaseAt(el, 600, 300, 2064)
    await waitFor(() => !el.open)

    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('超窄 base（120px）：exit-full 后继续拉仍不关闭（不承诺可用可见面积）', async () => {
    const el = createDrawer()
    el.style.setProperty('--wui-drawer-width', '120px')
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)
    await pullToFullAndRelease(el, 'right')

    const events = openChangeEvents(el)
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 500, y: 300, at: STEP_MS },
      { x: 700, y: 300, at: 3 * STEP_MS }
    ])
    await waitFor(() => Math.abs(currentAxisSize(el, 'right') - 120) < 2)
    await releaseAt(el, 700, 300, 1000)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(currentAxisSize(el, 'right')).toBe(120)
    expect(events).toHaveLength(0)
  })

  it('exit-full 后同手势反向外拉过 96px：onMove 不重新吸附', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)
    await pullToFullAndRelease(el, 'right')

    const events = openChangeEvents(el)
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 500, y: 300, at: STEP_MS },
      { x: 600, y: 300, at: 2 * STEP_MS },
      { x: 340, y: 300, at: 3 * STEP_MS }
    ])
    await waitForBaseSize(el, 'right')
    await releaseAt(el, 340, 300, 1000)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(currentAxisSize(el, 'right')).toBe(320)
    expect(events).toHaveLength(0)
  })

  it('exit-full 后 pointercancel：保持 open 与 base，无关闭事件', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)
    await pullToFullAndRelease(el, 'right')

    const events = openChangeEvents(el)
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 500, y: 300, at: STEP_MS },
      { x: 700, y: 300, at: 3 * STEP_MS }
    ])
    await waitForBaseSize(el, 'right')
    firePointer(el, 'pointercancel', 700, 300, 1000)
    await el.updateComplete
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(currentAxisSize(el, 'right')).toBe(320)
    expect(events).toHaveLength(0)
  })

  it('超窄 base（120px）exit-full 后移除 fullable：本段手势仍不关闭', async () => {
    const el = createDrawer()
    el.style.setProperty('--wui-drawer-width', '120px')
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)
    await pullToFullAndRelease(el, 'right')

    const events = openChangeEvents(el)
    await holdAndMove(el, [
      { x: 500, y: 300, at: 0 },
      { x: 500, y: 300, at: STEP_MS },
      { x: 700, y: 300, at: 3 * STEP_MS }
    ])
    await waitFor(() => Math.abs(currentAxisSize(el, 'right') - 120) < 2)
    el.fullable = false
    await el.updateComplete
    await releaseAt(el, 700, 300, 1000)
    await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

    expect(el.open).toBe(true)
    expect(getDialog(el).open).toBe(true)
    expect(currentAxisSize(el, 'right')).toBe(120)
    expect(events).toHaveLength(0)
  })

  it('exit-full 后拖拽中上层新开：保持 base，并通过露边几何证明 nested recalculate', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const parent = createDrawer()
    theme.append(parent)
    parent.draggable = true
    parent.fullable = true
    parent.open = true
    await parent.updateComplete
    await waitForOpenTransition(parent)
    await pullToFullAndRelease(parent, 'right')

    await holdAndMove(parent, [
      { x: 500, y: 300, at: 0 },
      { x: 500, y: 300, at: STEP_MS },
      { x: 700, y: 300, at: 3 * STEP_MS }
    ])
    await waitForBaseSize(parent, 'right')

    const child = createDrawer()
    theme.append(child)
    child.open = true
    await child.updateComplete
    await waitForOpenTransition(child)
    await releaseAt(parent, 700, 300, 1000)
    await waitFor(() => getDialog(parent).getAnimations({ subtree: true }).length === 0)
    await waitFor(() => getDialog(child).getAnimations({ subtree: true }).length === 0)

    expect(parent.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
    expect(child.open).toBe(true)
    await waitForBaseSize(parent, 'right')

    const parentDialog = getDialog(parent)
    const motionRect = parentDialog.querySelector('.wui-drawer-motion')!.getBoundingClientRect()
    expect(motionRect.left).toBeCloseTo(expectedNestedMotionLeft(parent), 0)
  })

  it.each(['positive', 'negative'] as const)(
    'full 弹回中途重抓（%s）：首个 move、跨 raw=0、exit-full 均连续',
    async direction => {
      const el = createDrawer()
      el.draggable = true
      el.fullable = true
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)
      await pullToFullAndRelease(el, 'right')
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

      const events = openChangeEvents(el)
      if (direction === 'positive') {
        await holdAndMove(el, [
          { x: 500, y: 300, at: 0 },
          { x: 500, y: 300, at: STEP_MS },
          { x: 560, y: 300, at: 2 * STEP_MS }
        ])
        await pauseReboundAfterRelease(el, 560, 300, 400, translate => translate > 20 && translate < 55)
      } else {
        await holdAndMove(el, [
          { x: 500, y: 300, at: 0 },
          { x: 500, y: 300, at: STEP_MS },
          { x: 250, y: 300, at: 2 * STEP_MS }
        ])
        await pauseReboundAfterRelease(el, 250, 300, 400, translate => translate > -16 && translate < -5)
      }

      firePointer(el, 'pointerdown', 600, 300, 1000)
      const initial = dragAxisTranslate(el, 'right')
      /*
       * 采样点按 drag-controller.ts 的判定模型推算：零点 = 按下点（600），
       * `dragOffset = dragInitialOffset + dampOverscroll(raw)`——闭合方向 1:1 跟手、
       * 打开方向按平方根压缩（raw −10 → −√10）；raw 96 = FULL_EXIT_TRAVEL 边界，
       * 越过即 exit-full 并走 postExitFullDelta。连续性（重抓瞬间不跳）是本测的主判据，
       * 采样值顺带把阻尼定律钉在受控点上。
       */
      firePointer(el, 'pointermove', 600, 300, 1032)
      expect(dragAxisTranslate(el, 'right')).toBeCloseTo(initial, 0)

      firePointer(el, 'pointermove', 590, 300, 1064)
      expect(dragAxisTranslate(el, 'right')).toBeCloseTo(initial - Math.sqrt(10), 0)

      firePointer(el, 'pointermove', 610, 300, 1096)
      expect(dragAxisTranslate(el, 'right')).toBeCloseTo(initial + 10, 0)

      firePointer(el, 'pointermove', 696, 300, 1128)
      expect(dragAxisTranslate(el, 'right')).toBeCloseTo(initial + 96, 0)

      await releaseAt(el, 696, 300, 2000)
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)
      expect(el.open).toBe(true)
      expect(getDialog(el).open).toBe(true)
      expect(events).toHaveLength(0)
      await waitForBaseSize(el, 'right')
    }
  )

  it('bottom 300px：full 回拉 400px 仍保留可用高度，松手停 base', async () => {
    await withViewport(1280, 720, async () => {
      const el = createDrawer()
      el.placement = 'bottom'
      el.draggable = true
      el.fullable = true
      el.open = true
      await el.updateComplete
      await waitForOpenTransition(el)
      await pullToFullAndRelease(el, 'bottom')

      const events = openChangeEvents(el)
      await holdAndMove(el, [
        { x: 500, y: 300, at: 0 },
        { x: 500, y: 300, at: STEP_MS },
        { x: 500, y: 396, at: 2 * STEP_MS },
        { x: 500, y: 700, at: 3 * STEP_MS }
      ])
      await waitFor(() => Math.abs(currentAxisSize(el, 'bottom') - 300) < 2)
      expect(visibleCloseAxisSize(el, 'bottom')).toBeGreaterThan(64)
      await releaseAt(el, 500, 700, 1000)
      await waitFor(() => getDialog(el).getAnimations({ subtree: true }).length === 0)

      expect(el.open).toBe(true)
      expect(getDialog(el).open).toBe(true)
      expect(currentAxisSize(el, 'bottom')).toBe(300)
      expect(events).toHaveLength(0)
    })
  })
})
