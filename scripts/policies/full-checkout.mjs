import { defineFullCheckout } from '@greypan/monorepo-kit'

/**
 * 全仓门禁的准入：稀疏检出的工作区上，cone 外的已跟踪文件不在磁盘上，按 tracked 清单扫描的检查
 * 只覆盖子集。收缩口径与恢复代价见 `.agents/skills/turbo-sparse-scope/SKILL.md`。
 */
export const fullCheckout = defineFullCheckout({
  remedy:
    'restore the full worktree with `node .agents/skills/turbo-sparse-scope/sparse-scope.mjs --restore`, ' +
    'then run `pnpm install --frozen-lockfile` and `pnpm build`, or leave this gate to CI'
})
