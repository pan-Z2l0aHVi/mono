import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit'

import { scriptTests } from '../policies/script-tests.mjs'

await runEntrypoint([scriptTests], { root: path.resolve(import.meta.dirname, '../..') })
