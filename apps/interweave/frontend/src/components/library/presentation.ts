import { lucideFile, lucideFileText, lucideGlobe, lucidePencil } from '@greypan/web-ui/icons'

import type { ResourceKind, ResourceSourceView, ResourceView } from '@/stores/library'

const KIND_ICONS = {
  pdf: lucideFileText,
  document: lucideFileText,
  data: lucidePencil,
  web: lucideGlobe,
  file: lucideFile
} satisfies Record<ResourceKind, typeof lucideFile>

const KIND_LABELS = {
  pdf: 'PDF',
  document: '文档',
  data: '数据',
  web: '网页',
  file: '文件'
} satisfies Record<ResourceKind, string>

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
  return KIND_LABELS[kind] ?? KIND_LABELS.file
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
