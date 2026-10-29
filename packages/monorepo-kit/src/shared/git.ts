import { execFileSync } from 'node:child_process'

export interface GitOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeout?: number
}

interface GitFailure {
  stderr?: string | Buffer
}

/**
 * 与 `exec` 相反：git 是门禁的判据来源，失败必须抛出，不能降级成返回值。
 */
export function git(root: string, args: readonly string[], options: GitOptions = {}): string {
  try {
    return execFileSync('git', [...args], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...options
    })
  } catch (error) {
    const failure = error as GitFailure
    const detail = String(failure.stderr ?? '').trim()
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
}
