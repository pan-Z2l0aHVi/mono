import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const runContextCheck = () => execFileSync(process.execPath, ['scripts/validate-context.mjs'], { encoding: 'utf8' })

assert.match(runContextCheck(), /validate-context passed/)

console.log('validate-context tests passed')
