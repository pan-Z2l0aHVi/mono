import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { installPointerFocusSuppression } from '../pointer-focus'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pointer focus suppression', () => {
  it('SSR 环境 window 不存在时返回 no-op', () => {
    vi.stubGlobal('window', undefined)

    const dispose = installPointerFocusSuppression()

    expect(dispose).toBeTypeOf('function')
    expect(() => dispose()).not.toThrow()
  })

  it('浏览器环境只挂 document capture 监听', () => {
    const documentSpy = vi.spyOn(document, 'addEventListener')
    const windowSpy = vi.spyOn(window, 'addEventListener')

    const dispose = installPointerFocusSuppression()

    expect(documentSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true)
    expect(documentSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(documentSpy).toHaveBeenCalledWith('focusin', expect.any(Function), true)
    expect(windowSpy).not.toHaveBeenCalled()

    dispose()
  })
})
