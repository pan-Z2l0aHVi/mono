import { defineTestPortCallSites, readPnpmWorkspaceDirectories } from '@greypan/monorepo-kit'

import { repoRoot } from './repo-root.mjs'

/**
 * 端口分配的调用面：`monorepo.json` 登记 project，各 workspace 的 `vite.config.ts` 逐个取用。
 * 两边不一致时运行时不会报错——漏登记的 project 或改名后残留的调用只会悄悄落到相邻段位，
 * 所以要求集合完全相等，且每个段位只被一个 project 引用。
 */
export const testPortCallSites = defineTestPortCallSites({
  configGlobs: readPnpmWorkspaceDirectories(repoRoot).map(directory => `${directory}/**/vite.config.ts`),
  callName: 'testApiPort'
})
