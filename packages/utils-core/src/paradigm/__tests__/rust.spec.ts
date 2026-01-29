import { describe, expect, it } from 'vitest'

import { err, isErr, isOk, ok, to, unwrap } from '../rust'

describe('Result 工具函数（Rust 风格）单元测试', () => {
  it('ok() 应当返回一个 Ok<T>', () => {
    const result = ok(123)
    expect(result).toEqual({ ok: true, value: 123 })
    expect(isOk(result)).toBe(true)
    expect(isErr(result)).toBe(false)
  })

  it('err() 应当返回一个 Err<E>', () => {
    const result = err('error')
    expect(result).toEqual({ ok: false, error: 'error' })
    expect(isErr(result)).toBe(true)
    expect(isOk(result)).toBe(false)
  })

  it('isOk() 和 isErr() 应当正确区分结果', () => {
    const success = ok('success')
    const failure = err('fail')

    expect(isOk(success)).toBe(true)
    expect(isErr(success)).toBe(false)

    expect(isOk(failure)).toBe(false)
    expect(isErr(failure)).toBe(true)
  })

  it('to() 应当把成功的 Promise 包装成 Ok', async () => {
    const result = await to(Promise.resolve('data'))
    expect(result).toEqual({ ok: true, value: 'data' })
    expect(isOk(result)).toBe(true)
  })

  it('to() 应当把失败的 Promise 包装成 Err', async () => {
    const result = await to(Promise.reject('error'))
    expect(result).toEqual({ ok: false, error: 'error' })
    expect(isErr(result)).toBe(true)
  })

  it('unwrap() 在 Ok 时返回值', () => {
    const result = ok('data')
    expect(unwrap(result)).toBe('data')
  })

  it('unwrap() 在 Err 时返回错误', () => {
    const result = err('error')
    expect(unwrap(result)).toBe('error')
  })

  it('Ok<T> 应当只有 ok 和 value 属性，没有 error', () => {
    const result = ok('success')
    expect(result).toHaveProperty('ok')
    expect(result.ok).toBe(true)
    expect(result).toHaveProperty('value')
    expect(result).not.toHaveProperty('error')
  })

  it('Err<E> 应当只有 ok 和 error 属性，没有 value', () => {
    const result = err('fail')
    expect(result).toHaveProperty('ok')
    expect(result.ok).toBe(false)
    expect(result).toHaveProperty('error')
    expect(result).not.toHaveProperty('value')
  })
})
