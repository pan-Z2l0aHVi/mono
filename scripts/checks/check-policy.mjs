import path from 'node:path'

import {
  interweaveTurboInputs,
  readmeLocales,
  runEntrypoint,
  turboCacheInvariant,
  webUiDocsInputs
} from '@greypan/monorepo-kit'

import { commandConventions } from '../policies/command-conventions.mjs'
import { noMutualLinks } from '../policies/no-mutual-links.mjs'

const checks = [
  commandConventions,
  interweaveTurboInputs,
  noMutualLinks,
  readmeLocales,
  turboCacheInvariant,
  webUiDocsInputs
]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'policy' })
