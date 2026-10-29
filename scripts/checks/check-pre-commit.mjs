import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit'

import { commandConventions } from '../policies/command-conventions.mjs'
import { noMutualLinks } from '../policies/no-mutual-links.mjs'
import { readmeLocales } from '../policies/readme-locales.mjs'
import { stagedClean } from '../policies/staged-clean.mjs'
import { turboCacheInvariant } from '../policies/turbo-cache-invariant.mjs'
import { webUiDocsInputs } from '../policies/web-ui-docs-inputs.mjs'

const checks = [commandConventions, stagedClean, noMutualLinks, readmeLocales, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'pre-commit' })
