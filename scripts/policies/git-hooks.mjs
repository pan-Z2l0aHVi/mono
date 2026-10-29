import fs from 'node:fs'
import path from 'node:path'

/**
 * 本仓交付的 git hook 名单：`.vite-hooks/` 下受版本控制的文件是唯一事实来源。
 * 安装器对要安装的 worktree 现读，`git-hooks-status` 检查对仓库根读同一份派生结果。
 *
 * 这里不 import `@greypan/monorepo-kit`：`prepare` 会在 `pnpm install` 期间运行安装器，
 * 而包的导出指向构建产物，安装期还不存在。
 */
export function versionedGitHooks(root) {
  const directory = path.join(root, '.vite-hooks')
  const hooks = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort()
  if (hooks.length === 0) throw new Error(`${directory} contains no git hooks`)
  return hooks
}
