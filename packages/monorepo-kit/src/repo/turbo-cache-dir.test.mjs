import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { findRepoRoot } from '../shared/repo-root.mjs'

import { resolveTurboCacheDir } from './turbo-cache-dir.mjs'

const repoRoot = findRepoRoot()
const helper = path.join(repoRoot, 'scripts', 'lib', 'turbo-cache-dir.sh')
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "greypan turbo cache 'fixture'-"))

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  assert.notEqual(result.status, null, `${command} did not run: ${result.error?.message ?? ''}`)
  return result
}

function assertSuccess(result, label) {
  assert.equal(result.status, 0, `${label} failed (${result.status}): ${result.stderr}\n${result.stdout}`)
}

function git(root, args) {
  const result = run('git', ['-C', root, ...args])
  assertSuccess(result, `git ${args.join(' ')}`)
  return result.stdout.trim()
}

function resolveCache(root, env = {}, pathValue = process.env.PATH) {
  const result = run('/bin/sh', [helper, '--root', root], {
    cwd: repoRoot,
    env: { ...process.env, ...env, PATH: pathValue }
  })
  return result
}

try {
  const source = path.join(fixtureRoot, "main repo 'quoted' with spaces")
  const worktree = path.join(fixtureRoot, "linked worktree 'quoted' with spaces")
  const clone = path.join(fixtureRoot, "separate clone 'quoted' with spaces")
  fs.mkdirSync(source, { recursive: true })
  assertSuccess(run('git', ['-C', source, 'init', '-b', 'main']), 'git init')
  fs.writeFileSync(
    path.join(source, 'package.json'),
    JSON.stringify({
      name: 'turbo-cache-fixture',
      version: '1.0.0',
      private: true,
      packageManager: 'pnpm@12.4.0',
      scripts: { build: 'node build.mjs' }
    })
  )
  fs.writeFileSync(path.join(source, 'turbo.json'), JSON.stringify({ tasks: { build: { outputs: ['dist/**'] } } }))
  const marker = path.join(fixtureRoot, 'build count.txt')
  const buildSource =
    [
      "import fs from 'node:fs'",
      "import path from 'node:path'",
      `const file = ${JSON.stringify(marker)}`,
      "const count = Number(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '0') + 1",
      'fs.writeFileSync(file, String(count))',
      "fs.mkdirSync('dist', { recursive: true })",
      "fs.writeFileSync(path.join('dist', 'built.txt'), 'fixture output\\n')"
    ].join('\n') + '\n'
  fs.writeFileSync(path.join(source, 'build.mjs'), buildSource)
  git(source, ['add', 'package.json', 'turbo.json', 'build.mjs'])
  assertSuccess(
    run('git', [
      '-C',
      source,
      '-c',
      'user.name=Codex',
      '-c',
      'user.email=noreply@openai.com',
      'commit',
      '-m',
      'fixture'
    ]),
    'fixture commit'
  )
  assertSuccess(run('git', ['clone', '--quiet', source, clone]), 'fixture clone')
  assertSuccess(run('git', ['-C', source, 'worktree', 'add', '--detach', worktree, 'HEAD']), 'fixture worktree')

  const tempWithQuotes = path.join(fixtureRoot, "temporary root 'with spaces'")
  const tempLink = path.join(fixtureRoot, 'temporary-root-link')
  fs.mkdirSync(tempWithQuotes)
  fs.symlinkSync(tempWithQuotes, tempLink)
  const physicalTemp = fs.realpathSync(tempWithQuotes)

  const mainPath = resolveCache(source, { TMPDIR: tempWithQuotes })
  assertSuccess(mainPath, 'main worktree cache resolution')
  const mainCache = mainPath.stdout.trim()
  assert.ok(mainCache.startsWith(`${physicalTemp}/greypan/turbo-cache/`), mainCache)
  assert.equal(mainPath.stdout.trim().split('\n').length, 1, 'helper must print one line')
  const worktreePath = resolveCache(worktree, { TMPDIR: tempWithQuotes })
  assertSuccess(worktreePath, 'linked worktree cache resolution')
  assert.equal(worktreePath.stdout.trim(), mainCache)
  const clonePath = resolveCache(clone, { TMPDIR: tempWithQuotes })
  assertSuccess(clonePath, 'separate clone cache resolution')
  assert.notEqual(clonePath.stdout.trim(), mainCache, 'a separate clone must use a separate cache namespace')

  assert.equal(
    resolveTurboCacheDir(source, { TMPDIR: tempWithQuotes }),
    mainCache,
    'Node and POSIX resolvers must agree for the main worktree'
  )
  assert.equal(
    resolveTurboCacheDir(worktree, { TMPDIR: tempWithQuotes }),
    mainCache,
    'Node and POSIX resolvers must agree for a linked worktree'
  )
  assert.notEqual(
    resolveTurboCacheDir(clone, { TMPDIR: tempWithQuotes }),
    mainCache,
    'the Node resolver must keep a separate clone namespace'
  )

  const defaultRoot = run('/bin/sh', [helper], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: tempWithQuotes }
  })
  assertSuccess(defaultRoot, 'default helper root')
  const repositoryCache = resolveCache(repoRoot, { TMPDIR: tempWithQuotes })
  assertSuccess(repositoryCache, 'repository cache path')
  assert.equal(
    defaultRoot.stdout.trim(),
    repositoryCache.stdout.trim(),
    'default root must come from the helper location'
  )
  assert.equal(
    resolveTurboCacheDir(undefined, { TMPDIR: tempWithQuotes }),
    repositoryCache.stdout.trim(),
    'the Node resolver default root must match the helper default root'
  )

  const symlinkTemp = resolveCache(source, { TMPDIR: tempLink })
  assertSuccess(symlinkTemp, 'symlink temp root')
  assert.equal(symlinkTemp.stdout.trim(), mainCache, 'temp root symlinks must be canonicalized')

  const tempFallback = path.join(fixtureRoot, 'TMP fallback')
  const tempFallback2 = path.join(fixtureRoot, 'TEMP fallback')
  fs.mkdirSync(tempFallback)
  fs.mkdirSync(tempFallback2)
  const tmpFallbackPath = resolveCache(source, { TMPDIR: '', TMP: tempFallback, TEMP: tempFallback2 })
  assertSuccess(tmpFallbackPath, 'TMP fallback')
  assert.equal(
    tmpFallbackPath.stdout.trim(),
    path.join(fs.realpathSync(tempFallback), 'greypan', 'turbo-cache', mainCache.split('/').at(-1))
  )
  const tempFallbackPath = resolveCache(source, { TMPDIR: '', TMP: '', TEMP: tempFallback2 })
  assertSuccess(tempFallbackPath, 'TEMP fallback')
  assert.equal(
    tempFallbackPath.stdout.trim(),
    path.join(fs.realpathSync(tempFallback2), 'greypan', 'turbo-cache', mainCache.split('/').at(-1))
  )
  const defaultTemp = resolveCache(source, { TMPDIR: '', TMP: '', TEMP: '' })
  assertSuccess(defaultTemp, 'default system temp fallback')
  assert.ok(defaultTemp.stdout.trim().startsWith(`${fs.realpathSync('/tmp')}/greypan/turbo-cache/`))

  assert.equal(
    resolveTurboCacheDir(source, { TMPDIR: '', TMP: tempFallback, TEMP: tempFallback2 }),
    tmpFallbackPath.stdout.trim(),
    'the Node resolver must follow the same TMP fallback'
  )
  assert.equal(
    resolveTurboCacheDir(source, { TMPDIR: '', TMP: '', TEMP: tempFallback2 }),
    tempFallbackPath.stdout.trim(),
    'the Node resolver must follow the same TEMP fallback'
  )
  assert.equal(
    resolveTurboCacheDir(source, { TMPDIR: '', TMP: '', TEMP: '' }),
    defaultTemp.stdout.trim(),
    'the Node resolver must use the same default system temp'
  )

  const relativeTemp = resolveCache(source, { TMPDIR: 'relative-temp', TMP: tempFallback })
  assert.notEqual(relativeTemp.status, 0)
  assert.match(relativeTemp.stderr, /TMPDIR must be an absolute/)
  const missingTemp = resolveCache(source, { TMPDIR: path.join(fixtureRoot, 'missing-temp'), TMP: tempFallback })
  assert.notEqual(missingTemp.status, 0)
  assert.match(missingTemp.stderr, /TMPDIR is not an existing directory/)

  assert.throws(
    () => resolveTurboCacheDir(source, { TMPDIR: 'relative-temp', TMP: tempFallback }),
    /TMPDIR must be an absolute existing directory/
  )
  assert.throws(
    () => resolveTurboCacheDir(source, { TMPDIR: path.join(fixtureRoot, 'missing-temp'), TMP: tempFallback }),
    /TMPDIR is not an existing directory/
  )

  const nonRepository = path.join(fixtureRoot, 'not a repository')
  fs.mkdirSync(nonRepository)
  const noGit = resolveCache(nonRepository, { TMPDIR: tempWithQuotes })
  assert.notEqual(noGit.status, 0)
  assert.match(noGit.stderr, /cannot resolve the Git common directory/)
  assert.throws(
    () => resolveTurboCacheDir(nonRepository, { TMPDIR: tempWithQuotes }),
    /cannot resolve the Git common directory/
  )

  const objectsDirectory = path.join(source, '.git', 'objects')
  const objectsBefore = fs.readdirSync(objectsDirectory).sort()
  const systemPath = '/usr/bin:/bin:/usr/sbin:/sbin'
  const withoutNode = run('/bin/sh', [helper, '--root', source], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: tempWithQuotes, PATH: systemPath }
  })
  assertSuccess(withoutNode, 'helper without Node on PATH')
  assert.equal(withoutNode.stdout.trim(), mainCache)
  assert.deepEqual(fs.readdirSync(objectsDirectory).sort(), objectsBefore, 'helper must not write Git objects')

  const turbo = path.join(repoRoot, 'node_modules', '.bin', 'turbo')
  assert.ok(fs.existsSync(turbo), 'workspace Turbo executable is required for the cache restoration fixture')
  fs.mkdirSync(path.dirname(mainCache), { recursive: true })
  const buildEnv = {
    ...process.env,
    TMPDIR: tempWithQuotes,
    TURBO_CACHE_DIR: mainCache,
    BUILD_MARKER: marker,
    TURBO_TELEMETRY_DISABLED: '1'
  }
  const build = (cwd, label) => {
    const result = run(turbo, ['run', 'build'], {
      cwd,
      env: { ...buildEnv, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}` }
    })
    assertSuccess(result, label)
    return result.stdout + result.stderr
  }

  build(source, 'initial fixture build')
  assert.equal(fs.readFileSync(marker, 'utf8'), '1')
  fs.rmSync(path.join(worktree, 'dist'), { recursive: true, force: true })
  build(worktree, 'linked worktree cache restore')
  assert.equal(fs.readFileSync(marker, 'utf8'), '1', 'the linked worktree must restore the cached output')
  assert.equal(fs.readFileSync(path.join(worktree, 'dist', 'built.txt'), 'utf8'), 'fixture output\n')

  fs.rmSync(mainCache, { recursive: true, force: true })
  fs.rmSync(path.join(worktree, 'dist'), { recursive: true, force: true })
  build(worktree, 'cache loss rebuild')
  assert.equal(fs.readFileSync(marker, 'utf8'), '2', 'a missing artifact cache must rebuild outputs')
  assert.ok(fs.existsSync(mainCache), 'Turbo must recreate the removed cache namespace')
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}

// mise 的 env 模板直接 exec helper；这组断言钉住本地、覆盖与 GitHub Actions 三种分支。
function miseRun(command, args, env) {
  const result = run(command, args, {
    cwd: repoRoot,
    env: { ...env, MISE_TRUSTED_CONFIG_PATHS: repoRoot }
  })
  assertSuccess(result, `${command} ${args.join(' ')}`)
  return result.stdout.trim()
}

function canonicalCache(env) {
  return miseRun('/bin/sh', [helper], env)
}

function miseCache(env) {
  return miseRun('mise', ['exec', '--', 'printenv', 'TURBO_CACHE_DIR'], env)
}

{
  const localEnv = { ...process.env }
  delete localEnv.GITHUB_ACTIONS
  delete localEnv.TURBO_CACHE_DIR
  assert.equal(miseCache(localEnv), canonicalCache(localEnv), 'local mise must use the helper-derived cache')

  const localOverride = {
    ...localEnv,
    GITHUB_ACTIONS: '',
    TURBO_CACHE_DIR: path.join(os.tmpdir(), 'untrusted turbo cache override')
  }
  assert.equal(miseCache(localOverride), canonicalCache(localOverride), 'local mise must ignore an inherited override')

  const workspaceWithQuotes = fs.mkdtempSync(path.join(os.tmpdir(), "greypan GHA workspace 'quoted'-"))
  try {
    const ghaOverride = path.join(workspaceWithQuotes, "artifact cache 'space'")
    assert.equal(
      miseCache({ ...localEnv, GITHUB_ACTIONS: 'true', TURBO_CACHE_DIR: ghaOverride }),
      ghaOverride,
      'GitHub Actions mise must preserve the explicit workspace override verbatim'
    )
    const ghaWorkspace = 'D:\\a\\mono\\mono'
    assert.equal(
      miseCache({
        ...localEnv,
        GITHUB_ACTIONS: 'true',
        GITHUB_WORKSPACE: ghaWorkspace,
        TURBO_CACHE_DIR: '',
        TMPDIR: '/__mise_probe_missing_unix_temp__'
      }),
      `${ghaWorkspace}/.turbo`,
      'an empty GitHub Actions override must use its workspace without calling the POSIX helper'
    )

    const ghaWithoutWorkspace = { ...localEnv, GITHUB_ACTIONS: 'true', TURBO_CACHE_DIR: '' }
    delete ghaWithoutWorkspace.GITHUB_WORKSPACE
    assert.equal(
      miseCache(ghaWithoutWorkspace),
      canonicalCache(localEnv),
      'an incomplete GitHub Actions environment must fall back to the local helper'
    )
  } finally {
    fs.rmSync(workspaceWithQuotes, { recursive: true, force: true })
  }
}

console.log('packages/monorepo-kit/src/repo/turbo-cache-dir.test.mjs: all assertions passed')
