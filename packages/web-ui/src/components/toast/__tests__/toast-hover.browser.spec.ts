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

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

/*
 * jsdom 里只能合成 pointerenter/pointerleave，事件序列和真实指针不是一回事（真实指针离开时
 * 还有 document 级的 pointerout/pointerleave）。这里用真实鼠标复现用户报的场景：
 * hover 上去再移开，倒计时必须按剩余时间续跑，而不是重启满时长、也不是永久停留。
 */
describe('toast 悬停暂停（浏览器）', () => {
  it('悬停期间不关闭，移开后按剩余时间关闭', async () => {
    const id = toast.info('悬停我', { id: 'hover', position: 'top-right', duration: 1500 })
    await waitMounted()
    const away = createAwayTarget()

    const el = findToast(id)
    expect(el).toBeDefined()

    await wait(1200)
    await page.elementLocator(el as Element).hover()

    // 越过原计时点（1500ms）后仍应停留 —— 悬停暂停生效。
    await wait(400)
    expect(findToast(id)?.visible).toBe(true)

    // 移开指针，剩余约 300ms。若重启满时长（1500ms），1000ms 时它还开着。
    await page.elementLocator(away).hover()
    await waitFor(() => findToast(id)?.visible !== true, 'hover 重启了满时长而不是续跑剩余时间', 1000)
    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close')
  })

  /*
   * 搬迁会把 toast 从指针底下移走，Chromium 重新命中测试后补发边界事件，悬停随即结束 ——
   * 这是期望行为：暂停的语义是「指针还在上面」，不是「这条 toast 被豁免」。真正要守住的是
   * 这条路径的两个退化：搬迁吞掉剩余时间导致立刻关闭，或搬迁重启满时长。remaining 与
   * duration 拉开足够距离（1000 vs 3000），断言才能稳稳区分两者。
   */
  it('悬停期间搬迁：剩余时间不丢，也不重启满时长', async () => {
    const id = toast.info('悬停并搬迁', { id: 'hover-move', position: 'top-right', duration: 3000 })
    await waitMounted()
    createAwayTarget()

    await wait(2000)
    await page.elementLocator(findToast(id) as Element).hover()
    await wait(100)

    // 悬停期间搬迁（真实 Chromium 走 moveBefore + connectedMoveCallback）。
    toast({ id, message: '悬停并搬迁', position: 'bottom-left' })
    await waitMounted()
    expect(findToast(id)?.parentElement?.dataset.wuiToastPosition).toBe('bottom-left')

    // 搬迁不得吞掉剩余时间：还有约 1000ms，不该立刻或 300ms 内就收场。
    await wait(300)
    expect(findToast(id)?.visible).toBe(true)

    // 剩余约 1000ms 后关闭；若重启满时长（3000ms）则 1600ms 内不会收场。
    await waitFor(() => findToast(id)?.visible !== true, '搬迁后倒计时没有按剩余时间续跑', 1600)
    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close')
  })
})
