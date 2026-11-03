import { afterEach, describe, expect, it } from 'vite-plus/test'

import { SHAKE_X_DISTANCE_FALLBACK, SHAKE_Y_DISTANCE_FALLBACK, shake } from '@/components/shake'

/*
 * jsdom 侧只测「选谁当目标、参数怎么解析」这一层——WAAPI 在 jsdom 里不存在，
 * 真正的摆动、峰值归一与 reduce 档位由 shake.browser.spec.ts /
 * reduced-motion.browser.spec.ts 在真浏览器里量。
 *
 * 这里用带类型的 stub 顶上 `animate`：需要断言的正是「有没有被调用、被谁调用、
 * 拿到了什么参数」，不是动画本身。
 */

interface AnimateCall {
  keyframes: Keyframe[]
  options: number | KeyframeAnimationOptions | undefined
}

function stubAnimate(el: HTMLElement): AnimateCall[] {
  const calls: AnimateCall[] = []
  el.animate = ((keyframes: Keyframe[], options?: number | KeyframeAnimationOptions) => {
    calls.push({ keyframes, options })
    return { id: '' } as unknown as Animation
  }) as typeof el.animate
  /*
   * 顶上 `getAnimations` 是为了让 stub 环境自洽：jsdom 两个都没有，只补 `animate`
   * 会让「重新触发前先撤掉上一条」那一步在测试里抛错。真实浏览器里两者同时存在，
   * 撤旧动画的行为由 browser spec 用真动画量。
   */
  el.getAnimations = (() => []) as typeof el.getAnimations
  return calls
}

/**
 * 关键帧里 `translate(dx, dy)` 在指定轴上摆出的最大幅度（相对静止位）。
 * `withBaseTransform` 在无基底变换时只留这一条函数式，所以它的两个参数就是两轴位移。
 */
function peakOf(call: AnimateCall, axis: 'x' | 'y'): number {
  const group = axis === 'x' ? 1 : 2
  const offsets = call.keyframes.map(keyframe => {
    const transform = String((keyframe as { transform?: string }).transform ?? '')
    const matched = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(transform)
    return matched ? Number.parseFloat(matched[group]) : 0
  })
  return Math.max(...offsets.map(Math.abs))
}

function durationOf(call: AnimateCall): number {
  const options = call.options
  if (typeof options === 'number') return options
  return typeof options?.duration === 'number' ? options.duration : Number.NaN
}

let host: HTMLElement | undefined

afterEach(() => {
  host?.remove()
  host = undefined
  // 摘掉自己的 stub，让下一条用例回到「该环境没有 WAAPI」的真实状态。
  delete (document.documentElement as { animate?: unknown; getAnimations?: unknown }).animate
  delete (document.documentElement as { animate?: unknown; getAnimations?: unknown }).getAnimations
})

describe('shake（jsdom 目标与参数解析）', () => {
  it('不带参数时目标是 documentElement', () => {
    const calls = stubAnimate(document.documentElement)
    host = document.createElement('div')
    document.body.append(host)
    const hostCalls = stubAnimate(host)

    shake()

    expect(calls).toHaveLength(1)
    expect(hostCalls, '指定 target 之外的元素不该被波及').toHaveLength(0)
  })

  it('直接传元素与传 options 都落到该元素，页面不动', () => {
    host = document.createElement('div')
    document.body.append(host)

    const pageCalls = stubAnimate(document.documentElement)
    const elementCalls = stubAnimate(host)

    shake(host)
    shake({ target: host, xDistance: 30, duration: 800 })

    expect(pageCalls).toHaveLength(0)
    expect(elementCalls).toHaveLength(2)
    expect(peakOf(elementCalls[1], 'x')).toBeCloseTo(30, 3)
    expect(durationOf(elementCalls[1])).toBe(800)
  })

  /*
   * 两轴共用同一条归一化序列，所以关键帧里两轴的极值各自等于传入的幅度：
   * 这一条测的是「参数怎么拆到两个轴上」，真浏览器里合成轨迹的形状由 browser spec 量。
   * 省略的那一轴读自己的 token（jsdom 里落到兜底），不是自动归零——两轴默认同为 12。
   */
  it('两轴分别给幅度时各自生效', () => {
    const calls = stubAnimate(document.documentElement)

    shake({ xDistance: 20, yDistance: 8 })

    expect(peakOf(calls[0], 'x')).toBeCloseTo(20, 3)
    expect(peakOf(calls[0], 'y')).toBeCloseTo(8, 3)

    calls.length = 0
    shake({ xDistance: 0, yDistance: 12 })
    expect(peakOf(calls[0], 'x'), '横向归零就不该带出横向位移').toBeCloseTo(0, 3)
    expect(peakOf(calls[0], 'y')).toBeCloseTo(12, 3)
  })

  /*
   * 没注册 CSS.registerProperty 的环境（jsdom）读回空串，走模块兜底。
   * 兜底值与注册项 initialValue 的一致性由 browser spec 钉住：漂移会让这里的
   * 结论与真浏览器相反。
   */
  it('未显式传幅度时读模块兜底值', () => {
    const calls = stubAnimate(document.documentElement)

    shake()

    expect(peakOf(calls[0], 'x')).toBeCloseTo(SHAKE_X_DISTANCE_FALLBACK, 3)
    expect(peakOf(calls[0], 'y')).toBeCloseTo(SHAKE_Y_DISTANCE_FALLBACK, 3)
  })

  it('两轴幅度全为 0、或时长为 0 时不创建动画', () => {
    const calls = stubAnimate(document.documentElement)

    shake({ xDistance: 0, yDistance: 0 })
    shake({ duration: 0 })

    expect(calls).toHaveLength(0)
  })

  it('单轴归零只摘掉那条轴，另一轴照旧摆', () => {
    const calls = stubAnimate(document.documentElement)

    shake({ xDistance: 0, yDistance: 16 })

    expect(calls).toHaveLength(1)
    expect(peakOf(calls[0], 'x')).toBeCloseTo(0, 3)
    expect(peakOf(calls[0], 'y')).toBeCloseTo(16, 3)
  })

  it('没有 WAAPI 的环境里不抛错', () => {
    // 真实 jsdom：animate 不存在（afterEach 已还原原型上的 undefined）。
    expect(typeof document.documentElement.animate).not.toBe('function')
    expect(() => shake()).not.toThrow()
  })
})
