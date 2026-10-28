import path from 'node:path'

import { goCheck, runEntrypoint } from '@greypan/monorepo-kit'

await runEntrypoint([goCheck], { root: path.resolve(import.meta.dirname, '../..') })
