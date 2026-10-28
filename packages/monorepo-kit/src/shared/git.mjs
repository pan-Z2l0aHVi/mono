import { execFileSync } from 'node:child_process'

export function git(root, args, options = {}) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options })
  } catch (error) {
    const detail = String(error.stderr ?? '').trim()
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
}
