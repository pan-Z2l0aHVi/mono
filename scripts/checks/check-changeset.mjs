import path from 'node:path'

import { runEntrypoint } from '@greypan/monorepo-kit'

import { changesetRequired } from '../policies/changeset-required.mjs'
import { changesetStatus } from '../policies/changeset-status.mjs'

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
// 传参坏了（exit 2，要修 workflow）与门禁没过（exit 1，要补 changeset）是两种失效；
// 判据失败由 runEntrypoint 就地写成一行 stderr 并置 exitCode，不在这里兜。
let options
try {
  options = parseOptions(process.argv.slice(2))
} catch (error) {
  process.stderr.write(`check-changeset: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(2)
}
await runEntrypoint([changesetStatus, changesetRequired], { root, ...options, mode: 'ci' })
