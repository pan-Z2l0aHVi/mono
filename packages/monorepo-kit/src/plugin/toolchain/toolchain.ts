import { definePlugin } from '@greypan/js-kit'

import { defineExec, type ExecResult } from '../exec/exec'

export interface ToolchainStep {
  /** 步骤名，失败信息里用它标出是哪条命令 */
  readonly name: string
  /** 命中哪些文件交给这条命令；同一文件可以同时命中多条步骤 */
  readonly match: RegExp
  /** 覆盖命令的 seam 环境变量名，值是 JSON argv 数组 */
  readonly seam?: string
  /** seam 未设置时使用的 argv 前缀 */
  readonly command: readonly string[]
  /** 追加在命令之后、文件之前的固定参数 */
  readonly args?: readonly string[]
  /** `exit` 只看退出码；`stdout` 在退出码为 0 但 stdout 非空时也算失败（`gofmt -l` 的语义） */
  readonly failOn: 'exit' | 'stdout'
  /** 失败信息末尾的下一步提示 */
  readonly hint?: string
}

export interface ToolchainJob {
  readonly step: ToolchainStep
  readonly files: readonly string[]
}

export interface ToolchainRun {
  readonly job: ToolchainJob
  readonly result: ExecResult
  readonly failed: boolean
}

export interface ToolchainApi {
  readonly steps: readonly ToolchainStep[]
  /** 按 `match` 把文件分到各步，保持步骤表顺序 */
  readonly partition: (files: readonly string[]) => ToolchainJob[]
  /** seam 解析后的命令前缀，不含 `args` */
  readonly command: (step: ToolchainStep) => readonly string[]
  /** 命令前缀加固定参数，不含文件 */
  readonly argv: (step: ToolchainStep) => readonly string[]
  /** 命令能否启动：以 `--help` 试跑，只报告可用性，不看输出 */
  readonly probe: (step: ToolchainStep) => boolean
  readonly invoke: (job: ToolchainJob) => ToolchainRun
}

export interface ToolchainContext {
  readonly root: string
  readonly env?: NodeJS.ProcessEnv
}

function seamArgv(seam: string, value: string | undefined, fallback: readonly string[]): readonly string[] {
  if (value === undefined) return fallback
  const invalid = () => new Error(`${seam} must be a JSON array of non-empty strings`)
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw invalid()
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some(item => typeof item !== 'string' || item === '')) {
    throw invalid()
  }
  return parsed as string[]
}

export const defineToolchain = (steps: readonly ToolchainStep[]) =>
  definePlugin<ToolchainApi, ToolchainContext>(({ root, env = process.env }) => {
    const { exec } = defineExec().make()

    function command(step: ToolchainStep): readonly string[] {
      return step.seam === undefined ? step.command : seamArgv(step.seam, env[step.seam], step.command)
    }

    function argv(step: ToolchainStep): readonly string[] {
      return [...command(step), ...(step.args ?? [])]
    }

    return {
      steps,
      partition: files => steps.map(step => ({ step, files: files.filter(file => step.match.test(file)) })),
      command,
      argv,
      probe: step => {
        const prefix = command(step)
        return exec(prefix[0], [...prefix.slice(1), '--help'], { cwd: root, env }).ok
      },
      invoke: job => {
        const prefix = argv(job.step)
        const result = exec(prefix[0], [...prefix.slice(1), ...job.files], { cwd: root, env })
        return { job, result, failed: !result.ok || (job.step.failOn === 'stdout' && result.stdout.trim() !== '') }
      }
    }
  })
