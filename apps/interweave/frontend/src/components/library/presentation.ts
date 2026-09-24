import {
  lucideCode,
  lucideFile,
  lucideFileText,
  lucideFilm,
  lucideGlobe,
  lucideHeadphones,
  lucideImage
} from '@greypan/web-ui/icons'

import type { ResourceKind, ResourceSourceView, ResourceView } from '@/stores/library'

const KIND_ICONS: Partial<Record<string, typeof lucideFile>> = {
  image: lucideImage,
  video: lucideFilm,
  audio: lucideHeadphones,
  document: lucideFileText,
  web: lucideGlobe,
  json: lucideCode,
  file: lucideFile,
  unknown: lucideFile
}

const KIND_LABELS: Partial<Record<string, string>> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
  web: '网页',
  json: 'JSON',
  file: '文件',
  unknown: '其他'
}

const KIND_CONTAINERS: Partial<Record<string, string>> = {
  image: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200',
  video: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-200',
  audio: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
  document: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
  web: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200',
  json: 'bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-200',
  file: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200'
}

const KIND_TEXT: Partial<Record<string, string>> = {
  image: 'text-blue-600 dark:text-blue-300',
  video: 'text-purple-600 dark:text-purple-300',
  audio: 'text-red-600 dark:text-red-300',
  document: 'text-amber-600 dark:text-amber-300',
  web: 'text-cyan-600 dark:text-cyan-300',
  json: 'text-green-600 dark:text-green-300',
  file: 'text-orange-600 dark:text-orange-300'
}

const TAG_CLASSES = [
  'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200',
  'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200'
]

function hashTag(tag: string) {
  let hash = 0
  for (const char of tag) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return hash
}

export function resourceIcon(kind: ResourceKind) {
  return KIND_ICONS[kind] ?? KIND_ICONS.file
}

export function resourceKindLabel(kind: ResourceKind) {
  return KIND_LABELS[kind] ?? KIND_LABELS.unknown!
}

export function resourceKindClass(kind: ResourceKind) {
  return KIND_CONTAINERS[kind] ?? 'bg-black/5 text-(--wui-color-text-secondary) dark:bg-white/8'
}

export function resourceKindTextClass(kind: ResourceKind) {
  return KIND_TEXT[kind] ?? 'text-(--wui-color-text-tertiary)'
}

export function tagClass(tag: string) {
  return TAG_CLASSES[hashTag(tag) % TAG_CLASSES.length]
}

export function sourceTypeLabel(source: ResourceSourceView) {
  return source.type === 'file' ? '本地文件' : 'URL'
}

export function sourceTypeIcon(source: ResourceSourceView) {
  return source.type === 'file' ? lucideFile : lucideGlobe
}

export function fileExtension(location: string) {
  const fileTitle = location.split(/[\\/]/).at(-1) ?? location
  const dot = fileTitle.lastIndexOf('.')
  return dot > 0 ? fileTitle.slice(dot + 1).toUpperCase() : ''
}

export function primarySource(resource: ResourceView) {
  return resource.preferred ?? resource.sources[0] ?? null
}

export function formatTimestamp(timestamp: number) {
  if (!timestamp) return '未知时间'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(timestamp))
}

export function formatSize(sizeBytes: number | null) {
  if (sizeBytes === null || !Number.isFinite(sizeBytes) || sizeBytes < 0) return null
  const megabytes = sizeBytes / (1024 * 1024)
  const value = megabytes >= 1 ? megabytes : sizeBytes / 1024
  const unit = megabytes >= 1 ? 'MB' : 'KB'
  const precision = value < 10 && !Number.isInteger(value) ? 1 : 0
  return `${value.toFixed(precision)} ${unit}`
}
