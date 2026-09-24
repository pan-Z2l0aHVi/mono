import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiCollapse } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const step = (): void => {
      if (predicate()) return resolve()
      if (performance.now() - start > timeoutMs) return reject(new Error('waitFor timeout'))
      step()
    }
    setTimeout(step, 16)
  })
}

function queryTrack(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-track')!
}

function queryContentContainer(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-content')!
}

function queryInner(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-inner')!
}

/*
 * 动效观察面用 Web Animations API：`getAnimations()` 对
 * 「有动效 vs 没有动效」有完全区分力，而 `transitionDuration` 取值只是它的实现手段。
 */
function runningTransitions(el: WebUiCollapse): string[] {
  return queryTrack(el)
    .getAnimations()
    .map(animation => (animation as CSSTransition).transitionProperty)
}

/*
 * 判定用的统一驱动：切换 open，并在随后的若干帧内**持续采样**运行中的过渡。
 *
 * 两个必须点（实测所得，写下来免得后人重踩）：
 * ① 采样必须跨帧，不能同步断言 —— 展开管线是「先钉住起点 → 下一 rAF 才翻 presence=open」，
 *    过渡要到那之后 1~2 帧才启动；同帧断言恒为空集，会把被测组写成空转断言。
 * ② 切换前要强制一次同步样式结算，给元素建立 before-change 样式；否则过渡根本不会启动，
 *    对照组会红而「0 条」会假绿。
 * 采样窗口 12 帧 ≈ 200ms，正好覆盖一次完整过渡。
 */
async function sampleTransitions(el: WebUiCollapse, open: boolean, frames = 12): Promise<string[]> {
  queryTrack(el).getBoundingClientRect()
  el.open = open
  await el.updateComplete
  const seen: string[] = []
  for (let index = 0; index < frames; index++) {
    seen.push(...runningTransitions(el))
    await nextFrame()
  }
  return seen
}

// 挂载到 theme 作用域内；`motion` 省略即 'system'（本文件跑在 browser-reduced-motion
// project，系统 prefers-reduced-motion 为 reduce）。
function mountInsideTheme(motion: string | null, collapse: WebUiCollapse): HTMLElement {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  if (motion) theme.setAttribute('motion', motion)
  document.body.append(theme)
  theme.append(collapse)
  return theme
}

function createCollapse(html: string, setup?: (el: WebUiCollapse) => void): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.innerHTML = html
  setup?.(el)
  return el
}

afterEach(() => document.body.replaceChildren())

/*
 * §10 S3：只断言「没有动效」是空转可过的（组件压根没动效时也绿）。本文件因此自带
 * **控制组** —— 显式 `motion='full'` 作用在系统 reduce 下**仍应启动过渡**，
 * 以此证明断言有区分力；控制组与被测组走同一个 `sampleTransitions()` 驱动与观察函数。
 */
describe('减少动效下的 Collapse（浏览器）', () => {
  const CONTENT =
    '<button class="trigger">Trigger</button><div slot="content"><div style="height: 80px">Content</div></div>'

  it('系统 reduce：展开收起全程不出现过渡；对照组 full 出现', async () => {
    const reducedEl = mountInsideTheme(null, createCollapse(CONTENT))
    const reduced = reducedEl.querySelector('web-ui-collapse') as WebUiCollapse
    await reduced.updateComplete

    expect(await sampleTransitions(reduced, true)).toHaveLength(0)
    expect(queryContentContainer(reduced).hidden).toBe(false)

    expect(await sampleTransitions(reduced, false)).toHaveLength(0)
    await waitFor(() => queryContentContainer(reduced).hidden === true)

    // 对照组：显式 full 覆盖系统 reduce → 同一驱动必须采到过渡
    const fullEl = mountInsideTheme('full', createCollapse(CONTENT))
    const full = fullEl.querySelector('web-ui-collapse') as WebUiCollapse
    await full.updateComplete

    expect((await sampleTransitions(full, true)).length).toBeGreaterThan(0)
    expect(queryContentContainer(full).hidden).toBe(false)
  })

  it('keep-mounted 关闭稳态在 reduce 下仍阻断交互，全程无过渡', async () => {
    const theme = mountInsideTheme(
      null,
      createCollapse(CONTENT, el => {
        el.keepMounted = true
      })
    )
    const el = theme.querySelector('web-ui-collapse') as WebUiCollapse
    await el.updateComplete

    expect(await sampleTransitions(el, true)).toHaveLength(0)

    expect(await sampleTransitions(el, false)).toHaveLength(0)
    await waitFor(() => queryInner(el).hasAttribute('inert'))

    expect(queryContentContainer(el).hidden).toBe(false)
    expect(queryInner(el).hasAttribute('inert')).toBe(true)
  })
})
