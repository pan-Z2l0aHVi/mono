import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const installer = path.join(repoRoot, 'scripts', 'maintenance', 'install-git-hooks.mjs')
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mono-git-hooks-'))
const globalConfig = path.join(fixtureRoot, 'gitconfig')
fs.writeFileSync(globalConfig, '')
const testEnvironment = {
  ...process.env,
  GIT_CONFIG_GLOBAL: globalConfig,
  GIT_CONFIG_NOSYSTEM: '1',
  HOME: path.join(fixtureRoot, 'home'),
  XDG_CONFIG_HOME: path.join(fixtureRoot, 'xdg default')
}
for (const name of Object.keys(testEnvironment)) {
  if (name.startsWith('GIT_CONFIG_') && !['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM'].includes(name)) {
    delete testEnvironment[name]
  }
}
for (const name of ['HUSKY', 'VP_GIT_HOOKS', 'VITE_GIT_HOOKS']) delete testEnvironment[name]

function run(command, args, options = {}) {
  const { env = {}, ...spawnOptions } = options
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...spawnOptions,
    env: { ...testEnvironment, ...env }
  })
  assert.notEqual(result.status, null, `${command} did not run: ${result.error?.message ?? ''}`)
  return result
}

function assertSuccess(result, label) {
  assert.equal(result.status, 0, `${label} failed (${result.status}): ${result.stderr}`)
}

function initRepo(root) {
  fs.mkdirSync(root, { recursive: true })
  assertSuccess(run('git', ['-C', root, 'init', '-b', 'main']), 'fixture git init')
  assertSuccess(run('git', ['-C', root, 'config', 'user.name', 'Fixture']), 'fixture author name')
  assertSuccess(run('git', ['-C', root, 'config', 'user.email', 'fixture@example.invalid']), 'fixture author email')
  assertSuccess(run('git', ['-C', root, 'config', 'core.hooksPath', '.git/hooks']), 'fixture hooksPath')
}

function install(repo, env = {}) {
  return run(process.execPath, [installer], { cwd: repo, env })
}

