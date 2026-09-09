import { describe, expect, it } from 'vite-plus/test'

import { getFileExtension } from '..'

describe('getFileExtension 测试', () => {
  it('应当正确获取后缀名', () => {
    expect(getFileExtension('test.png')).toBe('png')
    expect(getFileExtension('archive.tar.gz')).toBe('gz')
    expect(getFileExtension('UPPERCASE.JPG')).toBe('jpg')
  })

  it('无后缀或非法输入应当抛错', () => {
    expect(() => getFileExtension('no-extension')).toThrow('Filename has no extension.')
    expect(() => getFileExtension('.gitignore')).toThrow('Filename has no extension.')
    expect(() => getFileExtension('report.')).toThrow('Filename has no extension.')
    expect(() => getFileExtension('')).toThrow('Filename is invalid.')
  })
})
