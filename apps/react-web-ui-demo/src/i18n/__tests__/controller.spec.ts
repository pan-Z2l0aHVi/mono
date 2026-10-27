import { describe, expect, it, vi } from 'vite-plus/test'

import type { ExampleDoc } from '@/generated/zh-CN/examples'

import { createLocaleController } from '../controller'
import type { Locale } from '../locale'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const docs = [{ component: 'button', samples: [] }] as unknown as ExampleDoc[]
function setup() {
  const catalog = deferred<void>()
  const previews = deferred<void>()
  const commit = vi.fn<(locale: Locale) => void>()
  const persist = vi.fn<(locale: Locale) => void>()
  const prepare = vi.fn<(locale: Locale, docs: ExampleDoc[], components: string[]) => Promise<void>>(
    () => previews.promise
  )
  const controller = createLocaleController({
    loadCatalog: () => catalog.promise,
    loadDocs: async () => docs,
    prepareExamples: prepare,
    commitCatalog: commit,
    persist,
    setDocumentLanguage: vi.fn<(locale: Locale) => void>()
  })
  controller.register('button')
  return { controller, catalog, previews, prepare, commit, persist }
}

describe('语言切换保留当前文档和示例', () => {
  it('catalog、文档和当前页预览都就绪后才统一提交', async () => {
    const { controller, catalog, previews, prepare, commit, persist } = setup()
    const before = controller.getSnapshot()
    const request = controller.change('en')
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledWith('en', docs, ['button']))
    catalog.resolve()
    await Promise.resolve()
    expect(controller.getSnapshot()).toMatchObject({ locale: before.locale, docs: before.docs, pending: true })
    expect(commit).not.toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
    previews.resolve()
    await request
    expect(controller.getSnapshot()).toMatchObject({ locale: 'en', docs, pending: false })
    expect(commit).toHaveBeenCalledWith('en')
    expect(persist).toHaveBeenCalledWith('en')
  })

  it('预览加载失败保留已显示内容及偏好，原始错误传播', async () => {
    const error = new Error('preview unavailable')
    const persist = vi.fn<(locale: Locale) => void>()
    const controller = createLocaleController({
      loadCatalog: async () => {},
      loadDocs: async () => docs,
      prepareExamples: async locale => {
        if (locale === 'en') throw error
      },
      commitCatalog: vi.fn<(locale: Locale) => void>(),
      persist,
      setDocumentLanguage: vi.fn<(locale: Locale) => void>()
    })
    await controller.change('zh-CN', false)
    const before = controller.getSnapshot()
    await expect(controller.change('en')).rejects.toBe(error)
    expect(controller.getSnapshot()).toMatchObject({ locale: before.locale, docs: before.docs, pending: false })
    expect(persist).not.toHaveBeenCalled()
  })

  it('慢请求不能覆盖后来的选择', async () => {
    const { controller, catalog, previews, commit, persist } = setup()
    const old = controller.change('en')
    const next = controller.change('zh-CN')
    catalog.resolve()
    previews.resolve()
    await Promise.all([old, next])
    expect(commit.mock.calls).toEqual([['zh-CN']])
    expect(persist.mock.calls).toEqual([['zh-CN']])
  })
})

it('catalog 尚未就绪时换页，提交前准备新页面的示例', async () => {
  const { controller, catalog, previews, prepare, commit } = setup()
  const remove = controller.register('old-page')
  const request = controller.change('en')
  previews.resolve()
  await vi.waitFor(() => expect(prepare).toHaveBeenCalled())
  remove()
  controller.register('new-page')
  catalog.resolve()
  await request
  expect(prepare).toHaveBeenLastCalledWith('en', docs, ['button', 'new-page'])
  expect(commit).toHaveBeenCalledWith('en')
})
