import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { SettleExpectation } from '@/shared/test-utils'
import { afterRenderStep, waitForAnimationsToFinish, waitForSettledLayout } from '@/shared/test-utils'
import { waitForOpenTransition } from '@/shared/test-utils/real-gesture'

/**
 * 一个用得到的盒子：定位在视口内、有正宽高，用来承载动画与几何读数。
 */
function makeBox(): HTMLDivElement {
  const box = document.createElement('div')
  box.style.cssText = 'position: fixed; left: 16px; top: 16px; width: 40px; height: 40px; background: rgb(1 2 3);'
  return box
}

/**
 * 「目标已连接、已布局、完整落在视口内」这一期待值的最小复刻。
 * 刻意不用 `viewport.ts` 的 `expectInsideViewport`：那个模块 import 了 `page`，
 * 只存在于 browser runner，而这里断言的是判据本身，不该把另一份等待逻辑拖进来。
 */
function expectInsideViewport(targets: ReadonlyArray<Element | null | undefined>): SettleExpectation {
  return {
    check: () =>
      targets.every(target => {
        if (!target || !target.isConnected) return false
        const rect = target.getBoundingClientRect()
        return (
          (rect.width > 0 || rect.height > 0) &&
          rect.top >= -0.5 &&
          rect.left >= -0.5 &&
          rect.bottom <= window.innerHeight + 0.5 &&
          rect.right <= window.innerWidth + 0.5
        )
      }),
    describe: () => targets.map(target => (target?.isConnected ? 'connected' : 'not connected')).join(', ')
  }
}

afterEach(() => document.body.replaceChildren())

/*
 * 等待原语自身的守卫。
 *
 * 这些 helper 的「假稳定」形态是**返回的时刻什么都不代表**，而那种返回不会红：
 * 调用方以为自己等到了落定，接着去量一个还没动起来的盒子。四条判据如下，每条都
 * 对应一种已经在这个模块里存在过的静默返回——
 *
 *  1. 目标还没挂上 ⇒ 「没有可量的目标」必须等期待值，等不到就抛错，不能宣布定版。
 *     反事实（改前红）：`if (observed.length === 0) return` 在期待值**之前**执行，
 *     于是本用例的第一个断言成立前 helper 就已经返回。
 *  2. 过渡没跑完而预算耗尽 ⇒ `waitForAnimationsToFinish` 的返回值必须是承重的，
 *     settle 要把「没等到」判成失败。反事实（改前红）：旧实现 `Promise<void>`，
 *     settle 拿不到信号，预算耗尽照进度样取样。
 *  3. 一个可观察的根都没有 ⇒ 低层等待也要抛错，不能把「什么都没读到」当「已经稳定」。
 *     反事实（改前红）：旧实现 `if (observed.length === 0) return`。
 *  4. 面板尚未渲染 ⇒ `waitForOpenTransition` 轮询到 `dialog` 出现，不拿宿主顶替。
 *     反事实（改前红）：旧实现 `dialog ? [el, dialog] : el`，dialog 为 null 时只观察宿主，
 *     两个渲染步进就返回，那时面板还不存在。
 */
