import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import {
  SHAKE_X_DISTANCE_FALLBACK,
  SHAKE_X_DISTANCE_VARIABLE,
  SHAKE_Y_DISTANCE_FALLBACK,
  SHAKE_Y_DISTANCE_VARIABLE,
  shake
} from '@/components/shake'
import { pollUntil, waitForAnimationsToFinish } from '@/shared/test-utils'

/*
 * shake() 在真实浏览器里的行为（WAAPI）。
 *
 * 判据全部是**关系**：option / token 与实测摆幅相等、in-flow 与 fixed 走同一段位移、
 * 居中基准不漂、重触发不叠加。默认幅度是视觉调参结论，不锁像素。
 *
 * 取样方式是**暂停动画 + 逐关键帧设 currentTime**，与帧率、CI 负载无关；峰值只可能落在
 * 关键帧上（段间线性插值），所以遍历关键帧就是遍历真实轨迹的极值，不必把实现的采样点数
 * 复述一遍。
 */

/** 目标在指定轴上相对静止位的偏移（从合成后的 transform 矩阵里取）。 */
function offsetOf(el: HTMLElement, axis: 'x' | 'y'): number {
  const raw = getComputedStyle(el).transform
  if (!raw || raw === 'none') return 0
  const matrix = new DOMMatrixReadOnly(raw)
  return axis === 'x' ? matrix.m41 : matrix.m42
}

/** 取 shake 在目标上新建的那条动画，同时证明它只新建了一条。 */
function capture(el: HTMLElement, run: () => void): Animation {
  const before = new Set(el.getAnimations())
  run()
  const created = el.getAnimations().filter(animation => !before.has(animation))
  expect(created, 'shake() 应在目标上留下一条动画').toHaveLength(1)
  created[0].pause()
  return created[0]
}

/** 把已暂停的动画停在归一化时间轴上的 offset。 */
function settleAt(animation: Animation, offset: number): void {
  const duration = Number((animation.effect as KeyframeEffect).getTiming().duration)
  animation.currentTime = duration * offset
}

interface AxisPeak {
  /** 归一化时间轴上该轴摆幅最大的那一帧 */
  offset: number
  /** 该轴相对静止位的偏移（带符号） */
  value: number
}

function peakOf(el: HTMLElement, animation: Animation, axis: 'x' | 'y'): AxisPeak {
  const keyframes = (animation.effect as KeyframeEffect).getKeyframes() as Array<{ computedOffset: number }>
  settleAt(animation, 0)
  const rest = offsetOf(el, axis)
  let best: AxisPeak = { offset: 0, value: 0 }
  for (const frame of keyframes) {
    settleAt(animation, frame.computedOffset)
    const value = offsetOf(el, axis) - rest
    if (Math.abs(value) > Math.abs(best.value)) best = { offset: frame.computedOffset, value }
  }
  return best
}

const mounted: HTMLElement[] = []

function marker(inline: string, parent: Element = document.body): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `width:10px;height:10px;${inline}`
  parent.append(el)
  mounted.push(el)
  return el
}

afterEach(async () => {
  for (const el of mounted) el.remove()
  mounted.length = 0
  document.documentElement.style.removeProperty(SHAKE_X_DISTANCE_VARIABLE)
  document.documentElement.style.removeProperty(SHAKE_Y_DISTANCE_VARIABLE)
  await waitForAnimationsToFinish(document.documentElement)
})

