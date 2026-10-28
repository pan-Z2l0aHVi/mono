import { execFileSync } from 'node:child_process'

export const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

/**
 * 失败时把退出码与两路输出抬进返回值，不抛错：调用方要能区分「命令跑了但失败」与「命令起不来」。
 *
 * @typedef {{ ok: boolean, status?: number, stdout: string, stderr?: string }} ExecResult
 * @param {string} command
 * @param {readonly string[]} args
 * @param {object} [options]
 * @returns {ExecResult}
 */
export function exec(command, args, options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options })
    }
  } catch (error) {
    const failure = /** @type {{ status?: number, stdout?: string | Buffer, stderr?: string | Buffer }} */ (error)
    return {
      ok: false,
      status: failure.status,
      stdout: String(failure.stdout ?? ''),
      stderr: String(failure.stderr ?? '')
    }
  }
}

/**
 * @param {ExecResult} result
 * @returns {string}
 */
export function commandOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join('').trim()
}
