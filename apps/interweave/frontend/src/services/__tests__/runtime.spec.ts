import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { hasWailsRuntime, RUNTIME_CONFIG_TIMEOUT_MS, waitForRuntimeConfig } from '../runtime'

function stubRuntime(os = 'darwin', arch = 'arm64') {
  vi.stubGlobal('_wails', { environment: { OS: os, Arch: arch } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Wails runtime 就绪判定', () => {
  it('OS 与 Arch 齐全才算已注入', () => {
    expect(hasWailsRuntime()).toBe(false)

    // 只有一半的 environment 不算：它可能来自别处的半成品 stub。
    vi.stubGlobal('_wails', { environment: { OS: 'darwin' } })
    expect(hasWailsRuntime()).toBe(false)

    stubRuntime()
    expect(hasWailsRuntime()).toBe(true)
  })

  it('已注入时立即放行，不等事件', async () => {
    stubRuntime()
    await expect(waitForRuntimeConfig()).resolves.toBe(true)
  })

  it('未注入时等 runtime core 的就绪事件', async () => {
    const waiting = waitForRuntimeConfig()

    stubRuntime()
    window.dispatchEvent(new Event('wails:runtime-config-ready'))

    await expect(waiting).resolves.toBe(true)
  })

  /*
   * 浏览器预览（vite dev 直接开页面）永远等不到注入，因此不能无限挡着；
   * 超时后按「没有桥接」放行，调用方据此走预览路径。
   */
  it('等不到注入时超时放行，之后的事件不影响结果', async () => {
    vi.useFakeTimers()
    const waiting = waitForRuntimeConfig()
    await vi.advanceTimersByTimeAsync(RUNTIME_CONFIG_TIMEOUT_MS)

    await expect(waiting).resolves.toBe(false)

    // 已经结算，且监听已摘掉：迟到的事件既不改结果，也不该再被处理。
    stubRuntime()
    window.dispatchEvent(new Event('wails:runtime-config-ready'))
    await expect(waiting).resolves.toBe(false)
  })

  // 事件在首次判空与挂上监听之间到达时，超时路径的重查要能认出来。
  it('超时前注入但没收到事件，也算就绪', async () => {
    vi.useFakeTimers()
    const waiting = waitForRuntimeConfig()
    stubRuntime()
    await vi.advanceTimersByTimeAsync(RUNTIME_CONFIG_TIMEOUT_MS)

    await expect(waiting).resolves.toBe(true)
  })
})
