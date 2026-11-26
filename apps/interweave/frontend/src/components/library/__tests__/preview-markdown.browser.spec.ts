import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import PreviewCode from '../PreviewCode.vue'
import PreviewMarkdown from '../PreviewMarkdown.vue'
import { createPreviewSession, type PreviewTextResponse } from '../previewSession'

/*
 * markdown / 代码预览渲染管线的浏览器冒烟：经真实 createPreviewSession +
 * createDefaultPreviewRenderer（@greypan/md-to-meta/runtime、shiki wasm）在 Chromium 里出结果。
 */

async function waitFor(condition: () => boolean, message: string) {
  const deadline = performance.now() + 10_000
  while (performance.now() < deadline) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(message)
}

function resourceForFile(location: string): ResourceView {
  const preferred: ResourceSourceView = {
    id: 'source-1',
    type: 'file',
    location,
    available: true,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: '/resource-media/source-1',
    thumbnailUrl: null,
    metadata: null
  }
  return {
    id: 'resource-1',
    title: '预览目标',
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources: [preferred],
    preferred,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindDocument,
    sizeBytes: 1024
  }
}

function textResponse(content: string): PreviewTextResponse {
  const bytes = new TextEncoder().encode(content)
  return {
    ok: true,
    status: 200,
    body: null,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }
}

function mountMarkdownSession(markdown: string, openExternal: (target: string) => Promise<void>) {
  const host = document.createElement('div')
  document.body.append(host)
  const session = createPreviewSession(
    { open: () => true, resource: () => resourceForFile('/tmp/doc.md') },
    { fetchText: async () => textResponse(markdown), openExternal }
  )
  const app = createApp({
    setup() {
      return () =>
        session.state.value.kind === 'markdown' && session.state.value.status === 'ready'
          ? h(PreviewMarkdown, {
              nodes: session.state.value.nodes,
              openLink: session.openMarkdownLink
            })
          : null
    }
  })
  app.mount(host)
  return {
    host,
    unmount: () => {
      app.unmount()
      session.dispose()
      host.remove()
    }
  }
}

function mountCodeSession(code: string, location = '/tmp/sample.ts') {
  const host = document.createElement('div')
  document.body.append(host)
  const session = createPreviewSession(
    { open: () => true, resource: () => resourceForFile(location) },
    { fetchText: async () => textResponse(code) }
  )
  const app = createApp({
    setup() {
      return () =>
        session.state.value.kind === 'code' && session.state.value.status === 'ready'
          ? h(PreviewCode, {
              code: session.state.value.code,
              highlightedHtml: session.state.value.highlightedHtml,
              overHighlightLimit: session.state.value.overHighlightLimit
            })
          : null
    }
  })
  app.mount(host)
  return {
    host,
    unmount: () => {
      app.unmount()
      session.dispose()
      host.remove()
    }
  }
}

const SAMPLE = [
  '# 设计规范',
  '',
  '这是一段**加粗**与 `code` 文本。',
  '',
  '```ts',
  'const answer = 42;',
  '```',
  '',
  '- 列表项一',
  '- 列表项二',
  '',
  '[外链](https://example.com/ok) [相对](./x.md) [危险](javascript:alert(1))'
].join('\n')

describe('PreviewMarkdown（浏览器）', () => {
  it('按文档渲染标题、列表、着色代码与行内样式，链接改写并拦截，危险/相对目标判死', async () => {
    const openExternal = vi.fn<(target: string) => Promise<void>>(() => Promise.resolve())
    const mounted = mountMarkdownSession(SAMPLE, openExternal)
    try {
      await waitFor(() => {
        const root = mounted.host.querySelector('[data-preview-markdown]')
        return !!root && root.querySelectorAll('.mdm-heading').length > 0
      }, 'markdown 未渲染')

      const root = mounted.host.querySelector('[data-preview-markdown]')!
      expect(root.querySelector('h1.mdm-heading')?.textContent).toBe('设计规范')
      expect(root.querySelector('strong')).toBeTruthy()
      expect(root.querySelectorAll('li').length).toBe(2)

      // 代码块：runtime 管线（shiki 双主题 + 行号），md-to-meta 的 codeblock content 是可信产物。
      const pre = root.querySelector('pre')
      expect(pre?.innerHTML).toContain('--shiki-light')

      const live = root.querySelector<HTMLAnchorElement>('a[data-md-href]')
      expect(live?.getAttribute('data-md-href')).toBe('https://example.com/ok')
      expect(root.querySelectorAll('a[data-md-link-dead]').length).toBe(2)

      // 点击活链接：默认被拦截，交 openExternal，不让 WebView 导航。
      live!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await nextTick()
      expect(openExternal).toHaveBeenCalledWith('https://example.com/ok')
    } finally {
      mounted.unmount()
    }
  })

  it('raw HTML 自带的 data-md-href 不产生可点外链，点击不触发 openExternal', async () => {
    const openExternal = vi.fn<(target: string) => Promise<void>>(() => Promise.resolve())
    const hostile = '前文\n\n<a data-md-href="file:///etc/passwd">\n点我\n</a>\n'
    const mounted = mountMarkdownSession(hostile, openExternal)
    try {
      await waitFor(() => !!mounted.host.querySelector('[data-preview-markdown] a'), '链接未渲染')
      const anchors = [...mounted.host.querySelectorAll('[data-preview-markdown] a')]
      expect(anchors.filter(a => a.hasAttribute('data-md-href'))).toEqual([])
      anchors[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await nextTick()
      expect(openExternal).not.toHaveBeenCalled()
    } finally {
      mounted.unmount()
    }
  })
})

describe('PreviewCode（浏览器）', () => {
  it('白名单语言经 shiki 着色输出双主题与行号', async () => {
    const mounted = mountCodeSession('const answer = 42;\n', '/tmp/sample.ts')
    try {
      await waitFor(() => {
        const code = mounted.host.querySelector('[data-code]')
        return !!code && code.innerHTML.includes('--shiki-light')
      }, '代码未着色')
      const html = mounted.host.querySelector('[data-code]')!.innerHTML
      expect(html).toContain('--shiki-dark')
      expect(html).toContain('mdm-code')
    } finally {
      mounted.unmount()
    }
  })

  it('超过输入上限退回纯文本并提示，不进着色器', async () => {
    const big = Array.from({ length: 5200 }, (_, index) => `const value${index} = ${index};`).join('\n')
    const mounted = mountCodeSession(big, '/tmp/big.ts')
    try {
      await waitFor(() => mounted.host.textContent?.includes('文件过大') ?? false, '未出现纯文本提示')
      expect(mounted.host.querySelector('[data-code]')).toBeNull()
      expect(mounted.host.querySelector('pre')).toBeTruthy()
    } finally {
      mounted.unmount()
    }
  })
})
