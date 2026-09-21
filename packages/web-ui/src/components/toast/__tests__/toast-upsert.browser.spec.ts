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

// 轮询条件直至满足：退场收尾既可能由 CSS transition 的 transitionend 驱动，也可能落到
// `getTransitionDuration() + 80ms` 的兜底定时器上（时长跨文件、且可被主题令牌覆盖），
// 固定 sleep 会在并行负载下静默失配，这里以条件收敛代替固定等待。
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

// 游标在文件间继承且位置不定：停在 toast 将出现的位置会触发挂载暂停（show() 的设计
// 行为），搬迁后又可能永不 resume。停靠到 top-right / bottom-left 都覆盖不到的中性位置。
function createNeutralPark(): HTMLElement {
  const park = document.createElement('div')
  park.id = 'neutral-park'
  park.style.cssText = 'position:fixed;left:50%;top:50%;width:32px;height:32px;z-index:2147483647'
  document.body.appendChild(park)
  return park
}

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

/*
 * CI 上游标位置继承自上一个测试文件：若停在 toast 挂载点，挂载即触发悬停暂停
 *（show() 的设计行为），搬迁后静止游标不保证补发 pointerleave → 永不 resume → 永不关闭。
 * 用例前先把指针停靠到中性位置（left:50%;top:50%），使暂停点确定化。
 */
describe('toast upsert（浏览器）', () => {
  /*
   * jsdom 没有 Element.moveBefore()，走的是 pause/resume 降级分支；真实 Chromium 走
   * moveBefore + connectedMoveCallback。两条路径都要保住剩余计时，否则搬运后的 toast
   * 永远不会自动关闭。
   */
  it('position 变化后仍按剩余时间自动关闭', async () => {
    // 停靠游标到中性位置，避免继承的游标落在 top-right 挂载点触发挂载暂停。
    const park = createNeutralPark()
    await page.elementLocator(park).hover()
    const id = toast.info('搬运中', { id: 'move', position: 'top-right', duration: 1200 })
    await waitMounted()

    // 等 deadline 逼近（<900ms）再搬迁：固定 sleep(400) 的 margin 800ms 在 CI 停顿下可被
    // 越过，upsert 会落在已关闭的 toast 上。触发后仍有 ~900ms 给搬迁派发。
    await waitFor(
      () => {
        const d = (findToast(id) as unknown as { _deadline?: number } | undefined)?._deadline
        return d !== undefined && d - Date.now() < 900
      },
      'deadline did not approach',
      2500
    )
    toast({ id, message: '搬运中', position: 'bottom-left' })

    const el = findToast(id)
    expect(el).toBeDefined()
    expect(el?.parentElement?.dataset.wuiToastPosition).toBe('bottom-left')

    // 搬迁只换位置：续跑剩余 <900ms（触发窗口）；重启满时长 ≈1200ms，阈值 1000 居中判别。
    const timing = findToast(id) as unknown as { _deadline?: number } | undefined
    expect(timing?._deadline).toBeDefined()
    expect(timing!._deadline! - Date.now()).toBeLessThan(1000)

    // 越过原计时点（1200ms）之后它不该还是可见态；若搬运重启了计时，则它会一直 visible 到 1600ms。
    await wait(900)
    await waitFor(() => findToast(id)?.visible !== true, 'toast restarted its countdown after a position-only upsert')

    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close')
  })
})
