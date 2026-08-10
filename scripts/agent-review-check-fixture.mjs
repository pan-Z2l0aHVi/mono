import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { calculateWorktreeSnapshot } from './agent-review-snapshot.mjs'

const root = path.resolve(import.meta.dirname, '..')
const checker = path.join(root, 'scripts/agent-review-check.mjs')
const template = fs.readFileSync(path.join(root, 'scripts/fixtures/canonical-review-evidence.md'), 'utf8')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mono-agent-review-fixture-'))
const implementation = path.join(tempRoot, 'implementation')
const reviewer = path.join(tempRoot, 'reviewer')

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function initRepo(directory, state) {
  fs.mkdirSync(directory, { recursive: true })
  git(['init', '--quiet'], directory)
  fs.writeFileSync(path.join(directory, 'state.txt'), state)
  git(['add', 'state.txt'], directory)
  git(
    ['-c', 'user.name=Agent Fixture', '-c', 'user.email=fixture@example.test', 'commit', '--quiet', '-m', 'fixture'],
    directory
  )
}

function runChecker(evidence) {
  return spawnSync(
    process.execPath,
    [checker, '--evidence', evidence, '--implementation-worktree', implementation, '--reviewer-worktree', reviewer],
    {
      cwd: root,
      encoding: 'utf8'
    }
  )
}

try {
  initRepo(implementation, 'implementation-a\n')
  initRepo(reviewer, 'reviewer\n')

  const evidence = path.join(reviewer, 'review.md')
  const content = template
    .replace('<IMPLEMENTATION_WORKTREE>', implementation)
    .replace('<REVIEWER_WORKTREE>', reviewer)
    .replace('<SNAPSHOT>', calculateWorktreeSnapshot(implementation))
  fs.writeFileSync(evidence, content)

  const passed = runChecker(evidence)
  if (passed.status !== 0) throw new Error(`canonical evidence should pass:\n${passed.stdout}\n${passed.stderr}`)

  const mismatchedWorktrees = [
    ['implementation worktree', implementation, reviewer, '--implementation-worktree'],
    ['reviewer worktree', reviewer, implementation, '--reviewer-worktree']
  ]
  for (const [field, expected, incorrect, option] of mismatchedWorktrees) {
    fs.writeFileSync(evidence, content.replace(`${field}: ${expected}`, `${field}: ${incorrect}`))
    const mismatch = runChecker(evidence)
    if (mismatch.status === 0 || !`${mismatch.stdout}\n${mismatch.stderr}`.includes(option)) {
      throw new Error(`evidence with mismatched ${field} should fail:\n${mismatch.stdout}\n${mismatch.stderr}`)
    }
  }
  fs.writeFileSync(evidence, content)

  fs.writeFileSync(path.join(implementation, 'state.txt'), 'implementation-b\n')
  git(['add', 'state.txt'], implementation)
  git(
    [
      '-c',
      'user.name=Agent Fixture',
      '-c',
      'user.email=fixture@example.test',
      'commit',
      '--quiet',
      '-m',
      'second fixture'
    ],
    implementation
  )

  const stale = runChecker(evidence)
  if (stale.status === 0 || !`${stale.stdout}\n${stale.stderr}`.includes('working-tree-snapshot sha256')) {
    throw new Error(`stale evidence should fail after HEAD changes:\n${stale.stdout}\n${stale.stderr}`)
  }

  console.log(
    'agent-review-check fixture passed: canonical evidence is accepted, mismatched worktrees are rejected, and stale clean HEAD is rejected'
  )
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
