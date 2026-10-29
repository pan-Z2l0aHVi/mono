import { execFileSync, type StdioOptions } from 'node:child_process'

import { definePlugin } from '@greypan/js-kit'

export const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

export interface ExecOptions {
  cwd?: string
  env?: Record<string, string | undefined>
  timeout?: number
  stdio?: StdioOptions
}

export interface ExecResult {
  ok: boolean
  status?: number
  stdout: string
  stderr?: string
}

interface ExecFailure {
  status?: number
  stdout?: string | Buffer
  stderr?: string | Buffer
}

/**
 * 失败时把退出码与两路输出抬进返回值，不抛错：调用方要能区分「命令跑了但失败」与「命令起不来」。
 */
export function exec(command: string, args: readonly string[], options: ExecOptions = {}): ExecResult {
  try {
    const stdout = execFileSync(command, [...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...options
    })
    return { ok: true, stdout }
  } catch (error) {
    const failure = error as ExecFailure
    return {
      ok: false,
      status: failure.status,
      stdout: String(failure.stdout ?? ''),
      stderr: String(failure.stderr ?? '')
    }
  }
}

export function commandOutput(result: ExecResult): string {
  return [result.stdout, result.stderr].filter(Boolean).join('').trim()
}

export interface ExecApi {
  /** 本仓包管理器的可执行名，Windows 上是 `pnpm.cmd` */
  readonly pnpm: string
  readonly exec: (
    command: string,
    args: readonly string[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: StdioOptions }
  ) => ExecResult
  readonly commandOutput: (result: ExecResult) => string
}

/**
 * 以 argv 运行子进程，不经过 shell。失败抬进返回值而不是抛错：调用方要能区分
 * 「命令跑了但失败」与「命令起不来」，后者通常意味着工具链没装。
 */
export const defineExec = () => definePlugin<ExecApi, object>(() => ({ pnpm, exec, commandOutput }))
