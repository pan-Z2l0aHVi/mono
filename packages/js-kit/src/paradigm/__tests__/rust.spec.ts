import { describe, expect, it } from 'vite-plus/test'

import { err, isErr, isOk, ok, to, unwrap } from '../rust'

describe('Result 工具函数（Rust 风格）测试', () => {
  it('ok() / err() 产出的判别联合可由 isOk / isErr 分流', () => {
    // Ok 与 Err 的完整形状就是公共契约：下游按 `ok` 字段做类型收窄，
    // 额外或缺失的键都会让 `unwrap` 的条件类型推导改变。
    const success = ok(123)
    expect(success).toEqual({ ok: true, value: 123 })
    expect(isOk(success)).toBe(true)
    expect(isErr(success)).toBe(false)

    const failure = err('error')
    expect(failure).toEqual({ ok: false, error: 'error' })
    expect(isErr(failure)).toBe(true)
    expect(isOk(failure)).toBe(false)
  })

  it('to() 把 fulfilled Promise 包成 Ok、rejected 包成 Err', async () => {
    const success = await to(Promise.resolve('data'))
    expect(success).toEqual({ ok: true, value: 'data' })

    const failure = await to(Promise.reject(new Error('boom')))
    expect(isErr(failure)).toBe(true)
    expect((failure as { error: Error }).error.message).toBe('boom')
  })

  it('to() 对 thenable 与同步 throw 的 Promise 同样返回 Err，不外泄 rejection', async () => {
    const failure = await to(
      Promise.resolve().then(() => {
        throw new TypeError('sync in then')
      })
    )

    expect(isErr(failure)).toBe(true)
  })

  it('unwrap() 按分支取出 value 或 error', () => {
    expect(unwrap(ok('data'))).toBe('data')

    // Err 分支返回 error 而非抛出，调用方依赖「永不 throw」的形状自行分支
    const failure = new Error('boom')
    expect(unwrap(err(failure))).toBe(failure)
  })
})
