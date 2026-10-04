import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vite-plus/test'

import { base64ToFile, downloadFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } from '..'
import { worker } from '../../../test-helper'

describe('file 测试', () => {
  // 1×1 透明 PNG
  const pngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

  describe('Base64 校验与转换', () => {
    it('isValidBase64 接受 data URL，拒绝非 base64 与空串', () => {
      expect(isValidBase64(pngBase64)).toBe(true)
      expect(isValidBase64('not-a-base64-string')).toBe(false)
      // 空串与纯空白都会走进 atob 并抛错，必须提前判掉而不是让异常外泄
      expect(isValidBase64('')).toBe(false)
      expect(isValidBase64('   ')).toBe(false)
    })

    it('base64ToFile 从 data URL 还原出带正确扩展名与 MIME 的 File', () => {
      const file = base64ToFile(pngBase64, 'test-image')

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('test-image.png')
      expect(file.type).toBe('image/png')
    })

    it('fileToBase64 与 base64ToFile 往返还原原始内容', async () => {
      // 往返是这两个函数的主要用途；任一侧破坏 MIME 或数据都会静默产出坏文件
      const original = base64ToFile(pngBase64, 'pixel')
      const dataUrl = await fileToBase64(original)

      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
      const restored = base64ToFile(dataUrl, 'pixel')
      expect(restored.type).toBe(original.type)
      expect(new Uint8Array(await restored.arrayBuffer())).toEqual(new Uint8Array(await original.arrayBuffer()))
    })

    it('getImageInfo 读出图片的像素宽高', async () => {
      const info = await getImageInfo(base64ToFile(pngBase64, 'pixel'))

      expect(info).toEqual({ width: 1, height: 1 })
    })

    it('getImageInfo 对无法解码的输入 reject，而不是永不 settle', async () => {
      // 只断言 fulfilled 的话，一个 onerror 里直接 return 的实现会让 promise 永久挂起
      await expect(getImageInfo(new Blob(['not an image'], { type: 'image/png' }))).rejects.toThrow(
        'Image load failed:'
      )
    })
  })

  describe('isSameFileType (基于 Magic Number)', () => {
    const createMockFile = (content: number[], type: string) => {
      const blob = new Blob([new Uint8Array(content)], { type })
      return new File([blob], 'test.bin', { type })
    }

    it('文件头相同即判定同类型，与声明的 MIME 无关', async () => {
      // 这正是该函数存在的理由：只看 MIME 会把改过扩展名的文件当成同类型
      const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

      expect(await isSameFileType(createMockFile(pngHeader, 'image/png'), createMockFile(pngHeader, 'image/png'))).toBe(
        true
      )
      expect(
        await isSameFileType(
          createMockFile(pngHeader, 'image/png'),
          createMockFile(pngHeader, 'application/octet-stream')
        )
      ).toBe(true)
    })

    it('文件头不同即判定异类型，即便声明了相同 MIME', async () => {
      const pngHeader = [0x89, 0x50, 0x4e, 0x47]
      const jpgHeader = [0xff, 0xd8, 0xff, 0xe0]

      expect(
        await isSameFileType(createMockFile(pngHeader, 'image/jpeg'), createMockFile(jpgHeader, 'image/jpeg'))
      ).toBe(false)
    })
  })

  describe('downloadFile', () => {
    it('传入 File 时按其原名触发下载，不报错', async () => {
      await expect(downloadFile(new File(['hello'], 'hello.txt', { type: 'text/plain' }))).resolves.toBeUndefined()
    })

    it('传入字符串时用文件名作为下载名', async () => {
      worker.use(http.get('*', () => new HttpResponse('data', { headers: { 'content-type': 'text/plain' } })))

      await expect(downloadFile('https://example.com/docs/report.pdf')).resolves.toBeUndefined()
    })

    it('显式 filename 覆盖从 URL 推导出的名字', async () => {
      worker.use(http.get('*', () => new HttpResponse('data')))

      // 服务端给的 content-disposition 才是权威名字，这里覆盖的是「URL 推导」这一路
      await expect(downloadFile('https://example.com/a/b/original.bin', 'renamed.bin')).resolves.toBeUndefined()
    })

    it('非法 URL 在发起请求前就报可读错误', async () => {
      // 非法输入应给出含原值的错误，而不是 new URL 抛出的 TypeError
      await expect(downloadFile('not-a-url')).rejects.toThrow('Invalid URL: not-a-url.')
    })

    it('非 ok 响应抛出带状态码的错误', async () => {
      worker.use(http.get('*', () => new HttpResponse(null, { status: 404 })))

      await expect(downloadFile('https://example.com/missing-file.pdf')).rejects.toThrow(
        'Download failed: 404 Not Found'
      )
    })

    it('网络错误与 HTTP 错误可区分', async () => {
      worker.use(http.get('*', () => HttpResponse.error()))

      // 网络不可达与「服务端返回 4xx」对调用方是两种不同的可恢复路径
      await expect(downloadFile('https://example.com/file.pdf')).rejects.toThrow(
        'Network error: failed to fetch the file.'
      )
    })

    it('流式下载时按进度回调单调递增推进到 100', async () => {
      const body = 'x'.repeat(1000)
      worker.use(http.get('*', () => new HttpResponse(body, { headers: { 'content-length': String(body.length) } })))

      const percents: number[] = []
      await downloadFile('https://example.com/big.bin', undefined, percent => percents.push(percent))

      expect(percents.length).toBeGreaterThan(0)
      expect(percents[percents.length - 1]).toBe(100)
      // 进度条不能让用户看到数字回退
      expect([...percents].sort((a, b) => a - b)).toEqual(percents)
    })
  })
})
