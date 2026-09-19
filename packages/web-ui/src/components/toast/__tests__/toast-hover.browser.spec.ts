import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import { toast } from '..'

function fallbackRoot(): ShadowRoot | null {
  return document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function findToast(id: string) {
  return Array.from(fallbackRoot()?.querySelectorAll('web-ui-toast') ?? []).find(el => el.toastId === id)
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

// 批量挂载是微任务，show() 在其后的 rAF 里。
async function waitMounted(): Promise<void> {
  await Promise.resolve()
  await nextFrame()
  await nextFrame()
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 退场收尾走 CSS transitionend 或时长兜底定时器，固定 sleep 会在并行负载下失配，以条件收敛代替。
async function waitFor(condition: () => boolean, message: string, timeoutMs = 3000): Promise<void> {
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

// 真实指针需要一处「别处」才能移开：固定定位在左下角，避开 top-right 的 toast。
function createAwayTarget(): HTMLElement {
  const away = document.createElement('div')
  away.id = 'away-target'
  away.style.cssText = 'position:fixed;left:0;bottom:0;width:32px;height:32px;z-index:2147483647'
  document.body.appendChild(away)
  return away
}

// ── 可观察状态 helpers ──────────────────────────────────────────────
// TS private 字段运行时可读；用 unknown 双重转型避免 any。
type ToastTiming = {
  _deadline?: number
  _pausedRemaining?: number
  _closeTimer?: ReturnType<typeof setTimeout>
}

function timingOf(id: string): ToastTiming | undefined {
  return findToast(id) as unknown as ToastTiming | undefined
}

// 等待真正续跑：暂停态解除且 close timer 已重新点火。
async function waitResumed(id: string, message: string): Promise<void> {
  await waitFor(
    () => {
      const t = timingOf(id)
      return !!t && t._pausedRemaining === undefined && t._closeTimer !== undefined
    },
    message,
    2500
  )
}

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

/*
 * jsdom 里只能合成 pointerenter/pointerleave，事件序列和真实指针不是一回事（真实指针离开时
 * 还有 document 级的 pointerout/pointerleave）。这里用真实鼠标复现用户报的场景：
 * hover 上去再移开，倒计时必须按剩余时间续跑，而不是重启满时长、也不是永久停留。
 *
 * 「续跑 vs 重启」判定不依赖墙钟：移开后读组件内部 _deadline，续跑时它同步等于
 * Date.now() + pausedRemaining（≈600ms / ≈900ms），重启满时长的回归会给出 ≈duration
 * （3000ms）。两者差距远超任何 CI 负载抖动。
 *
 * CI 上游标位置继承自上一个测试文件：若停在 toast 将出现的位置，挂载后 Chromium 命中测试
 * 补发 pointerenter → 暂停，此刻剩余 ≈ 满时长，deadline 断言必然失败。每条用例在创建
 * toast 前先把指针停靠到无关的 away 目标，使「暂停发生点」确定化。
 */
describe('toast 悬停暂停（浏览器）', () => {
  it('悬停期间不关闭，移开后按剩余时间关闭', async () => {
    const away = createAwayTarget()
    // CI 上游标位置继承自上一个测试文件：若停在 toast 将出现的位置，挂载即触发悬停暂停
    //（剩余=满时长，show() 的设计行为），用例前提被破坏。先停靠到无关位置再创建 toast，
    // 让「暂停发生点」落在用例控制的 hover 时刻。
    await page.elementLocator(away).hover()
    const id = toast.info('悬停我', { id: 'hover', position: 'top-right', duration: 3000 })
    await waitMounted()

    const el = findToast(id)
    expect(el).toBeDefined()

    // 等 deadline 逼近（<1200ms）再悬停：固定 sleep 的 margin 仅 600ms，CI 停顿可越过
    // 3000ms deadline 使 toast 先行关闭。条件收敛触发后仍有 ~1200ms 给 hover 派发。
    await waitFor(
      () => {
        const d = timingOf(id)?._deadline
        return d !== undefined && d - Date.now() < 1200
      },
      'deadline did not approach',
      2500
    )
    const remainingBeforePause = (timingOf(id)?._deadline ?? 0) - Date.now()
    await page.elementLocator(el as Element).hover()

    // 越过原计时点（3000ms）后仍应停留 —— 悬停暂停生效。
    await wait(800)
    expect(findToast(id)?.visible).toBe(true)

    // 移开指针。续跑判定为可观察状态：resumeAutoClose() 同步按暂停时剩余重置 deadline，
    // 必然小于暂停前捕获的 remainingBeforePause；重启满时长的回归给出 ≈3000ms，必然大于它。
    await page.elementLocator(away).hover()
    await waitResumed(id, 'pointerleave 后未恢复自动关闭')
    const resumed = timingOf(id)?._deadline
    expect(resumed).toBeDefined()
    expect(resumed! - Date.now()).toBeLessThan(remainingBeforePause)
    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close', 4000)
  })

  /*
   * 搬迁会把 toast 从指针底下移走，Chromium 重新命中测试后补发边界事件，悬停随即结束 ——
   * 这是期望行为：暂停的语义是「指针还在上面」，不是「这条 toast 被豁免」。真正要守住的是
   * 这条路径的两个退化：搬迁吞掉剩余时间导致立刻关闭，或搬迁重启满时长。
   * 「续跑 vs 重启」通过 _deadline 读取判定：续跑剩余必然小于暂停前剩余，重启满时长 ≈3000ms。
   */
  it('悬停期间搬迁：剩余时间不丢，也不重启满时长', async () => {
    const away = createAwayTarget()
    await page.elementLocator(away).hover()
    const id = toast.info('悬停并搬迁', { id: 'hover-move', position: 'top-right', duration: 3000 })
    await waitMounted()

    // 与第一条用例同法：deadline 条件收敛（<1200ms）代替固定 sleep(2000)。
    await waitFor(
      () => {
        const d = timingOf(id)?._deadline
        return d !== undefined && d - Date.now() < 1200
      },
      'deadline did not approach',
      2500
    )
    const remainingBeforePause = (timingOf(id)?._deadline ?? 0) - Date.now()
    await page.elementLocator(findToast(id) as Element).hover()
    await wait(100)

    // 悬停期间搬迁（真实 Chromium 走 moveBefore + connectedMoveCallback）。
    toast({ id, message: '悬停并搬迁', position: 'bottom-left' })
    await waitMounted()
    expect(findToast(id)?.parentElement?.dataset.wuiToastPosition).toBe('bottom-left')

    // 搬迁不得吞掉剩余时间：还有约 1000ms，不该立刻或 300ms 内就收场。
    await wait(300)
    expect(findToast(id)?.visible).toBe(true)

    // 搬迁后 Chromium 重命中补发 pointerleave，悬停结束；等真正续跑再读 deadline。
    await waitResumed(id, '搬迁后未恢复自动关闭')
    const resumedAfterMove = timingOf(id)?._deadline
    expect(resumedAfterMove).toBeDefined()
    // 续跑剩余必然小于暂停前捕获的 remainingBeforePause；重启满时长会是 ≈3000ms。
    expect(resumedAfterMove! - Date.now()).toBeLessThan(remainingBeforePause)
    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close', 4000)
  })
})
