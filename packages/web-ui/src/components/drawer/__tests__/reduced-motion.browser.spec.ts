import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function getDragZone(el: WebUiDrawer): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
}

function waitFor(condition: () => boolean, message: string, timeoutMs = 5000): Promise<void> {
  const start = performance.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (condition()) return resolve()
      if (performance.now() - start > timeoutMs) return reject(new Error(message))
      setTimeout(tick, 25)
    }
    tick()
  })
}

/**
 * 等打开动画收敛。
 * reduced 下打开是**即时**的（压根没有过渡），所以只能要求「动画已收敛」，
 * 不能要求「动画已启动」。但 full 下过渡在 presence 翻转后才起（rAF 之后 1–2 帧），
 * 若一上来就判 0 会撞上那个空窗，故先放几帧让该启动的启动。
 */
async function waitForOpenSettled(el: WebUiDrawer) {
  const dialog = getDialog(el)
  await waitFor(() => dialog.open, 'drawer did not open')
  await nextFrame()
  await nextFrame()
  await nextFrame()
  await waitFor(() => dialog.getAnimations().length === 0, 'drawer open transition did not settle')
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
 * 在若干帧内采样 dialog 上出现过的过渡属性（§10 S2：动效一律用 WAAPI 观察）。
 * 只采 dialog 自身（含 ::backdrop），不带 subtree——避免把后代元素的动画算进来。
 */
async function sampleTransitions(el: WebUiDrawer, frames = 12): Promise<string[]> {
  const dialog = getDialog(el)
  const seen = new Set<string>()
  for (let i = 0; i < frames; i += 1) {
    for (const animation of dialog.getAnimations()) {
      seen.add((animation as CSSTransition).transitionProperty ?? (animation as CSSAnimation).animationName ?? '?')
    }
    await nextFrame()
  }
  return [...seen]
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
 * 原实现读 `getComputedStyle(dialog).transform` 的 m41/m42 断言「reduced 下零位移」——
 * 那是几何取值（§12 C1），已换成 `getAnimations()`：无弹簧 == 一条动画都没有。
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
    await waitFor(() => !full.open, 'drawer did not close after the settle transition', 10_000)
  })

  it('未达阈值松手：即时弹回打开位且无残留动画', async () => {
    /*
     * 收尾已交还 CSS transition（issue #123）。逐帧采样的窗口在 CI 高负载下会整个错过
     * 最短 180ms 的收尾，所以改用 transitionstart 监听——与帧率解耦，直接回答
     *「有没有真的跑过渡」。
     *
     * 本例不再带 motion='full' 对照组：本文件跑在 `browser-reduced-motion` 工程，系统
     * reduce 生效，而 reduce 媒体查询以 `transform: none !important` 对所有位移归零
     *（enter/exit 同样如此）；theme 的 motion 只影响 JS 侧收尾时序，改不动这条 CSS
     * 规则。旧实现之所以能在 full 下观察到动画，是因为 WAAPI 不受 CSS 管辖——实现副作用，
     * 不是契约。「full 下确实在等收尾」的对照由上面的「超过阈值松手」用例承担。
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
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await reduced.updateComplete
    for (const x of [106, 112, 118, 124, 130]) {
      dragZone.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: x, clientY: 300 })
      )
      await new Promise(resolve => setTimeout(resolve, 16))
    }
    await reduced.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 130, clientY: 300 })
    )
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
    await waitFor(() => !full.open, 'drawer did not close after the settle sequence', 10_000)
    expect(getDialog(full).open).toBe(false)
  })
})
