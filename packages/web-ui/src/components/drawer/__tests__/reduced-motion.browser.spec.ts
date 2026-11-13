import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

/**
 * 等打开动画收敛。
 * reduced 下打开是**即时**的（压根没有过渡），所以只能要求「动画已收敛」，
 * 不能要求「动画已启动」。但 full 下过渡在 presence 翻转后才起（rAF 之后 1–2 帧），
 * 若一上来就判 0 会撞上那个空窗，故先放几帧让该启动的启动。
 */
async function waitForOpenSettled(el: WebUiDrawer) {
  const dialog = getDialog(el)
  await pollUntil(() => dialog.open, 'drawer did not open')
  await waitForFrame()
  await waitForFrame()
  await waitForFrame()
  const motion = dialog.querySelector('.wui-drawer-motion')!
  await pollUntil(() => motion.getAnimations().length === 0, 'drawer open transition did not settle', 10_000)
}

/** 在 web-ui-theme 作用域内挂载 drawer；motion 为 null 时不套 theme（走系统 reduce）。 */
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

async function openDrawer(el: WebUiDrawer) {
  el.draggable = true
  el.open = true
  await el.updateComplete
  await waitForOpenSettled(el)
}

/**
 * 沿闭合方向（默认 right → 向右）拖到指定 clientX 后松手。
 * 分两段：判定零点在首个 pointermove（基准校准），位移自它起算，
 * 单次 move 的整程位移会被整体吸收。
 */
async function dragToClose(el: WebUiDrawer, toX: number) {
  const dragZone = getDragZone(el)
  // 首个 move 停在 100 → 110，只用于建立判定零点，不产生位移。
  const pivotX = 110
  dragZone.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
  )
  await el.updateComplete
  dragZone.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: pivotX, clientY: 300 })
  )
  await el.updateComplete
  dragZone.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: toX, clientY: 300 })
  )
  await el.updateComplete
  dragZone.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: toX, clientY: 300 })
  )
}

/**
 * 在若干帧内采样内容层与原生 backdrop 的过渡，不计其他后代动画。
 */
async function sampleTransitions(el: WebUiDrawer, frames = 12): Promise<string[]> {
  const dialog = getDialog(el)
  const motion = dialog.querySelector('.wui-drawer-motion')!
  const seen = new Set<string>()
  for (let i = 0; i < frames; i += 1) {
    for (const animation of [...dialog.getAnimations(), ...motion.getAnimations()]) {
      seen.add((animation as CSSTransition).transitionProperty ?? (animation as CSSAnimation).animationName ?? '?')
    }
    await waitForFrame()
  }
  return [...seen]
}

function pageMarker(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'width:10px;height:10px;margin-left:120px;margin-top:80px'
  document.body.append(el)
  return el
}

/** 默认 placement（right）第 1 层的让开量：16 个轴单位，横向 1 个单位是 1vw。 */
function firstLayerShift(): number {
  return 16 * (window.innerWidth / 100)
}

/**
 * 在若干帧内采样 documentElement 上出现过的动画。
 * 页面让开是一条 WAAPI，单帧读会撞上「动画还没诞生」的空窗；控制组用同一个 helper
 * 采到非空，负向那条「0 条」才有区分力。
 */
async function samplePageAnimations(frames = 12): Promise<Animation[]> {
  const seen = new Set<Animation>()
  for (let index = 0; index < frames; index += 1) {
    for (const animation of document.documentElement.getAnimations()) seen.add(animation)
    await waitForFrame()
  }
  return [...seen]
}

async function waitPageSettled(): Promise<void> {
  await pollUntil(() => document.documentElement.getAnimations().length === 0, 'page shift did not settle', 10_000)
}

afterEach(() => document.body.replaceChildren())

/*
 * 减少动效下的 Drawer 拖拽关闭。
 *
 * 本文件跑在 `browser-reduced-motion` 工程（按文件名路由），系统 `prefers-reduced-motion`
 * 即为真实环境。§10 S3 要求**自带控制组**：只断言「松手后 open 立即变 false」在有动效的
 * 实现下也可能成立（如果恰好同步），真正的区分点是**弹簧动画有没有跑**，而对照组
 * （显式 `motion='full'`）必须证明「同样的手势在没有 reduce 时会走弹簧」。
 *
 * 判据只取 `getAnimations()`：无弹簧 == 一条动画都没有。（读 `getComputedStyle(dialog).transform`
 * 的 m41/m42 是几何取值，§12 C1。）
 */
