/**
 * 本仓交付的 git hook 名单。`.vite-hooks/` 下受版本控制的 hook 是唯一事实来源，
 * 安装器与 `git-hooks-status` 检查共用这一份名单。
 *
 * 这里不 import `@greypan/monorepo-kit`：`prepare` 会在 `pnpm install` 期间运行安装器，
 * 而包的导出指向构建产物，安装期还不存在。
 */
export const requiredGitHooks = ['commit-msg', 'pre-commit']
