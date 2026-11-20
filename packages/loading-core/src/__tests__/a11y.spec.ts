import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { announceRouteChange } from '..'

describe('announceRouteChange', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('reuses one polite live region and announces the new title', () => {
    announceRouteChange('Home')
    const region = document.querySelector('[aria-live="polite"]')
    expect(region?.getAttribute('aria-atomic')).toBe('true')
    expect(region?.textContent).toBe('已进入：Home')

    announceRouteChange('Settings')
    expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(1)
    expect(region?.textContent).toBe('已进入：Settings')
  })
})
