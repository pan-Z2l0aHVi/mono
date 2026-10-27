import { setImmediate } from 'node:timers'

import { expect, it, vi } from 'vite-plus/test'

import type { ExampleDoc } from '@/generated/examples'

import { createLocaleController } from '../locale'

function setup() {
  const commits: string[] = []
  const deps = {
    loadCatalog: vi.fn<(locale: string) => Promise<void>>(async () => {}),
    commitCatalog: (locale: string) => {
      commits.push(locale)
    },
    loadDocs: vi.fn<(locale: string) => Promise<never[]>>(async () => []),
    prepareExamples: vi.fn<(locale: string, docs: ExampleDoc[], components: string[]) => Promise<void>>(async () => {}),
    readPreference: () => 'en',
    writePreference: vi.fn<(locale: string) => void>(),
    languages: () => ['zh-TW'],
    setDocumentLanguage: vi.fn<(locale: string) => void>()
  }
  return { deps, commits, state: createLocaleController(deps) }
}

it('偏好优先于浏览器，成功准备后一次提交并持久化', async () => {
  const { state, deps, commits } = setup()
  expect(state.detect()).toBe('en')
  await state.change('en')
  expect(commits).toEqual(['en'])
  expect(state.locale.value).toBe('en')
  expect(deps.writePreference).toHaveBeenCalledWith('en')
})

it('当前页示例就绪前保留原语言，示例失败不提交偏好', async () => {
  const { state, deps, commits } = setup()
  await state.change('zh-CN')
  const unregister = state.register('button')
  let fail!: (error: Error) => void
  let started!: () => void
  const start = new Promise<void>(resolve => {
    started = resolve
  })
  deps.prepareExamples.mockImplementationOnce(() => {
    started()
    return new Promise<void>((_, reject) => {
      fail = reject
    })
  })
  const request = state.change('en')
  const result = request.catch(error => error)
  await start
  expect(state.pending.value).toBe(true)
  expect(state.locale.value).toBe('zh-CN')
  expect(commits).toEqual(['zh-CN'])
  expect(deps.prepareExamples).toHaveBeenLastCalledWith('en', [], ['button'])
  fail(new Error('demo unavailable'))
  expect(await result).toEqual(new Error('demo unavailable'))
  expect(commits).toEqual(['zh-CN'])
  expect(deps.writePreference).toHaveBeenCalledTimes(1)
  expect(state.locale.value).toBe('zh-CN')
  await state.change('en')
  expect(state.locale.value).toBe('en')
  unregister()
})

it('文档失败不提交catalog或偏好，后续请求可恢复', async () => {
  const { state, deps, commits } = setup()
  deps.loadDocs.mockRejectedValueOnce(new Error('docs unavailable'))
  await expect(state.change('en')).rejects.toThrow('docs unavailable')
  expect(commits).toEqual([])
  expect(deps.writePreference).not.toHaveBeenCalled()
  await state.change('zh-CN')
  expect(commits).toEqual(['zh-CN'])
})

it('启动降级中文但不覆盖原偏好；双重失败保留原因', async () => {
  const { state, deps, commits } = setup()
  deps.loadDocs.mockRejectedValueOnce(new Error('English unavailable'))
  expect(await state.bootstrap()).toEqual({ degraded: true, error: expect.any(Error) })
  expect(commits).toEqual(['zh-CN'])
  expect(deps.writePreference).not.toHaveBeenCalled()
  deps.loadDocs.mockRejectedValue(new Error('offline'))
  await expect(state.bootstrap()).rejects.toBeInstanceOf(AggregateError)
})

it('旧请求落地不覆盖最新语言', async () => {
  const { state, deps, commits } = setup()
  let finish!: () => void
  let started!: () => void
  const start = new Promise<void>(resolve => {
    started = resolve
  })
  deps.loadCatalog.mockImplementationOnce(() => {
    started()
    return new Promise<void>(resolve => {
      finish = resolve
    })
  })
  const old = state.change('en')
  await start
  const latest = state.change('zh-CN')
  finish()
  await Promise.all([old, latest])
  expect(commits).toEqual(['zh-CN'])
  expect(state.pending.value).toBe(false)
})

it('文档已失败时仍等待旧catalog结束，才启动下一次准备', async () => {
  const { state, deps, commits } = setup()
  let finish!: () => void
  let started!: () => void
  const start = new Promise<void>(resolve => {
    started = resolve
  })
  deps.loadCatalog.mockImplementationOnce(() => {
    started()
    return new Promise<void>(resolve => {
      finish = resolve
    })
  })
  deps.loadDocs.mockRejectedValueOnce(new Error('docs unavailable'))
  const old = state.change('en')
  // 立即绑定错误处理，避免单个分支的错误变成未处理 rejection。
  const oldResult = old.catch(error => error)
  await start
  await Promise.resolve()
  const latest = state.change('zh-CN')
  // 跨一个事件循环阶段，排空 Promise rejection 与 queue 的微任务。
  await new Promise<void>(resolve => setImmediate(resolve))
  expect(deps.loadCatalog).toHaveBeenCalledTimes(1)
  expect(commits).toEqual([])
  finish()
  await Promise.all([oldResult, latest])
  expect(commits).toEqual(['zh-CN'])
})
