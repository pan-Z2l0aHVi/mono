import '..'
import '@/components/segmented-trigger'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import { pollUntil, queryA11y, waitForFrame, waitForUpdate } from '@/shared/test-utils'
import { parseDuration } from '@/shared/theme/duration'

import type { WebUiSegmented } from '..'

/*
 * indicator 落定门（浏览器）。
 *
 * 缺陷形态：indicator 的 left / width 带着 160ms 过渡，快速连点会连着改 value。若每次改值都
 * 照常起一段过渡，第二段要从第一段的插值中途重新起步——indicator 永远慢半拍，连点结束后还要
 * 再等一整轮才停在终值，与「已经选到第几项」对不上。
 *
 * 修复：飞行中到达的新值直接落定（不排队、不重启插值）。
 *
 * 判据取**indicator 的逐帧几何**，两个方向都必须有，缺一不可：
 *   - 快速连点 → 采样序列上不得出现中间值（不重跑多段插值）
 *   - 间隔 >200ms 的正常切换 → 采样序列上**必须**出现中间值（门没把正常过渡也关掉）
 * 只测前者的话，一个「把过渡全关掉」的实现同样能过：那样连点确实直接落定，但正常点击
 * 之间的 indicator 移动也没了，正是这个门要避免的副作用。
 *
 * 必须 browser mode：这里量的是 CSS 过渡的逐帧插值，jsdom 没有布局也没有过渡。
 */

afterEach(() => document.body.replaceChildren())

const EPS = 0.5

/*
 * 「飞行窗口过期」只能靠时间判定：窗口是组件内部一个 `setTimeout`，没有公开观测面，而
 * 直接落定的分支根本没有过渡可等（等动画收敛会在约两帧后返回，比窗口还短）。
 *
 * 时长取 indicator 上 `left` 那条过渡的计算值，不在测试里抄一份 160：组件的落定窗口与
 * CSS 的过渡按契约同值（`segmented/index.ts` 的 `triggerDuration` 读同一个 token、兜底同
 * 一个数）。抄死了就成了第二个真相来源，token 一改，窗口还没过期也照样「等够」。
 * 系数 1.6 是给真实计时器漂移留的余量，不参与契约。
 */
function settleWindowMs(indicator: HTMLElement): number {
  const styles = getComputedStyle(indicator)
  const index = styles.transitionProperty
    .split(',')
    .map(name => name.trim())
    .indexOf('left')
  const duration = parseDuration(index === -1 ? '' : (styles.transitionDuration.split(',')[index] ?? ''))
  if (duration === null || duration <= 0) {
    throw new Error(
      `indicator has no usable "left" transition: property="${styles.transitionProperty}" duration="${styles.transitionDuration}"`
    )
  }
  return Math.ceil(duration * 1.6)
}

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
  await pollUntil(() => indicator.getBoundingClientRect().width > 0, 'indicator 未完成定位')
  return { segmented, triggers, indicator }
}

/** 轻点某个 option：走 trigger 自己的 click 路径（与真实轻点同一入口）。 */
async function tap(segmented: WebUiSegmented, trigger: WebUiSegmentedTrigger) {
  optionSurface(trigger).click()
  await waitForUpdate(segmented)
}

/**
 * 逐帧采样 indicator 左缘，直到超过 budget 帧或位置连续 3 帧不再变化。
 *
 * 不按固定时长采样：过渡在并行负载下完成时间不可预测。连续若干帧不变即视为已停稳
 *（插值结束或根本没有插值，两种都算停稳）。
 */
async function sampleLeft(indicator: HTMLElement, budgetFrames = 40): Promise<number[]> {
  const samples: number[] = []
  let stable = 0
  for (let frame = 0; frame < budgetFrames && stable < 3; frame += 1) {
    await waitForFrame()
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
  // 两端各留 5% 的余量：直落终值的实现只会取到两端，取不到带内；
  // 而负载重的 runner 上过渡只被采到一帧时，这一帧可能落在过渡的靠后段
  // （CI 上实测首帧已在 87% 处），留 15% 的带子会把真实插值判成直落。
  return samples.some(value => value > lo + span * 0.05 && value < hi - span * 0.05)
}

describe('WebUiSegmented indicator 落定门（浏览器）', () => {
  it('快速连点直接落定终值，不重跑多段插值', async () => {
    const { segmented, triggers, indicator } = await mount()
    const startLeft = indicator.getBoundingClientRect().left
    const finalLeft = triggers[2].getBoundingClientRect().left

    // 连点：a → b → c，间隔远小于 160ms 的过渡时长。
    await tap(segmented, triggers[1])
    await tap(segmented, triggers[2])
    const samples = await sampleLeft(indicator)

    // 核心判据：整段采样里没有中间值——indicator 一步就停到终值。
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

    // 采样必须与轻点同时起跑：先轻点再采样，采样循环的第一帧可能落在过渡的后段
    // （CI runner 上实测首帧已在 87% 处），插值就量不到了。
    const sampling = sampleLeft(indicator)
    await tap(segmented, triggers[1])
    const samples = await sampling

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
    await new Promise(resolve => setTimeout(resolve, settleWindowMs(indicator)))
    await sampleLeft(indicator)

    // 再切一次：这一趟必须走完整过渡。
    const from = indicator.getBoundingClientRect().left
    const to = triggers[0].getBoundingClientRect().left
    const sampling = sampleLeft(indicator)
    await tap(segmented, triggers[0])
    const samples = await sampling

    expect(hasIntermediateValue(samples, from, to), `过期后采样=${samples.map(v => v.toFixed(1)).join(',')}`).toBe(true)
  })
})
