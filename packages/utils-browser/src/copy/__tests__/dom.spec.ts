import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyToClipboard } from '..'

describe('copy 单元测试', () => {
  describe('copyToClipboard 测试', () => {
    beforeAll(() => {
      // 补齐 JSDOM 缺失的 window.prompt
      window.prompt = vi.fn()

      // 核心：模拟 execCommand 并让它返回 true
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      document.execCommand = vi.fn().mockReturnValue(true)
    })

    beforeEach(() => {
      // 清除所有 mock 状态
      vi.clearAllMocks()

      // 确保原生 clipboard API 为空，强制降级走 copy-to-clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true
      })
    })

    it('在 JSDOM 环境下应 copy (通过伪造 execCommand)', async () => {
      const text = 'test message'
      await copyToClipboard(text)

      expect(document.execCommand).toHaveBeenCalledWith('copy')
    })

    it('传入 Blob 且环境不支持时应 reject', async () => {
      const blob = new Blob(['test'])
      await expect(copyToClipboard(blob)).rejects.toBeInstanceOf(Error)
    })

    it('debug 模式下的 console.error 应当包含预期的错误信息', async () => {
      // 让 execCommand 报错
      ;(document.execCommand as any).mockImplementationOnce(() => {
        throw new Error('Fake Error.')
      })

      // 模拟 console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // 强制把 window.prompt 也弄坏
      ;(window.prompt as any).mockImplementationOnce(() => {
        throw new Error('Prompt failed.')
      })

      await copyToClipboard('test', { debug: true }).catch(() => {})

      // 检查 console.error 的调用记录
      const hasMyError = consoleSpy.mock.calls.some(call => call[0] === 'All copy methods failed:')

      expect(hasMyError).toBe(true)

      // 恢复 spy
      consoleSpy.mockRestore()
    })
  })
})
