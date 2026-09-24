import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement, waitForFrame, waitForUpdate } from '@/shared/test-utils'

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

    await expect.poll(() => path.getAnimations().length).toBeGreaterThan(0)
    el.remove()
  })

  it('no-autoplay 关闭挂载自动播放', async () => {
    const el = createEl()
    el.duration = 5000
    el.noAutoplay = true
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    // 同文件对照组：与上面只差 no-autoplay 一项，证明 0 是开关造成的而不是环境本来就没动画。
    const control = createEl()
    control.duration = 5000
    control.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await waitForUpdate(el)
    await waitForUpdate(control)
    const path = el.querySelector('path')!
    const controlPath = control.querySelector('path')!

    await expect.poll(() => controlPath.getAnimations().length).toBeGreaterThan(0)
    await waitForFrame()
    expect(path.getAnimations()).toHaveLength(0)

    // 开关只关掉自动播放，不关掉 replay() 本身
    void el.replay()
    await expect.poll(() => path.getAnimations().length).toBeGreaterThan(0)

    path.getAnimations().forEach(animation => animation.cancel())
    controlPath.getAnimations().forEach(animation => animation.cancel())
    el.remove()
    control.remove()
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

  /*
   * 收回的终点是「没有线」，所以这一段不能像正向那样在收尾时还原消费者的内联 dash。
   * 末态必须写进 DOM 而不是留给一条 fill:forwards 动画：收尾后两个方向都是 0 条动画，
   * 差别只在内联 dash 上——收回把整条路径落进间隙（dasharray 与 dashoffset 同为空白值，
   * 不钉具体长度），正向还原成消费者自己写的那份。
   */
  it('replay({reverse:true}) 收尾把空白留在内联样式上，正向收尾则还原消费者样式，两者都不挂动画', async () => {
    const retracted = createEl()
    retracted.duration = 50
    retracted.noAutoplay = true
    retracted.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    const drawn = createEl()
    drawn.duration = 50
    drawn.noAutoplay = true
    drawn.innerHTML = '<svg><path d="M0 0 L100 100" style="stroke-dasharray: 4; stroke-dashoffset: 2"/></svg>'
    await waitForUpdate(retracted)
    await waitForUpdate(drawn)
    const retractedPath = retracted.querySelector('path')!
    const drawnPath = drawn.querySelector('path')!

    await retracted.replay({ reverse: true })
    expect(retractedPath.getAnimations()).toHaveLength(0)
    expect(retractedPath.style.strokeDasharray).toBe(retractedPath.style.strokeDashoffset)
    expect(Number(retractedPath.style.strokeDashoffset)).toBeGreaterThan(0)

    await drawn.replay()
    expect(drawnPath.getAnimations()).toHaveLength(0)
    expect(drawnPath.style.strokeDasharray).toBe('4')
    expect(drawnPath.style.strokeDashoffset).toBe('2')

    retracted.remove()
    drawn.remove()
  })

  /*
   * 元素被摘走再挂回（列表 key 重排、teleport）不能改变已收尾的末态。旧实现把空白钉在一条
   * 还活着的动画上，disconnect 收尾时还原成完整描边，于是未勾选的控件重新接回 DOM 时勾复现。
   */
  it('收回收尾后的元素摘走再挂回仍是空白', async () => {
    const el = createEl()
    el.duration = 50
    el.noAutoplay = true
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    await el.replay({ reverse: true })
    const blank = path.style.strokeDashoffset

    el.remove()
    document.body.append(el)
    await waitForUpdate(el)

    // 还原成消费者原值时 dash 为空串，Number('') 为 0，这里即失败。
    expect(Number(path.style.strokeDashoffset)).toBeGreaterThan(0)
    expect(path.style.strokeDashoffset).toBe(blank)
    el.remove()
  })

  /*
   * 「沿原路收回」的契约是两端互换，所以要看的是关键帧顺序：只断言末态分不出「真的反着播」
   * 和「正着播完再抹掉」。观察面用 WAAPI 的 getKeyframes()（§10 S2），只钉哪一端是 0、
   * 另一端非 0，不钉具体长度（§12 C1）。
   */
  it('收回的关键帧从满描边走到空白，画入相反', async () => {
    const el = createEl()
    el.duration = 5000
    el.noAutoplay = true
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    const ends = (): [number, number] => {
      const frames = (path.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes()
      return [Number(frames[0].strokeDashoffset), Number(frames[frames.length - 1].strokeDashoffset)]
    }

    void el.replay({ reverse: true })
    await expect.poll(() => path.getAnimations().length).toBeGreaterThan(0)
    const [retractFrom, retractTo] = ends()
    expect(retractFrom).toBe(0)
    expect(retractTo).toBeGreaterThan(0)
    path.getAnimations().forEach(animation => animation.cancel())

    void el.replay()
    await expect.poll(() => path.getAnimations().length).toBeGreaterThan(0)
    const [revealFrom, revealTo] = ends()
    expect(revealFrom).toBeGreaterThan(0)
    expect(revealTo).toBe(0)
    path.getAnimations().forEach(animation => animation.cancel())
    el.remove()
  })

  /*
   * 收回之后下一次 replay 必须拿回 DOM 控制权：从空白重新画满，收尾回到消费者原值。
   * 「原值」只允许在第一次触碰元素时记录，若从上一次运行之后重新取，这里就会把空白当成原值留下。
   */
  it('收回后的下一次 replay 从空白接管并回到消费者原值', async () => {
    const el = createEl()
    el.duration = 50
    el.noAutoplay = true
    el.innerHTML = '<svg><path d="M0 0 L100 100" style="stroke-dasharray: 4; stroke-dashoffset: 2"/></svg>'
    await waitForUpdate(el)
    const path = el.querySelector('path')!

    await el.replay({ reverse: true })
    expect(path.style.strokeDasharray).not.toBe('4')

    await el.replay()
    expect(path.getAnimations()).toHaveLength(0)
    expect(path.style.strokeDasharray).toBe('4')
    expect(path.style.strokeDashoffset).toBe('2')
    el.remove()
  })
})
