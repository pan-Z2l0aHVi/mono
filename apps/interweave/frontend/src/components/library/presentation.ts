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

import type { ResourceKind, ResourceSourceView, ResourceView, TagColor } from '@/stores/library'

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

export const DEFAULT_TAG_CLASS = 'bg-black/5 text-gray-500 dark:bg-white/10 dark:text-neutral-300'

/**
 * 持久化颜色 key → chip 样式。
 *
 * class 对照原样取自此前的「标签名 → 样式」映射，只是把 key 从标签名换成颜色 key，
 * 因此随机色只会落在此前就已经在用、且浅深两态对比度都验过的颜色上。
 *
 * 穷尽 Record<TagColor, string> 是与后端闭集的编译期契约：新增颜色而这里漏了样式
 * 会直接类型报错。TagColor.$zero（Go 零值 ""）对应「库内还没有颜色」，与运行期
 * 兜底同属中性一档。键必须写成字面量字符串：Tailwind 按源码文本扫描类名，
 * 拼出来的类名不会进产物。
 *
 * 用 satisfies 而不是类型标注，是为了让这张表在类型层面被检查、却仍然是普通的
 * 对象字面量——于是本模块对 TagColor 只需要 import type，不必把生成的枚举拖进
 * 运行期产物。这说的是本模块的取舍，不是全项目约定：mock 与测试确实以值的方式
 * import 这个枚举（要 Object.values 枚举全集），那与这张表无关。
 */
const TAG_COLOR_CLASSES = {
  '': DEFAULT_TAG_CLASS,
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-200',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-200',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-200',
  gray: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-neutral-300'
} satisfies Record<TagColor, string>

export const metadataRowClass =
  "relative flex min-w-0 items-center justify-between gap-4 px-4 py-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-black/6 after:content-[''] last:after:hidden dark:after:bg-white/8"
export const metadataLabelClass = 'shrink-0 text-xs leading-5 text-[#8a8a94] dark:text-(--wui-color-text-secondary)'
export const metadataValueClass =
  'min-w-0 truncate text-right text-xs leading-5 text-[#22212a] dark:text-(--wui-color-text)'

/*
 * 标签 chip 的统一外形：全 app 固定 22px 高。
 *
 * 用 inline-flex + items-center 而不是 inline-block + py-0.5：高度由 h-[22px] 唯一决定，
 * 标签文字再长也不会靠行内 padding 把行高撑开，列表行因此保持等高。
 */
export const tagChipClass = 'inline-flex h-[22px] items-center px-2 rounded-full text-xs whitespace-nowrap'

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

/**
 * 颜色 key → chip 样式。缺色（""）与闭集之外的意外值都退到中性档。
 *
 * 兜底不是多余的：穷尽类型只在编译期成立，而 key 来自持久化数据，
 * 越界的线上值或尚未归一的历史记录只能在这里挡住。
 *
 * 判空用 Object.hasOwn 而不是「取到 falsy 就兜底」：TAG_COLOR_CLASSES 是对象
 * 字面量，继承着 Object.prototype，所以 'constructor'、'toString'、'valueOf'
 * 这些键取出来是真值（函数或对象），|| 兜底对它们根本不生效，函数会把
 * "function Object() { [native code] }" 当作 class 返回并写进 :class 绑定。
 * 只有「是自有键」才等价于「这个 key 真的登记过 chip 样式」。
 */
export function tagClass(color: TagColor | string | null | undefined) {
  if (!color || !Object.hasOwn(TAG_COLOR_CLASSES, color)) return DEFAULT_TAG_CLASS
  return TAG_COLOR_CLASSES[color as TagColor]
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
