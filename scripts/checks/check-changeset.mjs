import path from 'node:path'

import * as changesetPolicy from '../lib/changeset-policy.mjs'
import * as changesetStatus from '../lib/changeset-status.mjs'
import { runEntrypoint } from '../lib/check-runner.mjs'

function parseOptions(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (key !== '--base' && key !== '--head') throw new Error(`unexpected argument: ${key}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${key}`)
    options[key.slice(2)] = value
    index += 1
  }
  if (!options.base) throw new Error('missing required option --base <sha-or-ref>')
  if (!options.head) throw new Error('missing required option --head <sha-or-ref>')
  return options
}

const root = path.resolve(import.meta.dirname, '../..')
try {
  const options = parseOptions(process.argv.slice(2))
  await runEntrypoint([changesetStatus, changesetPolicy], { root, ...options, mode: 'ci' })
} catch (error) {
  process.stderr.write(`check-changeset failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
