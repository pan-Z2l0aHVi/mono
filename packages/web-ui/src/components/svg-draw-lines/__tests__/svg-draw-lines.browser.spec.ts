import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement, waitForUpdate } from '@/shared/test-utils'

import '..'
import type { WebUiSvgDrawLines } from '..'

const createEl = (): WebUiSvgDrawLines => mountElement<WebUiSvgDrawLines>('web-ui-svg-draw-lines')

afterEach(() => document.body.replaceChildren())

describe('WebUiSvgDrawLines 组件（浏览器）', () => {
  it('直接 light DOM SVG 完成后恢复原始内联样式', async () => {
    const el = createEl()
    el.duration = 50
    el.innerHTML = '<svg><path d="M0 0 L100 100" style="stroke-dasharray: 4; stroke-dashoffset: 2"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    await el.replay()

    expect(path.style.strokeDasharray).toBe('4')
    expect(path.style.strokeDashoffset).toBe('2')
    el.remove()
  })

  it('首次 slot 内容出现后自动播放一次', async () => {
    const el = createEl()
    // 拉长时长，确保断言时动画仍处于进行中
    el.duration = 5000
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    // 未显式调用 replay()，仅凭内容出现即产生动画
    await expect.poll(() => path.getAnimations().length).toBeGreaterThan(0)
    el.remove()
  })

  /*
   * replay 的契约是「中断旧动画并重新开始」，不只是「调用不报错」。
   * 观察面用 WAAPI：旧实例被 cancel 后 playState 归 idle 且不再出现在
   * getAnimations() 里，新实例随即接管（§10 S2）。
   *
   * 区分力已实测（review fixup）：去掉 replay() 里的 cancelAll() 后本例变红。
   */
  it('replay 中断进行中的动画并重新开始', async () => {
    const el = createEl()
    // 拉长时长，确保断言时上一段动画仍在进行中
    el.duration = 5000
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    await expect.poll(() => path.getAnimations().length).toBeGreaterThan(0)
    const first = path.getAnimations()[0]

    // 不 await：replay 要等新动画跑完才 resolve，这里要看的是它刚接管的那一刻。
    const replayed = el.replay()
    await expect.poll(() => path.getAnimations().some(animation => animation !== first)).toBe(true)

    expect(first.playState).toBe('idle')
    expect(path.getAnimations().every(animation => animation !== first)).toBe(true)

    // 收尾：取消新动画让 replay() 的 promise 落地，避免挂着 5s 的悬挂动画。
    path.getAnimations().forEach(animation => animation.cancel())
    await replayed
    el.remove()
  })

  it('无内容时 replay 立即 resolve', async () => {
    const el = createEl()
    await expect(el.replay()).resolves.toBeUndefined()
    el.remove()
  })

  it('空 SVG 无几何元素时 replay 不报错', async () => {
    const el = createEl()
    el.innerHTML = '<svg></svg>'
    await waitForUpdate(el)
    await expect(el.replay()).resolves.toBeUndefined()
    el.remove()
  })
})
