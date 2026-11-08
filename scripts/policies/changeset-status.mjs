import { defineChangesetStatus } from '@greypan/monorepo-kit'

/**
 * 发布前 `changeset status --since=<base>` 的门槛，目录约定同 `changeset-required.mjs`。
 * 区间下界是每次调用才知道的事实，由入口解析 `--base` 后传进来。
 */
export const changesetStatus = ({ base }) => defineChangesetStatus({ base })
