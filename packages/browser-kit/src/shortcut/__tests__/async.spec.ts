import { describe, expect, it } from 'vite-plus/test'

import { defer, sleep, sleepSync } from '../async'

describe('async 工具', () => {
  it('defer 应将回调调度到微任务队列', async () => {
    let called = false
    const promise = defer(() => {
      called = true
    })

    // 同步阶段不应执行，等待微任务后执行
    expect(called).toBe(false)
    await promise
    expect(called).toBe(true)
  })

  it('defer 应传递回调返回值', async () => {
    await expect(defer(() => 42)).resolves.toBe(42)
  })

  it('defer 应透传 rejection', async () => {
    await expect(defer(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })

  it('sleep 应等待指定毫秒', async () => {
    const start = Date.now()
    await sleep(10)
    expect(Date.now() - start).toBeGreaterThanOrEqual(10)
  })

  it('sleepSync 应同步阻塞指定毫秒', () => {
    const start = Date.now()
    sleepSync(10)
    expect(Date.now() - start).toBeGreaterThanOrEqual(10)
  })
})
