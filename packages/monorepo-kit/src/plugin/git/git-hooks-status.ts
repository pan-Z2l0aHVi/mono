import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import type { CheckUnit } from '../../runner/check-runner'

export interface HookStatus {
  level: 'ok' | 'warn' | 'fail'
  detail: string
}

export interface GitHooksStatusOptions {
  /** 本仓交付的 hook 名单；受版本控制的 hook 是唯一事实来源，这份名单由调用方给出。 */
  readonly required: readonly string[]
  /** 修不回来时附在失败详情末尾的指引 */
  readonly installHint: string
}

export interface GitHooksStatus extends CheckUnit {
  /** 三态诊断：`warn` 表示无法判定而不是未安装，门禁不能把它当失败。 */
  readonly inspect: (root: string, options?: { env?: NodeJS.ProcessEnv }) => HookStatus
}

const disableEnvironmentVariables = ['HUSKY', 'VP_GIT_HOOKS', 'VITE_GIT_HOOKS']

function runGit(root: string, args: readonly string[]) {
  const result = spawnSync('git', [...args], { cwd: root, encoding: 'utf8' })
  return {
    status: result.status,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? ''
  }
}

// 安装脚本与已装 dispatcher 都遵循这些开关；体检必须先认同一语义，否则用户按偏好关掉 hook 后
// env-doctor 会持续报 fail，并建议运行一个同样会跳过的安装器。
function readDisabledPreference(root: string): { disabled: boolean; error?: string } {
  const result = runGit(root, ['config', '--bool', '--get', 'vp.hooks.disabled'])
  if (result.status === 0) return { disabled: result.stdout === 'true' }
  if (result.status === 1) return { disabled: false }
  return { disabled: false, error: result.stderr || `git config exited ${result.status}` }
}

export function defineGitHooksStatus({ required, installHint }: GitHooksStatusOptions): GitHooksStatus {
  function inspect(root: string, { env = process.env }: { env?: NodeJS.ProcessEnv } = {}): HookStatus {
    if (disableEnvironmentVariables.some(name => env[name] === '0')) {
      return { level: 'ok', detail: 'Git hooks are disabled by the environment' }
    }
    const preference = readDisabledPreference(root)
    if (preference.error) return { level: 'warn', detail: `cannot read vp.hooks.disabled: ${preference.error}` }
    if (preference.disabled) return { level: 'ok', detail: 'Git hooks are disabled by the local Vite+ preference' }

    const configured = runGit(root, ['config', '--get', 'core.hooksPath'])
    if (configured.status !== 0 && configured.status !== 1) {
      return { level: 'warn', detail: `cannot read core.hooksPath: ${configured.stderr}` }
    }
    const resolved = runGit(root, ['rev-parse', '--git-path', 'hooks'])
    if (resolved.status !== 0) {
      return { level: 'warn', detail: `cannot resolve the Git hooks directory: ${resolved.stderr}` }
    }
    const hooksDir = path.isAbsolute(resolved.stdout) ? resolved.stdout : path.resolve(root, resolved.stdout)
    if (hooksDir === '/dev/null') return { level: 'ok', detail: 'Git hooks are disabled by core.hooksPath=/dev/null' }

    const missing: string[] = []
    for (const name of required) {
      const file = path.join(hooksDir, name)
      let stats
      try {
        stats = fs.statSync(file)
      } catch {
        missing.push(`${name} (missing)`)
        continue
      }
      if (!stats.isFile()) {
        missing.push(`${name} (not a file)`)
        continue
      }
      try {
        fs.accessSync(file, fs.constants.X_OK)
      } catch {
        missing.push(`${name} (not executable)`)
      }
    }
    if (missing.length === 0) {
      return { level: 'ok', detail: `Git hooks are installed and executable at ${hooksDir}` }
    }
    const directoryNote = fs.existsSync(hooksDir) ? '' : ' (the hooks directory itself does not exist)'
    return {
      level: 'fail',
      detail: `git hooks are not runnable from ${hooksDir}${directoryNote}: ${missing.join(', ')}. ${installHint}`
    }
  }

  return {
    name: 'git-hooks-status',
    inspect,
    async run({ root, env }: { root: string; env?: NodeJS.ProcessEnv }): Promise<string> {
      const status = inspect(root, { env })
      if (status.level === 'fail') throw new Error(status.detail)
      return status.detail
    }
  }
}
