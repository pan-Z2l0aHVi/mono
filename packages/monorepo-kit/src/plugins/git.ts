import { definePlugin } from '@greypan/js-kit'

import { git } from '../shared/git'

export interface GitContext {
  readonly root: string
  readonly env?: NodeJS.ProcessEnv
}

export interface GitApi {
  /** 只读的 index 查询：`--diff-filter=ACMR` 排除删除，`core.quotePath=false` 保留原样路径 */
  readonly stagedFiles: () => string[]
}

export const defineGit = () =>
  definePlugin<GitApi, GitContext>(ctx => ({
    stagedFiles: () => {
      let output: string
      try {
        output = git(
          ctx.root,
          ['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
          { env: ctx.env }
        )
      } catch {
        throw new Error(`cannot run: git diff --cached failed in ${ctx.root}`)
      }
      return output.split(/\r?\n/).filter(Boolean)
    }
  }))
