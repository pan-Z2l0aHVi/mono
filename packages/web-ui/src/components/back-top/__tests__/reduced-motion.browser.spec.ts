import '..'
import '@/components/theme'

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiTheme } from '@/components/theme'
import { scrollWindowTo } from '@/shared/test-utils/viewport'

import type { WebUiBackTop } from '..'

let originalScrollBehavior = ''
let originalScrollBehaviorPriority = ''

async function mountBackTop(motion: 'reduced' | 'system'): Promise<WebUiBackTop> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = 'light'
  theme.motion = motion
  const el = document.createElement('web-ui-back-top') as WebUiBackTop
  theme.append(el)
  document.body.append(theme)
  await theme.updateComplete
  await el.updateComplete
  return el
}

function forceSmoothDocumentScroll() {
  document.documentElement.style.setProperty('scroll-behavior', 'smooth', 'important')
}

beforeEach(() => {
  const style = document.documentElement.style
  originalScrollBehavior = style.getPropertyValue('scroll-behavior')
  originalScrollBehaviorPriority = style.getPropertyPriority('scroll-behavior')
  style.setProperty('scroll-behavior', 'auto', 'important')
  document.body.replaceChildren()
  const spacer = document.createElement('div')
  spacer.style.height = '4000px'
  document.body.append(spacer)
})

afterEach(() => {
  const style = document.documentElement.style
  style.setProperty('scroll-behavior', 'auto', 'important')
  window.scrollTo(0, 0)
  document.body.replaceChildren()
  if (originalScrollBehavior) {
    style.setProperty('scroll-behavior', originalScrollBehavior, originalScrollBehaviorPriority)
  } else {
    style.removeProperty('scroll-behavior')
  }
})

describe('WebUiBackTop reduced motion scroll（浏览器）', () => {
  it('motion=reduced 时，即使根滚动容器指定 smooth 也瞬时到顶', async () => {
    await scrollWindowTo(1600)
    const el = await mountBackTop('reduced')
    forceSmoothDocumentScroll()

    el.toTop()

    expect(window.scrollY).toBe(0)
    expect(document.documentElement.style.getPropertyValue('scroll-behavior')).toBe('smooth')
    expect(document.documentElement.style.getPropertyPriority('scroll-behavior')).toBe('important')
  })

  it('motion=system 且系统偏好 reduce 时，即使根滚动容器指定 smooth 也瞬时到顶', async () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)
    await scrollWindowTo(1600)
    const el = await mountBackTop('system')
    forceSmoothDocumentScroll()

    el.toTop()

    expect(window.scrollY).toBe(0)
    expect(document.documentElement.style.getPropertyValue('scroll-behavior')).toBe('smooth')
    expect(document.documentElement.style.getPropertyPriority('scroll-behavior')).toBe('important')
  })
})
