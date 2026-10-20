import path from 'node:path'

import { runEntrypoint } from '../lib/check-runner.mjs'
import { name, run } from '../lib/go-check.mjs'

await runEntrypoint([{ name, run }], { root: path.resolve(import.meta.dirname, '../..') })
