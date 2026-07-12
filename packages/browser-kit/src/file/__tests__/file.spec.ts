import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vite-plus/test'

import { base64ToFile, downloadFile, formatFileSize, getFileExtension, isSameFileType, isValidBase64 } from '..'
import { worker } from '../../../test-helper'

describe('file 测试', () => {
  describe('getFileExtension', () => {
    it('应当正确获取后缀名', () => {
      expect(getFileExtension('test.png')).toBe('png')
      expect(getFileExtension('archive.tar.gz')).toBe('gz')
      expect(getFileExtension('UPPERCASE.JPG')).toBe('jpg')
    })

    it('处理无后缀或特殊文件名', () => {
      expect(() => getFileExtension('no-extension')).toThrow('Filename has no extension.')
      expect(() => getFileExtension('.gitignore')).toThrow('Filename has no extension.')
      expect(() => getFileExtension('')).toThrow('Filename is invalid.')
    })
  })

  describe('formatFileSize', () => {
    it('应当正确格式化字节', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('应当支持自定义保留小数位', () => {
      expect(formatFileSize(1500, 3)).toBe('1.465 KB')
      expect(formatFileSize(1500, 0)).toBe('1 KB')
    })
  })

  describe('Base64 校验与转换', () => {
    const validBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    const invalidBase64 = 'not-a-base64-string'

    it('isValidBase64 应当正确判断', () => {
      expect(isValidBase64(validBase64)).toBe(true)
      expect(isValidBase64(invalidBase64)).toBe(false)
      expect(isValidBase64('')).toBe(false)
    })

    it('base64ToFile 应当生成合法的 File 对象', () => {
      const file = base64ToFile(validBase64, 'test-image')
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('test-image.png')
      expect(file.type).toBe('image/png')
    })
  })

  describe('isSameFileType (基于 Magic Number)', () => {
    // Mock File 对象的 stream 和 slice 行为
    const createMockFile = (content: number[], type: string) => {
      const blob = new Blob([new Uint8Array(content)], { type })
      return new File([blob], 'test.bin', { type })
    }

    it('两个相同文件头的文件应当返回 true', async () => {
      const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      const file1 = createMockFile(pngHeader, 'image/png')
      const file2 = createMockFile(pngHeader, 'image/png')

      const result = await isSameFileType(file1, file2)
      expect(result).toBe(true)
    })

    it('不同文件头的文件应当返回 false', async () => {
      const pngHeader = [0x89, 0x50, 0x4e, 0x47]
      const jpgHeader = [0xff, 0xd8, 0xff, 0xe0]
      const file1 = createMockFile(pngHeader, 'image/png')
      const file2 = createMockFile(jpgHeader, 'image/jpeg')

      const result = await isSameFileType(file1, file2)
      expect(result).toBe(false)
    })
  })

  describe('downloadFile', () => {
    it('从 File 对象触发下载时，应正常完成不抛异常', async () => {
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
      await expect(downloadFile(file)).resolves.toBeUndefined()
    })

    it('fetch 返回非 ok 响应时应抛出错误', async () => {
      worker.use(http.get('*', () => new HttpResponse(null, { status: 404 })))

      await expect(downloadFile('https://example.com/missing-file.pdf')).rejects.toThrow(
        'Download failed: 404 Not Found'
      )
    })

    it('fetch 网络错误时应抛出有意义的错误', async () => {
      worker.use(http.get('*', () => HttpResponse.error()))

      await expect(downloadFile('https://example.com/file.pdf')).rejects.toThrow(
        'Network error: failed to fetch the file.'
      )
    })
  })
})
