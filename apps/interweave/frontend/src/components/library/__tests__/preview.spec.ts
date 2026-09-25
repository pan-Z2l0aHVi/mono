import { describe, expect, it, vi } from 'vite-plus/test'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView, ResourceView } from '../../../stores/library'
import { readTextPreview, resolvePreviewTarget, type TextPreviewBody } from '../preview'

function source(overrides: Partial<ResourceSourceView> = {}): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'file',
    location: '/tmp/photo.jpg',
    available: true,
    isPreferred: true,
    orderIndex: 0,
    metadata: null,
    ...overrides
  }
}

function resource(overrides: Partial<ResourceView> = {}): ResourceView {
  const preferred = overrides.preferred === undefined ? source() : overrides.preferred
  return {
    id: 'resource-1',
    title: '资源',
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: preferred ? [preferred] : [],
    preferred,
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 1024,
    ...overrides
  }
}

function mediaUrlFor(sourceId: string) {
  return `/resource-media/${sourceId}`
}

function streamResponse(chunks: Uint8Array[]): TextPreviewBody & { cancelled: () => boolean } {
  let index = 0
  let cancelled = false
  return {
    cancelled: () => cancelled,
    body: {
      getReader: () => ({
        read: async () => (index < chunks.length ? { done: false, value: chunks[index++] } : { done: true }),
        cancel: async () => {
          cancelled = true
        }
      })
    },
    arrayBuffer: async () => new ArrayBuffer(0)
  }
}

describe('resolvePreviewTarget', () => {
  it('图片与视频按 kind 直连媒体端点并保留系统外跳目标', () => {
    expect(
      resolvePreviewTarget(
        resource({ kind: ResourceKind.ResourceKindImage, preferred: source({ location: '/tmp/a.png' }) }),
        mediaUrlFor
      )
    ).toMatchObject({ mode: 'image', mediaUrl: '/resource-media/source-1', externalTarget: '/tmp/a.png' })

    expect(
      resolvePreviewTarget(
        resource({ kind: ResourceKind.ResourceKindVideo, preferred: source({ location: '/tmp/a.mp4' }) }),
        mediaUrlFor
      )
    ).toMatchObject({ mode: 'video', mediaUrl: '/resource-media/source-1', externalTarget: '/tmp/a.mp4' })
  })

  it('文本类扩展名走 text，pdf 等二进制文档落到 unsupported 且仍可外跳', () => {
    const textExtensions = ['md', 'txt', 'csv', 'json', 'jsonl', 'yaml', 'xml', 'tex', 'html']
    const modes = Object.fromEntries(
      textExtensions.map(extension => [
        extension,
        resolvePreviewTarget(
          resource({
            kind: ResourceKind.ResourceKindDocument,
            preferred: source({ location: `/tmp/a.${extension}` })
          }),
          mediaUrlFor
        ).mode
      ])
    )
    expect(modes).toEqual(Object.fromEntries(textExtensions.map(extension => [extension, 'text'])))

    expect(
      resolvePreviewTarget(
        resource({ kind: ResourceKind.ResourceKindDocument, preferred: source({ location: '/tmp/a.pdf' }) }),
        mediaUrlFor
      )
    ).toMatchObject({ mode: 'empty', emptyReason: 'unsupported-kind', externalTarget: '/tmp/a.pdf' })
  })

  it('未知扩展名的 file 资源不会因为 mime 猜测而进入文本预览', () => {
    expect(
      resolvePreviewTarget(
        resource({ kind: ResourceKind.ResourceKindFile, preferred: source({ location: '/tmp/a.bin' }) }),
        mediaUrlFor
      )
    ).toMatchObject({ mode: 'empty', emptyReason: 'unsupported-kind' })
  })

  it('URL 来源交给 iframe 直连原始地址，不读媒体端点', () => {
    const urlSource = source({ id: 'source-url', type: 'url', location: 'https://example.com/a' })
    const urlResource = resource({
      kind: ResourceKind.ResourceKindWeb,
      preferred: urlSource,
      sources: [urlSource]
    })
    const mediaUrlSpy = vi.fn<(sourceId: string) => string | null>(mediaUrlFor)

    expect(resolvePreviewTarget(urlResource, mediaUrlSpy)).toMatchObject({
      mode: 'url',
      mediaUrl: null,
      externalTarget: 'https://example.com/a'
    })
    expect(mediaUrlSpy).not.toHaveBeenCalled()
  })

  it('失效来源、缺来源与缺 runtime 各自给出可区分的空态', () => {
    const broken = source({ available: false })
    const brokenResource = resource({ preferred: broken, sources: [broken], available: false })
    expect(resolvePreviewTarget(brokenResource, mediaUrlFor)).toMatchObject({
      mode: 'empty',
      emptyReason: 'source-unavailable',
      externalTarget: null
    })

    expect(resolvePreviewTarget(null, mediaUrlFor)).toMatchObject({
      mode: 'empty',
      emptyReason: 'no-source',
      source: null
    })

    const orphanResource = resource({ preferred: null, sources: [] })
    expect(resolvePreviewTarget(orphanResource, mediaUrlFor)).toMatchObject({
      mode: 'empty',
      emptyReason: 'no-source'
    })

    expect(resolvePreviewTarget(resource(), () => null)).toMatchObject({
      mode: 'empty',
      emptyReason: 'media-unavailable',
      externalTarget: '/tmp/photo.jpg'
    })
  })

  it('URL 来源地址为空时不做外跳', () => {
    const urlSource = source({ type: 'url', location: '' })
    const urlResource = resource({ preferred: urlSource, sources: [urlSource] })
    expect(resolvePreviewTarget(urlResource, mediaUrlFor)).toMatchObject({
      mode: 'empty',
      emptyReason: 'empty-location',
      externalTarget: null
    })
  })
})

