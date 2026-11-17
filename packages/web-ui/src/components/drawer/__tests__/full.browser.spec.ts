import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'
import { waitForOpenTransition } from '@/shared/test-utils/real-gesture'

import type { WebUiDrawer } from '..'

// 轮询条件直至满足：宽度过渡 260ms 在并行负载下完成时间不可预测，
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
 * 判定零点在**首个 pointermove**（手势层 calibrateOnFirstMove 同拍）：所有行程
 * 坐标按「首个 move 处 raw = 0」推算，pointerdown 到首个 move 的间隔被吸收。
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
 * 拉到 full 并松手（各测试的公共前置）：按下后首个 move 建立零点，随后外拉
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

afterEach(() => document.body.replaceChildren())

/*
 * WebUiDrawer fullable 两段手势（浏览器）。
 *
 * 判据沿用 drag-close 的裁剪纪律：断言公开几何（dialog 的 offsetWidth/Height 贴满
 * 视口减留边、回到 base 尺寸）与归宿（open、原生 dialog、open-change 次数），
 * 不锁 is-full 状态类、阻尼残值与过渡中途的 transform 采样。吸附是否发生、
 * 是否恢复原尺寸、是否误关，全部由尺寸与 open 承载。
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

      // 首个 move 建立零点，随后外拉 30/60/90/150px：第 4 段越过 96px 阈值，此时仍按住。
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

  it('同一按住的两段式：full → 内拉恢复原尺寸 → 继续拉过半尺寸关闭', async () => {
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

    // 同一按住内拉：+120 越恢复阈值（宽度回 base），+220 越过 320/2 = 160 的
    // 关闭阈值；随后放慢步距，让释放判定落在距离分支而不是甩动分支。
    await continueMove(el, [
      { x: 470, y: 300, at: 5 * STEP_MS },
      { x: 530, y: 300, at: 6 * STEP_MS },
      { x: 570, y: 300, at: 7 * STEP_MS }
    ])
    await waitForBaseSize(el, 'right')
    expect(el.open).toBe(true)
    await continueMove(el, [
      { x: 572, y: 300, at: 400 },
      { x: 574, y: 300, at: 480 }
    ])
    await releaseAt(el, 574, 300, 600)
    await waitFor(() => !el.open)
    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
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

  it('reduced motion：吸附与恢复无 width/height 动画（跟手不受影响）', async () => {
    const el = mountDrawer('reduce')
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    // 按住状态吸附：宽度直接就位，dialog 上不存在 width/height 过渡。
    const points = [
      { x: 500, y: 300, at: 0 },
      { x: 470, y: 300, at: STEP_MS },
      { x: 440, y: 300, at: 2 * STEP_MS },
      { x: 410, y: 300, at: 3 * STEP_MS },
      { x: 350, y: 300, at: 4 * STEP_MS }
    ]
    await holdAndMove(el, points)
    await waitFor(() => currentAxisSize(el, 'right') >= fullAxisSize('right') - 1)

    const sizeAnimations = getDialog(el)
      .getAnimations()
      .filter(animation => {
        // 本仓 TS lib 未声明 CSSTransition.propertyName，按结构读。
        const property = (animation as Animation & { propertyName?: string }).propertyName
        return property === 'width' || property === 'height'
      })
    expect(sizeAnimations).toHaveLength(0)
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

    // 快甩外拉（16ms 步距，释放速度远超 500px/s）：未 armed → 普通弹回。
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

  it('full 态内拉的阈值连续：过恢复阈值但未过半尺寸松手 → 弹回 full，不关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await pullToFullAndRelease(el, 'right')
    const events = openChangeEvents(el)

    // 静止 full 上重新抓取：首个 move（560）为零点，内拉 120px 越过 96px 恢复阈值
    //（尺寸回 base），但未过 160px 关闭阈值 → 松手弹回（不是关闭）。收尾放慢，
    // 整段平均速度低于甩动阈值，判定落在距离分支。
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

  it('full 态内拉过半尺寸松手：关闭', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    await pullToFullAndRelease(el, 'right')
    const events = openChangeEvents(el)

    // 首个 move（600）为零点：内拉 120px 越恢复阈值、200px 越关闭阈值 → 松手关闭。
    const points = [
      { x: 500, y: 300, at: 0 },
      { x: 600, y: 300, at: STEP_MS },
      { x: 720, y: 300, at: 2 * STEP_MS },
      { x: 800, y: 300, at: 3 * STEP_MS }
    ]
    await holdAndMove(el, points)
    await waitForBaseSize(el, 'right')
    await releaseAt(el, 800, 300, 4 * STEP_MS)
    await waitFor(() => !el.open)

    expect(events.map(event => event.detail.open)).toEqual([false])
    expect(getDialog(el).open).toBe(false)
  })

  it('嵌套：full 态的 drawer 上层新开一层 → 同步瞬时恢复原尺寸', async () => {
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

    // 上层注册触发 depth 0→1 回调：父层同步收起（无 260ms 过渡），保持 open。
    await waitFor(() => getDialog(parent).offsetWidth < 340)
    expect(parent.open).toBe(true)
    expect(child.open).toBe(true)
    expect(getDialog(parent).open).toBe(true)
  })

  it('快甩外拉松手：短行程也吸附 full（armed 正例）', async () => {
    const el = createDrawer()
    el.draggable = true
    el.fullable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition(el)

    // 首个 move（470）为零点：净行程 30px（低于 96px 行程阈值，拖拽中不触发吸附），
    // 16ms 步距 → 释放速度远超 500px/s → 松手展开。
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

    // 首个 move（550）为零点：内拉至 570（raw +20，方向确认）→ 反向外甩至 520/500
    //（净行程 −70，低于吸附阈值；折返基线拉到 520，意图位移 − 折回位移 ≥ 10px
    // 置位改主意）→ 快甩松手：展开被拦，照常弹回。
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
})
