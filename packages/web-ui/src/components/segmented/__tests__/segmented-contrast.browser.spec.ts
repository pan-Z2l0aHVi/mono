import '@/components/segmented'
import '@/components/segmented-trigger'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiSegmented } from '@/components/segmented'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import type { WebUiTheme } from '@/components/theme'
import { queryA11y, waitForUpdate } from '@/shared/test-utils'

/**
 * segmented 的五条可辨度守卫：未选中 label 文字对 track 底、选中 label 文字对真实 indicator
 * 的正文级对比度，凸变种 indicator 对 track 底的亮度差与方向，以及两个变体各自的静止
 * indicator 是否与它该同色的那一档同色。
 *
 * 这里断言的是**关系**而非色值：两条文字守卫都要求 WCAG 正文级 4.5:1。两侧颜色都由主题
 * token 决定，断言里不含任何颜色字面量——主题怎么调色板（连同 media 块与双语文档一起改，
 * 那是一次完全正常的编辑）它都应成立，而只要 label 与实际承载面的明暗关系被破坏，它就会红。
 * 同色那两条拿同一主题里的 page / control 当参照物，判据是两个 calc 出来的色相等。
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
  page: HTMLElement
  control: HTMLElement
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
  // 参照物：theme 宿主不画盒，所以接住 page / control 色的活儿交给作用域内的子元素，
  // 让它和 indicator 走同一条 calc 路径，两边拿到的都是可比的计算值。
  const page = document.createElement('div')
  page.style.backgroundColor = 'var(--wui-color-page)'
  const control = document.createElement('div')
  control.style.backgroundColor = 'var(--wui-color-surface-control)'
  theme.append(segmented, page, control)
  document.body.append(theme)

  await waitForUpdate(segmented)
  await Promise.all(triggers.map(trigger => trigger.updateComplete))
  const track = queryA11y(segmented, '[role="listbox"]')
  if (!(track instanceof HTMLElement)) throw new Error('未找到 role="listbox" 的 track surface')
  const indicator = queryA11y(segmented, '.wui-segmented-indicator')
  if (!(indicator instanceof HTMLElement)) throw new Error('未找到静止态 indicator')
  return { track, indicator, page, control, triggers }
}

function textColorOf(trigger: WebUiSegmentedTrigger): string {
  const surface = queryA11y(trigger, '[role="option"]')
  if (!(surface instanceof HTMLElement)) throw new Error('未找到 role="option" 的可交互面')
  return getComputedStyle(surface).color
}

/** WCAG 相对亮度：一条计算色值的亮度，供亮度比与亮度方向两种断言共用。 */
function relativeLuminance(color: string): number {
  const parts = color.match(/[\d.]+/g)
  if (!parts) throw new Error(`无法解析颜色：${color}`)
  const [r, g, blue] = parts.slice(0, 3).map(Number)
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(blue)
}

