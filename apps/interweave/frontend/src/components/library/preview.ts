import type { ResourceKind, ResourceSourceView, ResourceView } from '@/stores/library'

import { fileExtension, primarySource } from './presentation'

export type PreviewMode = 'image' | 'video' | 'text' | 'url' | 'empty'

export type PreviewEmptyReason =
  | 'no-source'
  | 'empty-location'
  | 'source-unavailable'
  | 'media-unavailable'
  | 'unsupported-kind'

export interface PreviewTarget {
  mode: PreviewMode
  source: ResourceSourceView | null
  /** 本地 file 来源经 `/resource-media/<sourceId>` 读取；url 来源由 iframe 直接使用 source.location。 */
  mediaUrl: string | null
  /** 可交还系统默认应用打开的目标；两者都没有可用入口时为 null。 */
  externalTarget: string | null
  emptyReason: PreviewEmptyReason | null
}

/**
 * 纯文本扩展名清单。刻意只收「以字符为单位阅读」的类型：后端 `document` / `json`
 * kind 里还混着 pdf、docx、epub 等二进制格式，直接按 kind 铺进 `<pre>` 只会得到乱码。
 * 扩展名取自 fileExtension()，统一大写。
 */
const TEXT_EXTENSIONS = new Set([
  'CSV',
  'GEOJSON',
  'HTM',
  'HTML',
  'JSON',
  'JSONL',
  'MD',
  'MARKDOWN',
  'NDJSON',
  'TSV',
  'TXT',
  'TEX',
  'XML',
  'YAML',
  'YML'
])

/** 单次文本预览读取的字节上限；超出部分不再下载，drawer 显式标注已截断。 */
export const TEXT_PREVIEW_BYTE_LIMIT = 512 * 1024

function filePreviewMode(kind: ResourceKind, extension: string): PreviewMode {
  if (kind === 'image') return 'image'
  if (kind === 'video') return 'video'
  // 刻意让 kind==='unknown'（旧客户端或后端未识别的扩展名）也走扩展名判定：
  // 白名单是按「以字符为单位阅读」的文本类型收敛的，命中即安全展示，
  // 比 unknown 直接落进空态更符合「文本类尽量能读」的预期。
  if (TEXT_EXTENSIONS.has(extension)) return 'text'
  return 'empty'
}

function emptyTarget(
  source: ResourceSourceView | null,
  reason: PreviewEmptyReason,
  externalTarget: string | null = null
): PreviewTarget {
  return { mode: 'empty', source, mediaUrl: null, externalTarget, emptyReason: reason }
}

/**
 * 把 Resource 解析成一种预览形态。file 来源只能经媒体端点读取，url 来源的 iframe
 * 直接指向原始地址；空态按原因分类，让 drawer 能给出可行动的文案而不是一句通用失败。
 */
export function resolvePreviewTarget(
  resource: ResourceView | null,
  mediaUrlFor: (sourceId: string) => string | null
): PreviewTarget {
  const source = resource ? primarySource(resource) : null
  if (!resource || !source) return emptyTarget(null, 'no-source')

  if (source.type === 'url') {
    // url 分支刻意排在 available 检查之前：iframe 直接指向原始地址，
    // available 只反映上次抓取元数据是否成功，不代表链接此刻是否可访问，
    // 用它拦截会误伤「上次抓取失败但链接仍可打开」的资源。
    if (!source.location) return emptyTarget(source, 'empty-location')
    return { mode: 'url', source, mediaUrl: null, externalTarget: source.location, emptyReason: null }
  }

  // 失效的本地文件交给系统只会报错，不再提供外跳入口。
  if (!source.available) return emptyTarget(source, 'source-unavailable')

  const mode = filePreviewMode(resource.kind, fileExtension(source.location))
  if (mode === 'empty') return emptyTarget(source, 'unsupported-kind', source.location)

  const mediaUrl = mediaUrlFor(source.id)
  if (!mediaUrl) return emptyTarget(source, 'media-unavailable', source.location)

  return { mode, source, mediaUrl, externalTarget: source.location, emptyReason: null }
}

interface TextPreviewStream {
  read(): Promise<{ done: boolean; value?: Uint8Array }>
  cancel(): Promise<void> | void
}

/** fetch Response 的最小结构面，便于用假响应单测截断与解码。 */
export interface TextPreviewBody {
  body: { getReader(): TextPreviewStream } | null
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface TextPreview {
  text: string
  truncated: boolean
  byteLength: number
}

function decodeText(chunks: Uint8Array[], byteLength: number, limit: number, truncated: boolean): TextPreview {
  const kept = Math.min(byteLength, limit)
  const merged = new Uint8Array(kept)
  let offset = 0
  for (const chunk of chunks) {
    if (offset >= kept) break
    const end = Math.min(offset + chunk.byteLength, kept)
    merged.set(chunk.subarray(0, end - offset), offset)
    offset = end
  }
  // 截断可能落在多字节字符中间，TextDecoder 的替换字符是此处可接受的降级。
  return { text: new TextDecoder().decode(merged), truncated, byteLength: offset }
}

/**
 * 逐块读取文本并停在 limit 字节处：媒体端点对任意大小都返回完整文件，不限量就会把
 * 几百 MB 的日志整个拉进内存。流不可用时退化为一次性 arrayBuffer 后本地截断。
 */
export async function readTextPreview(
  response: TextPreviewBody,
  limit: number = TEXT_PREVIEW_BYTE_LIMIT
): Promise<TextPreview> {
  const reader = response.body?.getReader() ?? null
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer())
    return decodeText([buffer], buffer.byteLength, limit, buffer.byteLength > limit)
  }

  const chunks: Uint8Array[] = []
  let byteLength = 0
  let truncated = false
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value?.byteLength) continue
      chunks.push(value)
      byteLength += value.byteLength
      if (byteLength < limit) continue
      if (byteLength > limit) {
        truncated = true
        break
      }
      // 正好卡在 limit 上时多读一次，才能区分「刚好读满」与「后面还有内容」。
      truncated = !(await reader.read()).done
      break
    }
  } finally {
    if (truncated) await reader.cancel()
  }

  return decodeText(chunks, byteLength, limit, truncated)
}
