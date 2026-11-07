import { execFileSync, type StdioOptions } from 'node:child_process'

import { definePlugin } from '@greypan/js-kit'

import type { KitCtx } from '../runner/runner'

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
 * 以 argv 运行子进程，不经过 shell。失败时把退出码与两路输出抬进返回值而不是抛错：
 * 调用方要能区分「命令跑了但失败」与「命令起不来」。
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
      // spawn 失败时 Node 给的是 `null`，不是 `undefined`；原样返回会让所有用 `status === undefined`
      // 判「命令起不来」的调用方失效，报出 `exit null` 这种不存在的退出码。在边界上归一后，
      // `status` 只可能是 `number | undefined`，那三处调用方保持原样即可，不必改成 `== null`。
      status: failure.status ?? undefined,
      stdout: String(failure.stdout ?? ''),
      stderr: String(failure.stderr ?? '')
    }
  }
}

export function commandOutput(result: ExecResult): string {
  // 两路输出必须分行：连起来会把 stdout 末行与 stderr 首行拼成一个不存在的字符串，
  // 而触发层只打印这一行，CI 红时它就是唯一的定位信息。
  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
}

/**
 * 失败证据：优先用命令自己写出的内容，两路输出都为空时退回退出码。
 * 退出码缺席（`status` 为 `undefined`）就是「命令起不来」，与「跑了但失败」只有这一处可读差别。
 */
export function failureEvidence(result: ExecResult): string {
  return commandOutput(result) || `exited with status ${result.status ?? 'null (could not be launched)'}`
}

export interface ExecApi {
  /** 本仓包管理器的可执行名，Windows 上是 `pnpm.cmd` */
  readonly pnpm: string
  /** 默认落在注入的仓库根与注入的环境变量上；单次调用可用 options 覆盖任一。 */
  readonly exec: (command: string, args: readonly string[], options?: ExecOptions) => ExecResult
  readonly commandOutput: (result: ExecResult) => string
  readonly failureEvidence: (result: ExecResult) => string
}

/**
 * 子进程能力。`cwd` 与 `env` 由注入的仓库根与进程环境提供，所以判定不必逐处自己拼——
 * 拼漏一处就会把命令跑到另一个目录里去。
 */
export const defineExec = () =>
  definePlugin<ExecApi, KitCtx>(ctx => ({
    pnpm,
    exec: (command, args, options = {}) =>
      exec(command, args, {
        cwd: ctx.root,
        ...options,
        // 调用方给 env 时是补几个变量，不是替换整份环境；整体替换会丢掉 PATH 让命令起不来。
        env: { ...ctx.env, ...options.env }
      }),
    commandOutput,
    failureEvidence
  }))
