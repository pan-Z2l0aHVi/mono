import { findRepoRoot } from '@greypan/monorepo-kit'

/**
 * 本仓根目录，即 `pnpm-workspace.yaml` 所在处。
 * 不按目录深度写 `../..`：policy 文件搬家时那种写法会静默指向别处，读到的就是另一份配置。
 */
export const repoRoot = findRepoRoot(import.meta.dirname)