describe('减少动效下的 Drawer 拖拽关闭（浏览器）', () => {
  it('超过阈值松手：不走收尾过渡，open 立即落 false（对照组 full 会等收尾）', async () => {
    const reduced = mountDrawer(null)
    await openDrawer(reduced)
    await dragToClose(reduced, 300)

    expect(reduced.open).toBe(false)
    expect(await sampleTransitions(reduced, 4)).toHaveLength(0)

    // 对照组：显式 motion='full' 覆盖系统 reduce → 松手瞬间仍未关闭（在等收尾）。
    const full = mountDrawer('full')
    await openDrawer(full)
    await dragToClose(full, 300)
    expect(full.open).toBe(true)
    await pollUntil(() => !full.open, 'drawer did not close after the settle transition', 10_000)
  })

  it('未达阈值松手：即时弹回打开位且无残留动画', async () => {
    /*
     * 收尾由 CSS transition 承担（issue #123）。逐帧采样的窗口在 CI 高负载下会整个错过
     * 最短 180ms 的收尾，所以改用 transitionstart 监听——与帧率解耦，直接回答
     *「有没有真的跑过渡」。
     *
     * 本例不带 motion='full' 对照组：本文件跑在 `browser-reduced-motion` 工程，系统
     * reduce 生效，而 reduce 媒体查询以 `transform: none !important` 对所有位移归零
     *（enter/exit 同样如此）；theme 的 motion 只影响 JS 侧收尾时序，改不动这条 CSS
     * 规则。「full 下确实在等收尾」的对照由上面的「超过阈值松手」用例承担。
     */
    const seenTransform = (el: WebUiDrawer) => {
      const seen: string[] = []
      getDialog(el).addEventListener('transitionstart', event => seen.push((event as TransitionEvent).propertyName))
      return seen
    }

    const reduced = mountDrawer(null)
    await openDrawer(reduced)
    const reducedSeen = seenTransform(reduced)

    // 多段慢拖且净位移（自首个 move 起算）远低于阈值 → 弹回；多段也避免整段速度被判为甩动。
    const dragZone = getDragZone(reduced)
    // 判定读事件 timeStamp：显式给 32ms 间隔，慢拖不依赖真实墙钟，负载不会改变速度判定。
    const fire = (type: string, clientX: number, timeStamp: number) => {
      const event = new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX, clientY: 300 })
      Object.defineProperty(event, 'timeStamp', { value: timeStamp, configurable: true })
      dragZone.dispatchEvent(event)
    }
    fire('pointerdown', 100, 0)
    await reduced.updateComplete
    ;[106, 112, 118, 124, 130].forEach((x, index) => fire('pointermove', x, (index + 1) * 32))
    await reduced.updateComplete
    fire('pointerup', 130, 6 * 32)
    await reduced.updateComplete

    expect(reduced.open).toBe(true)
    expect(getDialog(reduced).open).toBe(true)
    expect(reducedSeen).not.toContain('transform')
  })

  it('theme 作用域优先于系统：motion=full 覆盖系统 reduce，松手后按收尾时序关闭（reduce 下由兜底定时器完成）', async () => {
    const full = mountDrawer('full')
    await openDrawer(full)
    await dragToClose(full, 300)

    // 系统虽为 reduce，但所在 theme 显式要求完整动效 → 松手瞬间仍未关闭。
    // 注意：此时的收尾不是 transform 过渡（reduce 媒体查询以 `transform: none !important`
    // 压过 `.is-settling` 的过渡声明），而是 JS 兜底定时器到期后直接落终态，
    // 本用例锁定的是「按收尾时序关闭」这一时序，不是过渡本身。
    expect(full.open).toBe(true)
    await pollUntil(() => !full.open, 'drawer did not close after the settle sequence', 10_000)
    expect(getDialog(full).open).toBe(false)
  })
})

/*
 * 减少动效下的整页让开（page-shift）。
 *
 * reduce 下整套不生效，**静止位移也不写**：drawer 自己的 CSS 在 reduce 下把 panel 的
 * transform/translate/scale 全部归零，页面单独滑出去会读成一个缺陷。
 *
 * 判据取页面 marker 的走位（几何结果），动画条数只作旁证：「一条动画都没有」在
 * 「压根没让开」和「让开了但没有过渡」两种实现下都成立，光靠它回答不了问题。
 * 控制组走 `mountDrawer('full')` —— 系统仍是 reduce，只有主题档位不同，
 * 于是两组差值精确归因到 `prefersReducedMotion()` 那一次判断。
 */
describe('减少动效下的整页让开（浏览器）', () => {
  it('系统 reduce：页面不让开也不产生动画（对照组 theme full 让开同样距离）', async () => {
    const reduced = mountDrawer(null)
    reduced.pageShift = true
    const reducedMarker = pageMarker()
    await reduced.updateComplete
    await pollUntil(() => reducedMarker.getBoundingClientRect().width > 0, 'marker did not lay out')
    const reducedRest = reducedMarker.getBoundingClientRect().left

    await openDrawer(reduced)
    expect(await samplePageAnimations()).toHaveLength(0)
    expect(reducedMarker.getBoundingClientRect().left).toBeCloseTo(reducedRest, 1)
    expect(reduced.open).toBe(true)

    const full = mountDrawer('full')
    full.pageShift = true
    const fullMarker = pageMarker()
    await full.updateComplete
    await pollUntil(() => fullMarker.getBoundingClientRect().width > 0, 'marker did not lay out')
    const fullRest = fullMarker.getBoundingClientRect().left

    await openDrawer(full)
    // 先采样再等收敛：让开动画跑完就从 getAnimations() 里消失，顺序反了控制组会假负。
    expect(await samplePageAnimations()).not.toHaveLength(0)
    await waitPageSettled()
    expect(fullMarker.getBoundingClientRect().left).toBeCloseTo(fullRest - firstLayerShift(), 1)
  })
})