describe('settle 等待原语（浏览器）', () => {
  it('期待值成立前、目标还没挂上时不宣布定版', async () => {
    // 目标此刻**未连接**：旧实现在进函数那一刻就把 `observed` 算成空然后返回。
    const box = makeBox()
    const targets = [box]
    expect(box.isConnected).toBe(false)

    let helperResolved = false
    const settled = waitForSettledLayout(targets, { expect: expectInsideViewport(targets), timeoutMs: 5000 }).then(
      () => {
        helperResolved = true
      }
    )

    // 两个渲染步进之后才挂上：真正的用例等的就是这段窗口（Lit 异步渲染、reconcile 搬迁）。
    await afterRenderStep()
    await afterRenderStep()
    document.body.append(box)

    // 挂上之前不得已经返回：这条断言量的是 helper **自己**等了没有。
    // 期待值与它同形是刻意的——调用方写下 `expect:` 正是在说「到位之前不许往下走」。
    expect(helperResolved).toBe(false)

    await settled
    expect(helperResolved).toBe(true)
  })

  it('一个已连接的目标都没有时抛错，而不是宣布已定版', async () => {
    const box = makeBox()
    expect(box.isConnected).toBe(false)
    let message = ''
    try {
      await waitForSettledLayout([box, null], { timeoutMs: 500 })
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain('no connected target to settle')
    // 诊断要能指明失败原因，而不只是「超时了」。
    expect(message).toContain('0 connected')
    expect(box.isConnected).toBe(false)
  })

  it('过渡还没跑完而预算耗尽时，settle 判失败而不是安静取样', async () => {
    const box = makeBox()
    document.body.append(box)
    // 一条永远跑不完的过渡：只动 opacity，几何读数是恒定的——「稳定帧循环」
    // 对它毫无察觉，这正是要靠动画收敛信号捕获的形状。
    const animation = box.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 60_000,
      iterations: Infinity
    })

    let message = ''
    try {
      await waitForSettledLayout([box], { timeoutMs: 300 })
    } catch (error) {
      message = (error as Error).message
    } finally {
      animation.cancel()
    }

    expect(message).toContain('animations were still running')
  })

  it('不要求稳定帧时，动画收敛信号是唯一守卫：耗尽预算仍然失败', async () => {
    const box = makeBox()
    document.body.append(box)
    const animation = box.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 60_000,
      iterations: Infinity
    })

    // `stableFrames: 0` 把「几何不再变化」这道收尾关掉，剩下的就只有动画信号。
    // 旧实现里动画那一步 `Promise<void>`：预算耗尽静默返回，本调用会**通过**——
    // 于是调用方在一个还在跑的过渡上量盒子。
    let message = ''
    try {
      await waitForSettledLayout([box], { timeoutMs: 300, stableFrames: 0 })
    } catch (error) {
      message = (error as Error).message
    } finally {
      animation.cancel()
    }

    expect(message).toContain('animations were still running')
  })

  it('一个可观察的根都没有时，等待动画也要抛错', async () => {
    const box = makeBox()
    expect(box.isConnected).toBe(false)
    let message = ''
    try {
      await waitForAnimationsToFinish([box, null])
    } catch (error) {
      message = (error as Error).message
    }
    // 误传类数组也走同一条：类型签名只收 `Element` 或真数组，NodeList 会被包成
    // 一层再过滤成空。这里直接钉住「空 ⇒ 抛错」这个行为，不依赖调用点自觉。
    expect(message).toContain('no connected root to observe')
    expect(box.isConnected).toBe(false)
  })

  it('动画准时收敛时，等待结束并报告已收敛', async () => {
    const box = makeBox()
    document.body.append(box)
    const animation = box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 20 })
    const converged = await waitForAnimationsToFinish([box], 5000)
    animation.cancel()
    expect(converged).toBe(true)
  })

  it('面板还没渲染出来时，waitForOpenTransition 不拿宿主顶替', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const shadow = host.attachShadow({ mode: 'open' })

    let helperResolved = false
    const transition = waitForOpenTransition(host).then(() => {
      helperResolved = true
    })

    // 两个渲染步进之后面板才出现。
    await afterRenderStep()
    await afterRenderStep()
    const dialog = document.createElement('dialog')
    shadow.append(dialog)

    // 面板出现之前不得已经返回：旧实现只用宿主观察，两个空闲步进就宣布收敛。
    expect(helperResolved).toBe(false)

    await transition

    // 返回时面板必须已在场。
    expect(shadow.querySelector('dialog')).not.toBeNull()
  })

  it('面板上的过渡还没收敛时，waitForOpenTransition 不返回', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const dialog = document.createElement('dialog')
    shadow.append(dialog)

    // 挂在**面板**上的一条长过渡，宿主此刻没有动画。本用例钉住的是
    // 「跑在面板子树里的过渡要被等掉」这一条：`getAnimations({subtree: true})`
    // 覆盖 shadow 后代，所以**必须**带上两个根 `[el, dialog]` 观察；
    // 只传宿主 `[el]` 会被本用例挡红——它正是「面板被当作根」与「以为宿主
    // subtree 覆盖面板」的分界钉子。
    const animation = dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 30_000 })

    let helperResolved = false
    const transition = waitForOpenTransition(host).then(() => {
      helperResolved = true
    })

    // 若干渲染步进之后仍不得返回：30 秒长的过渡一个步进都跑不完，
    // 所以「等够了步进数却没等到」只能是这个子树里的过渡没被观察，不是时间不够。
    for (let step = 0; step < 4; step += 1) await afterRenderStep()
    expect(animation.playState).toBe('running')
    expect(helperResolved).toBe(false)

    // 结束过渡后必须收敛：否则这条等待是「永远不返回」，也不成立。
    animation.finish()
    await transition
    expect(helperResolved).toBe(true)
    await animation.finished.catch(() => undefined)
  })

  it('面板始终不出现时，waitForOpenTransition 带着读数报错', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    host.attachShadow({ mode: 'open' })

    let message = ''
    try {
      await waitForOpenTransition(host)
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain('has no <dialog> panel yet')
  })
})
