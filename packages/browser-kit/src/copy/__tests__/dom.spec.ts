import { beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { copyToClipboard } from '..'

describe('copy 单元测试', () => {
  describe('copyToClipboard 测试', () => {
    beforeAll(() => {
      window.prompt = vi.fn()
      document.execCommand = vi.fn().mockReturnValue(true)
    })

    beforeEach(() => {
      vi.clearAllMocks()
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true
      })
    })

    it('纯文本在 execCommand 环境下应复制成功', async () => {
      await copyToClipboard('test message')
      expect(document.execCommand).toHaveBeenCalledWith('copy')
    })

    it('Blob 内容应正常复制', async () => {
      const blob = new Blob(['blob content'], { type: 'text/html' })
      await copyToClipboard(blob)
      expect(document.execCommand).toHaveBeenCalledWith('copy')
    })

    it('复制失败时不应 throw，静默 resolve', async () => {
      ;(document.execCommand as any).mockImplementation(() => {
        throw new Error('Fake Error.')
      })

      // 不应抛异常，静默处理
      await expect(copyToClipboard('test')).resolves.toBeUndefined()
    })

    it('debug 模式下失败时 v4 内部会输出诊断信息', async () => {
      ;(document.execCommand as any).mockImplementation(() => {
        throw new Error('Fake Error.')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await copyToClipboard('test', { debug: true })

      // v4 在 debug: true 且失败时会内部调用 console.error
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
