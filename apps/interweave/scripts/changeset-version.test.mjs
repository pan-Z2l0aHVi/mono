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
// shim 内嵌的是 shell 片段，`esac` 是 `case` 的结束关键字，不是拼写错误。
// cspell:ignore esac
writeShim(
  'git',
  '#!/bin/sh\nprintf \'git %s\\n\' "$*" >> "$CALLS"\ncase "$*" in\n' +
    '  *packages/web-ui/CHANGELOG.md*) exit ${GIT_CHANGELOG_STATUS:-0} ;;\n' +
    '  *packages/js-kit/CHANGELOG.md*) exit ${GIT_DEV_KIT_CHANGELOG_STATUS:-0} ;;\n' +
    '  *) exit ${GIT_DIFF_STATUS:-0} ;;\n' +
    'esac\n'
)

const changed = ['pnpm exec changeset version', 'git diff --quiet -- apps/interweave/package.json']
const webUiCheck = 'git diff --quiet -- packages/web-ui/CHANGELOG.md'
const devKitCheck = 'git diff --quiet -- packages/js-kit/CHANGELOG.md packages/browser-kit/CHANGELOG.md'
const checked = [...changed, webUiCheck, devKitCheck]
const synced = [...changed, 'pnpm --filter @greypan/interweave run sync:version', webUiCheck, devKitCheck]
const webUiRegenerate = [
  'pnpm exec turbo run build --filter=@greypan/react-web-ui-demo^... --filter=@greypan/vue-web-ui-demo^...',
  'node scripts/generate/regenerate-md-to-meta-artifacts.mjs apps/react-web-ui-demo apps/vue-web-ui-demo'
]
const devKitRegenerate = [
  'pnpm exec turbo run build --filter=@greypan/dev-kit-demo^...',
  'node scripts/generate/regenerate-md-to-meta-artifacts.mjs apps/dev-kit-demo'
]

function run(diffStatus, changelogStatus = '0', devKitChangelogStatus = '0') {
  return execFileSync('sh', [script], {
    env: {
      ...process.env,
      PATH: `${shim}${path.delimiter}${process.env.PATH ?? ''}`,
      CALLS: calls,
      GIT_DIFF_STATUS: diffStatus,
      GIT_CHANGELOG_STATUS: changelogStatus,
      GIT_DEV_KIT_CHANGELOG_STATUS: devKitChangelogStatus
    },
    encoding: 'utf8',
    stdio: 'pipe'
  })
}

function callsText() {
  return fs.readFileSync(calls, 'utf8').trim().split('\n')
}

function runExpectingFailure(diffStatus, changelogStatus = '0', devKitChangelogStatus = '0') {
  try {
    run(diffStatus, changelogStatus, devKitChangelogStatus)
  } catch (error) {
    return error
  }
  assert.fail(`expected changeset-version to fail when git exits ${diffStatus}`)
}

try {
  run('0')
  assert.deepEqual(callsText(), checked, 'unchanged app and changelogs must not regenerate or sync')

  fs.rmSync(calls)
  run('1')
  assert.deepEqual(callsText(), synced, 'a changed app version must run sync:version only')

  fs.rmSync(calls)
  run('1', '1', '0')
  assert.deepEqual(
    callsText(),
    [...changed, 'pnpm --filter @greypan/interweave run sync:version', webUiCheck, ...webUiRegenerate, devKitCheck],
    'app version + web-ui changelog must sync and regenerate web-ui demos'
  )

  fs.rmSync(calls)
  run('0', '1', '0')
  assert.deepEqual(
    callsText(),
    [...changed, webUiCheck, ...webUiRegenerate, devKitCheck],
    'a changed web-ui changelog without an app version bump must still regenerate web-ui demo artifacts'
  )

  fs.rmSync(calls)
  run('0', '0', '1')
  assert.deepEqual(
    callsText(),
    [...changed, webUiCheck, devKitCheck, ...devKitRegenerate],
    'a changed js-kit or browser-kit changelog must regenerate dev-kit-demo artifacts'
  )

  fs.rmSync(calls)
  const appFailure = runExpectingFailure('3')
  assert.equal(appFailure.status, 3)
  assert.deepEqual(callsText(), changed, 'an unexpected app git status must abort before the changelog checks')

  fs.rmSync(calls)
  const changelogFailure = runExpectingFailure('0', '3', '0')
  assert.equal(changelogFailure.status, 3)
  assert.deepEqual(
    callsText(),
    [...changed, webUiCheck],
    'an unexpected web-ui changelog git status must abort the release version step'
  )

  fs.rmSync(calls)
  const devKitFailure = runExpectingFailure('0', '0', '3')
  assert.equal(devKitFailure.status, 3)
  assert.deepEqual(
    callsText(),
    checked,
    'an unexpected dev-kit changelog git status must abort the release version step'
  )
} finally {
  fs.rmSync(fixture, { recursive: true, force: true })
}

console.log('apps/interweave/scripts/changeset-version.test.mjs: all assertions passed')
