import { defineGitHooksStatus } from '@greypan/monorepo-kit'

import { versionedGitHooks } from './git-hooks.mjs'
import { repoRoot } from './repo-root.mjs'

/**
 * hook 安装状态的判定在包里，名单与「修不回来时怎么办」的指引是本仓事实。
 * 名单由 `.vite-hooks/` 现读，且 `git-hooks.mjs` 不 import 包：`prepare` 会在 `pnpm install`
 * 期间运行安装器，那时包的构建产物还不存在，两件事不能合并成一条依赖边。
 */
export const gitHooksStatus = defineGitHooksStatus({
  required: versionedGitHooks(repoRoot),
  installHint:
    'Run `node scripts/maintenance/install-git-hooks.mjs` directly; a plain `pnpm install` only runs prepare when the lockfile or node_modules change (`pnpm install --force` also works). When core.hooksPath points outside .vite-hooks, vp config leaves that path alone and only the installer repairs it.'
})
