import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { access, chmod, link, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

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

const dispatcherMarker = '# mono-managed-commit-msg-dispatcher'
const previousDispatcher = `#!/bin/sh
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

async function install() {
  if (['HUSKY', 'VP_GIT_HOOKS', 'VITE_GIT_HOOKS'].some(name => process.env[name] === '0')) {
    console.log('Git hooks are disabled by the environment; skipping commit-msg dispatcher')
    return
  }

  const cwd = process.cwd()
  const repoRoot = gitWorktreeRoot(cwd)
  if (!repoRoot) {
    console.log('Git hooks are unavailable outside a Git worktree; skipping commit-msg dispatcher')
    return
  }
  if (runGitConfig(repoRoot)) {
    console.log('Git hooks are disabled by local Vite+ preference; skipping commit-msg dispatcher')
    return
  }
  const configuredHooksPath = gitOutput(['rev-parse', '--git-path', 'hooks'], repoRoot, 'cannot resolve Git hooksPath')
  const hooksDir = path.isAbsolute(configuredHooksPath)
    ? configuredHooksPath
    : path.resolve(repoRoot, configuredHooksPath)
  if (hooksDir === '/dev/null') {
    console.log('Git hooks are disabled by core.hooksPath=/dev/null; skipping commit-msg dispatcher')
    return
  }

  const versionedHook = path.join(repoRoot, '.vite-hooks', 'commit-msg')
  try {
    await access(versionedHook)
  } catch {
    throw new Error(`cannot find the versioned commit-msg hook at ${versionedHook}`)
  }

  await mkdir(hooksDir, { recursive: true })
  const target = path.join(hooksDir, 'commit-msg')
  let managedContents = null
  if (await pathExists(target)) {
    const contents = await readRegularFile(target)
    const isManaged =
      contents !== null && (contents === previousDispatcher || contents.includes(`\n${dispatcherMarker}\n`))
    if (!isManaged) {
      console.log(`Preserving existing commit-msg hook at ${target}`)
      return
    }
    managedContents = contents
  }

  const temporary = path.join(hooksDir, `.commit-msg.${process.pid}.${randomBytes(6).toString('hex')}`)
  const dispatcher = `#!/bin/sh
${dispatcherMarker}

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
hook="$repo_root/.vite-hooks/commit-msg"
[ ! -f "$hook" ] && exit 0
exec sh "$hook" "$@"
`

  if (managedContents !== null && managedContents === dispatcher) {
    console.log(`Commit-msg dispatcher is already current at ${target}`)
    return
  }

  try {
    await writeFile(temporary, dispatcher, { encoding: 'utf8', flag: 'wx', mode: 0o755 })
    await chmod(temporary, 0o755)
    if (managedContents !== null) {
      if ((await readRegularFile(target)) !== managedContents) {
        console.log(`Preserving existing commit-msg hook at ${target}`)
        return
      }
      await rename(temporary, target)
      console.log(`Updated managed commit-msg dispatcher at ${target}`)
    } else {
      try {
        await link(temporary, target)
        console.log(`Installed commit-msg dispatcher at ${target}`)
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
        console.log(`Preserving existing commit-msg hook at ${target}`)
      }
    }
  } finally {
    await unlink(temporary).catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}

install().catch(error => {
  console.error(`Git hook setup failed: ${error.message}`)
  process.exitCode = 1
})
