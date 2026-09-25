import { describe, expect, it, vi } from 'vite-plus/test'

import type { ResourceSourceView, ResourceView } from '../../../stores/library'
import {
  createLibraryRestoreQueue,
  normalizeRestoreURL,
  restoreLibraryQueue,
  type LibraryRestoreQueueItem
} from '../restore'

function source(id: string, type: ResourceSourceView['type']): ResourceSourceView {
  return {
    id,
    type,
    location: type === 'file' ? '/old/file.txt' : 'https://example.com/old',
    available: false,
    isPreferred: true,
    orderIndex: 0,
    metadata: null
  }
}

function resource(id: string, itemSource: ResourceSourceView): ResourceView {
  return {
    id,
    title: `Resource ${id}`,
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: [itemSource],
    preferred: itemSource,
    tagNames: [],
    available: false,
    kind: 'unknown',
    sizeBytes: null
  }
}

function queueItem(id: string, kind: LibraryRestoreQueueItem['kind']): LibraryRestoreQueueItem {
  return {
    id,
    sourceId: `source-${id}`,
    resourceId: `resource-${id}`,
    resourceTitle: `Resource ${id}`,
    kind,
    location: kind === 'file' ? `/old/${id}.txt` : `https://example.com/${id}`,
    replacementLocation: kind === 'file' ? '' : `https://example.com/${id}`
  }
}

describe('library restore queue', () => {
  it('按选中资源的首个失效来源建立队列', () => {
    const fileSource = source('file-source', 'file')
    const urlSource = source('url-source', 'url')
    const availableSource = { ...urlSource, id: 'available-source', available: true }
    const urlResource = {
      ...resource('url-resource', urlSource),
      sources: [urlSource, availableSource]
    }

    expect(createLibraryRestoreQueue([resource('file-resource', fileSource), urlResource])).toEqual([
      expect.objectContaining({ id: 'file-source', kind: 'file', replacementLocation: '' }),
      expect.objectContaining({ id: 'url-source', kind: 'url', replacementLocation: urlSource.location })
    ])
  })

  it('校验找回 URL', () => {
    expect(normalizeRestoreURL(' https://example.com/new ')).toBe('https://example.com/new')
    expect(normalizeRestoreURL('file:///tmp/new')).toBeNull()
    expect(normalizeRestoreURL('not a URL')).toBeNull()
  })

  it('顺序处理队列，取消不报错，失败后停止并保留失败项', async () => {
    const items = [queueItem('first', 'file'), queueItem('second', 'url'), queueItem('third', 'file')]
    const calls: string[] = []
    const chooseFilePath = vi.fn<() => Promise<string | null>>(async () => {
      calls.push('choose')
      return null
    })
    const replaceFileSource = vi.fn<(sourceId: string, inputPath: string) => Promise<unknown>>(async () => {
      calls.push('file')
    })
    const failure = new Error('replace failed')
    const replaceURLSource = vi.fn<(sourceId: string, inputURL: string) => Promise<unknown>>(async () => {
      calls.push('url')
      throw failure
    })

    const result = await restoreLibraryQueue(items, { chooseFilePath, replaceFileSource, replaceURLSource })

    expect(calls).toEqual(['choose', 'url'])
    expect(result.completedIds).toEqual([])
    expect(result.cancelledIds).toEqual(['first'])
    expect(result.failed).toEqual({ item: items[1], cause: failure })
    expect(chooseFilePath).toHaveBeenCalledTimes(1)
    expect(replaceFileSource).not.toHaveBeenCalled()
    expect(replaceURLSource).toHaveBeenCalledOnce()
    expect(replaceURLSource).toHaveBeenCalledWith('source-second', items[1].replacementLocation)
  })

  it('使用新文件路径替换成功来源', async () => {
    const item = queueItem('file', 'file')
    const replaceFileSource = vi.fn<(sourceId: string, inputPath: string) => Promise<unknown>>(async () => undefined)

    const result = await restoreLibraryQueue([item], {
      chooseFilePath: async () => '/new/file.txt',
      replaceFileSource,
      replaceURLSource: async () => undefined
    })

    expect(replaceFileSource).toHaveBeenCalledWith(item.sourceId, '/new/file.txt')
    expect(result).toEqual({ completedIds: [item.id], cancelledIds: [], failed: null })
  })
})
