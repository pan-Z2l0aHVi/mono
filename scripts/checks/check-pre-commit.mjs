import path from 'node:path'

import { runEntrypoint } from '../lib/check-runner.mjs'
import * as commandConventions from '../lib/command-conventions.mjs'
import * as formatClean from '../lib/format-clean.mjs'
import * as noMutualLinks from '../lib/no-mutual-links.mjs'
import * as turboCacheInvariant from '../lib/turbo-cache-invariant.mjs'
import * as webUiDocsInputs from '../lib/web-ui-docs-inputs.mjs'

const checks = [commandConventions, formatClean, noMutualLinks, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'pre-commit' })
