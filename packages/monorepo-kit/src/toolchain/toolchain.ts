import { type Plugin, definePlugin } from '@greypan/js-kit'

import { defineExec, type ExecApi, type ExecResult } from '../exec/exec'
import type { KitCtx } from '../runner/runner'

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
  /** 按 `match` 把文件分到各步，保持步骤表顺序 */
  readonly partition: (files: readonly string[]) => ToolchainJob[]
  readonly invoke: (job: ToolchainJob) => ToolchainRun
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

/**
 * 把一张工具链表跑成「按文件类型分派 + 判定成败」。命令起不来与命令跑了但失败都算失败，
 * 两者的区别留在 `ExecResult` 的退出码缺位里，由调用方的证据文案体现。
 * 返回值标注成 `Plugin<ToolchainApi, KitCtx>`：`use` 会并进 `defineExec` 的产出与需求，
 * 不收窄就要求消费者自己供给这条能力内部已经装好的东西。
 */
export const defineToolchain = (steps: readonly ToolchainStep[]): Plugin<ToolchainApi, KitCtx> =>
  defineExec().use(
    definePlugin<ToolchainApi, KitCtx & ExecApi>(ctx => {
      function command(step: ToolchainStep): readonly string[] {
        return step.seam === undefined ? step.command : seamArgv(step.seam, ctx.env[step.seam], step.command)
      }

      function argv(step: ToolchainStep): readonly string[] {
        return [...command(step), ...(step.args ?? [])]
      }

      return {
        partition: files => steps.map(step => ({ step, files: files.filter(file => step.match.test(file)) })),
        invoke: job => {
          const prefix = argv(job.step)
          const result = ctx.exec(prefix[0], [...prefix.slice(1), ...job.files])
          return { job, result, failed: !result.ok || (job.step.failOn === 'stdout' && result.stdout.trim() !== '') }
        }
      }
    })
  )
