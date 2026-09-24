import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/theme'

import '..'
import type { WebUiToast } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 定位器（非断言）：面板以 aria-live 标识（它是播报语义的载体），不用 class 名单（§12 C3）。
function queryPanel(el: WebUiToast): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[aria-live]')!
}

/*
 * 动效观察面用 Web Animations API：`getAnimations()` 对
 * 「有动效 vs 没有动效」有完全区分力；而入场起点的 scale（`--wui-scale-enter`）取值属
 * 计算样式读取，已按契约化重构判据删除。
 */
function runningTransitions(el: WebUiToast): string[] {
  return queryPanel(el)
    .getAnimations()
    .map(animation => (animation as CSSTransition).transitionProperty)
}

/*
 * 统一切换驱动：先同步结算一次样式建立 before-change 样式（否则过渡不启动，"0 条"会假绿），
 * 再切换 visible 并在随后的若干帧内**持续采样**。采样窗口 12 帧 ≈ 200ms，覆盖一次完整过渡。
 */
async function sampleTransitions(el: WebUiToast, visible: boolean, frames = 12): Promise<string[]> {
  queryPanel(el).getBoundingClientRect()
  el.visible = visible
  await el.updateComplete
  const seen: string[] = []
  for (let index = 0; index < frames; index++) {
    seen.push(...runningTransitions(el))
    await nextFrame()
  }
  return seen
}

// 一律挂到 theme 作用域内：reduce 是 theme 施加的（`motion` 省略 → 'system'）。
// 不挂 theme 就没有任何 reduced 作用域，token 回落字面量（200ms），过渡照跑 —— 那样
// 「0 条」断言的其实是"没挂 theme"，不是 reduced-motion 生效。
function mountToast(motion: string | null): WebUiToast {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  if (motion) theme.setAttribute('motion', motion)
  document.body.append(theme)

  const el = document.createElement('web-ui-toast')
  el.message = 'enter motion'
  theme.append(el)
  return el
}

afterEach(() => document.body.replaceChildren())

/*
 * §10 S3：只断言「没有动效」是空转可过的（组件压根没动效时也绿）。本文件因此自带
 * **控制组** —— 显式 `motion='full'` 作用在系统 reduce 下仍应启动入场过渡，
 * 以此证明断言有区分力；控制组与被测组走同一个 `sampleTransitions()` 驱动与观察函数。
 *
 * 本文件原名 `toast-enter-motion.browser.spec.ts`，在 browser 项目里用显式 `motion='reduced'`
 * 断言「缩放归 1」（= 读 token 值）。改名进入 browser-reduced-motion 项目后，被测组走
 * **系统** reduce（`motion` 省略 → 'system'），断言的是行为面。
 */
describe('减少动效下的 Toast 入场（浏览器）', () => {
  it('系统 reduce：入场全程不出现过渡；对照组 full 出现', async () => {
    const reduced = mountToast(null)
    await reduced.updateComplete

    expect(await sampleTransitions(reduced, true)).toHaveLength(0)
    expect(reduced.visible).toBe(true)
    expect(reduced.hasAttribute('visible')).toBe(true)

    const full = mountToast('full')
    await full.updateComplete

    expect((await sampleTransitions(full, true)).length).toBeGreaterThan(0)
    expect(full.visible).toBe(true)
  })

  it('系统 reduce：退场同样不出现过渡，visible 归宿不受影响', async () => {
    const reduced = mountToast(null)
    await reduced.updateComplete
    reduced.visible = true
    await reduced.updateComplete

    expect(await sampleTransitions(reduced, false)).toHaveLength(0)
    expect(reduced.visible).toBe(false)
    expect(reduced.hasAttribute('visible')).toBe(false)
  })
})
