import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { byCodeUnit } from '../shared/order'

import {
  type CorpusFile,
  collectMirrorFiles,
  collectWorkspaceFiles,
  extractInlineLinks,
  relativePosix,
  walkFiles
} from './corpus'

const { andThen, err, ok } = rust

// 指令面链接守卫：只解析行内 Markdown `[label](target)` 链接，引用式 `[label][id]` 不纳入既定判据。
// 扫描面与方向规则都是消费仓库的事实，经 options 传入；判据本身见
// ADR-0013 / ADR-0026「语料门禁」。
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

function addRoot(root: string, relative: string, entries: Map<string, CorpusFile>): void {
  let stat: fs.Stats
  try {
    stat = fs.statSync(path.join(root, relative))
  } catch {
    return
  }
  if (stat.isDirectory()) {
    for (const absolute of walkFiles(root, relative, file => file.endsWith('.md'))) {
      const file = relativePosix(root, absolute)
      entries.set(file, { path: file, file })
    }
  } else {
    entries.set(relative, { path: relative, file: relative })
  }
}

function dropVendored(entries: Map<string, CorpusFile>, vendored: string, locked: ReadonlySet<string>): void {
  const prefix = `${vendored}/`
  // 边遍历边删除是 Map 迭代器的定义行为：删掉当前条目不影响后续访问，所以不需要先复制一份。
  for (const file of entries.keys()) {
    if (!file.startsWith(prefix)) continue
    if (locked.has(file.slice(prefix.length).split('/')[0])) entries.delete(file)
  }
}

function collect(root: string, options: NoMutualLinksOptions): CorpusFile[] {
  const entries = new Map<string, CorpusFile>()
  for (const relative of options.roots) addRoot(root, relative, entries)
  for (const workspace of options.workspaces ?? []) {
    for (const entry of collectWorkspaceFiles(root, workspace.directory, {
      deep: workspace.deep,
      shallow: workspace.shallow
    })) {
      entries.set(entry.path, entry)
    }
  }
  if (options.mirror) {
    const locked = new Set(options.mirror.lockedNames(root))
    dropVendored(entries, options.mirror.vendored, locked)
    for (const entry of collectMirrorFiles(root, {
      entity: options.mirror.entity,
      surface: options.mirror.surface,
      isLocked: name => locked.has(name)
    })) {
      if (!entries.has(entry.path)) entries.set(entry.path, entry)
    }
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

/**
 * 指令面链接判定，链上以 `md: ` 起头归因。扫描面为空或一条本地链接都没有时，
 * 「没有违规」是扫描没跑起来的假象，所以这两条按失败报而不是通过。
 */
export const defineNoMutualLinks = (options: NoMutualLinksOptions): Chain =>
  defineRunner().use(
    definePlugin<{ run: Run }, KitCtx & { run: Run }>(ctx => ({
      run: () =>
        andThen(ctx.run(), async () => {
          const entries = collect(ctx.root, options)
          if (entries.length === 0) return err('md: cannot run: instruction scan found 0 Markdown files')

          const known = new Set(entries.map(entry => entry.path))
          const edges = new Set<string>()

          for (const entry of entries) {
            let text: string
            try {
              text = fs.readFileSync(path.join(ctx.root, entry.file), 'utf8')
            } catch {
              return err(`md: cannot read scan entry: ${entry.path}`)
            }
            for (const link of extractInlineLinks(text, { allowRootRelative: false })) {
              const directory = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '.'
              const resolved = normalize(`${directory}/${link.location}`)
              if (!known.has(resolved)) continue
              edges.add(`${entry.path}\u0000${resolved}`)
            }
          }

          if (edges.size === 0) return err('md: cannot run: instruction scan found 0 local Markdown links')

          const violations: string[] = []
          for (const key of edges) {
            const [source, target] = key.split('\u0000')
            for (const direction of options.forbiddenDirections ?? []) {
              if (source.startsWith(direction.from) && target.startsWith(direction.to))
                violations.push(`${direction.label} link forbidden: ${source} -> ${target}`)
            }
          }
          violations.sort()
          if (violations.length > 0) return err(`md: ${violations.join('\n')}`)

          return ok(undefined)
        })
    }))
  )
