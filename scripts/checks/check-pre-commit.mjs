import path from 'node:path'

import {
  noMutualLinks,
  readmeLocales,
  runEntrypoint,
  turboCacheInvariant,
  webUiDocsInputs
} from '@greypan/monorepo-kit'

import { commandConventions } from '../policies/command-conventions.mjs'
import { stagedClean } from '../policies/staged-clean.mjs'

const checks = [commandConventions, stagedClean, noMutualLinks, readmeLocales, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'pre-commit' })
