import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit'

import { contextCorpus } from '../policies/context-corpus.mjs'
import { fullCheckout } from '../policies/full-checkout.mjs'

await runEntrypoint([fullCheckout, contextCorpus], {
  root: path.resolve(import.meta.dirname, '../..'),
  mode: process.argv.includes('--report') ? 'report' : 'ci'
})
