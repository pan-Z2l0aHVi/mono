import '@/components/button'
import '@/components/segmented'
import '@/components/segmented-trigger'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiButton } from '@/components/button'
import type { WebUiSegmented } from '@/components/segmented'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import type { WebUiTheme } from '@/components/theme'
import { queryA11y, waitForUpdate } from '@/shared/test-utils'

/**
 * segmented 的可辨度守卫：未选中 label 与 track 底、选中 label 与真实 indicator 的文字对比度，
 * raised indicator 相对 track 的亮度差，以及深色 raised indicator 与同主题 secondary button 面是否同色。
 *
 * 这里断言的是**关系**而非色值：WCAG 相对亮度比由主题 token 决定，断言里不含颜色字面量。
 * 它应允许主题整体调整，同时拦住文字与实际承载面的对比度不足。
 *
 * 只钉「文字色等于某个 token」不够：README parity 守卫管的是文档与定义同步，管不了
 * 换一组同样合法的色值之后两者是否还看得清。
 *
 * track 与 label 走公开语义（role="listbox" / role="option"）；indicator 是模板里一个没有语义
 * 的 <span>，公开面拿不到它，只能按 .wui-segmented-indicator 取。
 */
afterEach(() => document.body.replaceChildren())

async function mount(
  appearance: 'light' | 'dark',
  variant: 'inset' | 'raised' = 'inset'
): Promise<{
  segmented: WebUiSegmented
  track: HTMLElement
  indicator: HTMLElement
  buttonFace: HTMLElement
  triggers: WebUiSegmentedTrigger[]
}> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = appearance
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.variant = variant
  segmented.value = 'a'
  const triggers = (['a', 'b', 'c'] as const).map(value => {
    const trigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
    trigger.value = value
    trigger.textContent = value
    return trigger
  })
  segmented.append(...triggers)

  // 同主题里的参照物：secondary button 的面是深色 raised indicator 的对照面。
  const button = document.createElement('web-ui-button') as WebUiButton
  button.variant = 'secondary'
  button.textContent = 'ok'
  theme.append(segmented, button)
  document.body.append(theme)

  await waitForUpdate(segmented)
  await Promise.all(triggers.map(trigger => trigger.updateComplete))
  await button.updateComplete
  const track = queryA11y(segmented, '[role="listbox"]')
  if (!(track instanceof HTMLElement)) throw new Error('未找到 role="listbox" 的 track surface')
  const indicator = queryA11y(segmented, '.wui-segmented-indicator')
  if (!(indicator instanceof HTMLElement)) throw new Error('未找到 selected indicator')
  const buttonFace = button.shadowRoot?.querySelector('button')
  if (!(buttonFace instanceof HTMLElement)) throw new Error('未找到 button 的 shadow 面')
  return { segmented, track, indicator, buttonFace, triggers }
}

function textColorOf(trigger: WebUiSegmentedTrigger): string {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  return getComputedStyle(surface).color
}

function selectedIndicatorColorOf(segmented: WebUiSegmented): string {
  const indicator = queryA11y(segmented, '.wui-segmented-indicator')
  if (!(indicator instanceof HTMLElement)) throw new Error('未找到 selected indicator')
  return getComputedStyle(indicator).backgroundColor
}

/** WCAG 相对亮度比：两条计算色值的亮度之比，两侧顺序无关。 */
function contrastRatio(a: string, b: string): number {
  const luminance = (color: string) => {
    const parts = color.match(/[\d.]+/g)
    if (!parts) throw new Error(`无法解析颜色：${color}`)
    const [r, g, blue] = parts.slice(0, 3).map(Number)
    const channel = (v: number) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(blue)
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('WebUiSegmented 可辨度（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    it(`${appearance} 下未选中 label 与 track 底的对比度 ≥ 4.5:1`, async () => {
      const { track, triggers } = await mount(appearance)
      const backdrop = getComputedStyle(track).backgroundColor

      for (const trigger of triggers) {
        const surface = queryA11y(trigger, '[role="option"]')
        if (surface?.getAttribute('aria-selected') === 'true') continue
        const label = trigger.textContent ?? ''
        const ratio = contrastRatio(textColorOf(trigger), backdrop)
        expect(ratio, `「${label}」与 track 底对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    })

    for (const variant of ['inset', 'raised'] as const) {
      it(`${appearance} / ${variant} 下选中 label 与 indicator 的对比度 ≥ 4.5:1`, async () => {
        const { segmented, triggers } = await mount(appearance, variant)
        const selected = triggers.find(
          trigger => queryA11y(trigger, '[role="option"]')?.getAttribute('aria-selected') === 'true'
        )
        if (!selected) throw new Error('未找到已选中的 segmented label')

        const ratio = contrastRatio(textColorOf(selected), selectedIndicatorColorOf(segmented))
        expect(
          ratio,
          `${appearance} / ${variant} 的选中 label 与 indicator 对比度不足：${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  /*
   * raised 变种的静止 indicator 靠投影与几何读出「浮起」，不靠亮度断层，所以比较浅色与深色
   * indicator 相对各自 track 的对比度。这条关系允许主题整体重排，但会拦住深色面被抬亮成高亮条。
   */
  it('raised 变体两档下 indicator 相对 track 的亮度差同一量级', async () => {
    const ratios = { light: 0, dark: 0 }
    for (const appearance of ['light', 'dark'] as const) {
      const { track, indicator } = await mount(appearance, 'raised')
      ratios[appearance] = contrastRatio(
        getComputedStyle(indicator).backgroundColor,
        getComputedStyle(track).backgroundColor
      )
    }

    expect(ratios.light).toBeGreaterThan(1)
    expect(ratios.dark).toBeGreaterThan(1)
    const summary = `light ${ratios.light.toFixed(2)}:1 vs dark ${ratios.dark.toFixed(2)}:1`
    expect(ratios.dark, `${summary}：dark 的 indicator 相对 track 断层超过 light 一档以上`).toBeLessThanOrEqual(
      ratios.light + 0.1
    )
  })

  /*
   * 深色 raised indicator 应沿用 secondary button 面的色值；以真实 button 为参照，
   * 让配色整体调整仍可成立，同时防止 indicator 单独抬亮后变成高亮条。
   */
  it('dark 下 raised 的 indicator 与同主题 secondary button 同面', async () => {
    const { indicator, buttonFace } = await mount('dark', 'raised')
    const indicatorBg = getComputedStyle(indicator).backgroundColor
    const buttonBg = getComputedStyle(buttonFace).backgroundColor

    expect(indicatorBg, `indicator ${indicatorBg} 应等于 secondary button 面 ${buttonBg}`).toBe(buttonBg)
  })
})
