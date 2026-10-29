import { execFileSync } from 'node:child_process'

import { definePlugin } from '@greypan/js-kit'

export interface GitContext {
  readonly root: string
  readonly env?: NodeJS.ProcessEnv
}

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
  readonly changedFiles: (options: ChangedFilesOptions) => string[]
  /** 读某个提交上的 blob；不存在时抛出 */
  readonly show: (commit: string, file: string) => string
  /** 把 ref 解析成提交 sha，无法解析时抛出 */
  readonly resolveCommit: (ref: string) => string
  readonly mergeBase: (left: string, right: string) => string
}

interface GitFailure {
  stderr?: string | Buffer
}

/**
 * 与 `exec` 相反：git 是门禁的判据来源，失败必须抛出，不能降级成返回值。
 */
function runGit(root: string, args: readonly string[], env: NodeJS.ProcessEnv | undefined): string {
  try {
    return execFileSync('git', [...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
  } catch (error) {
    const failure = error as GitFailure
    const detail = String(failure.stderr ?? '').trim()
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
}

function nulSeparated(output: string): string[] {
  return output.split('\0').filter(Boolean)
}

export const defineGit = () =>
  definePlugin<GitApi, GitContext>(ctx => {
    const raw = (args: readonly string[]): string => runGit(ctx.root, args, ctx.env)

    return {
      stagedFiles: () =>
        raw(['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'])
          .split(/\r?\n/)
          .filter(Boolean),
      files: pattern => nulSeparated(raw(['ls-files', '-z', pattern])),
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
