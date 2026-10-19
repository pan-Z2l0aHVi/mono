#!/usr/bin/env node
// 一层迁移兼容：登记业务只由 scripts/workflow/task-ledger.mjs 拥有。
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const removedCommands = new Map([
  [
    'guard',
    'guard was removed; run the five task-independent policy checks listed in docs/agents/commit.md (pre-commit runs them automatically).'
  ],
  [
    'freeze',
    'freeze was removed and no longer stages or normalizes files. If needed, run `mise exec -- pnpm fix-code` explicitly, review its changes, then stage only selected files with `git add`.'
  ],
  [
    'review',
    'review is no longer task-ledger state; follow docs/agents/review.md and keep review evidence with the PR.'
  ],
  [
    'approve',
    'approve is no longer task-ledger state; follow docs/agents/review.md and obtain the required user authorization.'
  ],
  [
    'verify',
    'verify is no longer task-ledger state; choose and run checks under docs/agents/verification.md, then report their evidence.'
  ]
])

function main() {
  const [requested, ...args] = process.argv.slice(2)
  const command = requested ?? 'help'
  const guidance = removedCommands.get(command)
  if (guidance) {
    process.stderr.write('deprecated `agent:task ' + command + '`: ' + guidance + '\n')
    process.exitCode = 1
    return
  }

  const mapped = command === 'done' ? 'close' : command
  process.stderr.write(
    'deprecated `agent:task`; use `agent:task-ledger` instead' +
      (mapped === 'close' && command === 'done' ? ' (`done` maps to `close`)' : '') +
      '.\n'
  )
  const target = path.join(import.meta.dirname, 'task-ledger.mjs')
  const result = spawnSync(process.execPath, [target, mapped, ...args], { stdio: 'inherit' })
  if (result.error) {
    process.stderr.write('could not start task-ledger: ' + result.error.message + '\n')
    process.exitCode = 1
  } else {
    process.exitCode = result.status ?? 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main()
