import fs from 'node:fs'
import path from 'node:path'

import { parseLocalLinkTarget, readInlineLinkTarget, stripCodeSegments } from './context-invariants'

export interface CorpusFile {
  /** 语料内逻辑路径（POSIX 相对路径）：链接解析与方向判定都以它为准 */
  readonly path: string
  /** 仓库根下的真实相对路径（POSIX）：镜像面的逻辑路径与磁盘路径不同 */
  readonly file: string
}

export interface InlineLink {
  readonly rawTarget: string
  readonly location: string
  readonly fragment: string
}

export interface ExtractInlineLinksOptions {
  /** 是否保留以 `/` 开头的仓库根相对链接；默认 `true` */
  readonly allowRootRelative?: boolean
}

export function relativePosix(root: string, file: string): string {
  return (path.relative(root, file) || '.').split(path.sep).join('/')
}

export function walkFiles(
  root: string,
  directory: string,
  predicate: (absoluteFile: string) => boolean = () => true
): string[] {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return []
  const files: string[] = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const file = path.join(absolute, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(root, path.relative(root, file), predicate))
    else if (predicate(file)) files.push(file)
  }
  return files
}

function collectNamedRecursive(
  root: string,
  directory: string,
  names: ReadonlySet<string>,
  entries: CorpusFile[]
): void {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      collectNamedRecursive(root, relative, names, entries)
    } else if (entry.isFile() && names.has(entry.name)) {
      entries.push({ path: relative, file: relative })
    }
  }
}

/**
 * 收集 workspace 根目录下的指令面文件：
 * - `deep`：递归收集匹配文件名；
 * - `shallow`：若目录自身是包（含 `package.json`），只收其根部；否则只收直接子目录，不递归。
 */
export function collectWorkspaceFiles(
  root: string,
  directory: string,
  options: { readonly deep?: readonly string[]; readonly shallow?: readonly string[] }
): CorpusFile[] {
  const entries: CorpusFile[] = []
  if (options.deep && options.deep.length > 0) {
    collectNamedRecursive(root, directory, new Set(options.deep), entries)
  }
  const shallow = options.shallow ?? []
  if (shallow.length > 0) {
    const absolute = path.join(root, directory)
    if (fs.existsSync(path.join(absolute, 'package.json'))) {
      for (const name of shallow) {
        const file = `${directory}/${name}`
        if (fs.existsSync(path.join(root, file))) entries.push({ path: file, file })
      }
    } else if (fs.existsSync(absolute)) {
      for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        for (const name of shallow) {
          const file = `${directory}/${entry.name}/${name}`
          if (fs.existsSync(path.join(root, file))) entries.push({ path: file, file })
        }
      }
    }
  }
  return entries
}

/**
 * 将 `entity` 目录下非锁定的 skill Markdown 映射回消费面 `surface` 路径，跳过实体根下的门面文档。
 */
export function collectMirrorFiles(
  root: string,
  options: {
    readonly entity: string
    readonly surface: string
    readonly isLocked: (skillName: string) => boolean
  }
): CorpusFile[] {
  const prefix = `${options.entity}/`
  const results: CorpusFile[] = []
  for (const absolute of walkFiles(root, options.entity, file => file.endsWith('.md'))) {
    const file = relativePosix(root, absolute)
    if (!file.startsWith(prefix)) continue
    const relative = file.slice(prefix.length)
    if (!relative.includes('/')) continue
    const skillName = relative.slice(0, relative.indexOf('/'))
    if (options.isLocked(skillName)) continue
    results.push({ path: `${options.surface}/${relative}`, file })
  }
  return results
}

const INLINE_LINK_START = /(?<!!)\[[^\]]*\]\(/g

/**
 * 剥离围栏代码块与行内 code 后扫描行内 Markdown 链接（忽略 `![]()` 图片语法），
 * 使用平衡括号读取 destination 并归一本地 target。
 */
export function extractInlineLinks(source: string, options: ExtractInlineLinksOptions = {}): InlineLink[] {
  const allowRootRelative = options.allowRootRelative ?? true
  const stripped = stripCodeSegments(source)
  const links: InlineLink[] = []
  for (const match of stripped.matchAll(INLINE_LINK_START)) {
    const raw = readInlineLinkTarget(stripped, match.index + match[0].length)
    if (raw === null) continue
    const rawTarget = raw.trim()
    const parsed = parseLocalLinkTarget(rawTarget)
    if (!parsed) continue
    if (!allowRootRelative && parsed.location.startsWith('/')) continue
    links.push({ rawTarget, location: parsed.location, fragment: parsed.fragment })
  }
  return links
}
