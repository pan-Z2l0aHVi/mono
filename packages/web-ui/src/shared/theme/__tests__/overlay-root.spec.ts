import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getFallbackOverlayRoot, getOverlayContainer } from '../overlay-root'

afterEach(() => {
  document.body.replaceChildren()
  document.querySelector('[data-wui-overlay-root]')?.remove()
})

describe('shared/theme overlay-root', () => {
  it('fallback root 惰性创建一次并跨调用复用', () => {
    const first = getFallbackOverlayRoot()
    const second = getFallbackOverlayRoot()

    expect(first).toBe(second)
    expect(document.querySelectorAll('[data-wui-overlay-root]').length).toBe(1)
    expect(first.hasAttribute('data-wui-overlay-container')).toBe(true)
  })

  it('getOverlayContainer 复用已有容器而不重复创建', () => {
    const root = getFallbackOverlayRoot()
    const container = getOverlayContainer(root.getRootNode() as ShadowRoot)

    expect(container.hasAttribute('data-wui-overlay-container')).toBe(true)
    expect((root.getRootNode() as ShadowRoot).querySelectorAll('[data-wui-overlay-container]').length).toBe(1)
  })
})
