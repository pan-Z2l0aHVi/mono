import { setImmediate } from 'node:timers'

import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it, vi } from 'vite-plus/test'

import { detectLocale, type LocaleDetectDependencies } from '../detect'
import type { DemoLocale, MetaDocs } from '../examples'
import { createLocaleController, createShellLocaleLoader } from '../locale'

const docs: MetaDocs = new Map([['button', [{ label: 'p', content: 'button' } as MetaNode]]])

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function setup() {
  const commits: string[] = []
  const deps = {
    loadCatalog: vi.fn<(locale: DemoLocale) => Promise<void>>(async () => {}),
    commitCatalog: (locale: DemoLocale) => {
      commits.push(locale)
    },
    loadDocs: vi.fn<(locale: DemoLocale, components: string[]) => Promise<MetaDocs>>(async () => docs),
    prepareExamples: vi.fn<(docs: MetaDocs) => Promise<void>>(async () => {}),
    readPreference: () => 'en' as string | null,
    writePreference: vi.fn<(locale: DemoLocale) => void>(),
    languages: () => ['zh-TW'],
    setDocumentLanguage: vi.fn<(locale: DemoLocale) => void>()
  }
  return { deps, commits, state: createLocaleController(deps) }
}

describe('语言切换保留当前文档和示例', () => {
  it('catalog、文档和当前页预览都就绪后才统一提交', async () => {
    const { state, deps, commits } = setup()
    const catalog = deferred<void>()
    const previews = deferred<void>()
    deps.loadCatalog.mockImplementation(() => catalog.promise)
    deps.prepareExamples.mockImplementation(() => previews.promise)
    state.register('button')
    const before = state.getSnapshot()
    const request = state.change('en')
    await vi.waitFor(() => expect(deps.prepareExamples).toHaveBeenCalledWith(docs))
    catalog.resolve()
    await Promise.resolve()
    expect(state.getSnapshot()).toMatchObject({ locale: before.locale, docs: before.docs, pending: true })
    expect(commits).toEqual([])
    expect(deps.writePreference).not.toHaveBeenCalled()
    previews.resolve()
    await request
    expect(state.getSnapshot()).toMatchObject({ locale: 'en', docs, pending: false })
    expect(commits).toEqual(['en'])
    expect(deps.writePreference).toHaveBeenCalledWith('en')
  })

  it('偏好优先于浏览器，成功准备后一次提交并持久化', async () => {
    const { state, deps, commits } = setup()
    expect(state.detect()).toBe('en')
    await state.change('en')
    expect(commits).toEqual(['en'])
    expect(state.getSnapshot().locale).toBe('en')
    expect(deps.writePreference).toHaveBeenCalledWith('en')
  })

  it('预览加载失败保留已显示内容及偏好，原始错误传播', async () => {
    const error = new Error('preview unavailable')
    const { state, deps, commits } = setup()
    deps.loadDocs.mockImplementation(async locale => {
      if (locale === 'en') throw error
      return docs
    })
    await state.change('zh-CN', false)
    const before = state.getSnapshot()
    await expect(state.change('en')).rejects.toBe(error)
    expect(state.getSnapshot()).toMatchObject({ locale: before.locale, docs: before.docs, pending: false })
    expect(deps.writePreference).not.toHaveBeenCalled()
    expect(commits).toEqual(['zh-CN'])
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
    expect(state.getSnapshot().pending).toBe(true)
    expect(state.getSnapshot().locale).toBe('zh-CN')
    expect(commits).toEqual(['zh-CN'])
    expect(deps.prepareExamples).toHaveBeenLastCalledWith(docs)
    fail(new Error('demo unavailable'))
    expect(await result).toEqual(new Error('demo unavailable'))
    expect(commits).toEqual(['zh-CN'])
    expect(deps.writePreference).toHaveBeenCalledTimes(1)
    expect(state.getSnapshot().locale).toBe('zh-CN')
    await state.change('en')
    expect(state.getSnapshot().locale).toBe('en')
    unregister()
  })

  it('慢请求不能覆盖后来的选择', async () => {
    const { state, deps, commits } = setup()
    const old = state.change('en')
    const next = state.change('zh-CN')
    await Promise.all([old, next])
    expect(commits).toEqual(['zh-CN'])
    expect(deps.writePreference.mock.calls).toEqual([['zh-CN']])
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
    expect(state.getSnapshot().pending).toBe(false)
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
})

describe('壳语种 catalog 装载', () => {
  it('壳语种加载失败时保留原始错误', async () => {
    const { state, deps } = setup()
    const failure = new Error('catalog unavailable')
    deps.loadCatalog.mockRejectedValueOnce(failure)
    await expect(state.loadShellLocale()).rejects.toBe(failure)
  })

  it('同一语种的并发请求只提交一次', async () => {
    const loader = createShellLocaleLoader(async () => {})
    const first = loader('en')
    expect(loader('en')).toBe(first)
    await first
    // 已装载过的那一档不再重复提交：再调一次应立即完成，且不会换第二次语种。
    await expect(loader('en')).resolves.toBeUndefined()
  })

  it('快速切换时按请求顺序提交 catalog', async () => {
    const calls: string[] = []
    let finishEnglish!: () => void
    const englishLoad = new Promise<void>(resolve => {
      finishEnglish = resolve
    })
    const load = createShellLocaleLoader(locale => {
      calls.push(locale)
      return locale === 'en' ? englishLoad : Promise.resolve()
    })

    await load('zh-CN')
    const english = load('en')
    const chinese = load('zh-CN')
    await Promise.resolve()
    expect(calls).toEqual(['zh-CN', 'en'])

    finishEnglish()
    await Promise.all([english, chinese])
    expect(calls).toEqual(['zh-CN', 'en', 'zh-CN'])
  })
})

describe('启动降级', () => {
  it('启动降级中文但不覆盖原偏好；双重失败保留原因', async () => {
    const { state, deps, commits } = setup()
    deps.loadDocs.mockRejectedValueOnce(new Error('English unavailable'))
    expect(await state.bootstrap()).toEqual({ degraded: true, error: expect.any(Error) })
    expect(commits).toEqual(['zh-CN'])
    expect(deps.writePreference).not.toHaveBeenCalled()
    deps.loadDocs.mockRejectedValue(new Error('offline'))
    await expect(state.bootstrap()).rejects.toBeInstanceOf(AggregateError)
  })
})

describe('页面注册与补载', () => {
  it('catalog 尚未就绪时换页，提交前准备新页面的示例', async () => {
    const { state, deps, commits } = setup()
    const catalog = deferred<void>()
    const previews = deferred<void>()
    deps.loadCatalog.mockImplementation(() => catalog.promise)
    deps.prepareExamples.mockImplementation(() => previews.promise)
    state.register('button')
    const remove = state.register('old-page')
    const request = state.change('en')
    previews.resolve()
    await vi.waitFor(() => expect(deps.loadDocs).toHaveBeenCalled())
    remove()
    state.register('new-page')
    catalog.resolve()
    await request
    expect(deps.loadDocs.mock.calls.at(-1)).toEqual(['en', ['button', 'new-page']])
    expect(commits).toEqual(['en'])
  })

  it('页面切换后只为当前语种补载新组件', async () => {
    const { state, deps } = setup()
    const componentDocs: MetaDocs = new Map([['radio', [{ label: 'p', content: 'radio' } as MetaNode]]])
    let release!: (value: MetaDocs) => void
    deps.loadDocs.mockImplementation((_locale, components) =>
      components.length ? new Promise<MetaDocs>(resolve => (release = resolve)) : Promise.resolve(new Map())
    )
    await state.change('en', false)
    const request = state.ensure('radio')
    release(componentDocs)
    await request
    expect(state.getSnapshot().docs.get('radio')).toEqual(componentDocs.get('radio'))
    expect(state.getSnapshot().locale).toBe('en')
  })

  it('ensure 对文档里已有的组件不再重复装载', async () => {
    const { state, deps } = setup()
    await state.change('en')
    const calls = deps.loadDocs.mock.calls.length
    await state.ensure('button')
    expect(deps.loadDocs.mock.calls.length).toBe(calls)
  })
})

describe('settled 测试钩子', () => {
  it('settled 等最近一次切换请求落定', async () => {
    const { state, deps } = setup()
    const catalog = deferred<void>()
    deps.loadCatalog.mockImplementation(() => catalog.promise)
    const request = state.change('en')
    let settledDone = false
    void state.settled().then(() => {
      settledDone = true
    })
    await Promise.resolve()
    expect(settledDone).toBe(false)
    catalog.resolve()
    await request
    await state.settled()
    expect(settledDone).toBe(true)
  })

  it('settled 跟随最新请求，旧请求结束不解除它', async () => {
    const { state, deps } = setup()
    // change 的 body 排在 queue 后面，mock 体要到微任务之后才执行；
    // 用 deferred 而不是从 mock 体里捕获 resolve，捕获时机就不依赖 body 何时跑。
    const catalog = deferred<void>()
    deps.loadCatalog.mockImplementationOnce(() => catalog.promise)
    const old = state.change('en')
    const latest = state.change('zh-CN')
    catalog.resolve()
    await Promise.all([old, latest])
    await state.settled()
    expect(state.getSnapshot().locale).toBe('zh-CN')
  })
})

describe('本机语种判定', () => {
  function detectDeps(overrides: Partial<LocaleDetectDependencies> = {}): LocaleDetectDependencies {
    return {
      readPreference: () => null,
      languages: () => ['en-US'],
      ...overrides
    }
  }

  it('选过的语种优先于浏览器习惯', () => {
    expect(detectLocale(detectDeps({ readPreference: () => 'en', languages: () => ['zh-CN'] }))).toBe('en')
  })

  it('存着不认识的语种值时退回浏览器习惯', () => {
    expect(detectLocale(detectDeps({ readPreference: () => 'fr', languages: () => ['zh-TW'] }))).toBe('zh-CN')
  })

  it('按顺序取第一个认识的浏览器语种，其余一律落英文', () => {
    expect(detectLocale(detectDeps({ languages: () => ['fr-FR', 'en-GB'] }))).toBe('en')
    expect(detectLocale(detectDeps({ languages: () => ['zh-HK', 'en-US'] }))).toBe('zh-CN')
    expect(detectLocale(detectDeps({ languages: () => ['de-DE'] }))).toBe('en')
  })

  it('读取偏好失败不影响判定', () => {
    expect(
      detectLocale(
        detectDeps({
          readPreference: () => {
            throw new Error('storage blocked')
          },
          languages: () => ['zh-CN']
        })
      )
    ).toBe('zh-CN')
  })
})
