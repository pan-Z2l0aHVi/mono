import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { copyToClipboard } from '..'

describe('copy 测试', () => {
  describe('copyToClipboard 测试', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('纯文本应复制成功', async () => {
      await expect(copyToClipboard('test message')).resolves.toBeUndefined()
    })

    it('Blob 内容应正常复制', async () => {
      const blob = new Blob(['blob content'], { type: 'text/html' })
      await expect(copyToClipboard(blob)).resolves.toBeUndefined()
    })

    it('复制失败时不应 throw，静默 resolve', async () => {
      // 使 Clipboard API 和 execCommand 都失败，验证 wrapper 不会抛异常
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Fake Error'))
      vi.spyOn(document, 'execCommand').mockImplementation(() => {
        throw new Error('Fake Error')
      })
      await expect(copyToClipboard('test')).resolves.toBeUndefined()
    })

    it('debug 模式下失败时 v4 内部会输出诊断信息', async () => {
      // 使 Clipboard API 和 execCommand 都失败，触发 debug 日志
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Fake Error'))
      vi.spyOn(document, 'execCommand').mockImplementation(() => {
        throw new Error('Fake Error')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await copyToClipboard('test', { debug: true })

      // v4 在 debug: true 且失败时会内部调用 console.error
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})
