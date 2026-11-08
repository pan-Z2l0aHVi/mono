import { type Plugin, definePlugin } from '@greypan/js-kit'

import { defineExec, type ExecApi } from '../exec/exec'
import type { KitCtx } from '../runner/runner'

export interface ChangedFilesOptions {
  readonly from: string
  readonly to: string
  /** 仓库相对的 pathspec；缺省是整棵树 */
  readonly pathspec?: string
  /** `--diff-filter` 的取值，如 `AMR` 排除删除；缺省不过滤 */
  readonly filter?: string
}

export interface GitApi {
  /** 只读的 index 查询：`--diff-filter=ACMR` 排除删除，`core.quotePath=false` 保留原样路径 */
  readonly stagedFiles: () => string[]
  /** tracked 且匹配 pathspec 的文件，`-z` 分隔以支持空格与非 ASCII 名字 */
  readonly files: (pattern: string) => string[]
  /** 带 skip-worktree 位的 tracked 文件：稀疏检出 cone 外的已跟踪文件，index 里还在，磁盘上没有 */
  readonly skipWorktreeFiles: () => string[]
  readonly changedFiles: (options: ChangedFilesOptions) => string[]
  /** 读某个提交上的 blob；不存在时抛出 */
  readonly show: (commit: string, file: string) => string
  /** 把 ref 解析成提交 sha，无法解析时抛出 */
  readonly resolveCommit: (ref: string) => string
  readonly mergeBase: (left: string, right: string) => string
}

function nulSeparated(output: string): string[] {
  return output.split('\0').filter(Boolean)
}

/**
 * 起进程用 `exec`，但语义相反：git 是门禁的判据来源，失败必须抛出，不能降级成返回值。
 * 返回值标注成 `Plugin<GitApi, KitCtx>`：`use` 会并进 `defineExec` 的产出与需求，
 * 不收窄就要求消费者自己供给这条能力内部已经装好的东西。
 */
export const defineGit = (): Plugin<GitApi, KitCtx> =>
  defineExec().use(
    definePlugin<GitApi, KitCtx & ExecApi>(ctx => {
      const raw = (args: readonly string[]): string => {
        const result = ctx.exec('git', args)
        if (result.ok) return result.stdout
        const detail = (result.stderr ?? '').trim()
        throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
      }

      return {
        stagedFiles: () =>
          raw(['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'])
            .split(/\r?\n/)
            .filter(Boolean),
        files: pattern => nulSeparated(raw(['ls-files', '-z', pattern])),
        // `-v` 在路径前加一位状态码：`H` 是普通条目，`S` 是 skip-worktree（cone 外），小写是 assume-unchanged。
        skipWorktreeFiles: () =>
          nulSeparated(raw(['ls-files', '-v', '-z']))
            .filter(entry => entry.startsWith('S '))
            .map(entry => entry.slice(2)),
        changedFiles: ({ from, to, pathspec, filter }) =>
          nulSeparated(
            raw([
              '-c',
              'core.quotePath=false',
              'diff',
              '--name-only',
              '-z',
              ...(filter ? [`--diff-filter=${filter}`] : []),
              from,
              to,
              '--',
              ...(pathspec ? [pathspec] : [])
            ])
          ),
        show: (commit, file) => raw(['show', `${commit}:${file}`]),
        resolveCommit: ref => raw(['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`]).trim(),
        mergeBase: (left, right) => raw(['merge-base', left, right]).trim()
      }
    })
  )
