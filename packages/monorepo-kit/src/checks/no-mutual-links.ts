import fs from 'node:fs'
import path from 'node:path'

import type { CheckUnit } from '../policy/check-runner'
import { byCodeUnit } from '../shared/order'

// 指令面互指图守卫：只解析行内 Markdown `[label](target)` 链接，引用式 `[label][id]` 不纳入既定判据。
// 扫描面、方向规则与上游件清单都是消费仓库的事实，经 options 传入；判据本身见
// docs/agents/agent-context.md「链接面与指令面」。
const ENTRY_NAME = /^[A-Z0-9_-]+\.md$/
const LINK = /(?<!!)\[[^\]]*\]\(([^)]*)\)/g

export interface NoMutualLinksOptions {
  /** 语料根：文件按原样入列，目录递归收 `.md`；不存在的根跳过 */
  readonly roots: readonly string[]
  /** workspace 根：`deep` 递归收集，`shallow` 只在直接子目录下收集 */
  readonly workspaces?: readonly {
    readonly directory: string
    readonly deep: readonly string[]
    readonly shallow: readonly string[]
  }[]
  /** 软链镜像面：`entity` 的正文以 `surface` 下的路径入列、读实体文件；上游件不参与判定 */
  readonly mirror?: {
    readonly entity: string
    readonly surface: string
    /** 上游件的实体目录，位于语料根之下 */
    readonly vendored: string
    /** 上游件名字，运行时从仓库根读取；缺失或不可读时抛出 `cannot run: …` */
    readonly lockedNames: (root: string) => readonly string[]
  }
  /** 禁止的链接方向：`from` 前缀的源指到 `to` 前缀的目标即违规 */
  readonly forbiddenDirections?: readonly {
    readonly from: string
    readonly to: string
    readonly label: string
  }[]
}

interface CorpusEntry {
  /** 语料内路径：链接解析与判定都以它为准 */
  readonly path: string
  /** 磁盘上的实体文件；镜像面的语料路径与实体路径不同 */
  readonly file: string
}

function relativePath(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join('/')
}

function addMarkdown(root: string, directory: string, entries: Map<string, CorpusEntry>): void {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      addMarkdown(root, relativePath(root, path.join(absolute, entry.name)), entries)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const file = relativePath(root, path.join(absolute, entry.name))
      entries.set(file, { path: file, file })
    }
  }
}

function addRoot(root: string, relative: string, entries: Map<string, CorpusEntry>): void {
  let stat: fs.Stats
  try {
    stat = fs.statSync(path.join(root, relative))
  } catch {
    return
  }
  if (stat.isDirectory()) addMarkdown(root, relative, entries)
  else entries.set(relative, { path: relative, file: relative })
}