try {
  const repo = path.join(fixtureRoot, "repo with spaces and 'quotes'")
  const linked = path.join(fixtureRoot, 'linked worktree')
  const sharedHooks = path.join(fixtureRoot, 'shared hooks')
  const messagePath = path.join(fixtureRoot, 'message')
  const mainMarker = path.join(fixtureRoot, 'main-hook-ran')
  const linkedMarker = path.join(fixtureRoot, 'linked-hook-ran')
  const mainPreCommitMarker = path.join(fixtureRoot, 'main-pre-commit-ran')
  const linkedPreCommitMarker = path.join(fixtureRoot, 'linked-pre-commit-ran')
  initRepo(repo)
  fs.mkdirSync(path.join(repo, '.vite-hooks'), { recursive: true })
  fs.writeFileSync(
    path.join(repo, '.vite-hooks', 'commit-msg'),
    '#!/bin/sh\nprintf \'%s\\n\' "$1" > "$HOOK_MARKER"\n',
    { mode: 0o644 }
  )
  fs.writeFileSync(
    path.join(repo, '.vite-hooks', 'pre-commit'),
    '#!/bin/sh\nprintf pre-commit > "$PRE_COMMIT_MARKER"\n',
    { mode: 0o644 }
  )
  fs.writeFileSync(path.join(repo, 'tracked-file'), 'fixture\n')
  assertSuccess(run('git', ['-C', repo, 'add', '.']), 'fixture stage')
  assertSuccess(run('git', ['-C', repo, 'commit', '-m', 'chore(root): create fixture']), 'fixture commit')
  assertSuccess(run('git', ['-C', repo, 'config', 'core.hooksPath', sharedHooks]), 'fixture hooksPath config')
  fs.mkdirSync(path.join(repo, 'subdir'))
  const relativeHooksPath = path.relative(repo, sharedHooks).split(path.sep).join('/')
  assertSuccess(
    run('git', ['-C', repo, 'config', 'core.hooksPath', relativeHooksPath]),
    'fixture relative hooksPath config'
  )
  assertSuccess(install(path.join(repo, 'subdir')), 'install custom hooksPath dispatcher from a subdirectory')
  const dispatcherPath = path.join(sharedHooks, 'commit-msg')
  const preCommitDispatcherPath = path.join(sharedHooks, 'pre-commit')
  assert.match(fs.readFileSync(dispatcherPath, 'utf8'), /mono-managed-git-hook-dispatcher: commit-msg/)
  assert.match(fs.readFileSync(preCommitDispatcherPath, 'utf8'), /mono-managed-git-hook-dispatcher: pre-commit/)
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(dispatcherPath).mode & 0o111, 0o111)
    assert.equal(fs.statSync(preCommitDispatcherPath).mode & 0o111, 0o111)
  }
  fs.chmodSync(sharedHooks, 0o555)
  try {
    const currentInstall = install(repo)
    assertSuccess(currentInstall, 'keep an up-to-date dispatcher in a read-only hooks directory')
    assert.match(currentInstall.stdout, /already current/)
  } finally {
    fs.chmodSync(sharedHooks, 0o755)
  }

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
  fs.writeFileSync(dispatcherPath, previousDispatcher, { mode: 0o755 })
  const upgradeResult = install(repo)
  assertSuccess(upgradeResult, 'upgrade previous generated dispatcher')
  assert.match(upgradeResult.stdout, /Updated managed commit-msg dispatcher/)
  assert.match(fs.readFileSync(dispatcherPath, 'utf8'), /hooks-init\.sh/)
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(dispatcherPath).mode & 0o111, 0o111)
  }

  // 旧版 marker 形态（# mono-managed-commit-msg-dispatcher）同样必须升级；否则已装旧版的仓库
  // 在 merge 后会一直打印 "Preserving existing ..."，五项 pre-commit 检查继续静默空转。
  fs.writeFileSync(dispatcherPath, '#!/bin/sh\n# mono-managed-commit-msg-dispatcher\n\nprintf legacy\n', {
    mode: 0o755
  })
  const markerUpgradeResult = install(repo)
  assertSuccess(markerUpgradeResult, 'upgrade legacy marker dispatcher')
  assert.match(markerUpgradeResult.stdout, /Updated managed commit-msg dispatcher/)
  assert.match(fs.readFileSync(dispatcherPath, 'utf8'), /mono-managed-git-hook-dispatcher: commit-msg/)

  // 内容已最新但执行位丢失时也要恢复权限，否则 env-doctor 的 "not executable" 会变成永久 fail。
  if (process.platform !== 'win32') {
    fs.chmodSync(dispatcherPath, 0o644)
    const permissionResult = install(repo)
    assertSuccess(permissionResult, 'restore dispatcher permissions')
    assert.match(permissionResult.stdout, /Restored commit-msg dispatcher permissions/)
    assert.equal(fs.statSync(dispatcherPath).mode & 0o111, 0o111)
  }

  assertSuccess(run('git', ['-C', repo, 'worktree', 'add', '-b', 'linked', linked]), 'fixture linked worktree')
  assert.equal(
    run('git', ['-C', linked, 'ls-tree', 'HEAD', '.vite-hooks/commit-msg']).stdout.split(' ')[0],
    '100644',
    'linked worktree fixture should reproduce the non-executable tracked hook'
  )
  fs.writeFileSync(messagePath, 'chore(root): fixture message\n')

  for (const [worktree, marker, preCommitMarker] of [
    [repo, mainMarker, mainPreCommitMarker],
    [linked, linkedMarker, linkedPreCommitMarker]
  ]) {
    assertSuccess(
      run('git', ['-C', worktree, 'hook', 'run', 'commit-msg', '--', messagePath], {
        env: { HOOK_MARKER: marker }
      }),
      `run dispatcher in ${worktree}`
    )
    assert.equal(fs.readFileSync(marker, 'utf8'), `${messagePath}\n`)
    assertSuccess(
      run('git', ['-C', worktree, 'hook', 'run', 'pre-commit'], {
        env: { PRE_COMMIT_MARKER: preCommitMarker }
      }),
      `run pre-commit dispatcher in ${worktree}`
    )
    assert.equal(fs.readFileSync(preCommitMarker, 'utf8'), 'pre-commit')
  }

  const versionedCommitHook = path.join(repoRoot, '.vite-hooks', 'commit-msg')
  const runVersionedCommitHook = message => {
    fs.writeFileSync(messagePath, message)
    return spawnSync('sh', [versionedCommitHook, messagePath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env
    })
  }
  assertSuccess(
    runVersionedCommitHook('fix(root): verify the English commit hook\n'),
    'accept an English commit message'
  )
  assert.notEqual(runVersionedCommitHook('fix(root): 修复提交检查\n').status, 0, 'reject CJK prose in a commit message')
  const commentOnlyResult = runVersionedCommitHook('#319 radio/checkbox 把 role 挂在 label 上\n')
  assert.notEqual(commentOnlyResult.status, 0, 'reject a commit message with only comment lines')
  assert.match(commentOnlyResult.stderr, /commit message must contain non-comment content/)

  // 缺 mise 时必须给出可读原因并以非零退出，而不是只留下 127。
  if (process.platform !== 'win32') {
    const trackedPreCommit = path.resolve(import.meta.dirname, '../../.vite-hooks/pre-commit')
    const noMise = spawnSync('sh', [trackedPreCommit], {
      env: { PATH: '/usr/bin:/bin' },
      encoding: 'utf8'
    })
    assert.equal(noMise.status, 1, 'pre-commit must fail when mise is not on PATH')
    assert.match(noMise.stderr, /needs mise on PATH/)
  }

  fs.unlinkSync(mainMarker)
  fs.unlinkSync(linkedMarker)
  fs.unlinkSync(mainPreCommitMarker)
  fs.unlinkSync(linkedPreCommitMarker)
  assertSuccess(
    run('git', ['-C', repo, 'config', 'vp.hooks.disabled', 'true']),
    'disable Vite+ hooks after dispatcher installation'
  )
  for (const [worktree, marker, preCommitMarker] of [
    [repo, mainMarker, mainPreCommitMarker],
    [linked, linkedMarker, linkedPreCommitMarker]
  ]) {
    assertSuccess(
      run('git', ['-C', worktree, 'hook', 'run', 'commit-msg', '--', messagePath], {
        env: { HOOK_MARKER: marker }
      }),
      `respect disabled preference in ${worktree}`
    )
    assert.equal(fs.existsSync(marker), false, 'disabled preference must skip the versioned hook')
    assertSuccess(
      run('git', ['-C', worktree, 'hook', 'run', 'pre-commit'], {
        env: { PRE_COMMIT_MARKER: preCommitMarker }
      }),
      `respect disabled preference for pre-commit in ${worktree}`
    )
    assert.equal(fs.existsSync(preCommitMarker), false, 'disabled preference must skip the versioned pre-commit hook')
  }

  assertSuccess(
    run('git', ['-C', repo, 'config', '--unset', 'vp.hooks.disabled']),
    're-enable Vite+ hooks for idempotency check'
  )
  const installedContents = fs.readFileSync(dispatcherPath, 'utf8')
  const installedPreCommitContents = fs.readFileSync(preCommitDispatcherPath, 'utf8')
  assertSuccess(install(repo), 'repeat custom hooksPath installation')
  assert.equal(fs.readFileSync(dispatcherPath, 'utf8'), installedContents, 'installer must be idempotent')
  assert.equal(
    fs.readFileSync(preCommitDispatcherPath, 'utf8'),
    installedPreCommitContents,
    'pre-commit dispatcher must be idempotent too'
  )

  const customRepo = path.join(fixtureRoot, 'repo with custom hook')
  const customHooks = path.join(fixtureRoot, 'custom hooks')
  initRepo(customRepo)
  fs.mkdirSync(path.join(customRepo, '.vite-hooks'), { recursive: true })
  fs.writeFileSync(path.join(customRepo, '.vite-hooks', 'commit-msg'), '#!/bin/sh\nexit 0\n')
  fs.writeFileSync(path.join(customRepo, '.vite-hooks', 'pre-commit'), '#!/bin/sh\nexit 0\n')
  fs.mkdirSync(customHooks)
  const customHookPath = path.join(customHooks, 'commit-msg')
  const customPreCommitPath = path.join(customHooks, 'pre-commit')
  fs.writeFileSync(customHookPath, '#!/bin/sh\nprintf custom\n')
  fs.writeFileSync(customPreCommitPath, '#!/bin/sh\nprintf custom pre-commit\n')
  assertSuccess(run('git', ['-C', customRepo, 'config', 'core.hooksPath', customHooks]), 'custom hook config')
  fs.chmodSync(customHooks, 0o555)
  let customInstall
  try {
    customInstall = install(customRepo)
    assertSuccess(customInstall, 'preserve existing custom hooks in a read-only hooks directory')
  } finally {
    fs.chmodSync(customHooks, 0o755)
  }
  assert.match(customInstall.stdout, /Preserving existing commit-msg hook/)
  assert.match(customInstall.stdout, /Preserving existing pre-commit hook/)
  assert.equal(fs.readFileSync(customHookPath, 'utf8'), '#!/bin/sh\nprintf custom\n')
  assert.equal(fs.readFileSync(customPreCommitPath, 'utf8'), '#!/bin/sh\nprintf custom pre-commit\n')

  const unrelatedRepo = path.join(fixtureRoot, 'unrelated repo')
  const unrelatedMarker = path.join(fixtureRoot, 'unrelated-hook-ran')
  initRepo(unrelatedRepo)
  fs.mkdirSync(path.join(unrelatedRepo, '.vite-hooks'), { recursive: true })
  fs.writeFileSync(path.join(unrelatedRepo, '.vite-hooks', 'commit-msg'), '#!/bin/sh\nprintf ran > "$HOOK_MARKER"\n')
  assertSuccess(
    run('git', ['-C', unrelatedRepo, 'config', 'core.hooksPath', sharedHooks]),
    'unrelated repository hooksPath config'
  )
  assertSuccess(
    run('git', ['-C', unrelatedRepo, 'hook', 'run', 'commit-msg', '--', messagePath], {
      env: { HOOK_MARKER: unrelatedMarker }
    }),
    'shared dispatcher should route to the current repository versioned hook'
  )
  assert.equal(fs.readFileSync(unrelatedMarker, 'utf8'), 'ran', 'shared dispatcher must use the current worktree hook')

  const disabledRepo = path.join(fixtureRoot, 'repo with disabled hooks')
  initRepo(disabledRepo)
  fs.mkdirSync(path.join(disabledRepo, '.vite-hooks'), { recursive: true })
  fs.writeFileSync(path.join(disabledRepo, '.vite-hooks', 'commit-msg'), '#!/bin/sh\nexit 0\n')
  assertSuccess(run('git', ['-C', disabledRepo, 'config', 'core.hooksPath', '/dev/null']), 'disabled hooks config')
  const disabledInstall = install(disabledRepo)
  assertSuccess(disabledInstall, 'install with hooks disabled')
  assert.match(disabledInstall.stdout, /skipping git hook setup/)

  const preferenceRepo = path.join(fixtureRoot, 'repo with disabled preference')
  initRepo(preferenceRepo)
  fs.mkdirSync(path.join(preferenceRepo, '.vite-hooks'), { recursive: true })
  fs.writeFileSync(path.join(preferenceRepo, '.vite-hooks', 'commit-msg'), '#!/bin/sh\nexit 0\n')
  assertSuccess(run('git', ['-C', preferenceRepo, 'config', 'vp.hooks.disabled', 'true']), 'Vite+ disabled preference')
  const preferenceInstall = install(preferenceRepo)
  assertSuccess(preferenceInstall, 'install with disabled Vite+ preference')
  assert.match(preferenceInstall.stdout, /disabled by local Vite\+ preference/)
  assert.equal(fs.existsSync(path.join(preferenceRepo, '.git', 'hooks', 'commit-msg')), false)

  const environmentRepo = path.join(fixtureRoot, 'repo with disabled environment')
  initRepo(environmentRepo)
  fs.mkdirSync(path.join(environmentRepo, '.vite-hooks'), { recursive: true })
  fs.writeFileSync(path.join(environmentRepo, '.vite-hooks', 'commit-msg'), '#!/bin/sh\nexit 0\n')
  const environmentInstall = install(environmentRepo, { VP_GIT_HOOKS: '0' })
  assertSuccess(environmentInstall, 'install with disabled Vite+ environment')
  assert.match(environmentInstall.stdout, /disabled by the environment/)
  assert.equal(fs.existsSync(path.join(environmentRepo, '.git', 'hooks', 'commit-msg')), false)

  const initScriptRepo = path.join(fixtureRoot, 'repo with hooks init script')
  const xdgConfig = path.join(fixtureRoot, 'xdg config')
  const hooksInit = path.join(xdgConfig, 'vite-plus', 'hooks-init.sh')
  const initScriptMarker = path.join(fixtureRoot, 'init-script-hook-ran')
  initRepo(initScriptRepo)
  fs.mkdirSync(path.join(initScriptRepo, '.vite-hooks'), { recursive: true })
  fs.writeFileSync(path.join(initScriptRepo, '.vite-hooks', 'commit-msg'), '#!/bin/sh\nprintf ran > "$HOOK_MARKER"\n')
  fs.mkdirSync(path.dirname(hooksInit), { recursive: true })
  fs.writeFileSync(
    hooksInit,
    'command -v mono54_optional_manager >/dev/null 2>&1 && export MONO54_MANAGER=1\nexport VP_GIT_HOOKS=0\n'
  )
  assertSuccess(install(initScriptRepo), 'install with hooks enabled before per-user init script is applied')
  assertSuccess(
    run('git', ['-C', initScriptRepo, 'hook', 'run', 'commit-msg', '--', messagePath], {
      env: { XDG_CONFIG_HOME: xdgConfig, HOOK_MARKER: initScriptMarker }
    }),
    'respect the Vite+ hook init script at hook runtime'
  )
  assert.equal(fs.existsSync(initScriptMarker), false, 'init script preference must skip the versioned hook')

  const outsideRepo = path.join(fixtureRoot, 'outside Git')
  fs.mkdirSync(outsideRepo)
  const outsideInstall = install(outsideRepo)
  assertSuccess(outsideInstall, 'skip hook setup outside Git')
  assert.match(outsideInstall.stdout, /outside a Git worktree/)
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}

console.log('scripts/maintenance/install-git-hooks.test.mjs: all assertions passed')
