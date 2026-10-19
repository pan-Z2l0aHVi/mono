import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(repoRoot, 'scripts', 'validate-context.mjs')
const unrelatedCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-validate-context-test-'))

try {
  assert.match(
    execFileSync(process.execPath, [script], { cwd: unrelatedCwd, encoding: 'utf8' }),
    /validate-context passed/
  )
} finally {
  fs.rmSync(unrelatedCwd, { recursive: true, force: true })
}

console.log('validate-context tests passed')
