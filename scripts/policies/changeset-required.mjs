import { defineChangesetRequired } from '@greypan/monorepo-kit'

/** PR changeset 门槛。目录与配置沿用 Changesets 约定（`.changeset/`、`config.json`），本仓没有覆写。 */
export const changesetRequired = defineChangesetRequired()
