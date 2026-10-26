import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// 与 scripts/maintenance/install-git-hooks.mjs 的 required hooks 保持一致：受版本控制的 hook 是
// 唯一事实来源，安装脚本装得上两者，体检就必须对两者断言。
export const requiredGitHooks = ['commit-msg', 'pre-commit']

const disableEnvironmentVariables = ['HUSKY', 'VP_GIT_HOOKS', 'VITE_GIT_HOOKS']

function runGit(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  return {
    status: result.status,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? ''
  }
}

// 安装脚本与已装 dispatcher 都遵循这些开关；体检必须先认同一语义，否则用户按偏好关掉 hook 后
// env-doctor 会持续报 fail，并建议运行一个同样会跳过的安装器。
export function gitHooksDisabledBy(root, env = process.env) {
  if (disableEnvironmentVariables.some(name => env[name] === '0')) return 'the environment'
  const preference = runGit(root, ['config', '--bool', '--get', 'vp.hooks.disabled'])
  if (preference.status === 0 && preference.stdout === 'true') return 'the local Vite+ preference'
  return null
}

export function inspectGitHooks(root, env = process.env) {
  const disabledBy = gitHooksDisabledBy(root, env)
  if (disabledBy) return { level: 'ok', detail: `Git hooks are disabled by ${disabledBy}` }

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

  const missing = []
  for (const name of requiredGitHooks) {
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
    detail: `git hooks are not runnable from ${hooksDir}${directoryNote}: ${missing.join(', ')}. Run \`node scripts/maintenance/install-git-hooks.mjs\` directly; a plain \`pnpm install\` only runs prepare when the lockfile or node_modules change (\`pnpm install --force\` also works). When core.hooksPath points outside .vite-hooks, vp config leaves that path alone and only the installer repairs it.`
  }
}
