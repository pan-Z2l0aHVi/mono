import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { chmod, link, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { requiredGitHooks } from '@greypan/monorepo-kit/policy/git-hooks-status'

function gitOutput(args, cwd, description) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' })
  if (result.error) throw new Error(`${description}: ${result.error.message}`)
  if (result.status !== 0) {
    const detail = result.stderr.trim()
    throw new Error(`${description} failed (exit ${result.status})${detail ? `: ${detail}` : ''}`)
  }
  return result.stdout.trim()
}

function gitWorktreeRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' })
  if (result.error) throw new Error(`cannot find the Git worktree: ${result.error.message}`)
  if (result.status !== 0) {
    if (/not a git repository/i.test(result.stderr)) return null
    const detail = result.stderr.trim()
    throw new Error(`cannot find the Git worktree (exit ${result.status})${detail ? `: ${detail}` : ''}`)
  }
  return result.stdout.trim()
}

function runGitConfig(cwd) {
  const result = spawnSync('git', ['config', '--bool', '--get', 'vp.hooks.disabled'], {
    cwd,
    encoding: 'utf8'
  })
  if (result.error) throw new Error(`cannot read the Vite+ hook preference: ${result.error.message}`)
  if (result.status === 0) return result.stdout.trim() === 'true'
  if (result.status === 1) return false
  throw new Error(`cannot read the Vite+ hook preference: ${result.stderr.trim()}`)
}

