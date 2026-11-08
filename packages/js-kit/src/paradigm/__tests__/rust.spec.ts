import { describe, expect, it } from 'vite-plus/test'

import { andThen, err, isErr, isOk, ok, to, unwrap } from '../rust'

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

describe('andThen 组合（Ok 载荷续跑，Err 短路）', () => {
  it('前一步 Err 时上浮同一条 Err，后一步一次都不跑', async () => {
    const failure = err('first failed')
    let secondRuns = 0
    const result = await andThen(failure, () => {
      secondRuns += 1
      return ok(undefined)
    })

    expect(result).toBe(failure)
    expect(secondRuns).toBe(0)
  })

  it('前一步 Ok 时把载荷交给后一步，结果以后一步为准', async () => {
    await expect(andThen(ok(3), value => ok(`#${value}`))).resolves.toEqual({ ok: true, value: '#3' })
    await expect(andThen(ok(3), value => (value > 0 ? err('positive') : ok('from second')))).resolves.toEqual({
      ok: false,
      error: 'positive'
    })
  })

  it('首参可以是已完成的 Result 或 Promise，后一步同理', async () => {
    const syncNext = await andThen(Promise.resolve(ok('data')), value => err(`seen ${value}`))
    const asyncNext = await andThen(ok('data'), async value => ok(`${value}!`))

    expect(syncNext).toEqual({ ok: false, error: 'seen data' })
    expect(asyncNext).toEqual({ ok: true, value: 'data!' })
  })
})