function addNamed(
  root: string,
  directory: string,
  names: readonly string[],
  recursive: boolean,
  entries: Map<string, CorpusEntry>
): void {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`
    if (entry.isDirectory()) {
      if (recursive) addNamed(root, relative, names, true, entries)
      else
        for (const name of names) {
          const file = `${relative}/${name}`
          if (fs.existsSync(path.join(root, file))) entries.set(file, { path: file, file })
        }
    } else if (recursive && entry.isFile() && names.includes(entry.name)) {
      entries.set(relative, { path: relative, file: relative })
    }
  }
}

function addMirror(
  root: string,
  mirror: NonNullable<NoMutualLinksOptions['mirror']>,
  locked: ReadonlySet<string>,
  entries: Map<string, CorpusEntry>
): void {
  const entity = new Map<string, CorpusEntry>()
  addMarkdown(root, mirror.entity, entity)
  const prefix = `${mirror.entity}/`
  for (const entry of entity.values()) {
    const relative = entry.path.slice(prefix.length)
    if (!relative.includes('/')) continue
    if (locked.has(relative.slice(0, relative.indexOf('/')))) continue
    const surface = `${mirror.surface}/${relative}`
    if (!entries.has(surface)) entries.set(surface, { path: surface, file: entry.file })
  }
}

function dropVendored(entries: Map<string, CorpusEntry>, vendored: string, locked: ReadonlySet<string>): void {
  const prefix = `${vendored}/`
  // 边遍历边删除是 Map 迭代器的定义行为：删掉当前条目不影响后续访问，所以不需要先复制一份。
  for (const file of entries.keys()) {
    if (!file.startsWith(prefix)) continue
    if (locked.has(file.slice(prefix.length).split('/')[0])) entries.delete(file)
  }
}

function collect(root: string, options: NoMutualLinksOptions): CorpusEntry[] {
  const entries = new Map<string, CorpusEntry>()
  for (const relative of options.roots) addRoot(root, relative, entries)
  for (const workspace of options.workspaces ?? []) {
    addNamed(root, workspace.directory, workspace.deep, true, entries)
    addNamed(root, workspace.directory, workspace.shallow, false, entries)
  }
  if (options.mirror) {
    const locked = new Set(options.mirror.lockedNames(root))
    dropVendored(entries, options.mirror.vendored, locked)
    addMirror(root, options.mirror, locked, entries)
  }
  return [...entries.values()].sort((left, right) => byCodeUnit(left.path, right.path))
}

function normalize(target: string): string {
  const stack: string[] = []
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (stack.length > 0) stack.pop()
    } else {
      stack.push(segment)
    }
  }
  return stack.join('/')
}

function basename(file: string): string {
  return file.slice(file.lastIndexOf('/') + 1)
}

function parseTarget(raw: string): string | null {
  let target = raw.replace(/\s+/g, ' ').trim()
  if (target.startsWith('<')) target = target.slice(1).replace(/>.*$/, '')
  else target = target.replace(/\s.*$/, '')
  if (!target) return null
  if (/^(?:https?:|mailto:|#)/.test(target) || target.startsWith('/')) return null
  target = target.replace(/#.*$/, '')
  return target || null
}

export function defineNoMutualLinks(options: NoMutualLinksOptions): CheckUnit {
  return {
    name: 'no-mutual-links',
    async run({ root }: { root: string }): Promise<string> {
      const entries = collect(root, options)
      if (entries.length === 0) throw new Error('cannot run: instruction scan found 0 Markdown files')

      const known = new Set(entries.map(entry => entry.path))
      const edges = new Set<string>()

      for (const entry of entries) {
        let text: string
        try {
          text = fs.readFileSync(path.join(root, entry.file), 'utf8')
        } catch {
          throw new Error(`cannot read scan entry: ${entry.path}`)
        }
        for (const match of text.matchAll(LINK)) {
          const target = parseTarget(match[1])
          if (!target) continue
          const directory = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '.'
          const resolved = normalize(`${directory}/${target}`)
          if (!known.has(resolved)) continue
          edges.add(`${entry.path}\u0000${resolved}`)
        }
      }

      if (edges.size === 0) throw new Error('cannot run: instruction scan found 0 local Markdown links')

      const violations: string[] = []
      for (const key of edges) {
        const [source, target] = key.split('\u0000')
        for (const direction of options.forbiddenDirections ?? []) {
          if (source.startsWith(direction.from) && target.startsWith(direction.to))
            violations.push(`${direction.label} link forbidden: ${source} -> ${target}`)
        }
      }
      for (const key of edges) {
        const [source, target] = key.split('\u0000')
        if (source >= target || !edges.has(`${target}\u0000${source}`)) continue
        if (ENTRY_NAME.test(basename(source)) || ENTRY_NAME.test(basename(target))) continue
        violations.push(`mutual links forbidden: ${source} <-> ${target}`)
      }
      violations.sort()
      if (violations.length > 0) throw new Error(violations.join('\n'))

      return `${entries.length} Markdown files, ${edges.size} local edges`
    }
  }
}
