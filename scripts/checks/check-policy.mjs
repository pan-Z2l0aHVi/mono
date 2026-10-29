import path from 'node:path'

import {
  interweaveTurboInputs,
  noMutualLinks,
  readmeLocales,
  runEntrypoint,
  turboCacheInvariant,
  webUiDocsInputs
} from '@greypan/monorepo-kit'

import { commandConventions } from '../policies/command-conventions.mjs'

const checks = [
  commandConventions,
  interweaveTurboInputs,
  noMutualLinks,
  readmeLocales,
  turboCacheInvariant,
  webUiDocsInputs
]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'policy' })
