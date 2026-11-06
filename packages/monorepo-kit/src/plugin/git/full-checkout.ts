import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../../runner/runner'

import { defineGit, type GitApi } from './git'

const { andThen, err, ok } = rust

export interface FullCheckoutOptions {
  /** 怎么把工作区恢复成全树，属于消费仓库的事实（本仓是 turbo-sparse-scope 的 `--restore`） */
  readonly remedy: string
}

/**
 * 全仓门禁的准入检查，链上以 `git: ` 起头归因。cone 外的已跟踪文件仍在 index 里、却不在磁盘上，
 * 按 tracked 清单或目录遍历扫描的检查因此静默变窄——把「只扫到子集」报成「全仓通过」。
 * 判据取 index 的 skip-worktree 位，因为「磁盘上少了几篇文档」正是会被吞掉的那一步。
 */
export const defineFullCheckout = (options: FullCheckoutOptions): Chain =>
  defineRunner()
    .use(defineGit())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & GitApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const skipped = ctx.skipWorktreeFiles()
            if (skipped.length === 0) return ok(undefined)
            const sample = skipped.slice(0, 3).join(', ')
            return err(
              `git: worktree is sparse: ${skipped.length} tracked file(s) are hidden by the cone (first: ${sample})\n` +
                `repo-wide checks would only scan the cone — ${options.remedy}`
            )
          })
      }))
    )
