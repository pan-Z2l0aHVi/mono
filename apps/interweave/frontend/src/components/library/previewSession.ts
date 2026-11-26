import { computed, effectScope, ref, watch, type ComputedRef } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { allowedImageTarget, allowedLinkTarget, sanitizeInlineHtml } from './markdown-html'
import {
  readTextPreview,
  resolvePreviewTarget,
  TEXT_PREVIEW_BYTE_LIMIT,
  type PreviewEmptyReason,
  type PreviewMode,
  type TextPreviewBody
} from './preview'
import { createDefaultPreviewRenderer, type PreviewRendererPort, type RawPreviewMarkdownNode } from './previewRuntime'

export type { PreviewRendererPort, RawPreviewMarkdownNode } from './previewRuntime'

export type SafeMarkdownNode =
  | { label: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; id?: string; html: string }
  | { label: 'p' | 'th' | 'td'; html: string }
  | { label: 'ul' | 'ol' | 'blockquote' | 'table' | 'tr'; children: SafeMarkdownNode[] }
  | { label: 'li'; html?: string; children?: SafeMarkdownNode[] }
  | { label: 'hr' }
  | { label: 'img'; src: string; alt: string }
  | { label: 'codeblock'; html: string }

export type PreviewState =
  | { kind: 'closed' }
  | {
      kind: 'empty'
      reason: PreviewEmptyReason
      title: string
      description: string
      source: ResourceSourceView | null
      canRecover: boolean
    }
  | { kind: 'image'; mediaKey: string; src: string; status: 'loading' | 'ready' | 'failed' }
  | { kind: 'video'; mediaKey: string; src: string; status: 'loading' | 'ready' | 'failed'; portrait: boolean }
  | { kind: 'audio'; mediaKey: string; src: string; status: 'loading' | 'ready' | 'failed' }
  | { kind: 'url'; mediaKey: string; src: string; status: 'loading' | 'ready' }
  | { kind: 'text'; status: 'loading' }
  | { kind: 'text'; status: 'failed'; error: string }
  | { kind: 'text'; status: 'ready'; text: string; truncated: boolean; notice: string }
  | { kind: 'markdown'; status: 'loading' }
  | { kind: 'markdown'; status: 'failed'; error: string; fallbackText?: string }
  | { kind: 'markdown'; status: 'ready'; nodes: SafeMarkdownNode[]; truncated: boolean; notice: string }
  | { kind: 'code'; status: 'loading' }
  | { kind: 'code'; status: 'failed'; error: string }
  | {
      kind: 'code'
      status: 'ready'
      code: string
      highlightedHtml: string | null
      overHighlightLimit: boolean
      truncated: boolean
      notice: string
    }

export interface PreviewTextResponse extends TextPreviewBody {
  ok: boolean
  status: number
}

export interface PreviewSessionPorts {
  fetchText(url: string, signal: AbortSignal): Promise<PreviewTextResponse>
  renderer: PreviewRendererPort
  openExternal(target: string): Promise<void>
  limits?: {
    textByteLimit?: number
    highlightByteLimit?: number
    highlightLineLimit?: number
  }
}

export interface PreviewSessionInput {
  open: () => boolean
  resource: () => ResourceView | null
}

export interface PreviewSession {
  readonly state: ComputedRef<PreviewState>
  readonly mode: ComputedRef<PreviewMode>
  readonly source: ComputedRef<ResourceSourceView | null>
  onMediaLoaded(mediaKey: string): void
  onMediaError(mediaKey: string): void
  onVideoMetadata(mediaKey: string, width: number, height: number): void
  openMarkdownLink(href: string): void
  dispose(): void
}

const DEFAULT_HIGHLIGHT_BYTE_LIMIT = 128 * 1024
const DEFAULT_HIGHLIGHT_LINE_LIMIT = 5000

const EMPTY_COPY: Record<PreviewEmptyReason, { title: string; description: string }> = {
  'no-source': { title: '没有可预览的入口', description: '这个资源没有可用的来源。' },
  'empty-location': { title: '链接地址为空', description: '刷新这个链接来源后才能预览。' },
  'source-unavailable': { title: '文件已失效', description: '原路径已经不存在，找回文件后即可预览。' },
  'media-unavailable': { title: '暂时无法预览', description: '请稍后重试，或用其他应用打开文件。' },
  'unsupported-kind': { title: '暂不支持预览', description: '可以在系统默认应用中打开这个文件。' }
}

function noticeFor(mode: 'text' | 'markdown' | 'code', truncated: boolean): string {
  if (!truncated) return mode === 'text' ? '部分文件的文字可能无法正常显示。' : ''
  return mode === 'text' ? '文件过大，仅显示开头部分。部分文件的文字可能无法正常显示。' : '文件过大，仅显示开头部分。'
}

