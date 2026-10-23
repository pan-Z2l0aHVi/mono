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
 * segmented 的三条可辨度守卫：label 文字对 track 底、凸变种 indicator 对 track 底的亮度差，
 * 以及凸变种 indicator 与同主题 secondary button 面是否同色。
 *
 * 这里断言的是**关系**而非色值：WCAG 相对亮度比 `ratio(文字, track 底) ≥ 3`。两侧颜色
 * 都由主题 token 决定，断言里不含任何颜色字面量——主题怎么调色板（连同 media 块与双语文档
 * 一起改，那是一次完全正常的编辑）它都应成立，而只要 label 与 track 的明暗关系被破坏，它就会红。
 * 第三条拿同一主题里的 secondary button 当参照物，判据是两个 calc 出来的色相等。
 *
 * 只钉「文字色等于某个 token」不够：README parity 守卫管的是文档与定义同步，管不了
 * 换一组同样合法的色值之后两者是否还看得清。
 *
 * track 与 label 走公开语义（`role="listbox"` / `role="option"`），不需要内部 class；indicator
 * 是模板里一个没有语义的 `<span>`，公开面拿不到它，只能按 `.wui-segmented-indicator` 取。
 */
afterEach(() => document.body.replaceChildren())

async function mount(
  appearance: 'light' | 'dark',
  variant: 'inset' | 'raised' = 'inset'
): Promise<{
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
  // 同主题里的参照物：secondary button 的面就是「这颗 indicator 应该长得像谁」。
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
  if (!(indicator instanceof HTMLElement)) throw new Error('未找到静止态 indicator')
  const buttonFace = button.shadowRoot?.querySelector('button')
  if (!(buttonFace instanceof HTMLElement)) throw new Error('未找到 button 的 shadow 面')
  return { track, indicator, buttonFace, triggers }
}

function textColorOf(trigger: WebUiSegmentedTrigger): string {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  return getComputedStyle(surface).color
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
    it(`${appearance} 下每个 label 与 track 底的对比度 ≥ 3:1`, async () => {
      const { track, triggers } = await mount(appearance)
      const backdrop = getComputedStyle(track).backgroundColor

      for (const trigger of triggers) {
        const label = trigger.textContent ?? ''
        const ratio = contrastRatio(textColorOf(trigger), backdrop)
        expect(ratio, `「${label}」与 track 底对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      }
    })
  }

  /*
   * 凸变种（raised）的静止 indicator 靠投影与几何读出「浮起」，不靠亮度断层，所以尺子取浅色档：
   * #e5e5ea track / #fff indicator，比值 1.26。深色抬一档灰的代价比想象中大——同一条
   * #2c2c2e 轨道上，indicator 从 #3a3a3c（1.23）换到 #48484a 就是 1.53，换到更早的 #5c5c5e
   * 是 2.09；亮度断层一盖过投影，选中块就读成一条高亮，而不是一颗按钮。
   * 断言拿两档各自量出的比值相比、不写色值字面量：调色板整体重排它仍然成立，只把深色
   * indicator 调亮就会红。
   *
   * 容差 0.1 刻意小于深色阶梯往上抬一档带来的比值增量（indicator 从 #3a3a3c 换到 #444446 是
   * 1.23 → 1.43，+0.21），所以它只吸收派生色与 color-mix 的抖动，放不下一次真实的抬档。
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

    // indicator 必须仍看得见（比值 > 1），但深色不得比浅色的凸起断层更亮。
    expect(ratios.light).toBeGreaterThan(1)
    expect(ratios.dark).toBeGreaterThan(1)
    const summary = `light ${ratios.light.toFixed(2)}:1 vs dark ${ratios.dark.toFixed(2)}:1`
    expect(ratios.dark, `${summary}：dark 的 indicator 相对 track 断层超过 light 一档以上`).toBeLessThanOrEqual(
      ratios.light + 0.1
    )
  })

  /*
   * 「深色下这颗 indicator 要像一颗按钮」的可执行版本：它的底色与同一主题里 secondary
   * button 的面是同一个 calc 值。用真实 button 当参照而不是色值字面量，是为了让失效模式
   * 自己说话——重排调色板时两者一起动、用例仍绿，只把 indicator 抬亮（旧值 #5c5c5e）就红。
   *
   * 浅色刻意不进这条断言：那里 button 的面是 #dfdfdf、indicator 是 #fff，比按钮面还白——它读成
   * 一张与 page 同为最白的纸片浮在沉下去的轨道上，本来就不是 button 面。深色没有这个选项
   * （page 是阶梯最暗的一档），比 button 面再亮一档只剩 surface-track（#444446），断层一盖过
   * 投影就读成高亮条而不是按钮，所以这里直接对齐 button 面，代价是轨道要沉一档
   * （见 surface-segmented-track）。
   */
  it('dark 下 raised 的 indicator 与同主题 secondary button 同面', async () => {
    const { indicator, buttonFace } = await mount('dark', 'raised')
    const indicatorBg = getComputedStyle(indicator).backgroundColor
    const buttonBg = getComputedStyle(buttonFace).backgroundColor

    expect(indicatorBg, `indicator ${indicatorBg} 应等于 secondary button 面 ${buttonBg}`).toBe(buttonBg)
  })
})
