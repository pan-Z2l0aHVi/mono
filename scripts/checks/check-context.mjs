import path from 'node:path'

import { contextCorpus, runEntrypoint } from '@greypan/monorepo-kit'

await runEntrypoint([contextCorpus], {
  root: path.resolve(import.meta.dirname, '../..'),
  mode: process.argv.includes('--report') ? 'report' : 'ci'
})
