import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import type { WebUiTheme } from '..'
import '..'

function createRootTheme(): WebUiTheme {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = 'light'
  theme.transition = 'on'
  theme.style.setProperty('--wui-theme-transition-duration', '600ms')
  document.body.append(theme)
  return theme
}

function createNestedTheme(): WebUiTheme {
  const outer = createRootTheme()
  const inner = document.createElement('web-ui-theme') as WebUiTheme
  inner.appearance = 'light'
  inner.transition = 'on'
  inner.style.setProperty('--wui-theme-transition-duration', '600ms')
  outer.append(inner)
  return inner
}

function wrapStartViewTransition() {
  const original = document.startViewTransition
  let transition: ViewTransition | undefined
  const start = vi.fn<(update?: () => void | Promise<void>) => ViewTransition>(
    (update?: () => void | Promise<void>) => {
      transition = original.call(document, update)
      return transition
    }
  )
  document.startViewTransition = start
  return {
    get current() {
      return transition
    },
    restore() {
      document.startViewTransition = original
    }
  }
}

afterEach(() => document.body.replaceChildren())

describe('theme transition（浏览器）', () => {
  it('根主题在 ::view-transition-new(root) 上创建圆形揭示并在结束后清理', async () => {
    const wrapper = wrapStartViewTransition()
    const theme = createRootTheme()
    await theme.updateComplete

    theme.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    await transition!.ready
    await Promise.resolve()

    const reveal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') === '::view-transition-new(root)'
      )
    expect(reveal).toBeDefined()
    const effect = reveal!.effect as KeyframeEffect
    expect((effect.getKeyframes()[0].clipPath as string).startsWith('circle(0px at ')).toBe(true)
    expect(
      document.adoptedStyleSheets.some(sheet =>
        Array.from(sheet.cssRules).some(rule => rule.cssText.includes('::view-transition-image-pair'))
      )
    ).toBe(true)

    await transition!.finished
    expect(document.adoptedStyleSheets.some(sheet => sheet.cssRules.length > 0)).toBe(false)
    expect(theme.style.getPropertyValue('view-transition-name')).toBe('')
    expect(theme.style.getPropertyValue('display')).toBe('')
    wrapper.restore()
  })

  it('嵌套主题使用唯一 capture name 并只清理该飞行状态', async () => {
    const wrapper = wrapStartViewTransition()
    const theme = createNestedTheme()
    await theme.updateComplete

    theme.appearance = 'dark'
    const transition = wrapper.current
    expect(transition).toBeDefined()
    await transition!.ready
    await Promise.resolve()

    const transitionName = theme.style.getPropertyValue('view-transition-name')
    expect(transitionName).toMatch(/^wui-theme-transition-/)
    const reveal = document
      .getAnimations()
      .find(
        animation =>
          ((animation.effect as KeyframeEffect | null)?.pseudoElement ?? '') ===
          `::view-transition-new(${transitionName})`
      )
    expect(reveal).toBeDefined()

    await transition!.finished
    expect(theme.style.getPropertyValue('view-transition-name')).toBe('')
    expect(theme.style.getPropertyValue('display')).toBe('')
    wrapper.restore()
  })
})
