import fs from 'node:fs'
import path from 'node:path'

import { defineExec } from '../plugins/exec'
import { defineGit } from '../plugins/git'
import { defineToolchain, type ToolchainStep } from '../plugins/toolchain'
import type { CheckUnit } from '../runner/check-runner'

export interface StagedCleanOptions {
  /** 提交边界要过哪些命令，属于消费仓库的工具链事实 */
  readonly steps: readonly ToolchainStep[]
  /** 工具起不来时附在提示括号里的安装方式 */
  readonly installHint: string
}

function report(step: ToolchainStep): string {
  return (
    `staged files are not clean — formatting, lint or types (${step.name})\n` +
    'fix it yourself and re-stage, then retry — this check only judges, it never rewrites on your behalf'
  )
}

function unavailable(command: readonly string[], installHint: string): string {
  return (
    `cannot run: '${command.join(' ')}' is unavailable\n` +
    `its launcher is missing from PATH, or the toolchain behind it is not installed (${installHint})`
  )
}

export function defineStagedClean({ steps, installHint }: StagedCleanOptions): CheckUnit {
  const plugins = defineGit().use(defineExec()).use(defineToolchain(steps))

  return {
    name: 'staged-clean',
    async run({ root, env = process.env }: { root: string; env?: NodeJS.ProcessEnv }): Promise<string> {
      const { stagedFiles, command, partition, probe, invoke, commandOutput } = plugins.make({ root, env })
      const staged = stagedFiles()
      if (staged.length === 0) return 'no staged files'

      const files: string[] = []
      for (const file of staged) {
        // 两类名字先 fail-closed：以 - 开头的路径会被工具当成 flag，被 git C-引号化的路径在磁盘上不存在。
        if (file.startsWith('-'))
          throw new Error(
            `cannot run: staged path '${file}' starts with '-' and would be parsed\n` +
              'as an option by a fixer; rename it, or commit from a worktree without that path'
          )
        if (file.startsWith('"'))
          throw new Error(
            `cannot run: git C-quoted a staged path (${file})\n` +
              'such a name contains a quote, a backslash or a newline, so it cannot be handed to a formatter safely; rename it'
          )
        let stat: fs.Stats
        try {
          stat = fs.statSync(path.join(root, file))
        } catch {
          continue
        }
        if (stat.isFile()) files.push(file)
      }

      const jobs = partition(files)
      for (const job of jobs) {
        if (job.files.length > 0 && !probe(job.step)) throw new Error(unavailable(command(job.step), installHint))
      }

      const failures: string[] = []
      for (const job of jobs) {
        if (job.files.length === 0) continue
        const { result, failed } = invoke(job)
        if (!failed) continue
        // `stdout` 步骤的失败证据就是 stdout 本身；`exit` 步骤的证据在退出码之外的输出里。
        const evidence = job.step.failOn === 'stdout' ? result.stdout.trim() : commandOutput(result)
        failures.push(
          `${report(job.step)}${evidence ? `\n${evidence}` : ''}${job.step.hint ? `\n${job.step.hint}` : ''}`
        )
      }

      if (failures.length > 0) throw new Error(failures.join('\n'))
      return `${files.length} staged file(s) checked`
    }
  }
}
