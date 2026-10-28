import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit/policy/check-runner'
import * as commandConventions from '@greypan/monorepo-kit/policy/command-conventions'
import * as formatClean from '@greypan/monorepo-kit/policy/format-clean'
import * as noMutualLinks from '@greypan/monorepo-kit/policy/no-mutual-links'
import * as turboCacheInvariant from '@greypan/monorepo-kit/policy/turbo-cache-invariant'
import * as webUiDocsInputs from '@greypan/monorepo-kit/policy/web-ui-docs-inputs'

const checks = [commandConventions, formatClean, noMutualLinks, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'pre-commit' })
