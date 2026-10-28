import path from 'node:path'

import {
  commandConventions,
  interweaveTurboInputs,
  noMutualLinks,
  runEntrypoint,
  turboCacheInvariant,
  webUiDocsInputs
} from '@greypan/monorepo-kit'

const checks = [commandConventions, interweaveTurboInputs, noMutualLinks, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'policy' })
