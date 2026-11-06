import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../../runner/runner'
import { defineExec, type ExecApi } from '../exec/exec'
import { defineToolchain, type ToolchainApi, type ToolchainStep } from '../toolchain/toolchain'

import { defineGit, type GitApi } from './git'

const { andThen, err, ok } = rust

export interface StagedCleanOptions {
  /** 提交边界要过哪些命令，属于消费仓库的工具链事实 */
  readonly steps: readonly ToolchainStep[]
}

function report(step: ToolchainStep): string {
  return (
    `staged files are not clean — formatting, lint or types (${step.name})\n` +
    'fix it yourself and re-stage, then retry — this check only judges, it never rewrites on your behalf'
  )
}

/**
 * 提交边界上的暂存文件洁净判定，链上以 `git: ` 起头归因。
 *
 * 一个工具的失败不掩盖另一个：命中步骤全部跑完，失败证据一起返回。命令起不来与跑了但失败
 * 都算失败，两者的差别留在证据行的退出码里。
 */
export const defineStagedClean = (options: StagedCleanOptions): Chain =>
  defineRunner()
    .use(defineGit())
    .use(defineExec())
    .use(defineToolchain(options.steps))
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & GitApi & ExecApi & ToolchainApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const staged = ctx.stagedFiles()
            if (staged.length === 0) return ok(undefined)

            const files: string[] = []
            for (const file of staged) {
              // 两类名字先 fail-closed：以 - 开头的路径会被工具当成 flag，被 git C-引号化的路径在磁盘上不存在。
              if (file.startsWith('-'))
                return err(
                  `git: cannot run: staged path '${file}' starts with '-' and would be parsed\n` +
                    'as an option by a fixer; rename it, or commit from a worktree without that path'
                )
              if (file.startsWith('"'))
                return err(
                  `git: cannot run: git C-quoted a staged path (${file})\n` +
                    'such a name contains a quote, a backslash or a newline, so it cannot be handed to a formatter safely; rename it'
                )
              const stat = fs.statSync(path.join(ctx.root, file), { throwIfNoEntry: false })
              if (stat?.isFile()) files.push(file)
            }

            const failures: string[] = []
            for (const job of ctx.partition(files)) {
              if (job.files.length === 0) continue
              const { result, failed } = ctx.invoke(job)
              if (!failed) continue
              // `stdout` 步骤的证据优先是 stdout 本身；退出码只在两者都空时兜底，那正是命令起不来。
              const evidence = (job.step.failOn === 'stdout' ? result.stdout.trim() : '') || ctx.failureEvidence(result)
              failures.push(
                `${report(job.step)}${evidence ? `\n${evidence}` : ''}${job.step.hint ? `\n${job.step.hint}` : ''}`
              )
            }

            if (failures.length > 0) return err(`git: ${failures.join('\n')}`)
            return ok(undefined)
          })
      }))
    )
