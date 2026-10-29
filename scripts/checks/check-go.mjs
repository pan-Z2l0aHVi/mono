import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit'

import { goCheck } from '../policies/go-check.mjs'

await runEntrypoint([goCheck], { root: path.resolve(import.meta.dirname, '../..') })
