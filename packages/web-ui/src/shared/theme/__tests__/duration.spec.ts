import { describe, expect, it } from 'vite-plus/test'

import { parseDuration } from '../duration'

describe('parseDuration', () => {
  it('秒与毫秒都换算到毫秒', () => {
    expect(parseDuration('160ms')).toBe(160)
    expect(parseDuration('1s')).toBe(1000)
    expect(parseDuration('.3s')).toBe(300)
    expect(parseDuration('0.25s')).toBe(250)
  })

  // 逗号列表切出来的 token 常带空格，两端空白不算格式错误。
  it('容忍两端空白', () => {
    expect(parseDuration(' 160ms ')).toBe(160)
    expect(parseDuration('1s ')).toBe(1000)
  })

  // 负值交给调用方钳制（checkbox）或忽略（presence 的 max 从 0 起算），解析本身不做范围处理。
  it('符号原样解析', () => {
    expect(parseDuration('-160ms')).toBe(-160)
    expect(parseDuration('+.3s')).toBe(300)
  })

  it('格式不符返回 null，由调用方兜底', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('160')).toBeNull()
    expect(parseDuration('auto')).toBeNull()
    expect(parseDuration('1e3ms')).toBeNull()
  })
})
