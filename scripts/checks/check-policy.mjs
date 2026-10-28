import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit/policy/check-runner'
import * as commandConventions from '@greypan/monorepo-kit/policy/command-conventions'
import * as interweaveTurboInputs from '@greypan/monorepo-kit/policy/interweave-turbo-inputs'
import * as noMutualLinks from '@greypan/monorepo-kit/policy/no-mutual-links'
import * as turboCacheInvariant from '@greypan/monorepo-kit/policy/turbo-cache-invariant'
import * as webUiDocsInputs from '@greypan/monorepo-kit/policy/web-ui-docs-inputs'

const checks = [commandConventions, interweaveTurboInputs, noMutualLinks, turboCacheInvariant, webUiDocsInputs]

await runEntrypoint(checks, { root: path.resolve(import.meta.dirname, '../..'), mode: 'policy' })
