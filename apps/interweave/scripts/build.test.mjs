import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dirname, 'build.mjs')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'interweave-build-'))
const shim = path.join(fixture, 'shim')
const calls = path.join(fixture, 'calls')
const envs = path.join(fixture, 'envs')
fs.mkdirSync(shim, { recursive: true })

const windows = process.platform === 'win32'
const pnpm = path.join(shim, windows ? 'pnpm.cmd' : 'pnpm')
fs.writeFileSync(
  pnpm,
  windows
    ? '@echo off\r\necho %*>>"%CALLS%"\r\necho SKIP_FRONTEND=%SKIP_FRONTEND%>>"%ENVS%"\r\nexit /b %EXIT_CODE%\r\n'
    : '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$CALLS"\nprintf \'SKIP_FRONTEND=%s\\n\' "${SKIP_FRONTEND:-}" >> "$ENVS"\nexit ${EXIT_CODE:-0}\n'
)
fs.chmodSync(pnpm, 0o755)

const expected =
  process.platform === 'darwin' ? 'build:macos:app' : process.platform === 'win32' ? 'build:windows' : 'build:frontend'

function run(exitCode = '0', extraEnv = {}) {
  const env = { ...process.env }
  delete env.TURBO_HASH
  delete env.SKIP_FRONTEND
  return execFileSync(process.execPath, [script], {
    env: {
      ...env,
      ...extraEnv,
      PATH: `${shim}${path.delimiter}${process.env.PATH ?? ''}`,
      CALLS: calls,
      ENVS: envs,
      EXIT_CODE: exitCode
    },
    encoding: 'utf8',
    stdio: 'pipe'
  })
}

try {
  run()
  assert.equal(
    fs.readFileSync(calls, 'utf8').trim(),
    `run ${expected}`,
    'build must dispatch to the host platform script'
  )

  assert.equal(
    fs.readFileSync(envs, 'utf8').trim(),
    'SKIP_FRONTEND=',
    'build must not ask the native task to skip the frontend without turbo'
  )

  fs.rmSync(calls)
  fs.rmSync(envs)
  run('0', { TURBO_HASH: 'abc123' })
  assert.equal(
    fs.readFileSync(calls, 'utf8').trim(),
    `run ${expected}`,
    'turbo builds must still dispatch to the host platform script'
  )
  assert.equal(
    fs.readFileSync(envs, 'utf8').trim(),
    'SKIP_FRONTEND=1',
    'build must let the native task reuse the frontend dist already built by turbo'
  )

  fs.rmSync(calls)
  assert.throws(
    () => run('7'),
    error => error.status === 7,
    'build must propagate a failing child status'
  )
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/build.test.mjs: all assertions passed')
