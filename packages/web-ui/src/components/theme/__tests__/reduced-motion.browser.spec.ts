import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/icon'
import '@/components/spinner'
import '@/components/theme'
import type { WebUiIcon } from '@/components/icon'
import type { WebUiSpinner } from '@/components/spinner'
import type { WebUiTheme } from '@/components/theme'

// 本文件跑在 Playwright reducedMotion: 'reduce' 的独立项目里（vite 按文件名路由）。
// 主题 token 是唯一能同时覆盖「显式 motion 属性」与「系统偏好」的载体，组件级
// @media (prefers-reduced-motion) 块看不到 motion 属性。
describe('系统 prefers-reduced-motion 下无限加载循环的周期（浏览器）', () => {
  afterEach(() => document.body.replaceChildren())

  function mountTheme(): WebUiTheme {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = 'light'
    theme.motion = 'system'
    document.body.append(theme)
    return theme
  }

  it('motion=system 跟随系统偏好：转场归零、两个加载循环放慢而不停', async () => {
    const theme = mountTheme()
    await theme.updateComplete
    const themeStyle = getComputedStyle(theme)

    expect(themeStyle.getPropertyValue('--wui-duration-swipe-settle').trim()).toBe('0s')
    expect(themeStyle.getPropertyValue('--wui-duration-spin').trim()).toBe('1.6s')
    expect(themeStyle.getPropertyValue('--wui-duration-spinner').trim()).toBe('1.6s')
  })

  it('icon 的 spin 与 spinner 的叶片追光读取放慢后的周期', async () => {
    const theme = mountTheme()

    const icon = document.createElement('web-ui-icon') as WebUiIcon
    icon.spin = true
    icon.icon = { body: '<circle cx="12" cy="12" r="9" />', width: 24, height: 24 }
    theme.append(icon)
    await icon.updateComplete

    const svg = icon.shadowRoot!.querySelector('svg')!
    expect(svg.classList.contains('spin')).toBe(true)
    // 循环只是放慢，不是停下或归零。
    expect(getComputedStyle(svg).animationDuration).toBe('1.6s')
    expect(getComputedStyle(svg).animationIterationCount).toBe('infinite')

    const spinner = document.createElement('web-ui-spinner') as WebUiSpinner
    theme.append(spinner)
    await spinner.updateComplete

    const leaves = spinner.shadowRoot!.querySelectorAll<HTMLElement>('.wui-spinner span')
    expect(leaves).toHaveLength(8)
    expect(getComputedStyle(leaves[0]).animationDuration).toBe('1.6s')
    // 叶片相位由同一 token 推导，周期变化时相位跟着变，不会断档。
    expect(getComputedStyle(leaves[0]).animationDelay).toBe('-1.6s')
    expect(getComputedStyle(leaves[7]).animationDelay).toBe('-0.2s')
  })
})
