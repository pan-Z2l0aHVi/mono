import path from 'node:path'

import {
  commandConventions,
  noMutualLinks,
  readmeLocales,
  runEntrypoint,
  stagedClean,
  turboCacheInvariant,
  webUiDocsInputs
} from '@greypan/monorepo-kit'

const checks = [commandConventions, stagedClean, noMutualLinks, readmeLocales, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'pre-commit' })
