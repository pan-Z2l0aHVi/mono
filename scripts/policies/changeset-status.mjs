import { defineChangesetStatus } from '@greypan/monorepo-kit'

/** 发布前 `changeset status --since=<base>` 的门槛，目录约定同 `changeset-policy.mjs`。 */
export const changesetStatus = defineChangesetStatus()
