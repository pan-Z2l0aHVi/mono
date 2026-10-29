import path from 'node:path'

import { definePlugin } from '@greypan/js-kit'

import { errorMessage } from '../shared/errors'

import { defineExec } from './exec'
import { defineGit } from './git'

export interface ChangesetsOptions {
  /** changeset 目录，Changesets 的约定 */
  readonly directory?: string
  /** 目录里的配置文件名 */
  readonly configFile?: string
}

export interface ChangesetsContext {
  readonly root: string
  readonly env?: NodeJS.ProcessEnv
}

export interface ChangesetsApi {
  /** `from..to` 之间新增、修改或改名的有效 changeset 条目，删除的文件不算 */
  readonly changed: (from: string, to: string) => readonly string[]
  /** 从某个提交读 changeset 文件内容；不存在时抛出 */
  readonly read: (commit: string, file: string) => string
  /** 某个提交上 config 的 `ignore` 列表，Changesets 会跳过这些包 */
  readonly ignoredPackages: (commit: string) => readonly string[]
  /** `changeset status --since=<base>`，失败抛错 */
  readonly status: (base: string) => void
}

// 目录里的说明文件不是 changeset 条目。README 比较不区分大小写，与 humans 的命名习惯一致；
// 其余名字沿用 Changesets 生态的固定拼写。
const DOCUMENT_NAMES = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const defineChangesets = ({ directory = '.changeset', configFile = 'config.json' }: ChangesetsOptions = {}) =>
  definePlugin<ChangesetsApi, ChangesetsContext>(ctx => {
    const { show, changedFiles } = defineGit().make(ctx)
    const { exec, pnpm, commandOutput } = defineExec().make()
    const configPath = `${directory}/${configFile}`
    const entryPath = new RegExp(`^${escapeRegExp(directory)}/(?:pre/)?[^/.][^/]*\\.md$`)

    function readBlob(commit: string, file: string): string {
      try {
        return show(commit, file)
      } catch (error) {
        throw new Error(`cannot read ${file} from PR head ${commit}: ${errorMessage(error)}`)
      }
    }

    function parseConfig(text: string): readonly string[] {
      let config: { ignore?: unknown }
      try {
        config = JSON.parse(text) as { ignore?: unknown }
      } catch {
        throw new Error(`changeset check cannot run: ${configPath} at PR head is not valid JSON`)
      }
      if (!Array.isArray(config.ignore) || config.ignore.some((name: unknown) => typeof name !== 'string'))
        throw new Error(
          `changeset check cannot run: ${configPath} at PR head must contain an ignore array of package names`
        )
      return config.ignore as string[]
    }

    return {
      changed: (from, to) =>
        changedFiles({ from, to, pathspec: directory, filter: 'AMR' }).filter(file => {
          if (!entryPath.test(file)) return false
          const name = path.posix.basename(file)
          return !DOCUMENT_NAMES.has(name) && name.toLowerCase() !== 'readme.md'
        }),
      read: (commit, file) => readBlob(commit, file),
      ignoredPackages: commit => parseConfig(readBlob(commit, configPath)),
      status: base => {
        const result = exec(pnpm, ['exec', 'changeset', 'status', `--since=${base}`], {
          cwd: ctx.root,
          env: ctx.env
        })
        if (!result.ok) {
          const output = commandOutput(result)
          throw new Error(`changeset status --since=${base} failed${output ? `:\n${output}` : ''}`)
        }
      }
    }
  })
