// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vite-plus/test'

import { loadPreviewRuntime, type RuntimeModule } from '../previewRuntime'

describe('loadPreviewRuntime', () => {
  it('首次加载失败后清空缓存，二次调用可重新加载并复用成功后的模块实例', async () => {
    const fakeModule: RuntimeModule = {
      parseMarkdown: vi.fn<RuntimeModule['parseMarkdown']>(async () => ({ nodes: [], codeFiles: [] })),
      highlightRuntime: vi.fn<RuntimeModule['highlightRuntime']>(async code => code)
    }

    const failingLoader = vi.fn<() => Promise<RuntimeModule>>(() => Promise.reject(new Error('chunk load failed')))
    await expect(loadPreviewRuntime(failingLoader)).rejects.toThrow('chunk load failed')
    expect(failingLoader).toHaveBeenCalledTimes(1)

    const succeedingLoader = vi.fn<() => Promise<RuntimeModule>>(async () => fakeModule)
    const first = await loadPreviewRuntime(succeedingLoader)
    const second = await loadPreviewRuntime(succeedingLoader)

    expect(first).toBe(fakeModule)
    expect(second).toBe(fakeModule)
    expect(succeedingLoader).toHaveBeenCalledTimes(1)
  })
})
