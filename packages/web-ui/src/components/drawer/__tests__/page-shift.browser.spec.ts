import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForAnimationsToFinish, waitForFrame } from '@/shared/test-utils'
import { setViewport } from '@/shared/test-utils/viewport'

import type { WebUiDrawer } from '..'

/*
 * 整页让开（page-shift，浏览器）。
 *
 * 判据全是**关系**：四个 placement 的轴向、符号与轴单位、按打开顺序 16a → 8a → 4a 的衰减、
 * 关闭中间层后剩余层重排。期望值按 `window` 现算，不锁像素也不锁视口尺寸。
 *
 * 观察面只有两样：页面上 marker 的 `getBoundingClientRect()`（几何结果）与
 * `documentElement.getAnimations()`（动效有无）。不读 `documentElement.style.translate`，
 * 那是本模块的落点实现；marker 走位就是它的公开后果。
 *
 * marker 一律靠左上锚定：滚动锁改的是 `documentElement` 的 `overflow`，经典滚动条消失
 * 会让内容盒变宽，靠左定位的盒子横坐标不受影响；`position: fixed` 那一条用来确认
 * 「整页一起走」而不是「只推了滚动区」。
 */

/** 每次等待的预算；比 per-test timeout 小，超时才会指到具体是哪一步等不动。 */
const ANIM_BUDGET_MS = 8_000
const HEAVY_TEST_TIMEOUT_MS = 20_000

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function createDrawer(heading: string): WebUiDrawer {
  const el = document.createElement('web-ui-drawer') as WebUiDrawer
  el.heading = heading
  document.body.append(el)
  return el
}

function marker(inline: string): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `width:10px;height:10px;${inline}`
  document.body.append(el)
  return el
}

interface Rest {
  left: number
  top: number
}

function resting(el: HTMLElement): Rest {
  const rect = el.getBoundingClientRect()
  return { left: rect.left, top: rect.top }
}

/** 相对静止位的位移分量。 */
function moved(el: HTMLElement, rest: Rest): { dx: number; dy: number } {
  const rect = el.getBoundingClientRect()
  return { dx: rect.left - rest.left, dy: rect.top - rest.top }
}

/** 一个轴单位 a：横向 1vw、纵向 1vh。 */
function axisUnit(axis: 'x' | 'y'): number {
  return (axis === 'x' ? window.innerWidth : window.innerHeight) / 100
}

/** 第 `depth` 层（0 起）的让开量：16a、8a、4a…… */
function layerShift(axis: 'x' | 'y', depth: number): number {
  return 16 * axisUnit(axis) * 0.5 ** depth
}

/** 前 `count` 层按打开顺序叠加的让开量。 */
function stackedShift(axis: 'x' | 'y', count: number): number {
  let total = 0
  for (let depth = 0; depth < count; depth += 1) total += layerShift(axis, depth)
  return total
}

/**
 * 在若干帧内采样 documentElement 上出现过的动画。
 *
 * 提前订阅式的持续采样：页面让开是 280ms 的 WAAPI，单帧读会撞上「过渡还没诞生」的空窗。
 * 「0 条」这条负向判据的区分力由同文件的正向用例承担——同一个 helper 在默认让开量下
 * 必然采到那一条。
 */
async function samplePageAnimations(frames = 12): Promise<Animation[]> {
  const seen = new Set<Animation>()
  for (let index = 0; index < frames; index += 1) {
    for (const animation of document.documentElement.getAnimations()) seen.add(animation)
    await waitForFrame()
  }
  return [...seen]
}

/** 页面与 drawer 自身的动画全部收敛后才允许量几何：中途读到的是过渡进行时。 */
async function settle(...drawers: WebUiDrawer[]) {
  const roots = [document.documentElement, ...drawers.flatMap(drawer => [drawer, getDialog(drawer)])]
  if (!(await waitForAnimationsToFinish(roots, ANIM_BUDGET_MS)))
    throw new Error('Expected the page shift and drawer transitions to settle')
}

async function openDrawer(el: WebUiDrawer) {
  el.open = true
  await el.updateComplete
  await pollUntil(() => getDialog(el).matches(':modal'), 'Expected the drawer to reach the top layer')
  await settle(el)
}

async function closeDrawer(el: WebUiDrawer, ...others: WebUiDrawer[]) {
  el.open = false
  await el.updateComplete
  await pollUntil(() => !getDialog(el).open, 'Expected the drawer dialog to close')
  await settle(...others)
}

