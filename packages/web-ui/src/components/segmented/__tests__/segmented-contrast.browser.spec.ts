import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/segmented'
import '@/components/segmented-trigger'
import '@/components/theme'
import type { WebUiSegmented } from '@/components/segmented'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'
import type { WebUiTheme } from '@/components/theme'
import { queryA11y, waitForUpdate } from '@/shared/test-utils'

/**
 * segmented 标签文字对轨道底的可辨度守卫。
 *
 * 这里断言的是**关系**而非色值：WCAG 相对亮度比 `ratio(文字, 轨道底) ≥ 3`。两侧颜色
 * 都由主题 token 决定，本用例不含任何颜色字面量——主题怎么调色板（连同 media 块与双语文档
 * 一起改，那是一次完全正常的编辑）它都应成立，而只要标签与轨道的明暗关系被破坏，它就会红。
 *
 * 只钉「文字色等于某个 token」不够：README parity 守卫管的是文档与定义同步，管不了
 * 换一组同样合法的色值之后两者是否还看得清。
 *
 * 轨道按公开语义 `role="listbox"` 定位，标签按 `role="option"` 定位——不需要内部 class，
 * 也不需要指示器的几何，故不引入 segmented-look 里那套夹具的其余部分。
 */
afterEach(() => document.body.replaceChildren())

async function mount(appearance: 'light' | 'dark'): Promise<{ track: HTMLElement; triggers: WebUiSegmentedTrigger[] }> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = appearance
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'a'
  const triggers = (['a', 'b', 'c'] as const).map(value => {
    const trigger = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
    trigger.value = value
    trigger.textContent = value
    return trigger
  })
  segmented.append(...triggers)
  theme.append(segmented)
  document.body.append(theme)

  await waitForUpdate(segmented)
  await Promise.all(triggers.map(trigger => trigger.updateComplete))
  const track = queryA11y(segmented, '[role="listbox"]')
  if (!(track instanceof HTMLElement)) throw new Error('未找到 role="listbox" 的轨道面')
  return { track, triggers }
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

describe('WebUiSegmented 标签可辨度（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    it(`${appearance} 下每个标签与轨道底的对比度 ≥ 3:1`, async () => {
      const { track, triggers } = await mount(appearance)
      const backdrop = getComputedStyle(track).backgroundColor

      for (const trigger of triggers) {
        const label = trigger.textContent ?? ''
        const ratio = contrastRatio(textColorOf(trigger), backdrop)
        expect(ratio, `「${label}」与轨道底对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      }
    })
  }
})