describe('shake（浏览器 WAAPI）', () => {
  it('不带参数震整页：in-flow 与 fixed 内容走同一段位移，跑完不残留位移', async () => {
    const inFlow = marker('margin-left:120px')
    const fixed = marker('position:fixed;top:60px;left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'in-flow marker 未布局')

    const restInFlow = inFlow.getBoundingClientRect().left
    const restFixed = fixed.getBoundingClientRect().left
    const xDistance = 30
    const animation = capture(document.documentElement, () => shake({ xDistance }))

    const peak = peakOf(document.documentElement, animation, 'x')
    expect(Math.abs(peak.value)).toBeCloseTo(xDistance, 1)

    /*
     * 停在摆幅最大那一帧再量两个 marker。fixed 跟着整页走是「震整页」的既定代价，
     * 两者位移必须相同——差一个 24px 就说明页面不是整体动，而是滚动区被推了。
     */
    settleAt(animation, peak.offset)
    expect(inFlow.getBoundingClientRect().left - restInFlow).toBeCloseTo(peak.value, 1)
    expect(fixed.getBoundingClientRect().left - restFixed).toBeCloseTo(peak.value, 1)

    animation.finish()
    await waitForAnimationsToFinish(document.documentElement)
    expect(inFlow.getBoundingClientRect().left).toBeCloseTo(restInFlow, 1)
    expect(document.documentElement.getAnimations()).toHaveLength(0)
  })

  it('指定 target 时只震那一块，整页不动', () => {
    const el = marker('margin-left:140px')
    const animation = capture(el, () => shake({ target: el, xDistance: 24 }))

    expect(Math.abs(peakOf(el, animation, 'x').value)).toBeCloseTo(24, 1)
    expect(document.documentElement.getAnimations()).toHaveLength(0)
  })

  it('目标已有的 transform 被逐帧带上：居中定位不被震动吃掉', () => {
    // 绝对定位 + translate(-50%,-50%) 居中。丢掉基底变换时，关键帧只剩摆幅本身，
    // 元素的纵向中心会从 120 掉到 140（整块偏到右下），摆幅再对也救不回来。
    // 只让横向摆（纵向显式归零），纵向中心才是纯粹的基底变换判据。
    const el = document.createElement('div')
    el.style.cssText = 'position:absolute;top:120px;left:200px;width:80px;height:40px;transform:translate(-50%,-50%)'
    document.body.append(el)
    mounted.push(el)

    const centreY = () => {
      const rect = el.getBoundingClientRect()
      return rect.top + rect.height / 2
    }
    const restCentreY = centreY()
    const animation = capture(el, () => shake({ target: el, xDistance: 20, yDistance: 0 }))

    const peak = peakOf(el, animation, 'x')
    expect(Math.abs(peak.value)).toBeCloseTo(20, 1)
    settleAt(animation, peak.offset)
    expect(centreY()).toBeCloseTo(restCentreY, 1)
  })

  it('两轴同时给幅度：各自摆到自己的量，且同相位落在同一帧', () => {
    const el = marker('margin-left:160px')
    const animation = capture(el, () => shake({ target: el, xDistance: 24, yDistance: 10 }))

    const xPeak = peakOf(el, animation, 'x')
    const yPeak = peakOf(el, animation, 'y')
    expect(Math.abs(xPeak.value)).toBeCloseTo(24, 1)
    expect(Math.abs(yPeak.value)).toBeCloseTo(10, 1)
    /*
     * 同相位是「合成轨迹是一条直线」的前提：两轴的极值帧必须重合、符号关系恒定。
     * 若哪天改成两轴错相，这两条判据会立刻变红，而不是留下一个没人发现的椭圆轨道。
     */
    expect(yPeak.offset).toBe(xPeak.offset)
    expect(Math.sign(yPeak.value)).toBe(Math.sign(xPeak.value))
  })

  it('只给纵向幅度就是上下摆，横向不带出去', () => {
    const el = marker('margin-left:160px')
    const animation = capture(el, () => shake({ target: el, xDistance: 0, yDistance: 16 }))

    expect(Math.abs(peakOf(el, animation, 'y').value)).toBeCloseTo(16, 1)
    expect(Math.abs(peakOf(el, animation, 'x').value)).toBeCloseTo(0, 1)
  })

  it('token 驱动幅度；单轴归零只摘掉那条轴，两轴都归零才关掉整条效果', () => {
    const el = marker('margin-left:160px')
    el.style.setProperty(SHAKE_X_DISTANCE_VARIABLE, '26px')
    const animation = capture(el, () => shake(el))
    expect(Math.abs(peakOf(el, animation, 'x').value)).toBeCloseTo(26, 1)
    animation.cancel()

    // 注册为 <length> 后消费方的 unitless 0 在计算值阶段归一成 0px：
    // 横向归零后，纵向仍按自己的 token（此处是注册项默认值）摆。
    el.style.setProperty(SHAKE_X_DISTANCE_VARIABLE, '0')
    expect(Number.parseFloat(getComputedStyle(el).getPropertyValue(SHAKE_X_DISTANCE_VARIABLE))).toBe(0)
    const vertical = capture(el, () => shake(el))
    expect(Math.abs(peakOf(el, vertical, 'x').value)).toBeCloseTo(0, 1)
    expect(Math.abs(peakOf(el, vertical, 'y').value)).toBeCloseTo(SHAKE_Y_DISTANCE_FALLBACK, 1)
    vertical.cancel()

    // 两轴都为 0 才是整条关掉：不留动画，也不创建动画。
    el.style.setProperty(SHAKE_Y_DISTANCE_VARIABLE, '0')
    expect(el.getAnimations()).toHaveLength(0)
    shake(el)
    expect(el.getAnimations()).toHaveLength(0)
  })

  it('纵向幅度由自己的 token 驱动，与横向两个量互不覆写', () => {
    const el = marker('margin-left:160px')
    el.style.setProperty(SHAKE_X_DISTANCE_VARIABLE, '20px')
    el.style.setProperty(SHAKE_Y_DISTANCE_VARIABLE, '9px')
    const animation = capture(el, () => shake(el))

    expect(Math.abs(peakOf(el, animation, 'x').value)).toBeCloseTo(20, 1)
    expect(Math.abs(peakOf(el, animation, 'y').value)).toBeCloseTo(9, 1)
  })

  it('同一目标重复调用：撤掉上一条重新摆，位移不叠加', () => {
    const el = marker('margin-left:160px')
    const first = capture(el, () => shake({ target: el, xDistance: 20 }))

    const before = new Set(el.getAnimations())
    shake({ target: el, xDistance: 20 })
    const created = el.getAnimations().filter(animation => !before.has(animation))

    expect(created).toHaveLength(1)
    expect(el.getAnimations()).toHaveLength(1)
    expect(first.playState).toBe('idle')
  })

  it('模块兜底常量与注册项 initialValue 同源', () => {
    const el = marker('')
    // 无任何覆盖时读到的就是注册项的 initialValue。漂移会让 jsdom 侧的结论与真浏览器相反。
    expect(Number.parseFloat(getComputedStyle(el).getPropertyValue(SHAKE_X_DISTANCE_VARIABLE))).toBe(
      SHAKE_X_DISTANCE_FALLBACK
    )
    expect(Number.parseFloat(getComputedStyle(el).getPropertyValue(SHAKE_Y_DISTANCE_VARIABLE))).toBe(
      SHAKE_Y_DISTANCE_FALLBACK
    )
  })

  /*
   * 主题档位压过系统档位：本工程系统偏好是「不减少动效」，所以 `motion='reduced'` 下
   * 「不动」只可能来自主题范围。reduce 工程里同样形状的断言分辨不出这两条来源
   * （那里系统本来就该不动），因此这条必须留在正常工程。
   *
   * 对照走**同一个调用形状**（`shake({ xDistance })` 震整页），只翻动 `motion` 属性：
   * 环境、目标、代码路径全不变，区分力只剩档位本身。
   */
  it('根主题 motion=reduced：系统未要求减少动效时也不摆，翻成 full 后同样调用会摆', async () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false)

    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)
    mounted.push(theme)
    // getOverlayRoot() 读 renderRoot，未渲染过的主题不算生效范围 → findRootTheme() 找不到它。
    await theme.updateComplete

    const inFlow = marker('margin-left:120px', theme)
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'in-flow marker 未布局')
    const rest = inFlow.getBoundingClientRect().left

    shake({ xDistance: 30 })
    expect(document.documentElement.getAnimations()).toHaveLength(0)
    expect(inFlow.getBoundingClientRect().left).toBeCloseTo(rest, 1)

    theme.setAttribute('motion', 'full')
    const animation = capture(document.documentElement, () => shake({ xDistance: 30 }))
    expect(Math.abs(peakOf(document.documentElement, animation, 'x').value)).toBeCloseTo(30, 1)
    // 暂停着的动画会让 afterEach 的收敛等待走满预算，收尾时撤掉。
    animation.cancel()
  })
})
