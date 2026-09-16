import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiSvgDrawLines } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiSvgDrawLines reduced motion（浏览器）', () => {
  it('无 web-ui-theme 祖先时遵循系统 prefers-reduced-motion，不启动动画', async () => {
    const el = mountElement<WebUiSvgDrawLines>('web-ui-svg-draw-lines')
    el.innerHTML = '<svg><path d="M0 0 L100 100"/></svg>'
    await el.updateComplete
    await waitForFrame()

    const path = el.querySelector('path')!
    await el.replay()

    expect(path.getAnimations()).toHaveLength(0)
    el.remove()
  })
})