describe('readTextPreview', () => {
  it('未超限时完整解码并标记未截断', async () => {
    const response = streamResponse([new TextEncoder().encode('hello '), new TextEncoder().encode('world')])
    await expect(readTextPreview(response, 64)).resolves.toEqual({
      text: 'hello world',
      truncated: false,
      byteLength: 11
    })
    expect(response.cancelled()).toBe(false)
  })

  it('超过上限时截断到边界并取消剩余读取', async () => {
    const response = streamResponse([new TextEncoder().encode('abcdefghij'), new TextEncoder().encode('KLMNOPQRST')])
    await expect(readTextPreview(response, 12)).resolves.toEqual({
      text: 'abcdefghijKL',
      truncated: true,
      byteLength: 12
    })
    expect(response.cancelled()).toBe(true)
  })

  it('内容恰好等于上限时不算截断', async () => {
    const response = streamResponse([new TextEncoder().encode('12345678')])
    await expect(readTextPreview(response, 8)).resolves.toMatchObject({ text: '12345678', truncated: false })
    expect(response.cancelled()).toBe(false)
  })

  it('无流式 body 时退化为一次性读取并本地截断', async () => {
    const bytes = new TextEncoder().encode('abcdefghij')
    const response: TextPreviewBody = {
      body: null,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    }
    await expect(readTextPreview(response, 4)).resolves.toEqual({ text: 'abcd', truncated: true, byteLength: 4 })
  })

  it('reader 提前结束不会把剩余内存读空', async () => {
    const read = vi.fn<() => Promise<{ done: boolean; value?: Uint8Array }>>(async () => ({ done: true }))
    const response: TextPreviewBody = {
      body: { getReader: () => ({ read, cancel: async () => {} }) },
      arrayBuffer: async () => new ArrayBuffer(0)
    }
    await expect(readTextPreview(response, 1024)).resolves.toEqual({ text: '', truncated: false, byteLength: 0 })
    expect(read).toHaveBeenCalledOnce()
  })
})
