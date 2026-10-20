import path from 'node:path'

import { runEntrypoint } from '../lib/check-runner.mjs'
import { name, run } from '../lib/script-tests.mjs'

await runEntrypoint([{ name, run }], { root: path.resolve(import.meta.dirname, '../..') })
