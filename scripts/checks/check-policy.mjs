import path from 'node:path'

import { runEntrypoint } from '../lib/check-runner.mjs'

import * as commandConventions from './command-conventions.mjs'
import * as noMutualLinks from './no-mutual-links.mjs'
import * as turboCacheInvariant from './turbo-cache-invariant.mjs'
import * as webUiDocsInputs from './web-ui-docs-inputs.mjs'

const checks = [commandConventions, noMutualLinks, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'policy' })
