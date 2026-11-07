import { defineChangesetRequired } from '@greypan/monorepo-kit'

/**
 * PR changeset 门槛。目录与配置沿用 Changesets 约定（`.changeset/`、`config.json`），本仓没有覆写；
 * 区间两端是每次调用才知道的事实，由入口解析 `--base/--head` 后传进来。
 */
export const changesetRequired = ({ base, head }) => defineChangesetRequired({ base, head })
