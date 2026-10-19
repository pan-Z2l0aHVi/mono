import fs from 'node:fs'
import path from 'node:path'

import { commandOutput, execShell } from '../lib/exec.mjs'

// 提交边界的只读格式检查：只判定，不运行 fixer，也不改 index。
// 文件名来自 index，但工具检查工作区副本；index 与工作区分叉时由作者收敛。
// 环境变量只覆盖「调用哪条命令」，是 fixture 的测试 seam，不是用户接口。
export const name = 'format-clean'

const STYLELINT_FILE = /\.(?:css|scss|less|html|vue)$/
const GO_FILE = /\.go$/

function tool(prefix, args, root, env) {
  return execShell(prefix, args, { cwd: root, env })
}

function requireTool(prefix, root, env) {
  if (!tool(prefix, ['--help'], root, env).ok)
    throw new Error(
      `cannot run: '${prefix}' is unavailable\nits launcher is missing from PATH, or the toolchain behind it is not installed (mise install; pnpm install for Node deps)`
    )
}

function report(reason) {
  return (
    `staged files are not clean — formatting, lint or types (${reason})\n` +
    'fix it yourself and re-stage, then retry — this check only judges, it never rewrites on your behalf'
  )
}

function stagedFiles(root, env) {
  const result = execShell('git -c core.quotePath=false diff --cached --name-only --diff-filter=ACMR', [], {
    cwd: root,
    env
  })
  if (!result.ok) throw new Error(`cannot run: git diff --cached failed in ${root}`)
  return result.stdout.split(/\r?\n/).filter(Boolean)
}

export async function run({ root, env = process.env }) {
  const vpCommand = env.AGENT_VP_CMD || 'pnpm exec vp'
  const stylelintCommand = env.AGENT_STYLELINT_CMD || 'pnpm exec stylelint'
  const gofmtCommand = env.AGENT_GOFMT_CMD || 'gofmt'

  const staged = stagedFiles(root, env)
  if (staged.length === 0) return 'no staged files'

  const vpFiles = []
  const stylelintFiles = []
  const goFiles = []
  for (const file of staged) {
    // 两类名字先 fail-closed：以 - 开头的路径会被工具当成开关，被 git C-引号化的路径在磁盘上不存在。
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
    let stat
    try {
      stat = fs.statSync(path.join(root, file))
    } catch {
      continue
    }
    if (!stat.isFile()) continue
    vpFiles.push(file)
    if (STYLELINT_FILE.test(file)) stylelintFiles.push(file)
    if (GO_FILE.test(file)) goFiles.push(file)
  }

  if (vpFiles.length > 0) requireTool(vpCommand, root, env)
  if (stylelintFiles.length > 0) requireTool(stylelintCommand, root, env)
  if (goFiles.length > 0) requireTool(gofmtCommand, root, env)

  const failures = []

  if (vpFiles.length > 0) {
    const result = tool(vpCommand, ['check', '--no-error-on-unmatched-pattern', ...vpFiles], root, env)
    if (!result.ok) {
      failures.push(
        `${report('vp check')}${commandOutput(result) ? `\n${commandOutput(result)}` : ''}\n` +
          'vp check --fix <files> repairs formatting and autofixable lint, never a type error'
      )
    }
  }

  if (stylelintFiles.length > 0) {
    const result = tool(stylelintCommand, ['--allow-empty-input', ...stylelintFiles], root, env)
    if (!result.ok) {
      failures.push(
        `${report('stylelint')}${commandOutput(result) ? `\n${commandOutput(result)}` : ''}\n` +
          'stylelint <files>; pnpm run fix-stylelint fixes the whole repo'
      )
    }
  }

  if (goFiles.length > 0) {
    const result = tool(gofmtCommand, ['-l', ...goFiles], root, env)
    if (!result.ok) {
      failures.push(`${report('gofmt')}${commandOutput(result) ? `\n${commandOutput(result)}` : ''}`)
    } else if (result.stdout.trim()) {
      failures.push(
        `${report('gofmt')}\n${result.stdout.trim()}\ngofmt -w <files>; pnpm run fix-go fixes the whole repo`
      )
    }
  }

  if (failures.length > 0) throw new Error(failures.join('\n'))
  return `${vpFiles.length} staged file(s) checked`
}
