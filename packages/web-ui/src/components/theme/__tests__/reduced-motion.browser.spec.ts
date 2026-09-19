import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/icon'
import '@/components/spinner'
import '@/components/theme'
import type { WebUiIcon } from '@/components/icon'
import type { WebUiSpinner } from '@/components/spinner'
import type { WebUiTheme } from '@/components/theme'

/**
 * 无限加载循环在 `prefers-reduced-motion` 下的周期契约。
 *
 * 本文件跑在 `browser-reduced-motion` project（Playwright `reducedMotion: 'reduce'`；
 * vite 按文件名路由，凡以 `reduced-motion.browser.spec.ts` 结尾的 spec 都进这个 project）。
 *
 * 契约是"**放慢而不停**"——一个冻结的加载指示器读起来就是界面卡死，所以 reduce 下转场归零、
 * 但这两个循环只把周期拉长（600ms → 1600ms、800ms → 1600ms）。
 *
 * 断言全部走 Web Animations API（`docs/testing/DELETION-RUBRIC.md` §10 S2）：原实现读
 * `getComputedStyle(svg).animationDuration / animationIterationCount` 与 theme 的
 * `--wui-duration-*` 取值，既是 §5 禁止的 CSS 取值，也只证明"声明存在"、证明不了"循环真的在转"。
 *
 * ⚠️ 观察面用 `shadowRoot.getAnimations()` 而不是 `el.getAnimations({ subtree: true })`：
 * 实测后者**不跨 shadow 边界**（对 icon/spinner 恒返回空集）。这不是动画没跑，是查询范围问题 ——
 * b6 实测同一时刻 `shadowRoot.getAnimations()` 能采到、`{ subtree: true }` 采不到。
 *
 * **本文件自带控制组**（§10 S3）：只断言"还在转"是空转可过的（循环压根不启动也会绿），
 * 必须同时证明周期确实**变了**。故「motion=system 放慢」与「motion=full 回到默认」拆为成对用例，
 * 走同一个 `loopPeriods()` 观察函数——后者即前者的对照组。
 */
function mountTheme(motion: string): WebUiTheme {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = 'light'
  theme.motion = motion
  document.body.append(theme)
  return theme
}

function createSpinningIcon(theme: WebUiTheme): WebUiIcon {
  const icon = document.createElement('web-ui-icon') as WebUiIcon
  icon.spin = true
  icon.icon = { body: '<circle cx="12" cy="12" r="9" />', width: 24, height: 24 }
  theme.append(icon)
  return icon
}

/**
 * 某个加载循环的周期集合（ms）。只收该动画名下的运行中动画，
 * 并顺带断言它们**没有**停止 —— `iterations === Infinity` 就是"不停"的 API 级表达。
 */
function loopPeriods(el: HTMLElement, animationName: string): number[] {
  return Array.from(el.shadowRoot?.getAnimations() ?? [])
    .map(animation => animation as CSSAnimation)
    .filter(animation => animation.animationName === animationName)
    .map(animation => {
      const timing = animation.effect!.getComputedTiming()
      expect(timing.iterations, `${animationName} 不应停止循环`).toBe(Infinity)
      return timing.duration as number
    })
}

afterEach(() => document.body.replaceChildren())

describe('系统 prefers-reduced-motion 下无限加载循环的周期（浏览器）', () => {
  it('motion=system 跟随系统偏好：两个加载循环放慢到 1.6s 且不停', async () => {
    const theme = mountTheme('system')

    const icon = createSpinningIcon(theme)
    await icon.updateComplete
    expect(loopPeriods(icon, 'wui-icon-spin')).toEqual([1600])

    const spinner = document.createElement('web-ui-spinner') as WebUiSpinner
    theme.append(spinner)
    await spinner.updateComplete
    const leafPeriods = loopPeriods(spinner, 'wui-spinner-leaf-fade')
    expect(leafPeriods.length).toBeGreaterThan(0)
    expect(new Set(leafPeriods)).toEqual(new Set([1600]))
  })

  it('motion=full 覆盖系统偏好：两个循环回到默认周期（对照组，证明上一条有区分力）', async () => {
    const theme = mountTheme('full')

    const icon = createSpinningIcon(theme)
    await icon.updateComplete
    expect(loopPeriods(icon, 'wui-icon-spin')).toEqual([600])

    const spinner = document.createElement('web-ui-spinner') as WebUiSpinner
    theme.append(spinner)
    await spinner.updateComplete
    const leafPeriods = loopPeriods(spinner, 'wui-spinner-leaf-fade')
    expect(leafPeriods.length).toBeGreaterThan(0)
    expect(new Set(leafPeriods)).toEqual(new Set([800]))
  })
})

describe('系统 prefers-reduced-motion 下主题切换 fallback（浏览器）', () => {
  it('transition=true 也不启动 View Transition，直接提交 appearance', async () => {
    const original = document.startViewTransition
    let started = false
    try {
      document.startViewTransition = (...args) => {
        started = true
        return original.call(document, ...args)
      }

      const theme = document.createElement('web-ui-theme') as WebUiTheme
      theme.appearance = 'light'
      theme.transition = true
      document.body.append(theme)
      await theme.updateComplete

      theme.appearance = 'dark'
      await theme.updateComplete

      expect(started).toBe(false)
      expect(theme.appearance).toBe('dark')
    } finally {
      document.startViewTransition = original
    }
  })
})
