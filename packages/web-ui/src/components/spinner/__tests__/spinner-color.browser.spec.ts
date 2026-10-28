import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiTheme } from '@/components/theme'
import { pollUntil } from '@/shared/test-utils'

import { WebUiSpinner } from '..'

afterEach(() => {
  WebUiSpinner.hide()
  document.body.replaceChildren()
})

function renderedSpinnerColor(spinner: WebUiSpinner): string {
  const leaf = spinner.shadowRoot?.querySelector('span')
  if (!leaf) throw new Error('spinner should render a loading leaf')
  return getComputedStyle(leaf, '::before').backgroundColor
}

function renderedDescriptionColor(spinner: WebUiSpinner): string {
  const element = Array.from(spinner.shadowRoot?.querySelectorAll('div') ?? []).find(
    candidate => candidate.textContent === spinner.description
  )
  if (!element) throw new Error('spinner should render its description')
  return getComputedStyle(element).color
}

describe('spinner 色彩（浏览器）', () => {
  it('默认颜色与描述文字一起跟随主题', async () => {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = 'light'
    theme.motion = 'reduced'
    document.body.append(theme)
    await theme.updateComplete

    const spinner = document.createElement('web-ui-spinner') as WebUiSpinner
    spinner.description = 'Loading'
    theme.append(spinner)
    await spinner.updateComplete

    const lightColor = renderedSpinnerColor(spinner)
    expect(lightColor).toBe(renderedDescriptionColor(spinner))

    theme.appearance = 'dark'
    await theme.updateComplete

    const darkColor = renderedSpinnerColor(spinner)
    expect(darkColor).toBe(renderedDescriptionColor(spinner))
    expect(darkColor).not.toBe(lightColor)
  })

  it('color 属性覆盖主题默认色', async () => {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = 'dark'
    theme.motion = 'reduced'
    document.body.append(theme)
    await theme.updateComplete

    const spinner = document.createElement('web-ui-spinner') as WebUiSpinner
    spinner.setAttribute('color', '#00a')
    theme.append(spinner)
    await spinner.updateComplete

    expect(spinner.color).toBe('#00a')
    expect(renderedSpinnerColor(spinner)).toBe('rgb(0, 0, 170)')
  })

  it('命令式实例继承当前主题的颜色', async () => {
    const inactiveTheme = document.createElement('web-ui-theme') as WebUiTheme
    document.body.append(inactiveTheme)
    await inactiveTheme.updateComplete

    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = 'dark'
    theme.motion = 'reduced'
    inactiveTheme.append(theme)
    expect(theme.getOverlayRoot()).toBeUndefined()

    const spinner = WebUiSpinner.show()
    expect(spinner.parentElement).toBe(theme)
    await theme.updateComplete
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
    await spinner.updateComplete

    const probe = document.createElement('span')
    probe.style.color = 'var(--wui-color-text-secondary)'
    const overlayRoot = theme.getOverlayRoot()
    if (!overlayRoot) throw new Error('theme should provide its overlay root')
    overlayRoot.append(probe)
    const expectedColor = getComputedStyle(probe).color
    probe.remove()

    expect(inactiveTheme.getOverlayRoot()).toBeUndefined()
    expect(overlayRoot.contains(spinner)).toBe(true)
    expect(renderedSpinnerColor(spinner)).toBe(expectedColor)
  })

  it('主题首次渲染时迁移仍保留 duration 自动关闭', async () => {
    const inactiveTheme = document.createElement('web-ui-theme') as WebUiTheme
    document.body.append(inactiveTheme)

    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = 'dark'
    theme.motion = 'reduced'
    inactiveTheme.append(theme)

    const spinner = WebUiSpinner.show({ duration: 100 })
    expect(spinner.parentElement).toBe(theme)

    await theme.updateComplete
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))

    const overlayRoot = theme.getOverlayRoot()
    if (!overlayRoot) throw new Error('theme should provide its overlay root')
    expect(overlayRoot.contains(spinner)).toBe(true)

    // duration 到点后自动关闭：轮询「已摘掉」这个确定性信号，不拿 150ms  wall-clock 当屏障。
    await pollUntil(() => !spinner.isConnected, 'spinner 没有在 duration 到点后自动关闭')
  })
})
