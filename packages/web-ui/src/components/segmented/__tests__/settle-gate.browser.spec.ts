import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/segmented-trigger'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import { pollUntil, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSegmented } from '..'

/*
 * 指示器落定门（浏览器）。
 *
 * 缺陷形态：指示器的 left / width 带着 160ms 过渡，快速连点会连着改 value。若每次改值都
 * 照常起一段过渡，第二段要从第一段的插值中途重新起步——指示器永远慢半拍，连点结束后还要
 * 再等一整轮才停在终值，与「已经选到第几项」对不上。
 *
 * 修复：飞行中到达的新值直接落定（不排队、不重启插值）。
 *
 * 判据取**指示器的逐帧几何**，两个方向都必须有，缺一不可：
 *   - 快速连点 → 采样序列上不得出现中间值（不重跑多段插值）
 *   - 间隔 >200ms 的正常切换 → 采样序列上**必须**出现中间值（门没把正常过渡也关掉）
 * 只测前者的话，一个「把过渡全关掉」的实现同样能过：那样连点确实直接落定，但正常点击
 * 之间的指示器移动也没了，正是这个门要避免的副作用。
 *
 * 必须 browser mode：这里量的是 CSS 过渡的逐帧插值，jsdom 没有布局也没有过渡。
 */

afterEach(() => document.body.replaceChildren())

const EPS = 0.5
/** 过渡时长（--wui-duration-trigger 默认 160ms）的 1.6 倍，确保飞行窗口确实过期。 */
const GAP_MS = 260

function optionSurface(trigger: WebUiSegmentedTrigger): HTMLElement {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  return surface
}

async function mount(): Promise<{
  segmented: WebUiSegmented
  triggers: WebUiSegmentedTrigger[]
  indicator: HTMLElement
}> {
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'a'
  const triggers = (['a', 'b', 'c'] as const).map(value => {
    const trigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
    trigger.value = value
    trigger.textContent = value
    return trigger
  })
  segmented.append(...triggers)
  document.body.appendChild(segmented)

  await waitForUpdate(segmented)
  const indicator = segmented.shadowRoot?.querySelector('.wui-segmented-indicator') as HTMLElement
  // 定位走 afterSync 的 rAF，首帧之后才有 left/width。
  await pollUntil(() => indicator.getBoundingClientRect().width > 0, '指示器未完成定位')
  return { segmented, triggers, indicator }
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve))
}

/** 轻点某个选项：走 trigger 自己的 click 路径（与真实轻点同一入口）。 */
async function tap(segmented: WebUiSegmented, trigger: WebUiSegmentedTrigger) {
  optionSurface(trigger).click()
  await waitForUpdate(segmented)
}

/**
 * 逐帧采样指示器左缘，直到超过 budget 帧或位置连续 3 帧不再变化。
 *
 * 不按固定时长采样：过渡在并行负载下完成时间不可预测。连续若干帧不变即视为已停稳
 *（插值结束或根本没有插值，两种都算停稳）。
 */
async function sampleLeft(indicator: HTMLElement, budgetFrames = 40): Promise<number[]> {
  const samples: number[] = []
  let stable = 0
  for (let frame = 0; frame < budgetFrames && stable < 3; frame += 1) {
    await nextFrame()
    const left = indicator.getBoundingClientRect().left
    samples.push(left)
    stable = samples.length > 1 && Math.abs(left - samples[samples.length - 2]) < 0.5 ? stable + 1 : 0
  }
  return samples
}

/** 采样序列里是否存在严格处于两端之间的中间值（插值确实发生过）。 */
function hasIntermediateValue(samples: number[], from: number, to: number): boolean {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const span = hi - lo
  if (span < 1) return false
  return samples.some(value => value > lo + span * 0.15 && value < hi - span * 0.15)
}

describe('WebUiSegmented 指示器落定门（浏览器）', () => {
  it('快速连点直接落定终值，不重跑多段插值', async () => {
    const { segmented, triggers, indicator } = await mount()
    const startLeft = indicator.getBoundingClientRect().left
    const finalLeft = triggers[2].getBoundingClientRect().left

    // 连点：a → b → c，间隔远小于 160ms 的过渡时长。
    await tap(segmented, triggers[1])
    await tap(segmented, triggers[2])
    const samples = await sampleLeft(indicator)

    // 核心判据：整段采样里没有中间值——指示器一步就停到终值。
    expect(
      hasIntermediateValue(samples, startLeft, finalLeft),
      `连点采样=${samples.map(v => v.toFixed(1)).join(',')}`
    ).toBe(false)
    // 并且真的停在了终值（不是「没有中间值」因为压根没动）。
    expect(
      Math.abs(samples[samples.length - 1] - finalLeft),
      `末帧=${samples[samples.length - 1]} 终值=${finalLeft}`
    ).toBeLessThanOrEqual(EPS)
  })

  it('间隔超过过渡时长的正常切换仍走完整过渡（门没把过渡也关掉）', async () => {
    const { segmented, triggers, indicator } = await mount()
    const startLeft = indicator.getBoundingClientRect().left
    const targetLeft = triggers[1].getBoundingClientRect().left

    // 采样必须紧接轻点开始：先等窗口过期再采，量到的是已经停稳的终值，
    // 插值早已发生完，判据就永远读不到中间值。
    await tap(segmented, triggers[1])
    const samples = await sampleLeft(indicator)

    expect(
      hasIntermediateValue(samples, startLeft, targetLeft),
      `正常切换采样=${samples.map(v => v.toFixed(1)).join(',')}`
    ).toBe(true)
    expect(
      Math.abs(samples[samples.length - 1] - targetLeft),
      `末帧=${samples[samples.length - 1]} 目标=${targetLeft}`
    ).toBeLessThanOrEqual(EPS)
  })

  it('窗口过期后的下一次切换重新拿到完整过渡（世代号没把门永久焊死）', async () => {
    const { segmented, triggers, indicator } = await mount()

    // 先来一次快速连点（打开落定门），等窗口过期。
    await tap(segmented, triggers[1])
    await tap(segmented, triggers[2])
    await new Promise(resolve => setTimeout(resolve, GAP_MS))
    await sampleLeft(indicator)

    // 再切一次：这一趟必须走完整过渡。
    const from = indicator.getBoundingClientRect().left
    const to = triggers[0].getBoundingClientRect().left
    await tap(segmented, triggers[0])
    const samples = await sampleLeft(indicator)

    expect(hasIntermediateValue(samples, from, to), `过期后采样=${samples.map(v => v.toFixed(1)).join(',')}`).toBe(true)
  })
})
