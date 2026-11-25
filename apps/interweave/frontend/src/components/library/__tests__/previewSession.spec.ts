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

function resourceOf(preferred: ResourceSourceView | null, kind: ResourceKind, id = 'resource-1'): ResourceView {
  return {
    id,
    title: '预览目标',
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: preferred ? [preferred] : [],
    preferred,
    tags: [],
    tagNames: [],
    available: preferred?.available ?? false,
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

  it('同资源 empty -> empty 切换与本地 file 来源 ReplaceSource 均能触发刷新', async () => {
    // 1. empty -> empty: source-unavailable -> no-source -> 另一个失效来源
    const missingA = fileSource({ id: 'missing-a', available: false, mediaUrl: null })
    const missingB = fileSource({ id: 'missing-b', available: false, mediaUrl: null })
    const emptyResource = ref<ResourceView | null>(resourceOf(missingA, ResourceKind.ResourceKindDocument))
    const emptySession = createPreviewSession({ open: () => true, resource: () => emptyResource.value })

    try {
      expect(emptySession.state.value).toMatchObject({
        kind: 'empty',
        reason: 'source-unavailable',
        canRecover: true,
        source: missingA
      })

      emptyResource.value = resourceOf(null, ResourceKind.ResourceKindDocument)
      await nextTick()
      expect(emptySession.state.value).toMatchObject({
        kind: 'empty',
        reason: 'no-source',
        canRecover: false,
        source: null
      })

      emptyResource.value = resourceOf(missingB, ResourceKind.ResourceKindDocument)
      await nextTick()
      expect(emptySession.state.value).toMatchObject({
        kind: 'empty',
        reason: 'source-unavailable',
        canRecover: true,
        source: missingB
      })
    } finally {
      emptySession.dispose()
    }

    // 2. 本地 file code 来源 ReplaceSource（保留 source.id 与 mediaUrl，仅改 location）刷新语言与内容
    let fetchCount = 0
    const highlightCode = vi.fn<PreviewRendererPort['highlightCode']>(async (_code, lang) => `<pre>${lang}</pre>`)
    const fetchText = vi.fn<(url: string, signal: AbortSignal) => Promise<PreviewTextResponse>>(async () => {
      fetchCount += 1
      return textResponse(fetchCount === 1 ? 'const a = 1' : 'print(1)')
    })
    const codeResource = ref<ResourceView | null>(
      resourceOf(
        fileSource({ id: 'src-file', location: '/tmp/a.ts', mediaUrl: '/resource-media/src-file' }),
        ResourceKind.ResourceKindDocument
      )
    )
    const codeSession = createPreviewSession(
      { open: () => true, resource: () => codeResource.value },
      { fetchText, renderer: { parseMarkdown: async () => ({ nodes: [] }), highlightCode } }
    )

    try {
      await flush()
      expect(highlightCode).toHaveBeenLastCalledWith('const a = 1', 'ts')
      expect(codeSession.state.value).toMatchObject({ kind: 'code', status: 'ready', highlightedHtml: '<pre>ts</pre>' })

      codeResource.value = resourceOf(
        fileSource({ id: 'src-file', location: '/tmp/b.py', mediaUrl: '/resource-media/src-file' }),
        ResourceKind.ResourceKindDocument
      )
      await flush()
      expect(fetchText).toHaveBeenCalledTimes(2)
      expect(highlightCode).toHaveBeenLastCalledWith('print(1)', 'python')
      expect(codeSession.state.value).toMatchObject({
        kind: 'code',
        status: 'ready',
        highlightedHtml: '<pre>python</pre>'
      })
    } finally {
      codeSession.dispose()
    }

    // 3. 本地 file image 来源 ReplaceSource 仅改 location 时重建 mediaKey 并回到 loading
    const imageResource = ref<ResourceView | null>(
      resourceOf(
        fileSource({ id: 'src-img', location: '/tmp/a.png', mediaUrl: '/resource-media/src-img' }),
        ResourceKind.ResourceKindImage
      )
    )
    const imageSession = createPreviewSession({ open: () => true, resource: () => imageResource.value })
    try {
      expect(imageSession.state.value).toEqual({
        kind: 'image',
        mediaKey: 'src-img|/resource-media/src-img|/tmp/a.png',
        src: '/resource-media/src-img',
        status: 'loading'
      })
      imageSession.onMediaLoaded('src-img|/resource-media/src-img|/tmp/a.png')
      expect(imageSession.state.value).toMatchObject({ status: 'ready' })

      imageResource.value = resourceOf(
        fileSource({ id: 'src-img', location: '/tmp/b.png', mediaUrl: '/resource-media/src-img' }),
        ResourceKind.ResourceKindImage
      )
      await nextTick()
      expect(imageSession.state.value).toEqual({
        kind: 'image',
        mediaKey: 'src-img|/resource-media/src-img|/tmp/b.png',
        src: '/resource-media/src-img',
        status: 'loading'
      })
    } finally {
      imageSession.dispose()
    }
  })

  it('text 模式支持 ready、截断提示以及非 2xx 与网络错误失败态', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const resource = ref<ResourceView | null>(
      resourceOf(fileSource({ id: 'txt-1', location: '/tmp/note.txt' }), ResourceKind.ResourceKindDocument)
    )

    // 正常 ready
    const readySession = createPreviewSession(
      { open: () => true, resource: () => resource.value },
      { fetchText: async () => textResponse('hello world'), limits: { textByteLimit: 100 } }
    )
    try {
      await flush()
      expect(readySession.state.value).toEqual({
        kind: 'text',
        status: 'ready',
        text: 'hello world',
        truncated: false,
        notice: '部分文件的文字可能无法正常显示。'
      })
    } finally {
      readySession.dispose()
    }

    // 超限截断
    const truncatedSession = createPreviewSession(
      { open: () => true, resource: () => resource.value },
      { fetchText: async () => textResponse('abcdefghij'), limits: { textByteLimit: 4 } }
    )
    try {
      await flush()
      expect(truncatedSession.state.value).toEqual({
        kind: 'text',
        status: 'ready',
        text: 'abcd',
        truncated: true,
        notice: '文件过大，仅显示开头部分。部分文件的文字可能无法正常显示。'
      })
    } finally {
      truncatedSession.dispose()
    }

    // 非 2xx
    const notFoundSession = createPreviewSession(
      { open: () => true, resource: () => resource.value },
      { fetchText: async () => textResponse('missing', 404) }
    )
    try {
      await flush()
      expect(notFoundSession.state.value).toEqual({
        kind: 'text',
        status: 'failed',
        error: '无法读取文件，请检查文件是否还在原处'
      })
    } finally {
      notFoundSession.dispose()
    }

    // 网络异常
    const networkErrSession = createPreviewSession(
      { open: () => true, resource: () => resource.value },
      { fetchText: async () => Promise.reject(new TypeError('network down')) }
    )
    try {
      await flush()
      expect(networkErrSession.state.value).toEqual({
        kind: 'text',
        status: 'failed',
        error: '无法读取文件，请检查文件是否还在原处'
      })
    } finally {
      networkErrSession.dispose()
      errorSpy.mockRestore()
    }
  })

  it('覆盖全部 5 种 emptyReason 与 canRecover 判定', async () => {
    const cases: Array<{
      resource: ResourceView
      reason: 'no-source' | 'empty-location' | 'source-unavailable' | 'media-unavailable' | 'unsupported-kind'
      canRecover: boolean
    }> = [
      {
        resource: resourceOf(null, ResourceKind.ResourceKindDocument),
        reason: 'no-source',
        canRecover: false
      },
      {
        resource: resourceOf(fileSource({ type: 'url', location: '', mediaUrl: null }), ResourceKind.ResourceKindWeb),
        reason: 'empty-location',
        canRecover: false
      },
      {
        resource: resourceOf(fileSource({ available: false, mediaUrl: null }), ResourceKind.ResourceKindImage),
        reason: 'source-unavailable',
        canRecover: true
      },
      {
        resource: resourceOf(fileSource({ available: true, mediaUrl: null }), ResourceKind.ResourceKindImage),
        reason: 'media-unavailable',
        canRecover: false
      },
      {
        resource: resourceOf(
          fileSource({ available: true, location: '/tmp/archive.zip' }),
          ResourceKind.ResourceKindFile
        ),
        reason: 'unsupported-kind',
        canRecover: false
      }
    ]

    for (const item of cases) {
      const session = createPreviewSession({ open: () => true, resource: () => item.resource })
      try {
        expect(session.state.value).toMatchObject({
          kind: 'empty',
          reason: item.reason,
          canRecover: item.canRecover
        })
      } finally {
        session.dispose()
      }
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

  it('dispose 中止在途 fetch、丢弃滞后解析/着色并停止 effectScope', async () => {
    // 1. 中止 fetchText 且停止 scope 响应
    const capturedSignals: AbortSignal[] = []
    const fetchText = vi.fn<(url: string, signal: AbortSignal) => Promise<PreviewTextResponse>>((_url, signal) => {
      capturedSignals.push(signal)
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    })
    const resource = ref<ResourceView | null>(
      resourceOf(fileSource({ id: 'd1', location: '/tmp/a.txt' }), ResourceKind.ResourceKindDocument)
    )
    const session1 = createPreviewSession({ open: () => true, resource: () => resource.value }, { fetchText })
    expect(fetchText).toHaveBeenCalledTimes(1)
    expect(capturedSignals[0]?.aborted).toBe(false)

    session1.dispose()
    expect(capturedSignals[0]?.aborted).toBe(true)

    resource.value = resourceOf(
      fileSource({ id: 'd2', location: '/tmp/b.txt', mediaUrl: '/m/b' }),
      ResourceKind.ResourceKindDocument,
      'resource-2'
    )
    await nextTick()
    expect(fetchText).toHaveBeenCalledTimes(1)

    // 2. 丢弃在途 parseMarkdown 与 highlightCode 滞后回写
    const pendingParse = createDeferred<{ nodes: RawPreviewMarkdownNode[] }>()
    const pendingHighlight = createDeferred<string>()
    const mdSession = createPreviewSession(
      {
        open: () => true,
        resource: () => resourceOf(fileSource({ location: '/tmp/a.md' }), ResourceKind.ResourceKindDocument)
      },
      {
        fetchText: async () => textResponse('# hi'),
        renderer: { parseMarkdown: () => pendingParse.promise, highlightCode: async c => c }
      }
    )
    await flush()
    expect(mdSession.state.value).toEqual({ kind: 'markdown', status: 'loading' })
    mdSession.dispose()
    pendingParse.resolve({ nodes: [{ label: 'h1', content: 'stale' }] })
    await flush()
    expect(mdSession.state.value).toEqual({ kind: 'markdown', status: 'loading' })

    const codeSession = createPreviewSession(
      {
        open: () => true,
        resource: () => resourceOf(fileSource({ location: '/tmp/a.ts' }), ResourceKind.ResourceKindDocument)
      },
      {
        fetchText: async () => textResponse('const x = 1'),
        renderer: { parseMarkdown: async () => ({ nodes: [] }), highlightCode: () => pendingHighlight.promise }
      }
    )
    await flush()
    expect(codeSession.state.value).toEqual({ kind: 'code', status: 'loading' })
    codeSession.dispose()
    pendingHighlight.resolve('<pre>stale</pre>')
    await flush()
    expect(codeSession.state.value).toEqual({ kind: 'code', status: 'loading' })
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
        mediaKey: 'v1|/m/v1|/tmp/v.mp4',
        src: '/m/v1',
        status: 'loading',
        portrait: false
      })
      session.onVideoMetadata('wrong-key', 100, 200)
      expect(session.state.value).toMatchObject({ portrait: false })

      session.onVideoMetadata('v1|/m/v1|/tmp/v.mp4', 100, 200)
      session.onMediaLoaded('v1|/m/v1|/tmp/v.mp4')
      expect(session.state.value).toMatchObject({ status: 'ready', portrait: true })

      session.onMediaError('wrong-key')
      expect(session.state.value).toMatchObject({ status: 'ready' })

      session.onMediaError('v1|/m/v1|/tmp/v.mp4')
      expect(session.state.value).toMatchObject({ status: 'failed' })
    } finally {
      session.dispose()
    }
  })
})
