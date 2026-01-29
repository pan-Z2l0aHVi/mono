import { describe, expect, it } from 'vitest'

import { err, isErr, isOk, ok, to, unwrap } from '../go'

describe('Result 工具函数（Go 风格）单元测试', () => {
  it('ok() 应当返回 Ok<T>', () => {
    const result = ok(42)
    expect(result).toEqual([null, 42])
    expect(isOk(result)).toBe(true)
    expect(isErr(result)).toBe(false)
  })

  it('err() 应当返回 Err<E>', () => {
    const error = new Error('Failed.')
    const result = err(error)
    expect(result).toEqual([error, null])
    expect(isErr(result)).toBe(true)
    expect(isOk(result)).toBe(false)
  })

  it('isOk() 和 isErr() 应当正确区分结果', () => {
    const success = ok(123)
    const failure = err('error')

    expect(isOk(success)).toBe(true)
    expect(isErr(success)).toBe(false)

    expect(isOk(failure)).toBe(false)
    expect(isErr(failure)).toBe(true)
  })

  it('to() 应当把成功的 Promise 包装成 Ok', async () => {
    const result = await to(Promise.resolve('hi'))
    expect(isOk(result)).toBe(true)
    expect(result).toEqual([null, 'hi'])
  })

  it('to() 应当把失败的 Promise 包装成 Err', async () => {
    const result = await to(Promise.reject('error'))
    expect(isErr(result)).toBe(true)
    expect(result).toEqual(['error', null])
  })

  it('unwrap() 在 Ok 时返回值', () => {
    const result = ok('data')
    expect(unwrap(result)).toBe('data')
  })

  it('unwrap() 在 Err 时返回错误', () => {
    const result = err('error')
    expect(unwrap(result)).toBe('error')
  })

  it('Result 数据结构应当是 [error, value]', () => {
    const success = ok(1)
    expect(success[0]).toBeNull()
    expect(success[1]).toBe(1)

    const failure = err('boom')
    expect(failure[0]).toBe('boom')
    expect(failure[1]).toBeNull()
  })
})
