import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it, vi } from 'vite-plus/test'

import { createLocaleController } from '../controller'
import type { MetaDocs } from '../examples'
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
const docs: MetaDocs = new Map([['button', [{ label: 'p', content: 'button' } as MetaNode]]])
function setup() {
  const catalog = deferred<void>()
  const previews = deferred<void>()
  const commit = vi.fn<(locale: Locale) => void>()
  const persist = vi.fn<(locale: Locale) => void>()
  const loadDocs = vi.fn<(locale: Locale, components: string[]) => Promise<MetaDocs>>(async () => docs)
  const prepare = vi.fn<(docs: MetaDocs) => Promise<void>>(() => previews.promise)
  const controller = createLocaleController({
    loadCatalog: () => catalog.promise,
    loadDocs,
    prepareExamples: prepare,
    commitCatalog: commit,
    persist,
    setDocumentLanguage: vi.fn<(locale: Locale) => void>()
  })
  controller.register('button')
  return { controller, catalog, previews, loadDocs, prepare, commit, persist }
}

describe('语言切换保留当前文档和示例', () => {
  it('catalog、文档和当前页预览都就绪后才统一提交', async () => {
    const { controller, catalog, previews, prepare, commit, persist } = setup()
    const before = controller.getSnapshot()
    const request = controller.change('en')
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledWith(docs))
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
      loadDocs: async locale => {
        if (locale === 'en') throw error
        return docs
      },
      prepareExamples: async () => {},
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
  const { controller, catalog, previews, loadDocs, commit } = setup()
  const remove = controller.register('old-page')
  const request = controller.change('en')
  previews.resolve()
  await vi.waitFor(() => expect(loadDocs).toHaveBeenCalled())
  remove()
  controller.register('new-page')
  catalog.resolve()
  await request
  expect(loadDocs.mock.calls.at(-1)).toEqual(['en', ['button', 'new-page']])
  expect(commit).toHaveBeenCalledWith('en')
})

it('页面切换后只为当前语种补载新组件', async () => {
  const loaded = deferred<MetaDocs>()
  const controller = createLocaleController({
    loadCatalog: async () => {},
    loadDocs: async (_locale, components) => (components.length ? loaded.promise : new Map()),
    prepareExamples: async () => {},
    commitCatalog: vi.fn<(locale: Locale) => void>(),
    persist: vi.fn<(locale: Locale) => void>(),
    setDocumentLanguage: vi.fn<(locale: Locale) => void>()
  })
  await controller.change('en', false)
  expect(controller.getSnapshot().docs.size).toBe(0)

  const componentDocs: MetaDocs = new Map([['radio', [{ label: 'p', content: 'radio' } as MetaNode]]])
  void controller.ensure('radio')
  loaded.resolve(componentDocs)
  await vi.waitFor(() => expect(controller.getSnapshot().docs.get('radio')).toEqual(componentDocs.get('radio')))
  expect(controller.getSnapshot().locale).toBe('en')
})
