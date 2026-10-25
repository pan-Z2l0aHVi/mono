import path from 'node:path'

import { runEntrypoint } from '../lib/check-runner.mjs'
import * as commandConventions from '../lib/command-conventions.mjs'
import * as interweaveTurboInputs from '../lib/interweave-turbo-inputs.mjs'
import * as noMutualLinks from '../lib/no-mutual-links.mjs'
import * as shellI18nCatalog from '../lib/shell-i18n-catalog.mjs'
import * as turboCacheInvariant from '../lib/turbo-cache-invariant.mjs'
import * as webUiDocsInputs from '../lib/web-ui-docs-inputs.mjs'

const checks = [
  commandConventions,
  interweaveTurboInputs,
  noMutualLinks,
  shellI18nCatalog,
  turboCacheInvariant,
  webUiDocsInputs
]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'policy' })
