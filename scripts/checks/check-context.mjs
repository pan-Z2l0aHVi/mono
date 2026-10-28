import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit/policy/check-runner'
import { name, run } from '@greypan/monorepo-kit/policy/context-corpus'

await runEntrypoint([{ name, run }], {
  root: path.resolve(import.meta.dirname, '../..'),
  mode: process.argv.includes('--report') ? 'report' : 'ci'
})
