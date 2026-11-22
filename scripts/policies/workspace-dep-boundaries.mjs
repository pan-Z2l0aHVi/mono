import { defineWorkspaceDepBoundaries, readPnpmWorkspaceDirectories } from '@greypan/monorepo-kit'

import { repoRoot } from './repo-root.mjs'

/**
 * 本仓 workspace Manifest 拓扑依赖边界：
 * 全图零循环依赖、公开包运行时/peer/optional 禁引私有包、`packages/*` 禁引 `apps/*`（含嵌套应用 workspace）。
 */
export const workspaceDepBoundaries = defineWorkspaceDepBoundaries({
  workspaces: readPnpmWorkspaceDirectories(repoRoot),
  applicationDirs: ['apps']
})
