import '@/components/segmented'
import '@/components/segmented-trigger'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

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

/**
 * 按帧等背景落到期望的一侧。hover 底色带 80ms 过渡：指针动作返回时首帧样式可能还没落定，
 * 立刻读数会读到过渡起点。等可观察值而不是固定延时；超时信息带上 :hover 与 marker，便于区分
 * 「过渡没跑完」与「hover 根本没命中」。
 */
async function waitForBackground(el: HTMLElement, expected: (value: string) => boolean, label: string): Promise<void> {
  for (let frame = 0; frame < 300; frame++) {
    if (expected(getComputedStyle(el).backgroundColor)) return
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }
  const media = matchMedia('(hover: hover) and (pointer: fine)').matches
  throw new Error(
    `300 帧内未满足：${label}（:hover=${el.matches(':hover')}，hover media=${media}，` +
      `pointerOutside=${el.hasAttribute('data-pointer-outside')}）`
  )
}

describe('WebUiSegmented 可辨度（浏览器）', () => {
  it('按住未选中项移出后松开，背景恢复且重新悬停仍可反馈', async () => {
    const { triggers } = await mount('light')
    const trigger = triggers[1]!
    const surface = queryA11y(trigger, '[role="option"]') as HTMLElement
    const outside = document.createElement('div')
    outside.id = 'segmented-pointer-outside'
    outside.style.cssText = 'width: 100px; height: 40px; margin: 48px'
    document.body.append(outside)
    await userEvent.hover(outside)
    const resting = getComputedStyle(surface).backgroundColor
    await userEvent.pointer([
      { target: trigger, keys: '[MouseLeft>]' },
      { target: outside, keys: '[/MouseLeft]' }
    ])
    await waitForBackground(surface, value => value === resting, '松开后背景应回到静止值')
    await userEvent.hover(trigger)
    await waitForBackground(surface, value => value !== resting, '重新悬停后背景应与静止值不同')
    expect(getComputedStyle(surface).backgroundColor).not.toBe(resting)
  })

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
   * 凸变种的静止 indicator 靠投影与几何读出「浮起」，同时要和 track 有一档可测的亮度断层。
   * 浅色是 #fff on #eeeef3（≈1.16），深色是 control #3a3a3c on #17171b（≈1.58）：深色 chip 取
   * control 面（与 neutral button 同档），断层比浅色更大是刻意的——page 色 chip 在深色里读成
   * 「按下去」，和旁边的按钮并排也明显偏暗。
   *
   * 断言拿两档各自量出的比值，不写色值字面量：调色板整体重排它仍然成立。上限 2.0 兜住
   * 「chip 被抬成一整条高亮」的失效模式——投影还在，选中块仍是浮起的面而不是一条亮条。
   */
  it('raised 变体两档下 indicator 相对 track 更亮，且断层不越过高亮档', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      const { track, indicator } = await mount(appearance, 'raised')
      const indicatorBg = getComputedStyle(indicator).backgroundColor
      const trackBg = getComputedStyle(track).backgroundColor
      const ratio = contrastRatio(indicatorBg, trackBg)

      // 两档都得有断层：深色 chip 取 control 面（≈1.58:1），浅色取 page 色（≈1.16:1）。
      expect(relativeLuminance(indicatorBg)).toBeGreaterThan(relativeLuminance(trackBg))
      expect(ratio).toBeGreaterThan(1.05)
      // 断层过大时 chip 会读成一条高亮，而不是浮起的面。
      expect(ratio).toBeLessThan(2)
    }
  })

  /*
   * 「凸变种这颗 indicator 该跟谁同色」的可执行版本：浅色取 page、深色取 control（neutral button
   * 同档）。用真实计算值当参照而不是色值字面量，是为了让失效模式自己说话——深色把 chip 压回
   * page 色（读成按下）、或浅色把 chip 挪到 control 面（与 track 同色、断层归零）都会红。
   *
   * 这条只管「与谁同色」，不管方向；方向由上面那条亮度断言兜住。
   */
  it('raised 的 indicator 浅色与 page 同色、深色与 control 面同色', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      const { indicator, page, control } = await mount(appearance, 'raised')
      const indicatorBg = getComputedStyle(indicator).backgroundColor
      const reference = appearance === 'light' ? page : control
      const referenceBg = getComputedStyle(reference).backgroundColor

      // 参照面随主题切换：浅色取 page、深色取 control（neutral button 同档）。
      expect(indicatorBg).toBe(referenceBg)
    }
  })

  /*
   * 凹变种那颗走的是另一条等式：静止 indicator 与同主题的 control 面同色（浅色 #eeeef3、深色
   * #3a3a3c）。`secondary` button 浅色还会从 control 向 shade 压深半档，不在这条等式的覆盖内。
   * 写法与上一条完全对称，只是参照物从 page 换成 control——两个变体各自钉住一档，谁也不跟着谁漂。
   *
   * 失效模式：只把 control 或 segmented 的颜色挪走，这条就红。两枚 token 在 theme 里是互不引用的
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
