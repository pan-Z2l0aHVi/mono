import { afterEach, describe, expect, it } from 'vite-plus/test'

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

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

describe('toast upsert（浏览器）', () => {
  /*
   * jsdom 没有 Element.moveBefore()，走的是 pause/resume 降级分支；真实 Chromium 走
   * moveBefore + connectedMoveCallback。两条路径都要保住剩余计时，否则搬运后的 toast
   * 永远不会自动关闭。
   */
  it('position 变化后仍按剩余时间自动关闭', async () => {
    const id = toast.info('搬运中', { id: 'move', position: 'top-right', duration: 1200 })
    await waitMounted()

    await wait(400)
    toast({ id, message: '搬运中', position: 'bottom-left' })

    const el = findToast(id)
    expect(el).toBeDefined()
    expect(el?.parentElement?.dataset.wuiToastPosition).toBe('bottom-left')

    // 越过原计时点（1200ms）之后它不该还是可见态；若搬运重启了计时，则它会一直 visible 到 1600ms。
    await wait(900)
    await waitFor(() => findToast(id)?.visible !== true, 'toast restarted its countdown after a position-only upsert')

    await waitFor(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close')
  })
})
