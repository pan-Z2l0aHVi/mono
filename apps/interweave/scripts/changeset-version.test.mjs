import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dirname, 'changeset-version.sh')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'interweave-changeset-version-'))
const shim = path.join(fixture, 'shim')
const calls = path.join(fixture, 'calls')
fs.mkdirSync(shim, { recursive: true })

function writeShim(name, body) {
  const file = path.join(shim, name)
  fs.writeFileSync(file, body)
  fs.chmodSync(file, 0o755)
}

writeShim('pnpm', '#!/bin/sh\nprintf \'pnpm %s\\n\' "$*" >> "$CALLS"\nexit 0\n')
writeShim('node', '#!/bin/sh\nprintf \'node %s\\n\' "$*" >> "$CALLS"\nexit 0\n')
writeShim(
  'git',
  '#!/bin/sh\nprintf \'git %s\\n\' "$*" >> "$CALLS"\ncase "$*" in\n' +
    '  *packages/web-ui/CHANGELOG.md*) exit ${GIT_CHANGELOG_STATUS:-0} ;;\n' +
    '  *) exit ${GIT_DIFF_STATUS:-0} ;;\n' +
    'esac\n'
)

const changed = ['pnpm exec changeset version', 'git diff --quiet -- apps/interweave/package.json']
const checked = [...changed, 'git diff --quiet -- packages/web-ui/CHANGELOG.md']
const synced = [...changed, 'pnpm --filter @greypan/interweave run sync:version', checked[2]]
const regenerated = [
  ...checked,
  'pnpm --filter @greypan/md-to-meta run build',
  // 换行续行在真实执行时会被 shell 合并，shim 记录的是展开后的完整参数。
  'node scripts/generate/regenerate-md-to-meta-artifacts.mjs apps/react-web-ui-demo apps/vue-web-ui-demo'
]

function run(diffStatus, changelogStatus = '0') {
  return execFileSync('sh', [script], {
    env: {
      ...process.env,
      PATH: `${shim}${path.delimiter}${process.env.PATH ?? ''}`,
      CALLS: calls,
      GIT_DIFF_STATUS: diffStatus,
      GIT_CHANGELOG_STATUS: changelogStatus
    },
    encoding: 'utf8',
    stdio: 'pipe'
  })
}

function callsText() {
  return fs.readFileSync(calls, 'utf8').trim().split('\n')
}

function runExpectingFailure(diffStatus, changelogStatus = '0') {
  try {
    run(diffStatus, changelogStatus)
  } catch (error) {
    return error
  }
  assert.fail(`expected changeset-version to fail when git exits ${diffStatus}`)
}

try {
  run('0')
  assert.deepEqual(callsText(), checked, 'unchanged app and changelog must not regenerate or sync')

  fs.rmSync(calls)
  run('1')
  assert.deepEqual(callsText(), synced, 'a changed app version must run sync:version only')

  fs.rmSync(calls)
  run('1', '1')
  assert.deepEqual(callsText(), [...synced, ...regenerated.slice(3)], 'both changes must sync and regenerate')

  fs.rmSync(calls)
  run('0', '1')
  assert.deepEqual(
    callsText(),
    regenerated,
    'a changed changelog without an app version bump must still regenerate demo artifacts'
  )

  fs.rmSync(calls)
  const appFailure = runExpectingFailure('3')
  assert.equal(appFailure.status, 3)
  assert.deepEqual(callsText(), changed, 'an unexpected app git status must abort before the changelog check')

  fs.rmSync(calls)
  const changelogFailure = runExpectingFailure('0', '3')
  assert.equal(changelogFailure.status, 3)
  assert.deepEqual(callsText(), checked, 'an unexpected changelog git status must abort the release version step')
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/changeset-version.test.mjs: all assertions passed')
