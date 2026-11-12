import { describe, expect, it, vi } from 'vite-plus/test'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView, ResourceView } from '../../../stores/library'
import {
  createLibraryRestoreQueue,
  normalizeLibraryURL,
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
    mediaUrl: null,
    thumbnailUrl: null,
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
    tags: [],
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
    resourceKind: ResourceKind.ResourceKindFile,
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
    expect(normalizeLibraryURL(' https://example.com/new ')).toBe('https://example.com/new')
    expect(normalizeLibraryURL('file:///tmp/new')).toBeNull()
    expect(normalizeLibraryURL('not a URL')).toBeNull()
  })

  it('逐项替换，失败后继续保存其他项', async () => {
    const items = [
      { ...queueItem('first', 'file'), replacementLocation: '/new/file.txt' },
      queueItem('second', 'url'),
      { ...queueItem('third', 'file'), replacementLocation: '/new/third.txt' }
    ]
    const replaceFileSource = vi.fn(async () => undefined)
    const failure = new Error('replace failed')
    const replaceURLSource = vi.fn(async () => {
      throw failure
    })
    const replaceScannedFileSource = vi.fn(async () => undefined)
    const result = await restoreLibraryQueue(items, { replaceFileSource, replaceScannedFileSource, replaceURLSource })
    expect(replaceFileSource).toHaveBeenCalledTimes(2)
    expect(replaceFileSource).toHaveBeenCalledWith('source-first', '/new/file.txt')
    expect(result.completedIds).toEqual(['first', 'third'])
    expect(result.failures).toEqual([{ item: items[1], cause: failure }])
  })
})
