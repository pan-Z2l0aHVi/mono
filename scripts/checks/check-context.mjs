import path from 'node:path'

import { runEntrypoint } from '../lib/check-runner.mjs'
import { name, run } from '../lib/context-corpus.mjs'

await runEntrypoint([{ name, run }], {
  root: path.resolve(import.meta.dirname, '../..'),
  mode: process.argv.includes('--report') ? 'report' : 'ci'
})