async function pathExists(file) {
  try {
    await lstat(file)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function readRegularFile(file) {
  try {
    const details = await lstat(file)
    if (!details.isFile() || details.isSymbolicLink()) return null
    return await readFile(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

// 受版本控制的 hook 是唯一事实来源：`.vite-hooks` 里有哪个，就兜底哪个。
const hookNames = requiredGitHooks

function dispatcherMarker(hookName) {
  return `# mono-managed-git-hook-dispatcher: ${hookName}`
}

// 旧版安装脚本只渲染 commit-msg，先是没有 marker 的版本，后来是带
// `# mono-managed-commit-msg-dispatcher` 的版本。两者都必须认作托管内容，否则已经装过旧版的
// 仓库会一直打印 "Preserving existing ..." 而永远升不上来。
const legacyCommitMsgMarker = '# mono-managed-commit-msg-dispatcher'
const legacyCommitMsgDispatcher = `#!/bin/sh
set -eu

if [ "\${HUSKY-}" = "0" ] || [ "\${VP_GIT_HOOKS-}" = "0" ] || [ "\${VITE_GIT_HOOKS-}" = "0" ]; then
  exit 0
fi

hooks_disabled=$(git config --bool --get vp.hooks.disabled 2>/dev/null || true)
if [ "$hooks_disabled" = true ]; then
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel)
hook="$repo_root/.vite-hooks/commit-msg"
[ ! -f "$hook" ] && exit 0
exec sh "$hook" "$@"
`

function isManagedDispatcher(hookName, contents) {
  if (contents === null) return false
  if (contents.includes(`\n${dispatcherMarker(hookName)}\n`)) return true
  if (hookName !== 'commit-msg') return false
  return contents === legacyCommitMsgDispatcher || contents.includes(`\n${legacyCommitMsgMarker}\n`)
}

function renderDispatcher(hookName) {
  return `#!/bin/sh
${dispatcherMarker(hookName)}

hooks_init="\${XDG_CONFIG_HOME:-\${HOME:-}/.config}/vite-plus/hooks-init.sh"
if [ ! -f "$hooks_init" ]; then
  hooks_init="\${XDG_CONFIG_HOME:-\${HOME:-}/.config}/husky/init.sh"
fi
if [ -f "$hooks_init" ]; then
  . "$hooks_init"
fi

if [ "\${HUSKY-}" = "0" ] || [ "\${VP_GIT_HOOKS-}" = "0" ] || [ "\${VITE_GIT_HOOKS-}" = "0" ]; then
  exit 0
fi

hooks_disabled=$(git config --bool --get vp.hooks.disabled 2>/dev/null || true)
if [ "$hooks_disabled" = true ]; then
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel) || exit $?
hook="$repo_root/.vite-hooks/${hookName}"
[ ! -f "$hook" ] && exit 0
exec sh "$hook" "$@"
`
}

async function installDispatcher(hooksDir, hookName) {
  const target = path.join(hooksDir, hookName)
  let managedContents = null
  if (await pathExists(target)) {
    const contents = await readRegularFile(target)
    if (!isManagedDispatcher(hookName, contents)) {
      console.log(`Preserving existing ${hookName} hook at ${target}`)
      return
    }
    managedContents = contents
  }

  const dispatcher = renderDispatcher(hookName)
  if (managedContents === dispatcher) {
    // Windows 的 stat.mode 不表达 Unix 权限位；按 0755 比较只会每轮误报 Restored。
    if (process.platform !== 'win32') {
      const { mode } = await lstat(target)
      if ((mode & 0o777) !== 0o755) {
        await chmod(target, 0o755)
        console.log(`Restored ${hookName} dispatcher permissions at ${target}`)
        return
      }
    }
    console.log(`${hookName} dispatcher is already current at ${target}`)
    return
  }

  const temporary = path.join(hooksDir, `.${hookName}.${process.pid}.${randomBytes(6).toString('hex')}`)
  try {
    await writeFile(temporary, dispatcher, { encoding: 'utf8', flag: 'wx', mode: 0o755 })
    await chmod(temporary, 0o755)
    if (managedContents !== null) {
      if ((await readRegularFile(target)) !== managedContents) {
        console.log(`Preserving existing ${hookName} hook at ${target}`)
        return
      }
      await rename(temporary, target)
      console.log(`Updated managed ${hookName} dispatcher at ${target}`)
    } else {
      try {
        await link(temporary, target)
        console.log(`Installed ${hookName} dispatcher at ${target}`)
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
        console.log(`Preserving existing ${hookName} hook at ${target}`)
      }
    }
  } finally {
    await unlink(temporary).catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}

async function install() {
  if (['HUSKY', 'VP_GIT_HOOKS', 'VITE_GIT_HOOKS'].some(name => process.env[name] === '0')) {
    console.log('Git hooks are disabled by the environment; skipping git hook setup')
    return
  }

  const cwd = process.cwd()
  const repoRoot = gitWorktreeRoot(cwd)
  if (!repoRoot) {
    console.log('Git hooks are unavailable outside a Git worktree; skipping git hook setup')
    return
  }
  if (runGitConfig(repoRoot)) {
    console.log('Git hooks are disabled by local Vite+ preference; skipping git hook setup')
    return
  }
  const configuredHooksPath = gitOutput(['rev-parse', '--git-path', 'hooks'], repoRoot, 'cannot resolve Git hooksPath')
  const hooksDir = path.isAbsolute(configuredHooksPath)
    ? configuredHooksPath
    : path.resolve(repoRoot, configuredHooksPath)
  if (hooksDir === '/dev/null') {
    console.log('Git hooks are disabled by core.hooksPath=/dev/null; skipping git hook setup')
    return
  }

  const versionedHooks = []
  for (const hookName of hookNames) {
    if (await pathExists(path.join(repoRoot, '.vite-hooks', hookName))) versionedHooks.push(hookName)
  }
  if (!versionedHooks.includes('commit-msg')) {
    throw new Error(`cannot find the versioned commit-msg hook at ${path.join(repoRoot, '.vite-hooks', 'commit-msg')}`)
  }

  await mkdir(hooksDir, { recursive: true })
  for (const hookName of versionedHooks) await installDispatcher(hooksDir, hookName)
}

install().catch(error => {
  console.error(`Git hook setup failed: ${error.message}`)
  process.exitCode = 1
})