/** WCAG 相对亮度比：两条计算色值的亮度之比，两侧顺序无关。 */
function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('WebUiSegmented 可辨度（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    it(`${appearance} 下未选中 label 与 track 底的对比度 ≥ 4.5:1`, async () => {
      const { track, triggers } = await mount(appearance)
      const backdrop = getComputedStyle(track).backgroundColor
      const unselected = triggers.filter(
        trigger => queryA11y(trigger, '[role="option"]')?.getAttribute('aria-selected') !== 'true'
      )
      // 全是选中项时循环零断言空过，先证明这条用例有测量对象。
      expect(unselected.length, '前置：应存在未选中的 segmented label').toBeGreaterThan(0)

      for (const trigger of unselected) {
        const label = trigger.textContent ?? ''
        const ratio = contrastRatio(textColorOf(trigger), backdrop)
        expect(ratio, `「${label}」与 track 底对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    })

    for (const variant of ['inset', 'raised'] as const) {
      it(`${appearance} / ${variant} 下选中 label 与 indicator 的对比度 ≥ 4.5:1`, async () => {
        const { indicator, triggers } = await mount(appearance, variant)
        const selected = triggers.find(
          trigger => queryA11y(trigger, '[role="option"]')?.getAttribute('aria-selected') === 'true'
        )
        if (!selected) throw new Error('未找到已选中的 segmented label')

        const indicatorBg = getComputedStyle(indicator).backgroundColor
        const ratio = contrastRatio(textColorOf(selected), indicatorBg)
        expect(
          ratio,
          `${appearance} / ${variant} 的选中 label 与 indicator 对比度不足：${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  /*
   * 凸变种（raised）的静止 indicator 靠投影与几何读出「浮起」，不靠亮度断层，所以尺子取浅色档：
   * #e5e5ea track / #fff indicator，比值 1.26。深色档是 #17191a track / #242628 indicator，比值 1.16，
   * 比浅色还收敛一点——page 之下能开的空间本来就比 page 之上窄。亮度断层一盖过投影，选中块就读成
   * 一条高亮，而不是一颗浮起的面。
   * 断言拿两档各自量出的比值相比、不写色值字面量：调色板整体重排它仍然成立。
   *
   * 阈值 light + 0.1 卡在深色阶梯的两档上：indicator 从 page 往上挪一档（surface）是 1.27，仍在带内；
   * 挪两档（control，也就是「按钮面」方案）是 1.55，直接红。比值只管断层大小、不管符号，
   * 所以反向的那半（把 track 浮到 page 之上、indicator 压成 page 色，比值 1.09）由下面那条亮度方向
   * 断言兜住——两条合起来才钉住「浮起但不抢戏」。
   */
  it('raised 变体两档下 indicator 相对 track 的亮度差同一量级、且方向朝凸', async () => {
    const ratios = { light: 0, dark: 0 }
    for (const appearance of ['light', 'dark'] as const) {
      const { track, indicator } = await mount(appearance, 'raised')
      const indicatorBg = getComputedStyle(indicator).backgroundColor
      const trackBg = getComputedStyle(track).backgroundColor
      ratios[appearance] = contrastRatio(indicatorBg, trackBg)

      expect(relativeLuminance(indicatorBg), `${appearance}: indicator 应比 track 亮（凸）`).toBeGreaterThan(
        relativeLuminance(trackBg)
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
   * 「凸变种这颗 indicator 就是页面本身」的可执行版本：两档下它的底色都与同一主题里接住
   * `--wui-color-page` 的那个面同色。用真实计算值当参照而不是色值字面量，是为了让失效模式自己说话——
   * 只把深色 indicator 抬到 button 面（#3a3a3c）就红；只把 page 挪一档、selected 留在原地同样红，
   * 因为这两枚 token 在 theme 里互不引用，等式全靠这条用例兜着。
   *
   * 这条只管「与谁同色」，不管方向：浅色那里 page 是最亮档，与它同色即浮起；深色那里 page 是最暗档，
   * 同色成立的前提是轨道被开到 page 之下。若有人只把 indicator 压成 page 色而让轨道继续浮在页面上，
   * 这条仍绿，红的是上一条里那条亮度方向断言。
   */
  it('raised 的 indicator 两档下都与同主题 page 同色', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      const { indicator, page } = await mount(appearance, 'raised')
      const indicatorBg = getComputedStyle(indicator).backgroundColor
      const pageBg = getComputedStyle(page).backgroundColor

      expect(indicatorBg, `${appearance}: indicator ${indicatorBg} 应等于 page ${pageBg}`).toBe(pageBg)
    }
  })

  /*
   * 凹变种那颗走的是另一条等式：静止 indicator 与同主题的中性可交互控件同面，也就是 `secondary`
   * button 用的那一档（浅色 #dfdfdf、深色 #3a3a3c）。写法与上一条完全对称，只是参照物从 page 换成
   * control——两个变体各自钉住一档，谁也不跟着谁漂。
   *
   * 失效模式：把浅色 indicator 调成 #e5e5ea（也正是凸变种轨道现在的颜色）
   * 这条就红；只把 control 那一档挪走、segmented 留在原地，同样红。两枚 token 在 theme 里是互不引用的
   * 字面量定义，这条等式没有结构耦合兜着，「要不要一起动」只能由这条用例来逼。
   */
  it('inset 的 indicator 两档下都与同主题 control 面同色', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      const { indicator, control } = await mount(appearance, 'inset')
      const indicatorBg = getComputedStyle(indicator).backgroundColor
      const controlBg = getComputedStyle(control).backgroundColor

      expect(indicatorBg, `${appearance}: indicator ${indicatorBg} 应等于 control ${controlBg}`).toBe(controlBg)
    }
  })
})
