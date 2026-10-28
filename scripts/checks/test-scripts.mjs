import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit/policy/check-runner'
import { name, run } from '@greypan/monorepo-kit/policy/script-tests'

await runEntrypoint([{ name, run }], { root: path.resolve(import.meta.dirname, '../..') })
