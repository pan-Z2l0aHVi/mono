import path from 'node:path'

import { runEntrypoint, scriptTests } from '@greypan/monorepo-kit'

await runEntrypoint([scriptTests], { root: path.resolve(import.meta.dirname, '../..') })
