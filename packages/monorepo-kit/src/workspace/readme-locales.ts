import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'

import { defineWorkspace, type WorkspaceApi } from './workspace'

const { andThen, err, ok } = rust

// 发布包的根 README 就是 npm 包页，英文版与中文版各是一半读者的入口：缺一份，或只有单向链接，
// 另一侧读者就没有路。私有包与应用不要求多语言——内部文档的语言由仓库规则统一——但只要多语言版
// 存在，它和主版就必须能互相到达。扫描面跳过点目录与调用方声明的目录：`.agents/` 等是工具与
// 上游件的家，`__tests__/` 下的 README 是夹具，上游文本不归本仓门禁管。译文集合与跳过目录都是
// 消费仓库的事实，经 options 传入。
const BASE = 'README.md'
const LINK = /(?<!!)\[[^\]]*\]\(([^)]*)\)/g
// GitHub 文件页是发布包 README 的常用链接形态：分支名不参与判定，路径必须落在仓库内。
const GITHUB_BLOB = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+)$/

export interface ReadmeLocalesOptions {
  /** 发布包与译文目录必须提供的译文 locale，对应 `README.<locale>.md` */
  readonly locales: readonly string[]
  /** 遍历时整棵跳过的目录名；点目录始终跳过 */
  readonly skippedDirectories: readonly string[]
}

/**
 * 收集扫描面内的全部目录，仓库根记作 `.`。符号链接目录不跟随。
 */
function walkDirectories(root: string, skipped: ReadonlySet<string>): string[] {
  const directories = ['.']
  const pending = ['.']
  while (pending.length > 0) {
    const relative = pending.pop() as string
    const absolute = path.join(root, relative)
    let entries
    try {
      entries = fs.readdirSync(absolute, { withFileTypes: true })
    } catch {
      throw new Error(`cannot read directory: ${relative}`)
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') || skipped.has(entry.name)) continue
      const next = relative === '.' ? entry.name : `${relative}/${entry.name}`
      directories.push(next)
      pending.push(next)
    }
  }
  return directories
}

function fileIn(directory: string, fileName: string): string {
  return directory === '.' ? fileName : `${directory}/${fileName}`
}

/**
 * 行内链接的 destination，去掉 title 与片段。引用式链接与图片不在判据内。
 */
function linkTargets(text: string): string[] {
  const targets: string[] = []
  for (const match of text.matchAll(LINK)) {
    let target = match[1].replace(/\s+/g, ' ').trim()
    if (target.startsWith('<')) target = target.slice(1).replace(/>.*$/, '')
    else target = target.replace(/\s.*$/, '')
    target = target.replace(/#.*$/, '')
    if (target) targets.push(target)
  }
  return targets
}

/**
 * 把链接解析成仓库相对路径；远程、协议、纯锚点与越出仓库根的路径返回 null。
 * `source` 是发起链接的仓库相对文件路径。
 */
function resolveTarget(source: string, target: string): string | null {
  if (target.startsWith('/')) return null
  const hosted = GITHUB_BLOB.exec(target)
  if (hosted) return hosted[1]
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return null

  const segments: string[] = []
  for (const segment of `${path.posix.dirname(source)}/${target}`.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments.join('/')
}

/**
 * README 双语配对的判定，链上以 `md: ` 起头归因：译文必须有主版可译、双向互链，
 * 发布包必须同时备齐每个 locale 的 README。
 */
export const defineReadmeLocales = ({ locales, skippedDirectories }: ReadmeLocalesOptions): Chain => {
  const skipped = new Set(skippedDirectories)

  return defineRunner()
    .use(defineWorkspace())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & WorkspaceApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const { root } = ctx
            const violations: string[] = []

            for (const directory of walkDirectories(root, skipped)) {
              const basePath = fileIn(directory, BASE)
              const baseExists = fs.existsSync(path.join(root, basePath))

              for (const locale of locales) {
                const localePath = fileIn(directory, `README.${locale}.md`)
                if (!fs.existsSync(path.join(root, localePath))) continue
                if (!baseExists) {
                  violations.push(`${localePath}: no ${basePath} to translate`)
                  continue
                }

                for (const [source, sibling] of [
                  [basePath, localePath],
                  [localePath, basePath]
                ]) {
                  const text = fs.readFileSync(path.join(root, source), 'utf8')
                  if (!linkTargets(text).some(target => resolveTarget(source, target) === sibling)) {
                    violations.push(`${source}: no link to ${sibling}`)
                  }
                }
              }
            }

            for (const manifestFile of ctx.manifests()) {
              const manifest = ctx.readManifest<{ name?: string; private?: boolean }>(manifestFile)
              if (manifest.private === true) continue

              const packageDirectory = path.posix.dirname(manifestFile)
              const label = manifest.name ?? packageDirectory
              if (!fs.existsSync(path.join(root, packageDirectory, BASE))) {
                violations.push(`${label}: published package is missing ${BASE}`)
              }
              for (const locale of locales) {
                if (!fs.existsSync(path.join(root, fileIn(packageDirectory, `README.${locale}.md`)))) {
                  violations.push(`${label}: published package is missing README.${locale}.md`)
                }
              }
            }

            violations.sort()
            if (violations.length > 0) return err(`md: ${violations.join('\n')}`)
            return ok(undefined)
          })
      }))
    )
}
