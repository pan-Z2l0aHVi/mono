import path from 'node:path'

import {
  commandConventions,
  formatClean,
  noMutualLinks,
  runEntrypoint,
  turboCacheInvariant,
  webUiDocsInputs
} from '@greypan/monorepo-kit'

const checks = [commandConventions, formatClean, noMutualLinks, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'pre-commit' })
