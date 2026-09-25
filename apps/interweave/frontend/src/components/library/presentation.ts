import {
  lucideCode,
  lucideFile,
  lucideFileText,
  lucideFilm,
  lucideGlobe,
  lucideImage,
  lucideLink,
  lucideMusic
} from '@greypan/web-ui/icons'

import type { ResourceKind, ResourceSourceView, ResourceView } from '@/stores/library'

const KIND_ICONS: Partial<Record<string, typeof lucideFile>> = {
  image: lucideImage,
  video: lucideFilm,
  audio: lucideMusic,
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
  json: '源代码',
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

const TAG_CLASSES: Record<string, string> = {
  设计: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200',
  开发: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  素材: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-200',
  灵感: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
  参考: 'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-200',
  工具: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200',
  归档: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-neutral-300',
  文档: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-200',
  重要: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
  紧急: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200',
  草稿: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-neutral-300',
  审核: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200',
  发布: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  原型: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200',
  测试: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
  备份: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-200'
}

const DEFAULT_TAG_CLASS = 'bg-black/5 text-gray-500 dark:bg-white/10 dark:text-neutral-300'

export const metadataRowClass =
  "relative flex min-w-0 items-center justify-between gap-4 px-4 py-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-black/6 after:content-[''] last:after:hidden dark:after:bg-white/8"
export const metadataLabelClass = 'shrink-0 text-[13px] leading-5 text-[#8a8a94] dark:text-(--wui-color-text-secondary)'
export const metadataValueClass =
  'min-w-0 truncate text-right text-[13px] font-medium leading-5 text-[#22212a] dark:text-(--wui-color-text)'

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
  return KIND_TEXT[kind] ?? 'text-[#c0c0c8] dark:text-(--wui-color-text-tertiary)'
}

export function tagClass(tag: string) {
  return TAG_CLASSES[tag] ?? DEFAULT_TAG_CLASS
}

export function sourceTypeLabel(source: ResourceSourceView) {
  return source.type === 'file' ? '本地文件' : 'URL'
}

export function sourceTypeIcon(source: ResourceSourceView) {
  return source.type === 'file' ? lucideFile : lucideLink
}

export function sourceTypeDisplayLabel(source: ResourceSourceView) {
  return source.type === 'file' ? '文件系统' : '远程链接'
}

export function fileExtension(location: string) {
  const fileTitle = location.split(/[\\/]/).at(-1) ?? location
  const dot = fileTitle.lastIndexOf('.')
  return dot > 0 ? fileTitle.slice(dot + 1).toUpperCase() : ''
}

export function primarySource(resource: ResourceView) {
  return resource.preferred ?? resource.sources[0] ?? null
}

const timestampFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function formatTimestamp(timestamp: number) {
  if (!timestamp) return '未知时间'
  return timestampFormatter.format(new Date(timestamp)).replaceAll('/', '-')
}

export function formatSize(sizeBytes: number | null) {
  if (sizeBytes === null || !Number.isFinite(sizeBytes) || sizeBytes < 0) return null
  const megabytes = sizeBytes / (1024 * 1024)
  const value = megabytes >= 1 ? megabytes : sizeBytes / 1024
  const unit = megabytes >= 1 ? 'MB' : 'KB'
  const precision = value < 10 && !Number.isInteger(value) ? 1 : 0
  return `${value.toFixed(precision)} ${unit}`
}
