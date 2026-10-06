import { describe, expect, it } from 'vite-plus/test'

import { getFileExtension } from '..'

describe('getFileExtension 测试', () => {
  it('只取最后一个点之后的后缀并统一小写', () => {
    expect(getFileExtension('test.png')).toBe('png')
    // 多点扩展名取最后一段：archive.tar.gz 是 gz，不是 tar.gz
    expect(getFileExtension('archive.tar.gz')).toBe('gz')
    expect(getFileExtension('UPPERCASE.JPG')).toBe('jpg')
  })

  it('首点、尾点与无点都不视作后缀名', () => {
    expect(() => getFileExtension('no-extension')).toThrow('Filename has no extension.')
    expect(() => getFileExtension('.gitignore')).toThrow('Filename has no extension.')
    expect(() => getFileExtension('report.')).toThrow('Filename has no extension.')
  })

  it('空串与非字符串输入报「非法文件名」，与「无后缀」区分开', () => {
    // 两种错误消息不同，调用方靠它们区分「输入非法」与「输入合法但无后缀」
    expect(() => getFileExtension('')).toThrow('Filename is invalid.')
    expect(() => getFileExtension(undefined as unknown as string)).toThrow('Filename is invalid.')
    expect(() => getFileExtension(42 as unknown as string)).toThrow('Filename is invalid.')
  })
})
