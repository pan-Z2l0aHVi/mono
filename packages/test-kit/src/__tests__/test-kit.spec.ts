import { describe, expect, it } from 'vite-plus/test'

import { defineCapturedRequests, defineMsw } from '..'

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

    it('应当支持插件组合', () => {
      const combined = defineMsw([]).use(defineCapturedRequests())

      expect(combined).toBeDefined()
      expect(typeof combined.make).toBe('function')
    })
  })
})
