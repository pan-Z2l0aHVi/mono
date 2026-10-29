import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit'

import { commandConventions } from '../policies/command-conventions.mjs'
import { interweaveTurboInputs } from '../policies/interweave-turbo-inputs.mjs'
import { noMutualLinks } from '../policies/no-mutual-links.mjs'
import { readmeLocales } from '../policies/readme-locales.mjs'
import { testPortCallSites } from '../policies/test-port-call-sites.mjs'
import { turboCacheInvariant } from '../policies/turbo-cache-invariant.mjs'
import { webUiDocsInputs } from '../policies/web-ui-docs-inputs.mjs'

const checks = [
  commandConventions,
  interweaveTurboInputs,
  noMutualLinks,
  readmeLocales,
  testPortCallSites,
  turboCacheInvariant,
  webUiDocsInputs
]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'policy' })
