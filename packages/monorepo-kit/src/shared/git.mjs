import { execFileSync } from 'node:child_process'

/**
 * 与 `exec` 相反：git 是门禁的判据来源，失败必须抛出，不能降级成返回值。
 *
 * @param {string} root
 * @param {readonly string[]} args
 * @param {object} [options]
 * @returns {string}
 */
export function git(root, args, options = {}) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options })
  } catch (error) {
    const failure = /** @type {{ stderr?: string | Buffer }} */ (error)
    const detail = String(failure.stderr ?? '').trim()
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
}