function sanitizeMarkdownNode(node: RawPreviewMarkdownNode): SafeMarkdownNode | null {
  switch (node.label) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        label: node.label,
        id: node.id,
        html: sanitizeInlineHtml(node.content ?? '').html
      }
    case 'p':
    case 'th':
    case 'td':
      return {
        label: node.label,
        html: sanitizeInlineHtml(node.content ?? '').html
      }
    case 'ul':
    case 'ol':
    case 'blockquote':
    case 'table':
    case 'tr':
      return {
        label: node.label,
        children: sanitizeMarkdownNodes(node.children ?? [])
      }
    case 'li':
      if (node.children) {
        return { label: 'li', children: sanitizeMarkdownNodes(node.children) }
      }
      return { label: 'li', html: sanitizeInlineHtml(node.content ?? '').html }
    case 'hr':
      return { label: 'hr' }
    case 'img': {
      const src = allowedImageTarget(node.src ?? '')
      if (src === null) return null
      return { label: 'img', src, alt: node.alt ?? '' }
    }
    case 'codeblock':
      return { label: 'codeblock', html: node.content ?? '' }
    default:
      return null
  }
}

function sanitizeMarkdownNodes(nodes: readonly RawPreviewMarkdownNode[]): SafeMarkdownNode[] {
  const result: SafeMarkdownNode[] = []
  for (const node of nodes) {
    const safe = sanitizeMarkdownNode(node)
    if (safe) result.push(safe)
  }
  return result
}

async function defaultFetchText(url: string, signal: AbortSignal): Promise<PreviewTextResponse> {
  return await fetch(url, { signal })
}

