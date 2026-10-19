import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dirname, 'release-version.mjs')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'interweave-release-version-'))
const shim = path.join(fixture, 'shim')
const calls = path.join(fixture, 'calls')
fs.mkdirSync(shim, { recursive: true })

function writeShim(name, posix, windowsBody) {
  const file = path.join(shim, process.platform === 'win32' ? `${name}.cmd` : name)
  fs.writeFileSync(file, process.platform === 'win32' ? windowsBody : posix)
  fs.chmodSync(file, 0o755)
}

writeShim(
  'pnpm',
  '#!/bin/sh\nprintf \'pnpm %s\\n\' "$*" >> "$CALLS"\nexit 0\n',
  '@echo off\r\necho pnpm %*>>"%CALLS%"\r\nexit /b 0\r\n'
)
writeShim(
  'git',
  '#!/bin/sh\nprintf \'git %s\\n\' "$*" >> "$CALLS"\nexit ${GIT_DIFF_STATUS:-0}\n',
  '@echo off\r\necho git %*>>"%CALLS%"\r\nexit /b %GIT_DIFF_STATUS%\r\n'
)

const changed = ['pnpm exec changeset version', 'git diff --quiet -- apps/interweave/package.json']
const synced = [...changed, 'pnpm --filter @greypan/interweave run sync:version']

function run(diffStatus) {
  return execFileSync(process.execPath, [script], {
    env: {
      ...process.env,
      PATH: `${shim}${path.delimiter}${process.env.PATH ?? ''}`,
      CALLS: calls,
      GIT_DIFF_STATUS: diffStatus
    },
    encoding: 'utf8',
    stdio: 'pipe'
  })
}

function callsText() {
  return fs.readFileSync(calls, 'utf8').trim().split('\n')
}

function runExpectingFailure(diffStatus) {
  try {
    run(diffStatus)
  } catch (error) {
    return error
  }
  assert.fail(`expected release-version to fail when git exits ${diffStatus}`)
}

try {
  run('0')
  assert.deepEqual(callsText(), changed, 'an unchanged app version must not run sync:version')

  fs.rmSync(calls)
  run('1')
  assert.deepEqual(callsText(), synced, 'a changed app version must run sync:version')

  fs.rmSync(calls)
  const failure = runExpectingFailure('3')
  assert.equal(failure.status, 3)
  assert.deepEqual(callsText(), changed, 'an unexpected git status must abort the release version step')
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/release-version.test.mjs: all assertions passed')
