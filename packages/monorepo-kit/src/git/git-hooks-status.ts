import fs from 'node:fs'
import path from 'node:path'

import { type Plugin, definePlugin } from '@greypan/js-kit'

import { defineExec, type ExecApi } from '../exec/exec'
import type { KitCtx } from '../runner/runner'

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

export interface GitHooksStatusApi {
  /** 三态诊断：`warn` 表示无法判定而不是未安装，门禁不能把它当失败。 */
  readonly inspectGitHooks: () => HookStatus
}

const disableEnvironmentVariables = ['HUSKY', 'VP_GIT_HOOKS', 'VITE_GIT_HOOKS']

interface GitQuery {
  /** 退出码为 0 */
  ok: boolean
  /** 缺席就是「命令起不来」，与「跑了但非零」是两种失效 */
  status?: number
  stdout: string
  stderr: string
}

// 安装脚本与已装 dispatcher 都遵循这些开关；体检必须先认同一语义，否则用户按偏好关掉 hook 后
// env-doctor 会持续报 fail，并建议运行一个同样会跳过的安装器。
function readDisabledPreference(query: (args: readonly string[]) => GitQuery): {
  disabled: boolean
  error?: string
} {
  const result = query(['config', '--bool', '--get', 'vp.hooks.disabled'])
  if (result.ok) return { disabled: result.stdout === 'true' }
  if (result.status === 1) return { disabled: false }
  return { disabled: false, error: result.stderr || `git config exited ${result.status}` }
}

/**
 * Git hook 安装状态的能力插件：只出诊断，不进链。体检要区分「没装」与「读不出来」，
 * 三态压成 `Result<void, string>` 就丢了后者——所以要的是 `exec` 的返回值而不是 `git` 的抛错面。
 * 返回值标注成 `Plugin<GitHooksStatusApi, KitCtx>`，不把内部接的 `exec` 漏给消费者。
 */
export const defineGitHooksStatus = ({
  required,
  installHint
}: GitHooksStatusOptions): Plugin<GitHooksStatusApi, KitCtx> =>
  defineExec().use(
    definePlugin<GitHooksStatusApi, KitCtx & ExecApi>(ctx => {
      const query = (args: readonly string[]): GitQuery => {
        const result = ctx.exec('git', args)
        return {
          ok: result.ok,
          status: result.status,
          stdout: result.stdout.trim(),
          stderr: (result.stderr ?? '').trim()
        }
      }

      function inspect(): HookStatus {
        if (disableEnvironmentVariables.some(name => ctx.env[name] === '0')) {
          return { level: 'ok', detail: 'Git hooks are disabled by the environment' }
        }
        const preference = readDisabledPreference(query)
        if (preference.error) return { level: 'warn', detail: `cannot read vp.hooks.disabled: ${preference.error}` }
        if (preference.disabled) return { level: 'ok', detail: 'Git hooks are disabled by the local Vite+ preference' }

        const configured = query(['config', '--get', 'core.hooksPath'])
        if (!configured.ok && configured.status !== 1) {
          return { level: 'warn', detail: `cannot read core.hooksPath: ${configured.stderr}` }
        }
        const resolved = query(['rev-parse', '--git-path', 'hooks'])
        if (!resolved.ok) {
          return { level: 'warn', detail: `cannot resolve the Git hooks directory: ${resolved.stderr}` }
        }
        const hooksDir = path.isAbsolute(resolved.stdout) ? resolved.stdout : path.resolve(ctx.root, resolved.stdout)
        if (hooksDir === '/dev/null')
          return { level: 'ok', detail: 'Git hooks are disabled by core.hooksPath=/dev/null' }

        const missing: string[] = []
        for (const name of required) {
          const file = path.join(hooksDir, name)
          let stats: fs.Stats | undefined
          try {
            stats = fs.statSync(file, { throwIfNoEntry: false })
          } catch (error) {
            // throwIfNoEntry 只吃掉 ENOENT 与 ENOTDIR，EACCES、ELOOP 仍然抛；调用方直接读这个返回值，异常会让体检整个没有输出。
            missing.push(`${name} (${(error as NodeJS.ErrnoException).code ?? 'stat failed'})`)
            continue
          }
          if (!stats) {
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

      return { inspectGitHooks: inspect }
    })
  )
