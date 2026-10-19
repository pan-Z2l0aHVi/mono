import path from 'node:path'

import { run } from '../lib/package-contract.mjs'

const args = process.argv.slice(2)
const rootOptionIndex = args.indexOf('--root')
const quiet = args.includes('--quiet')
if (rootOptionIndex >= 0 && !args[rootOptionIndex + 1]) {
  console.error('Usage: node scripts/checks/check-pack.mjs [--quiet] [--root <repository-root>]')
  process.exit(1)
}
const root =
  rootOptionIndex >= 0 ? path.resolve(args[rootOptionIndex + 1] ?? '') : path.resolve(import.meta.dirname, '../..')
try {
  const detail = await run({ root })
  if (!quiet) console.log(`check-pack passed (${detail})`)
} catch (error) {
  if (!quiet)
    console.error(`check-pack failed with error(s):\n${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
