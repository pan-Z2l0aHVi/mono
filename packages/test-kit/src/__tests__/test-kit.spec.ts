import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vite-plus/test'

import { defineCapturedRequests, defineMsw } from '..'

// test-kit 在 Node 环境跑，真实 setupWorker 会抛
// "Failed to execute setupWorker in a non-browser environment"，
// 因此桩掉 msw/browser，仅验证 defineMsw 的生命周期委托。
vi.mock('msw/browser', () => ({
  setupWorker: vi.fn<(...handlers: unknown[]) => object>(() => ({
    start: vi.fn<(options?: { quiet: boolean }) => Promise<void>>().mockResolvedValue(undefined),
    stop: vi.fn<() => void>(),
    resetHandlers: vi.fn<() => void>()
  }))
}))

import { setupWorker } from 'msw/browser'

const mockedSetupWorker = vi.mocked(setupWorker)

describe('test-kit 插件测试', () => {
  describe('defineCapturedRequests', () => {
    it('应当提供 capturedRequests 数组', () => {
      const { capturedRequests } = defineCapturedRequests().make()

      expect(Array.isArray(capturedRequests)).toBe(true)
      expect(capturedRequests).toHaveLength(0)
    })

    it('应当支持 push 请求记录', () => {
      const { capturedRequests } = defineCapturedRequests().make()

      capturedRequests.push({
        url: '/api/test',
        body: { event: 'click' },
        method: 'POST',
        timestamp: Date.now()
      })

      expect(capturedRequests).toHaveLength(1)
      expect(capturedRequests[0].url).toBe('/api/test')
    })

    it('clearCapturedRequests 应当清空数组', () => {
      const { capturedRequests, clearCapturedRequests } = defineCapturedRequests().make()

      capturedRequests.push({
        url: '/api/test',
        body: {},
        method: 'POST',
        timestamp: Date.now()
      })
      expect(capturedRequests).toHaveLength(1)

      clearCapturedRequests()
      expect(capturedRequests).toHaveLength(0)
    })

    it('多个实例应当独立', () => {
      const instance1 = defineCapturedRequests().make()
      const instance2 = defineCapturedRequests().make()

      instance1.capturedRequests.push({
        url: '/api/test',
        body: {},
        method: 'POST',
        timestamp: Date.now()
      })

      expect(instance1.capturedRequests).toHaveLength(1)
      expect(instance2.capturedRequests).toHaveLength(0)
    })
  })

  describe('defineMsw', () => {
    it('应当返回插件对象', () => {
      const plugin = defineMsw([])

      expect(plugin).toBeDefined()
      expect(typeof plugin.use).toBe('function')
      expect(typeof plugin.make).toBe('function')
    })

    it('make() 应创建 worker 并转发 handlers', () => {
      const handlers = [http.post('*', () => HttpResponse.json({}))]
      const ctx = defineMsw(handlers).make()

      expect(mockedSetupWorker).toHaveBeenCalledWith(...handlers)
      expect(ctx.worker).toBeDefined()
    })

    it('startMsw/stopMsw/resetMsw 应委托到 worker', async () => {
      const ctx = defineMsw([]).make()

      await ctx.startMsw()
      expect(ctx.worker.start).toHaveBeenCalledWith({ quiet: true })

      ctx.stopMsw()
      expect(ctx.worker.stop).toHaveBeenCalled()

      ctx.resetMsw()
      expect(ctx.worker.resetHandlers).toHaveBeenCalled()
    })

    it('应当支持插件组合并同时暴露 worker 与 capturedRequests', () => {
      const ctx = defineMsw([]).use(defineCapturedRequests()).make()

      expect(ctx.worker).toBeDefined()
      expect(Array.isArray(ctx.capturedRequests)).toBe(true)

      ctx.capturedRequests.push({ url: '/x', body: {}, method: 'POST', timestamp: 0 })
      ctx.clearCapturedRequests()
      expect(ctx.capturedRequests).toHaveLength(0)
    })
  })
})