afterEach(async () => {
  // 先等页面动画跑完再清 DOM：留着进行中的动画去 replaceChildren 会把这条动画带进下一条用例。
  await settle()
  document.body.replaceChildren()
  document.documentElement.style.removeProperty('overflow')
  document.documentElement.style.removeProperty('overscroll-behavior')
})

describe('WebUiDrawer 整页让开（浏览器）', () => {
  it('打开时页面沿进场方向让开、fixed 与 in-flow 同步走，关闭后回到原位', async () => {
    const inFlow = marker('margin-left:120px;margin-top:80px')
    const fixed = marker('position:fixed;top:80px;left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the in-flow marker to lay out')
    const restInFlow = resting(inFlow)
    const restFixed = resting(fixed)

    const el = createDrawer('page shift')
    el.pageShift = true
    await el.updateComplete
    const shift = layerShift('x', 0)
    expect(shift).toBeGreaterThan(0)

    el.open = true
    await el.updateComplete
    await pollUntil(() => getDialog(el).matches(':modal'), 'Expected the drawer to reach the top layer')
    // 动效面：让开这一步确实有一条动画在跑，而不是「直接写在位」。
    expect(await samplePageAnimations()).toHaveLength(1)
    // 采样式需要约 200ms，让开动画是 280ms：量几何前必须先等它收敛。
    await settle(el)

    const openInFlow = moved(inFlow, restInFlow)
    expect(openInFlow.dx).toBeCloseTo(-shift, 1)
    expect(openInFlow.dy).toBeCloseTo(0, 1)
    expect(moved(fixed, restFixed).dx).toBeCloseTo(openInFlow.dx, 1)

    await closeDrawer(el)
    expect(moved(inFlow, restInFlow).dx).toBeCloseTo(0, 1)
    expect(moved(inFlow, restInFlow).dy).toBeCloseTo(0, 1)
    expect(moved(fixed, restFixed).dx).toBeCloseTo(0, 1)
    expect(document.documentElement.getAnimations()).toHaveLength(0)
  })

  it('top layer 不随页面走：已就位的 drawer panel 位置不变，页面 toggle 仍生效', async () => {
    const inFlow = marker('margin-left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
    const rest = resting(inFlow)

    const el = createDrawer('keep still')
    el.pageShift = true
    await el.updateComplete
    await openDrawer(el)
    const shift = layerShift('x', 0)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-shift, 1)

    /*
     * panel 已停在打开位（transition 收敛）之后再改页面位移——若让开发生在 panel 就位之前，
     * panel 自己的进场位移会盖过页面位移，这条断言就答不了「top layer 跟不跟着走」。
     *
     * 关掉再打开 pageShift 走的是 pop/push 两条路径，页面位移应当完整往返；
     * 期间 dialog 的矩形必须纹丝不动（top layer 不参与页面变换）。
     */
    const dialogRest = resting(getDialog(el))
    el.pageShift = false
    await el.updateComplete
    await settle(el)
    expect(moved(inFlow, rest).dx).toBeCloseTo(0, 1)

    el.pageShift = true
    await el.updateComplete
    await settle(el)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-shift, 1)
    expect(el.open).toBe(true)
    expect(getDialog(el).matches(':modal')).toBe(true)
    expect(resting(getDialog(el)).left).toBeCloseTo(dialogRest.left, 1)
    expect(resting(getDialog(el)).top).toBeCloseTo(dialogRest.top, 1)
  })

  /*
   * 四个 placement 的轴向与符号来自同一张表（`-_dragCloseSign` + `_dragAxis`）。
   * 「页面朝 drawer 的进场方向走」在 right 是向左、在 left 是向右、在 top 是向下、
   * 在 bottom 是向上——写反任何一格都只会让**那一个**方向变红。轴单位同样一分为二：
   * left/right 用 1vw、top/bottom 用 1vh，期望值按对应边的长度现算。
   */
  it.each([
    { placement: 'right', axis: 'x', sign: -1 },
    { placement: 'left', axis: 'x', sign: 1 },
    { placement: 'top', axis: 'y', sign: 1 },
    { placement: 'bottom', axis: 'y', sign: -1 }
  ] as const)('placement=$placement：让开落在 $axis 轴的 $sign 方向', async ({ placement, axis, sign }) => {
    const inFlow = marker('margin-left:120px;margin-top:80px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
    const rest = resting(inFlow)

    const el = createDrawer(placement)
    el.placement = placement
    el.pageShift = true
    await el.updateComplete
    await openDrawer(el)

    const { dx, dy } = moved(inFlow, rest)
    const shift = layerShift(axis, 0)
    expect(axis === 'x' ? dx : dy).toBeCloseTo(sign * shift, 1)
    expect(axis === 'x' ? dy : dx).toBeCloseTo(0, 1)
  })

  /*
   * 位移以视口单位写在根元素上，转屏或改窗口大小后应当由浏览器重算，而不是停在开启那一刻的 px。
   * 横向看宽度、纵向看高度：两侧视口都只改目标轴，另一轴的期望值仍是 0。
   */
  it.each([
    { placement: 'right', axis: 'x', sign: -1 },
    { placement: 'top', axis: 'y', sign: 1 }
  ] as const)(
    '打开后视口改变：placement=$placement 的让开量按 16a 跟随新 $axis 轴尺寸',
    { timeout: HEAVY_TEST_TIMEOUT_MS },
    async ({ placement, axis, sign }) => {
      const initial = { width: window.innerWidth, height: window.innerHeight }
      const opened = { width: 1200, height: 800 }
      const resized = axis === 'x' ? { width: 900, height: 800 } : { width: 1200, height: 600 }
      await setViewport(opened.width, opened.height)
      try {
        const inFlow = marker('margin-left:120px;margin-top:80px')
        await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
        const rest = resting(inFlow)

        const el = createDrawer(placement)
        el.placement = placement
        el.pageShift = true
        await el.updateComplete
        await openDrawer(el)
        expect(axis === 'x' ? moved(inFlow, rest).dx : moved(inFlow, rest).dy).toBeCloseTo(
          sign * layerShift(axis, 0),
          1
        )

        await setViewport(resized.width, resized.height)
        const afterResize = moved(inFlow, rest)
        expect(axis === 'x' ? afterResize.dx : afterResize.dy).toBeCloseTo(sign * layerShift(axis, 0), 1)
        expect(axis === 'x' ? afterResize.dy : afterResize.dx).toBeCloseTo(0, 1)

        await closeDrawer(el)
        expect(moved(inFlow, rest).dx).toBeCloseTo(0, 1)
        expect(moved(inFlow, rest).dy).toBeCloseTo(0, 1)
      } finally {
        await setViewport(initial.width, initial.height)
      }
    }
  )

  it('同级两层按打开先后衰减：第 2 层让开第 1 层的一半', { timeout: HEAVY_TEST_TIMEOUT_MS }, async () => {
    const inFlow = marker('margin-left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
    const rest = resting(inFlow)

    /*
     * 两个同级 drawer 都开 page-shift：第 1 层 16a、第 2 层 8a，合计 24a。
     * 若退回「每层同样多」读到 -32a，若只看栈顶读到 -8a，若沿用上一份总和读到 -16a。
     */
    const first = createDrawer('first')
    first.pageShift = true
    const second = createDrawer('second')
    second.pageShift = true
    await first.updateComplete
    await second.updateComplete

    await openDrawer(first)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-layerShift('x', 0), 1)

    await openDrawer(second)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-stackedShift('x', 2), 1)
    expect(first.open).toBe(true)

    await closeDrawer(second, first)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-layerShift('x', 0), 1)

    await closeDrawer(first)
    expect(moved(inFlow, rest).dx).toBeCloseTo(0, 1)
  })

  /*
   * 用户实际遇到的组合：声明式嵌套 + 两层都开 page-shift。层级管理与整页让开是两套
   * 独立机制——父层面板会被子层缩放偏移，页面则按打开顺序 16a → 8a 叠加。
   */
  it(
    '嵌套两层都开启 page-shift：子层让开父层的一半，关闭子层回落到父层',
    { timeout: HEAVY_TEST_TIMEOUT_MS },
    async () => {
      const inFlow = marker('margin-left:120px')
      await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
      const rest = resting(inFlow)

      const parent = createDrawer('parent')
      parent.pageShift = true
      await parent.updateComplete
      const child = createDrawer('child')
      child.pageShift = true
      parent.append(child)
      await child.updateComplete

      await openDrawer(parent)
      expect(moved(inFlow, rest).dx).toBeCloseTo(-layerShift('x', 0), 1)

      await openDrawer(child)
      expect(moved(inFlow, rest).dx).toBeCloseTo(-stackedShift('x', 2), 1)

      await closeDrawer(child, parent)
      expect(moved(inFlow, rest).dx).toBeCloseTo(-layerShift('x', 0), 1)

      await closeDrawer(parent)
      expect(moved(inFlow, rest).dx).toBeCloseTo(0, 1)
    }
  )

  /*
   * 四层按 16a、8a、4a、2a 叠加：每多一层只补上一层的一半。合计 30a，低于收敛上限 32a。
   */
  it('四层按 16a、8a、4a、2a 逐层叠加', { timeout: HEAVY_TEST_TIMEOUT_MS }, async () => {
    const inFlow = marker('margin-left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
    const rest = resting(inFlow)

    const drawers = [1, 2, 3, 4].map(depth => {
      const el = createDrawer(`layer ${depth}`)
      el.pageShift = true
      return el
    })
    await Promise.all(drawers.map(el => el.updateComplete))

    for (let opened = 0; opened < drawers.length; opened += 1) {
      await openDrawer(drawers[opened])
      expect(moved(inFlow, rest).dx).toBeCloseTo(-stackedShift('x', opened + 1), 1)
    }
  })

  /*
   * 关闭中间层后剩余层按新的打开顺序重排：第 3 层关闭前的系数是 4a，关闭后它前面的
   * 两层不变、它自己退出，合计从 28a 落回 24a；再关第 1 层则原第 2 层顶成第 1 层（16a）。
   */
  it('关闭中间层后剩余层重排：关掉的层退出，后面的层各补上一档', { timeout: HEAVY_TEST_TIMEOUT_MS }, async () => {
    const inFlow = marker('margin-left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
    const rest = resting(inFlow)

    const drawers = ['a', 'b', 'c'].map(name => {
      const el = createDrawer(name)
      el.pageShift = true
      return el
    })
    await Promise.all(drawers.map(el => el.updateComplete))
    for (const el of drawers) await openDrawer(el)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-stackedShift('x', 3), 1)

    await closeDrawer(drawers[1], drawers[0], drawers[2])
    expect(moved(inFlow, rest).dx).toBeCloseTo(-stackedShift('x', 2), 1)

    await closeDrawer(drawers[0], drawers[2])
    expect(moved(inFlow, rest).dx).toBeCloseTo(-layerShift('x', 0), 1)

    await closeDrawer(drawers[2])
    expect(moved(inFlow, rest).dx).toBeCloseTo(0, 1)
  })

  it('拖拽 panel 时页面停在原地：让开只跟 open 走，不跟手势走', { timeout: HEAVY_TEST_TIMEOUT_MS }, async () => {
    const inFlow = marker('margin-left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
    const rest = resting(inFlow)

    const el = createDrawer('drag')
    el.pageShift = true
    el.draggable = true
    await el.updateComplete
    await openDrawer(el)

    const shift = layerShift('x', 0)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-shift, 1)

    /*
     * 净位移远低于关闭阈值的多段慢拖 → 弹回，drawer 始终打开。
     * 期间页面必须一直在让开位：若把 page-shift 接进拖拽增量，drawer 相对视口不动，
     * 「跟手」被抵消一半，而这里的 marker 会跟着 pointer 走。
     *
     * 判定读事件 timeStamp：显式给 32ms 间隔，慢拖不依赖真实墙钟，负载不会把这段手势
     * 的速度判成甩动。首个 move（206）只用于建立位移零点。
     */
    const dragZone = el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
    const fire = (type: string, clientX: number, timeStamp: number) => {
      const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX, clientY: 300 })
      Object.defineProperty(event, 'timeStamp', { value: timeStamp, configurable: true })
      dragZone.dispatchEvent(event)
    }
    fire('pointerdown', 200, 0)
    await el.updateComplete
    ;[212, 218, 224].forEach((x, index) => fire('pointermove', x, (index + 1) * 32))
    await el.updateComplete
    expect(moved(inFlow, rest).dx).toBeCloseTo(-shift, 1)
    expect(document.documentElement.getAnimations()).toHaveLength(0)

    fire('pointerup', 224, 4 * 32)
    await el.updateComplete
    await settle(el)
    await pollUntil(() => el.open, 'Expected the drawer to stay open after the bounce-back')
    expect(moved(inFlow, rest).dx).toBeCloseTo(-shift, 1)
  })

  it('宿主被移出文档时页面立刻归位，不留下没人负责的位移', async () => {
    const inFlow = marker('margin-left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'Expected the marker to lay out')
    const rest = resting(inFlow)

    const el = createDrawer('dispose')
    el.pageShift = true
    await el.updateComplete
    await openDrawer(el)
    expect(moved(inFlow, rest).dx).toBeCloseTo(-layerShift('x', 0), 1)

    el.remove()
    expect(moved(inFlow, rest).dx).toBeCloseTo(0, 1)
    expect(document.documentElement.getAnimations()).toHaveLength(0)

    // 归位是即时的：断连后再补一段退场动画会把位移带进下一个页面状态。
    expect(await samplePageAnimations(4)).toHaveLength(0)
  })
})
