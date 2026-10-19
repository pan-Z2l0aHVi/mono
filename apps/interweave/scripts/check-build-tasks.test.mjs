import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'interweave-build-tasks-'))
const scriptDir = path.join(fixture, 'scripts')
const buildDir = path.join(fixture, 'build')
const script = path.join(scriptDir, 'check-build-tasks.mjs')
fs.mkdirSync(scriptDir, { recursive: true })
fs.mkdirSync(buildDir, { recursive: true })
fs.copyFileSync(path.join(import.meta.dirname, 'check-build-tasks.mjs'), script)

function writeTaskfile(content) {
  fs.writeFileSync(path.join(buildDir, 'Taskfile.yml'), content)
}

function run() {
  return execFileSync(process.execPath, [script], { encoding: 'utf8', stdio: 'pipe' })
}

function runExpectingFailure() {
  try {
    run()
  } catch (error) {
    return error
  }
  assert.fail('expected the build task check to fail')
}

try {
  writeTaskfile(`version: '3'\ntasks:\n  build:\n    cmds:\n      - echo relative/path\n`)
  assert.match(run(), /host-neutral/)

  writeTaskfile(`version: '3'\ntasks:\n  build:\n    cmds:\n      - /usr/bin/echo hi\n`)
  const failure = runExpectingFailure()
  assert.equal(failure.status, 1)
  assert.match(failure.stderr, /line 5: \/usr\/bin\/echo/)
  assert.match(failure.stderr, /Move the darwin-only step/)

  writeTaskfile(`version: '3'\ntasks:\n  build:\n    cmds:\n      - echo ok\n  other: /absolute/not/in/cmds\n`)
  assert.match(run(), /host-neutral/)
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/check-build-tasks.test.mjs: all assertions passed')
