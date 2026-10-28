import '..'
import '@/components/segmented-trigger'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import { pollUntil, queryA11y, waitForFrame, waitForUpdate } from '@/shared/test-utils'

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
 * 两个方向都必须验证，缺一不可：
 *   - 快速连点 → 直接到终值，且没有继续运行的 left 过渡
 *   - 正常切换 → 必须启动 left 过渡（门没把正常过渡也关掉）
 * 只测前者的话，一个「把过渡全关掉」的实现同样能过：那样连点确实直接落定，但正常点击
 * 之间的 indicator 移动也没了，正是这个门要避免的副作用。
 *
 * 必须 browser mode：这里验证 CSS 过渡生命周期与布局，jsdom 不提供这些浏览器行为。
 */

afterEach(() => document.body.replaceChildren())

const EPS = 0.5

/*
 * indicator 移动时长。用例自己把它写在宿主上：组件的落定窗口读的是这个 token
 * （`segmented/index.ts` 的 `triggerDuration()`），CSS 里 left / width 那两条过渡读的也是
 * 同一个，两边因此永远同值——不在测试里另抄一份数字，否则 token 一改就成了第二个真相来源。
 */
const TRIGGER_DURATION_MS = 160
const TRIGGER_DURATION = `${TRIGGER_DURATION_MS}ms`

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
  segmented.style.setProperty('--wui-duration-trigger', TRIGGER_DURATION)
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

describe('WebUiSegmented indicator 落定门（浏览器）', () => {
  it('快速连点直接落定终值，不重跑多段插值', async () => {
    const { segmented, triggers, indicator } = await mount()
    const finalLeft = triggers[2].getBoundingClientRect().left

    // 保持飞行窗口开启，并让第一笔定位进入浏览器的样式计算。
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      await tap(segmented, triggers[1])
      await waitForFrame()
      indicator.getBoundingClientRect()

      await tap(segmented, triggers[2])
      await waitForFrame()
      await waitForUpdate(segmented)
      expect(Math.abs(indicator.getBoundingClientRect().left - finalLeft)).toBeLessThanOrEqual(EPS)
      const leftTransitions = indicator
        .getAnimations()
        .filter(animation => animation instanceof CSSTransition && animation.transitionProperty === 'left')
      expect(leftTransitions).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('正常切换仍启动过渡（门没把过渡也关掉）', async () => {
    const { segmented, triggers, indicator } = await mount()
    const targetLeft = triggers[1].getBoundingClientRect().left
    let leftTransitionEnded = false
    indicator.addEventListener('transitionend', event => {
      if (event.target === indicator && event.propertyName === 'left') leftTransitionEnded = true
    })

    await tap(segmented, triggers[1])
    await pollUntil(() => leftTransitionEnded, '正常切换未完成 left 过渡')
    expect(Math.abs(indicator.getBoundingClientRect().left - targetLeft)).toBeLessThanOrEqual(EPS)
  })

  it('窗口过期后的下一次切换重新拿到完整过渡（世代号没把门永久焊死）', async () => {
    const { segmented, triggers, indicator } = await mount()

    // 只控制组件的计时器，保留真实渲染帧。逐帧提交两次点击后推进窗口回调。
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      await tap(segmented, triggers[1])
      await waitForFrame()
      await tap(segmented, triggers[2])
      await waitForFrame()
      vi.advanceTimersByTime(TRIGGER_DURATION_MS)
      await waitForUpdate(segmented)
    } finally {
      vi.useRealTimers()
    }
    await waitForFrame()

    // 再切一次：这一趟必须启动过渡。
    let leftTransitionStarted = false
    indicator.addEventListener('transitionrun', event => {
      if (event.target === indicator && event.propertyName === 'left') leftTransitionStarted = true
    })
    await tap(segmented, triggers[0])
    await pollUntil(() => leftTransitionStarted, '窗口过期后的切换未启动 left 过渡')
    expect(leftTransitionStarted).toBe(true)
  })
})
