// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import {
  createPreviewSession,
  type PreviewRendererPort,
  type PreviewTextResponse,
  type RawPreviewMarkdownNode
} from '../previewSession'

function fileSource(overrides: Partial<ResourceSourceView> = {}): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'file',
    location: '/tmp/a.txt',
    available: true,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: '/resource-media/source-1',
    thumbnailUrl: null,
    metadata: null,
    ...overrides
  }
}

function resourceOf(preferred: ResourceSourceView, kind: ResourceKind, id = 'resource-1'): ResourceView {
  return {
    id,
    title: '预览目标',
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: [preferred],
    preferred,
    tags: [],
    tagNames: [],
    available: preferred.available,
    kind,
    sizeBytes: 1024
  }
}

function textResponse(content: string, status = 200): PreviewTextResponse {
  const bytes = new TextEncoder().encode(content)
  return {
    ok: status >= 200 && status < 300,
    status,
    body: null,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function flush(): Promise<void> {
  await Promise.resolve()
  await nextTick()
  await new Promise<void>(resolve => setImmediate(resolve))
  await nextTick()
}

describe('createPreviewSession', () => {
  it('open 为 false 时保持 closed 且不触发 fetch，关闭时取消在途请求', async () => {
    const signals: AbortSignal[] = []
    const fetchText = vi.fn<(url: string, signal: AbortSignal) => Promise<PreviewTextResponse>>((_url, signal) => {
      signals.push(signal)
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    })
    const open = ref(false)
    const resource = ref<ResourceView | null>(resourceOf(fileSource(), ResourceKind.ResourceKindDocument))
    const session = createPreviewSession({ open: () => open.value, resource: () => resource.value }, { fetchText })

    try {
      expect(session.state.value).toEqual({ kind: 'closed' })
      expect(fetchText).not.toHaveBeenCalled()

      open.value = true
      await nextTick()
      expect(fetchText).toHaveBeenCalledTimes(1)
      expect(session.state.value).toEqual({ kind: 'text', status: 'loading' })
      expect(signals[0]?.aborted).toBe(false)

      open.value = false
      await nextTick()
      expect(signals[0]?.aborted).toBe(true)
      expect(session.state.value).toEqual({ kind: 'closed' })
    } finally {
      session.dispose()
    }
  })

  it('url 模式同 source.id 经 ReplaceSource 替换 location 时重建 mediaKey 与 src', async () => {
    const resource = ref<ResourceView | null>(
      resourceOf(
        fileSource({ id: 'src-url', type: 'url', location: 'https://example.com/v1', mediaUrl: null }),
        ResourceKind.ResourceKindWeb
      )
    )
    const session = createPreviewSession({ open: () => true, resource: () => resource.value })

    try {
      expect(session.state.value).toEqual({
        kind: 'url',
        mediaKey: 'src-url|https://example.com/v1',
        src: 'https://example.com/v1',
        status: 'loading'
      })
      session.onMediaLoaded('src-url|https://example.com/v1')
      expect(session.state.value).toMatchObject({ kind: 'url', status: 'ready' })

      resource.value = resourceOf(
        fileSource({ id: 'src-url', type: 'url', location: 'https://example.com/v2', mediaUrl: null }),
        ResourceKind.ResourceKindWeb
      )
      await nextTick()

      expect(session.state.value).toEqual({
        kind: 'url',
        mediaKey: 'src-url|https://example.com/v2',
        src: 'https://example.com/v2',
        status: 'loading'
      })
      // 迟到的旧 mediaKey 事件必须被丢弃。
      session.onMediaLoaded('src-url|https://example.com/v1')
      expect(session.state.value).toMatchObject({ kind: 'url', status: 'loading' })
    } finally {
      session.dispose()
    }
  })

  it('快切文档时仅保留最新代次解析结果，避免旧解析乱序覆盖', async () => {
    const firstParse = createDeferred<{ nodes: RawPreviewMarkdownNode[] }>()
    const secondParse = createDeferred<{ nodes: RawPreviewMarkdownNode[] }>()
    let call = 0
    const renderer: PreviewRendererPort = {
      parseMarkdown: vi.fn<PreviewRendererPort['parseMarkdown']>(() => {
        call += 1
        return call === 1 ? firstParse.promise : secondParse.promise
      }),
      highlightCode: vi.fn<PreviewRendererPort['highlightCode']>(async code => code)
    }
    const fetchText = vi.fn<(url: string, signal: AbortSignal) => Promise<PreviewTextResponse>>(async url =>
      textResponse(`# ${url}`)
    )

    const resource = ref<ResourceView | null>(
      resourceOf(fileSource({ id: 's1', location: '/tmp/1.md', mediaUrl: '/m/1' }), ResourceKind.ResourceKindDocument)
    )
    const session = createPreviewSession({ open: () => true, resource: () => resource.value }, { fetchText, renderer })

    try {
      await flush()
      // fetch 已完成但 parse 未完成，状态仍停在 loading（不闪烁空白）。
      expect(session.state.value).toEqual({ kind: 'markdown', status: 'loading' })

      resource.value = resourceOf(
        fileSource({ id: 's2', location: '/tmp/2.md', mediaUrl: '/m/2' }),
        ResourceKind.ResourceKindDocument,
        'resource-2'
      )
      await flush()

      secondParse.resolve({ nodes: [{ label: 'h1', content: '新标题' }] })
      await flush()
      expect(session.state.value).toMatchObject({
        kind: 'markdown',
        status: 'ready',
        nodes: [{ label: 'h1', html: '新标题' }]
      })

      // 迟到的旧文档解析不得覆盖新结果。
      firstParse.resolve({ nodes: [{ label: 'h1', content: '旧标题' }] })
      await flush()
      expect(session.state.value).toMatchObject({
        kind: 'markdown',
        status: 'ready',
        nodes: [{ label: 'h1', html: '新标题' }]
      })
    } finally {
      session.dispose()
    }
  })

  it('Markdown 一次性清洗剔除 XSS 与 img mailto，并支持失败后重开恢复', async () => {
    let shouldFail = true
    const renderer: PreviewRendererPort = {
      parseMarkdown: vi.fn<PreviewRendererPort['parseMarkdown']>(async () => {
        if (shouldFail) throw new Error('chunk load failed')
        return {
          nodes: [
            { label: 'p', content: '<strong>ok</strong><script>alert(1)</script><img src="mailto:a@b.c">' },
            { label: 'img', src: 'mailto:a@b.c', alt: 'bad' },
            { label: 'img', src: 'https://example.com/ok.png', alt: 'ok' }
          ]
        }
      }),
      highlightCode: vi.fn<PreviewRendererPort['highlightCode']>(async code => code)
    }
    const open = ref(true)
    const resource = ref<ResourceView | null>(
      resourceOf(fileSource({ location: '/tmp/doc.md' }), ResourceKind.ResourceKindDocument)
    )
    const session = createPreviewSession(
      { open: () => open.value, resource: () => resource.value },
      { fetchText: async () => textResponse('# doc'), renderer }
    )

    try {
      await flush()
      expect(session.state.value).toMatchObject({ kind: 'markdown', status: 'failed', fallbackText: '# doc' })

      shouldFail = false
      open.value = false
      await nextTick()
      open.value = true
      await flush()

      expect(session.state.value).toMatchObject({
        kind: 'markdown',
        status: 'ready',
        nodes: [
          { label: 'p', html: '<strong>ok</strong>alert(1)' },
          { label: 'img', src: 'https://example.com/ok.png', alt: 'ok' }
        ]
      })
    } finally {
      session.dispose()
    }
  })

  it('代码预览超过字节/行数阈值或着色失败时降级纯文本不留白', async () => {
    const highlightCode = vi.fn<PreviewRendererPort['highlightCode']>(async () => '<pre>highlighted</pre>')
    const resource = ref<ResourceView | null>(
      resourceOf(fileSource({ location: '/tmp/big.ts' }), ResourceKind.ResourceKindDocument)
    )
    const session = createPreviewSession(
      { open: () => true, resource: () => resource.value },
      {
        fetchText: async () => textResponse('1234567890'),
        renderer: { parseMarkdown: async () => ({ nodes: [] }), highlightCode },
        limits: { highlightByteLimit: 5 }
      }
    )

    try {
      await flush()
      expect(highlightCode).not.toHaveBeenCalled()
      expect(session.state.value).toMatchObject({
        kind: 'code',
        status: 'ready',
        code: '1234567890',
        highlightedHtml: null,
        overHighlightLimit: true
      })
    } finally {
      session.dispose()
    }

    const failingHighlight = vi.fn<PreviewRendererPort['highlightCode']>(async () => {
      throw new Error('shiki failed')
    })
    const session2 = createPreviewSession(
      { open: () => true, resource: () => resource.value },
      {
        fetchText: async () => textResponse('const x = 1'),
        renderer: { parseMarkdown: async () => ({ nodes: [] }), highlightCode: failingHighlight }
      }
    )
    try {
      await flush()
      expect(failingHighlight).toHaveBeenCalledWith('const x = 1', 'ts')
      expect(session2.state.value).toMatchObject({
        kind: 'code',
        status: 'ready',
        code: 'const x = 1',
        highlightedHtml: null,
        overHighlightLimit: false
      })
    } finally {
      session2.dispose()
    }
  })

  it('openMarkdownLink 二次白名单校验，拦截危险协议，放行 https/mailto', () => {
    const openExternal = vi.fn<(target: string) => Promise<void>>(async () => {})
    const session = createPreviewSession({ open: () => false, resource: () => null }, { openExternal })

    try {
      session.openMarkdownLink('javascript:alert(1)')
      session.openMarkdownLink('file:///etc/passwd')
      session.openMarkdownLink('/relative')
      expect(openExternal).not.toHaveBeenCalled()

      session.openMarkdownLink('https://example.com/ok')
      session.openMarkdownLink('mailto:a@b.c')
      expect(openExternal).toHaveBeenNthCalledWith(1, 'https://example.com/ok')
      expect(openExternal).toHaveBeenNthCalledWith(2, 'mailto:a@b.c')
    } finally {
      session.dispose()
    }
  })

  it('媒体状态支持 video 竖屏元信息与错误状态，并丢弃迟到 mediaKey 回调', async () => {
    const resource = ref<ResourceView | null>(
      resourceOf(fileSource({ id: 'v1', location: '/tmp/v.mp4', mediaUrl: '/m/v1' }), ResourceKind.ResourceKindVideo)
    )
    const session = createPreviewSession({ open: () => true, resource: () => resource.value })

    try {
      expect(session.state.value).toEqual({
        kind: 'video',
        mediaKey: 'v1|/m/v1',
        src: '/m/v1',
        status: 'loading',
        portrait: false
      })
      session.onVideoMetadata('wrong-key', 100, 200)
      expect(session.state.value).toMatchObject({ portrait: false })

      session.onVideoMetadata('v1|/m/v1', 100, 200)
      session.onMediaLoaded('v1|/m/v1')
      expect(session.state.value).toMatchObject({ status: 'ready', portrait: true })

      session.onMediaError('wrong-key')
      expect(session.state.value).toMatchObject({ status: 'ready' })

      session.onMediaError('v1|/m/v1')
      expect(session.state.value).toMatchObject({ status: 'failed' })
    } finally {
      session.dispose()
    }
  })
})
