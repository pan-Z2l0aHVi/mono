import { definePlugin } from '@greypan/js-kit'

import { commandOutput, exec, pnpm, type ExecResult } from '../shared/exec'

export interface ExecApi {
  /** 本仓包管理器的可执行名，Windows 上是 `pnpm.cmd` */
  readonly pnpm: string
  readonly exec: (
    command: string,
    args: readonly string[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv }
  ) => ExecResult
  readonly commandOutput: (result: ExecResult) => string
}

/**
 * 以 argv 运行子进程，不经过 shell。失败抬进返回值而不是抛错：调用方要能区分
 * 「命令跑了但失败」与「命令起不来」，后者通常意味着工具链没装。
 */
export const defineExec = () => definePlugin<ExecApi, object>(() => ({ pnpm, exec, commandOutput }))