export function createPreviewSession(
  input: PreviewSessionInput,
  ports: Partial<PreviewSessionPorts> = {}
): PreviewSession {
  const fetchText = ports.fetchText ?? defaultFetchText
  const renderer = ports.renderer ?? createDefaultPreviewRenderer()
  const openExternal = ports.openExternal ?? (async () => {})
  const textByteLimit = ports.limits?.textByteLimit ?? TEXT_PREVIEW_BYTE_LIMIT
  const highlightByteLimit = ports.limits?.highlightByteLimit ?? DEFAULT_HIGHLIGHT_BYTE_LIMIT
  const highlightLineLimit = ports.limits?.highlightLineLimit ?? DEFAULT_HIGHLIGHT_LINE_LIMIT

  const scope = effectScope(true)
  const currentState = ref<PreviewState>({ kind: 'closed' })
  let generation = 0
  let abortController: AbortController | null = null

  function cancelInFlight(): number {
    generation += 1
    abortController?.abort()
    abortController = null
    return generation
  }

  const target = scope.run(() => computed(() => resolvePreviewTarget(input.resource())))!
  const effectiveSrc = scope.run(() => computed(() => target.value.mediaUrl ?? target.value.externalTarget ?? ''))!
  const currentMediaKey = scope.run(() =>
    computed(() => {
      const source = target.value.source
      const locationPart = source?.type === 'file' ? `|${source.location}` : ''
      return `${source?.id ?? ''}|${effectiveSrc.value}${locationPart}`
    })
  )!
  const state = scope.run(() => computed(() => currentState.value))!
  const mode = scope.run(() => computed(() => target.value.mode))!
  const source = scope.run(() => computed(() => target.value.source))!

  async function loadTextPipeline(
    mode: 'text' | 'markdown' | 'code',
    mediaUrl: string,
    language: string | undefined,
    request: number
  ): Promise<void> {
    const controller = new AbortController()
    abortController = controller
    currentState.value = { kind: mode, status: 'loading' }

    let previewText: string
    let truncated: boolean
    let byteLength: number
    try {
      const response = await fetchText(mediaUrl, controller.signal)
      if (!response.ok) throw new Error(`读取失败（HTTP ${response.status}）`)
      const preview = await readTextPreview(response, textByteLimit)
      if (request !== generation) return
      previewText = preview.text
      truncated = preview.truncated
      byteLength = preview.byteLength
    } catch (cause) {
      if (request !== generation) return
      console.error('读取文件预览失败', cause)
      currentState.value = {
        kind: mode,
        status: 'failed',
        error: '无法读取文件，请检查文件是否还在原处'
      }
      return
    }

    const notice = noticeFor(mode, truncated)

    if (mode === 'text') {
      currentState.value = { kind: 'text', status: 'ready', text: previewText, truncated, notice }
      return
    }

    if (mode === 'markdown') {
      try {
        const parsed = await renderer.parseMarkdown(previewText)
        if (request !== generation) return
        const nodes = sanitizeMarkdownNodes(parsed.nodes)
        currentState.value = { kind: 'markdown', status: 'ready', nodes, truncated, notice }
      } catch {
        if (request !== generation) return
        currentState.value = {
          kind: 'markdown',
          status: 'failed',
          error: '无法按文档渲染，请改用纯文本预览。',
          fallbackText: previewText
        }
      }
      return
    }

    const overHighlightLimit = byteLength > highlightByteLimit || previewText.split('\n').length > highlightLineLimit
    if (!language || overHighlightLimit) {
      currentState.value = {
        kind: 'code',
        status: 'ready',
        code: previewText,
        highlightedHtml: null,
        overHighlightLimit,
        truncated,
        notice
      }
      return
    }

    try {
      const highlightedHtml = await renderer.highlightCode(previewText, language)
      if (request !== generation) return
      currentState.value = {
        kind: 'code',
        status: 'ready',
        code: previewText,
        highlightedHtml,
        overHighlightLimit: false,
        truncated,
        notice
      }
    } catch {
      if (request !== generation) return
      currentState.value = {
        kind: 'code',
        status: 'ready',
        code: previewText,
        highlightedHtml: null,
        overHighlightLimit: false,
        truncated,
        notice
      }
    }
  }

  scope.run(() => {
    watch(
      () =>
        [
          input.open(),
          input.resource()?.id ?? null,
          target.value.mode,
          effectiveSrc.value,
          target.value.source?.id ?? null,
          target.value.source?.location ?? '',
          target.value.emptyReason ?? null,
          target.value.language ?? ''
        ] as const,
      ([open]) => {
        const request = cancelInFlight()
        if (!open) {
          currentState.value = { kind: 'closed' }
          return
        }
        const resolved = target.value
        if (resolved.mode === 'empty' && resolved.emptyReason) {
          const copy = EMPTY_COPY[resolved.emptyReason]
          currentState.value = {
            kind: 'empty',
            reason: resolved.emptyReason,
            title: copy.title,
            description: copy.description,
            source: resolved.source,
            canRecover: resolved.emptyReason === 'source-unavailable' && resolved.source !== null
          }
          return
        }
        if (resolved.mode === 'image') {
          currentState.value = {
            kind: 'image',
            mediaKey: currentMediaKey.value,
            src: resolved.mediaUrl ?? '',
            status: 'loading'
          }
          return
        }
        if (resolved.mode === 'video') {
          currentState.value = {
            kind: 'video',
            mediaKey: currentMediaKey.value,
            src: resolved.mediaUrl ?? '',
            status: 'loading',
            portrait: false
          }
          return
        }
        if (resolved.mode === 'audio') {
          currentState.value = {
            kind: 'audio',
            mediaKey: currentMediaKey.value,
            src: resolved.mediaUrl ?? '',
            status: 'loading'
          }
          return
        }
        if (resolved.mode === 'url') {
          currentState.value = {
            kind: 'url',
            mediaKey: currentMediaKey.value,
            src: effectiveSrc.value,
            status: 'loading'
          }
          return
        }
        if (
          (resolved.mode === 'text' || resolved.mode === 'markdown' || resolved.mode === 'code') &&
          resolved.mediaUrl
        ) {
          void loadTextPipeline(resolved.mode, resolved.mediaUrl, resolved.language, request)
        }
      },
      { immediate: true }
    )
  })

  function onMediaLoaded(mediaKey: string) {
    const state = currentState.value
    if (
      (state.kind === 'image' || state.kind === 'video' || state.kind === 'audio' || state.kind === 'url') &&
      state.mediaKey === mediaKey
    ) {
      currentState.value = { ...state, status: 'ready' }
    }
  }

  function onMediaError(mediaKey: string) {
    const state = currentState.value
    if ((state.kind === 'image' || state.kind === 'video' || state.kind === 'audio') && state.mediaKey === mediaKey) {
      currentState.value = { ...state, status: 'failed' }
    }
  }

  function onVideoMetadata(mediaKey: string, width: number, height: number) {
    const state = currentState.value
    if (state.kind === 'video' && state.mediaKey === mediaKey) {
      currentState.value = { ...state, portrait: height > width }
    }
  }

  function openMarkdownLink(href: string) {
    const targetHref = allowedLinkTarget(href)
    if (targetHref === null) return
    void openExternal(targetHref)
  }

  function dispose() {
    cancelInFlight()
    scope.stop()
  }

  return {
    state,
    mode,
    source,
    onMediaLoaded,
    onMediaError,
    onVideoMetadata,
    openMarkdownLink,
    dispose
  }
}
