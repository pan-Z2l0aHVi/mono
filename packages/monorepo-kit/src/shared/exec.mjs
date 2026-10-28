import { execFileSync } from 'node:child_process'

export const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

export function exec(command, args, options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options })
    }
  } catch (error) {
    return {
      ok: false,
      status: error.status,
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? '')
    }
  }
}

export function commandOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join('').trim()
}
