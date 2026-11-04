import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit'

import { fullCheckout } from '../policies/full-checkout.mjs'
import { scriptTests } from '../policies/script-tests.mjs'

await runEntrypoint([fullCheckout, scriptTests], { root: path.resolve(import.meta.dirname, '../..') })
