import { defineChangesetIgnoreCoverage } from '@greypan/monorepo-kit'

/**
 * Changesets 版本管理覆盖守卫：
 * 所有公开 npm 包必须参与版本管理；所有私有包必须加入 `.changeset/config.json` 的 `ignore`，
 * 仅显式放行桌面端交付应用 `@greypan/interweave`。
 */
export const changesetIgnoreCoverage = defineChangesetIgnoreCoverage({
  allowedPrivateVersioned: ['@greypan/interweave']
})
