import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function calculateWorktreeSnapshot(cwd) {
  const head = git(['rev-parse', 'HEAD'], cwd).trim()
  const indexDiff = git(['diff', '--cached', '--binary'], cwd)
  const worktreeStatus = git(['status', '--porcelain=v1', '--untracked-files=all', '-z'], cwd)
  const worktreeDiff = git(['diff', '--binary'], cwd)
  const untrackedFiles = git(['ls-files', '--others', '--exclude-standard', '-z'], cwd).split('\0').filter(Boolean)
  const untrackedRows = []

  for (const file of untrackedFiles) {
    const absolute = path.join(cwd, file)
    let content
    try {
      const stat = fs.lstatSync(absolute)
      content = stat.isSymbolicLink() ? `symlink:${fs.readlinkSync(absolute)}` : fs.readFileSync(absolute)
    } catch {
      content = 'missing'
    }
    untrackedRows.push(`UNTRACKED\0${file}\0${hash(content)}`)
  }

  const payload = [
    `HEAD\0${head}`,
    `INDEX-DIFF\0${hash(indexDiff)}`,
    `STATUS\0${hash(worktreeStatus)}`,
    `WORKTREE-DIFF\0${hash(worktreeDiff)}`,
    ...untrackedRows.sort()
  ].join('\n')

  return hash(payload)
}
