import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { calculateWorktreeSnapshot } from './agent-review-snapshot.mjs'

const args = process.argv.slice(2)
const value = name => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const evidence = value('--evidence')
const implementationWorktree = value('--implementation-worktree')
const reviewerWorktree = value('--reviewer-worktree')
const expectedSnapshot = value('--snapshot-sha256')

if (!evidence || !implementationWorktree || !reviewerWorktree) {
  console.error(
    'Usage: pnpm check:agent-review -- --evidence <file> --implementation-worktree <path> --reviewer-worktree <path> [--snapshot-sha256 <sha256>]'
  )
  process.exit(2)
}

const errors = []
const resolveExisting = (file, label) => {
  const absolute = path.resolve(file)
  if (!fs.existsSync(absolute)) {
    errors.push(`${label} does not exist: ${file}`)
    return absolute
  }
  return fs.realpathSync(absolute)
}
const implementation = resolveExisting(implementationWorktree, 'implementation worktree')
const reviewer = resolveExisting(reviewerWorktree, 'reviewer worktree')
const evidenceAbsolute = path.resolve(evidence)
const evidencePath = fs.existsSync(evidenceAbsolute) ? fs.realpathSync(evidenceAbsolute) : evidenceAbsolute

if (!fs.existsSync(evidenceAbsolute)) errors.push(`review evidence does not exist: ${evidence}`)
if (implementation === reviewer) errors.push('implementation and reviewer worktrees must be different')
if (!fs.existsSync(path.join(implementation, '.git')))
  errors.push(`implementation worktree is not a Git worktree: ${implementation}`)
if (!fs.existsSync(path.join(reviewer, '.git'))) errors.push(`reviewer worktree is not a Git worktree: ${reviewer}`)

const fields = [
  'reviewer identity/client',
  'implementation agent',
  'implementation worktree',
  'reviewer worktree',
  'working-tree-snapshot sha256',
  'changed files',
  'findings',
  'verification status',
  'verification evidence',
  'residual risks'
]
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function fieldMatch(source, field) {
  return source.match(new RegExp(`^\\s*${escapeRegExp(field)}\\s*:\\s*(.*)$`, 'im'))
}

function fieldHasValue(source, field) {
  const match = fieldMatch(source, field)
  if (!match) return false
  if (match[1].trim()) return true

  const start = (match.index ?? 0) + match[0].length
  const rest = source.slice(start)
  const nextField = new RegExp(`^\\s*(?:${fields.map(escapeRegExp).join('|')})\\s*:`, 'im').exec(rest)
  const block = nextField ? rest.slice(0, nextField.index) : rest
  return block.split('\n').some(line => /^\s*(?:[-*+]\s+|\S)/.test(line) && line.trim().length > 0)
}

function validateRecordedWorktree(source, field, actualWorktree, option) {
  const recorded = fieldMatch(source, field)?.[1]?.trim()
  if (!recorded) return
  if (!path.isAbsolute(recorded)) {
    errors.push(`evidence ${field} must be an absolute path: ${recorded}`)
    return
  }

  const recordedPath = fs.existsSync(recorded) ? fs.realpathSync(recorded) : path.resolve(recorded)
  if (recordedPath !== actualWorktree) {
    errors.push(`evidence ${field} does not match ${option}`)
  }
}

if (fs.existsSync(evidencePath)) {
  const source = fs.readFileSync(evidencePath, 'utf8')
  for (const field of fields) {
    if (!fieldHasValue(source, field)) errors.push(`evidence missing value for ${field}:`)
  }

  const reviewerIdentity = fieldMatch(source, 'reviewer identity/client')?.[1]?.trim()
  const implementationIdentity = fieldMatch(source, 'implementation agent')?.[1]?.trim()
  if (reviewerIdentity && implementationIdentity && reviewerIdentity === implementationIdentity) {
    errors.push('reviewer identity/client must differ from implementation agent')
  }

  validateRecordedWorktree(source, 'implementation worktree', implementation, '--implementation-worktree')
  validateRecordedWorktree(source, 'reviewer worktree', reviewer, '--reviewer-worktree')

  if (fs.existsSync(path.join(implementation, '.git')) && fs.existsSync(path.join(reviewer, '.git'))) {
    const actualSnapshot = calculateWorktreeSnapshot(implementation)
    const recordedSnapshot = fieldMatch(source, 'working-tree-snapshot sha256')?.[1]?.trim()
    if (recordedSnapshot && recordedSnapshot !== actualSnapshot) {
      errors.push(`working-tree-snapshot sha256 does not match implementation worktree (expected ${actualSnapshot})`)
    }
    if (expectedSnapshot && expectedSnapshot !== actualSnapshot) {
      errors.push(`--snapshot-sha256 does not match implementation worktree (expected ${actualSnapshot})`)
    }
  }

  const evidenceRelativeToReviewer = path.relative(reviewer, evidencePath)
  if (evidenceRelativeToReviewer.startsWith('..') || path.isAbsolute(evidenceRelativeToReviewer)) {
    errors.push('review evidence must be stored in the reviewer worktree')
  }
}

if (errors.length) {
  console.error(`agent-review-check failed with ${errors.length} error(s):`)
  console.error(errors.map(error => `- ${error}`).join('\n'))
  process.exit(1)
}
console.log(
  'agent-review-check passed: independent worktrees and evidence are bound to the complete implementation snapshot'
)
