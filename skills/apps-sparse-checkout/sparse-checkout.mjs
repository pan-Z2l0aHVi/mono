#!/usr/bin/env node
// 极简 App-only git sparse-checkout 管理脚本：packages/ 与根级目录永远全量保留，仅按需隔离 apps/*。
// 契约与安全规则见同目录 SKILL.md。
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EXIT_OK = 0
const EXIT_FAILURE = 1
const EXIT_USAGE = 2
const DEPENDENCY_SYNC = ['install', '--frozen-lockfile']
const PNPM_BIN = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const USAGE = `Usage:
  node sparse-checkout.mjs --app <dir-name>... [--dry-run] [--json]
  node sparse-checkout.mjs --app <dir-name>... --check [--json]
  node sparse-checkout.mjs --status [--json]
  node sparse-checkout.mjs --restore [--json]
  node sparse-checkout.mjs --help

Actions:
  --app <dir-name>...  keep only the named apps/<dir-name> subtree(s); packages/ and all root dirs remain full
  --check              compare the current cone against the cone required by --app; read-only
  --status             read-only: show current sparse cone, visible/hidden apps, and reminders
  --restore            disable sparse checkout, materialize the full worktree, and sync dependencies
  --dry-run            print the computed cone and commands without modifying the worktree
  --json               machine-readable output on stdout
  -h, --help           show this help message

Exit codes: 0 success, 1 environment/git/pnpm failure or --check mismatch, 2 usage or target error.
`

export class ScopeError extends Error {
  constructor(message, exitCode = EXIT_FAILURE, detail = '') {
    super(message)
    this.name = 'ScopeError'
    this.exitCode = exitCode
    this.detail = detail
  }
}

export function parseArgs(argv) {
  const apps = []
  const flags = new Set()
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '-h' || token === '--help') {
      flags.add('help')
    } else if (token === '--dry-run') {
      flags.add('dry-run')
    } else if (token === '--restore') {
      flags.add('restore')
    } else if (token === '--status') {
      flags.add('status')
    } else if (token === '--check') {
      flags.add('check')
    } else if (token === '--json') {
      flags.add('json')
    } else if (token === '--app') {
      flags.add('app')
      let consumed = 0
      while (index + 1 < argv.length && !argv[index + 1].startsWith('-')) {
        index += 1
        apps.push(argv[index])
        consumed += 1
      }
      if (consumed === 0) {
        throw new ScopeError('--app requires at least one app directory name', EXIT_USAGE, USAGE)
      }
    } else if (token.startsWith('--app=')) {
      flags.add('app')
      const value = token.slice('--app='.length)
      if (!value) {
        throw new ScopeError('--app requires at least one app directory name', EXIT_USAGE, USAGE)
      }
      apps.push(value)
    } else if (token.startsWith('-')) {
      throw new ScopeError(`unknown argument: ${token}`, EXIT_USAGE, USAGE)
    } else {
      throw new ScopeError(`unexpected positional argument: ${token} (pass --app <dir-name>...)`, EXIT_USAGE, USAGE)
    }
  }

  const json = flags.has('json')
  if (flags.has('help')) return { action: 'help', json }

  const singletonActions = ['restore', 'status'].filter(action => flags.has(action))
  if (singletonActions.length > 1) {
    throw new ScopeError(`conflicting actions: ${singletonActions.map(a => `--${a}`).join(', ')}`, EXIT_USAGE, USAGE)
  }

  const singleton = singletonActions[0]
  if (singleton) {
    if (flags.has('app')) {
      throw new ScopeError(`--app cannot be combined with --${singleton}`, EXIT_USAGE, USAGE)
    }
    if (flags.has('check')) {
      throw new ScopeError(`--check cannot be combined with --${singleton}`, EXIT_USAGE, USAGE)
    }
    if (flags.has('dry-run')) {
      throw new ScopeError(`--dry-run cannot be combined with --${singleton}`, EXIT_USAGE, USAGE)
    }
    return { action: singleton, json }
  }

  if (flags.has('check')) {
    if (!flags.has('app')) {
      throw new ScopeError('--check requires --app <dir-name>...', EXIT_USAGE, USAGE)
    }
    if (flags.has('dry-run')) {
      throw new ScopeError('--dry-run cannot be combined with --check', EXIT_USAGE, USAGE)
    }
    return { action: 'check', json, dryRun: false, apps }
  }

  if (!flags.has('app')) {
    throw new ScopeError('missing action: pass --app <dir-name>..., --status, or --restore', EXIT_USAGE, USAGE)
  }

  return { action: 'app', json, dryRun: flags.has('dry-run'), apps }
}

const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export function normalizeConePath(value) {
  const raw = String(value).trim()
  if (!raw) throw new ScopeError('empty path in cone entry', EXIT_FAILURE)
  const normalized = raw.replace(/^\.\/+/, '').replace(/\/+$/, '')
  const segments = normalized.split('/')
  if (!normalized || normalized === '.' || path.posix.isAbsolute(normalized)) {
    throw new ScopeError(`path must be repo-relative: ${raw}`, EXIT_FAILURE)
  }
  if (segments.includes('..') || segments.includes('.')) {
    throw new ScopeError(`path must stay inside the repository: ${raw}`, EXIT_FAILURE)
  }
  return normalized
}

export function normalizeAppName(value) {
  const raw = String(value).trim()
  if (!raw) throw new ScopeError('app directory name must not be empty', EXIT_USAGE, USAGE)
  if (
    raw === '.' ||
    raw === '..' ||
    raw.includes('/') ||
    raw.includes('\\') ||
    raw.includes('\0') ||
    path.posix.isAbsolute(raw) ||
    path.win32.isAbsolute(raw)
  ) {
    throw new ScopeError(
      `invalid app directory name (expected a direct subdirectory name under apps/ without path separators or traversal): ${value}`,
      EXIT_USAGE,
      USAGE
    )
  }
  return raw
}

export function resolveAppTargets(rawApps, knownApps) {
  const knownSet = new Set(knownApps)
  const selected = []
  const seen = new Set()
  for (const rawApp of rawApps) {
    const name = normalizeAppName(rawApp)
    if (!knownSet.has(name)) {
      throw new ScopeError(
        `unknown app directory under apps/: ${name}`,
        EXIT_USAGE,
        knownApps.length > 0
          ? `known apps:\n${knownApps.map(entry => `  ${entry}`).join('\n')}`
          : 'known apps:\n  (none)'
      )
    }
    if (!seen.has(name)) {
      seen.add(name)
      selected.push(name)
    }
  }
  return selected
}

export function filterKeptRootDirs(dirs) {
  return dirs.filter(dir => dir !== 'apps')
}

export function buildCone(paths) {
  return [...new Set(paths.map(normalizeConePath))].sort(compareText)
}

export function computeAppsCone(rootDirs, selectedApps) {
  const keepRootDirs = filterKeptRootDirs(rootDirs)
  return buildCone([...keepRootDirs, ...selectedApps.map(app => `apps/${app}`)])
}

/**
 * cone 一致性判据：两个集合都按 buildCone 归一（去重、排序、路径规范化）再比差集。
 */
export function compareCone(current, expected) {
  const currentCone = buildCone(current)
  const expectedCone = buildCone(expected)
  const missing = expectedCone.filter(dir => !currentCone.includes(dir))
  const extra = currentCone.filter(dir => !expectedCone.includes(dir))
  return {
    matches: missing.length === 0 && extra.length === 0,
    current: currentCone,
    expected: expectedCone,
    missing,
    extra
  }
}

export function isPathInCone(file, cone) {
  const normalized = normalizeConePath(file)
  // Cone mode always materializes root-level files; only directories can be absent.
  if (!normalized.includes('/')) return true
  return cone.some(dir => normalized === dir || normalized.startsWith(`${dir}/`))
}

export function parsePorcelainZ(output) {
  const tokens = output.split('\0')
  const files = []
  for (let index = 0; index < tokens.length; index += 1) {
    const entry = tokens[index]
    if (!entry) continue
    const status = entry.slice(0, 2)
    const file = entry.slice(3)
    // -z puts the new path first and the original path in the next token for renames/copies.
    if (status.includes('R') || status.includes('C')) index += 1
    if (file) files.push(file)
  }
  return files
}

export function listDirtyOutsideCone(files, cone) {
  return files.filter(file => !isPathInCone(file, cone)).sort(compareText)
}

export function listHiddenApps(knownApps, selectedApps) {
  const selected = new Set(selectedApps)
  return knownApps.filter(app => !selected.has(app)).sort(compareText)
}

export function dependencySyncPlan({ hasWorkspaceFile, pnpmAvailable }) {
  if (!hasWorkspaceFile) return { mode: 'skip', reason: 'no pnpm-workspace.yaml at the repository root' }
  if (!pnpmAvailable) return { mode: 'skip', reason: 'pnpm is not available on PATH' }
  return { mode: 'sync' }
}

function preview(text) {
  const trimmed = String(text ?? '').trim()
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed
}

function runGit(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.error) throw new ScopeError(`cannot run git: ${result.error.message}`, EXIT_FAILURE)
  return result
}

function gitOrThrow(root, args, description) {
  const result = runGit(root, args)
  if (result.status !== 0) {
    throw new ScopeError(`${description} failed (exit ${result.status})`, EXIT_FAILURE, preview(result.stderr))
  }
  return result.stdout
}

function resolveRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  if (result.error) throw new ScopeError(`cannot run git: ${result.error.message}`, EXIT_FAILURE)
  if (result.status !== 0) throw new ScopeError('not inside a Git worktree', EXIT_FAILURE, preview(result.stderr))
  return fs.realpathSync(result.stdout.trim())
}

function listRootDirs(root) {
  const result = runGit(root, ['ls-tree', '-d', '--name-only', 'HEAD'])
  if (result.status !== 0) throw new ScopeError('cannot list root directories', EXIT_FAILURE, preview(result.stderr))
  return result.stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function listAppDirs(root) {
  const result = runGit(root, ['ls-tree', '-d', '--name-only', 'HEAD', '--', 'apps/'])
  if (result.status !== 0) {
    throw new ScopeError('cannot list directories under apps/', EXIT_FAILURE, preview(result.stderr))
  }
  return result.stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(entry => entry.slice('apps/'.length))
    .filter(name => name && !name.includes('/'))
    .sort(compareText)
}

function readSparseCone(root) {
  const result = runGit(root, ['sparse-checkout', 'list'])
  if (result.status === 0) {
    return result.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  }
  if (/not sparse/i.test(result.stderr)) return null
  throw new ScopeError('git sparse-checkout list failed', EXIT_FAILURE, preview(result.stderr))
}

function readConeMode(root) {
  const result = runGit(root, ['config', '--bool', '--get', 'core.sparseCheckoutCone'])
  if (result.status !== 0) return null
  const value = result.stdout.trim()
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function readDirtyFiles(root) {
  const result = runGit(root, ['status', '--porcelain', '-z'])
  if (result.status !== 0) throw new ScopeError('git status failed', EXIT_FAILURE, preview(result.stderr))
  return parsePorcelainZ(result.stdout)
}

function disableSparse(root) {
  const result = runGit(root, ['sparse-checkout', 'disable'])
  if (result.status !== 0 && !/not sparse/i.test(result.stderr)) {
    throw new ScopeError('git sparse-checkout disable failed', EXIT_FAILURE, preview(result.stderr))
  }
}

function applyCone(root, cone) {
  gitOrThrow(root, ['sparse-checkout', 'init', '--cone'], 'git sparse-checkout init --cone')
  const result = runGit(root, ['sparse-checkout', 'set', '--cone', ...cone])
  if (result.status !== 0) {
    throw new ScopeError('git sparse-checkout set failed', EXIT_FAILURE, preview(result.stderr))
  }
  return result.stderr
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('warning:'))
}

function resolveDependencyPlan(root) {
  const hasWorkspaceFile = fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))
  if (!hasWorkspaceFile) return dependencySyncPlan({ hasWorkspaceFile, pnpmAvailable: false })
  return dependencySyncPlan({
    hasWorkspaceFile,
    pnpmAvailable: spawnSync(PNPM_BIN, ['--version'], { cwd: root, encoding: 'utf8' }).status === 0
  })
}

function syncDependencies(root, plan) {
  if (plan.mode === 'skip') return { status: 'skipped', reason: plan.reason }
  const result = spawnSync(PNPM_BIN, DEPENDENCY_SYNC, { cwd: root, encoding: 'utf8' })
  if (result.error) {
    throw new ScopeError(`cannot run pnpm install --frozen-lockfile: ${result.error.message}`, EXIT_FAILURE)
  }
  if (result.status !== 0) {
    throw new ScopeError(
      'pnpm install --frozen-lockfile failed',
      EXIT_FAILURE,
      preview(result.stderr || result.stdout)
    )
  }
  return { status: 'synced' }
}

function restorePreviousState(root, previousCone, { applied, synced }, error) {
  if (!applied) return
  try {
    const notes = []
    if (previousCone) {
      const warnings = applyCone(root, previousCone)
      notes.push('note: previous sparse cone restored', ...warnings)
    } else {
      disableSparse(root)
      notes.push('note: sparse checkout disabled; the worktree is full')
    }
    if (!synced) notes.push('note: dependencies may be stale; run pnpm install --frozen-lockfile')
    if (error instanceof ScopeError) error.detail = `${error.detail}\n${notes.join('\n')}`.trim()
    else process.stderr.write(`${notes.join('\n')}\n`)
  } catch (restoreError) {
    const note = `note: the previous worktree state could not be restored: ${restoreError.message}`
    if (error instanceof ScopeError) error.detail = `${error.detail}\n${note}`.trim()
    else process.stderr.write(`${note}\n`)
  }
}

function writeReport(report, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    return
  }
  const order = [
    'action',
    'dryRun',
    'sparse',
    'coneMode',
    'matches',
    'apps',
    'knownApps',
    'visibleApps',
    'hiddenApps',
    'rootEntries',
    'cone',
    'previousCone',
    'currentCone',
    'expectedCone',
    'missing',
    'extra',
    'dirtyOutsideCone',
    'dependencies',
    'commands',
    'warnings',
    'reminders'
  ]
  const lines = []
  for (const key of order) {
    const value = report[key]
    if (value === undefined) continue
    if (key === 'dependencies') {
      if (value.status === 'synced') lines.push('dependencies: synced (pnpm install --frozen-lockfile)')
      else if (value.status === 'would-sync') lines.push('dependencies: would sync (pnpm install --frozen-lockfile)')
      else lines.push(`dependencies: skipped (${value.reason})`)
      continue
    }
    if (Array.isArray(value)) {
      lines.push(`${key}:`)
      if (value.length === 0) lines.push('  (none)')
      for (const entry of value) {
        lines.push(`  ${Array.isArray(entry) ? entry.join(' ') : String(entry)}`)
      }
      continue
    }
    lines.push(`${key}: ${value}`)
  }
  process.stdout.write(`${lines.join('\n')}\n`)
}

function printStatus(root, json) {
  const sparseCone = readSparseCone(root)
  const coneMode = sparseCone ? (readConeMode(root) === false ? 'non-cone' : 'cone') : 'full'
  const rootDirs = listRootDirs(root)
  const rootEntries = filterKeptRootDirs(rootDirs)
  const knownApps = listAppDirs(root)
  const visibleApps = sparseCone
    ? coneMode === 'cone'
      ? knownApps.filter(app => isPathInCone(`apps/${app}`, sparseCone))
      : []
    : knownApps
  const hiddenApps = sparseCone
    ? coneMode === 'cone'
      ? listHiddenApps(knownApps, visibleApps)
      : knownApps
    : []
  const dirty = sparseCone ? listDirtyOutsideCone(readDirtyFiles(root), sparseCone) : []
  const warnings = []
  if (coneMode === 'non-cone') {
    warnings.push('worktree is in non-cone sparse mode; re-apply with --app or run --restore')
  }
  if (sparseCone && coneMode === 'cone' && rootDirs.includes('packages') && !isPathInCone('packages', sparseCone)) {
    warnings.push('packages/ is hidden by the current sparse cone; re-apply with --app or run --restore')
  }
  if (dirty.length > 0) {
    warnings.push(
      `${dirty.length} uncommitted file(s) outside the cone; staged changes may leave the worktree until --restore`
    )
  }
  const report = {
    action: 'status',
    sparse: Boolean(sparseCone),
    coneMode,
    cone: sparseCone ?? [],
    knownApps,
    visibleApps,
    hiddenApps,
    rootEntries,
    dirtyOutsideCone: dirty,
    reminders: [
      'packages/ and all root directories remain full; only apps/* are isolated',
      'use `git grep <pattern> HEAD` when searching across hidden apps',
      'test-scripts, check-context and check-policy refuse a sparse worktree: run --restore or leave them to CI'
    ],
    warnings
  }
  writeReport(report, json)
  return EXIT_OK
}

function restore(root, json) {
  const previousCone = readSparseCone(root)
  if (!previousCone) {
    writeReport({ action: 'restore', sparse: false, previousCone: [] }, json)
    return EXIT_OK
  }
  const dependencyPlan = resolveDependencyPlan(root)
  disableSparse(root)
  let dependencies
  try {
    dependencies = syncDependencies(root, dependencyPlan)
  } catch (error) {
    const notes = [
      'note: sparse checkout disabled; the worktree is full',
      'note: dependencies may be stale; run pnpm install --frozen-lockfile'
    ]
    if (error instanceof ScopeError) error.detail = `${error.detail}\n${notes.join('\n')}`.trim()
    throw error
  }
  const warnings = []
  if (dependencies.status === 'skipped') {
    warnings.push(
      `dependencies were not synced (${dependencies.reason}); run pnpm install --frozen-lockfile before pnpm scripts or hooks`
    )
  }
  writeReport({ action: 'restore', sparse: false, previousCone, dependencies, warnings }, json)
  return EXIT_OK
}

function applyApps(root, options) {
  const previousCone = readSparseCone(root)
  const previousConeMode = previousCone ? (readConeMode(root) === false ? 'non-cone' : 'cone') : 'full'
  const rootDirs = listRootDirs(root)
  const keepRootDirs = filterKeptRootDirs(rootDirs)
  const knownApps = listAppDirs(root)
  const selectedApps = resolveAppTargets(options.apps, knownApps)
  const targetCone = computeAppsCone(rootDirs, selectedApps)

  const skillDir = path
    .relative(root, path.dirname(fs.realpathSync(fileURLToPath(import.meta.url))))
    .split(path.sep)
    .join('/')
  const skillInsideRepo =
    skillDir !== '' && skillDir !== '..' && !skillDir.startsWith('../') && !path.isAbsolute(skillDir)
  if (skillInsideRepo && !isPathInCone(skillDir, targetCone)) {
    throw new ScopeError(`the computed cone would hide this skill (${skillDir})`, EXIT_FAILURE)
  }

  const hiddenApps = listHiddenApps(knownApps, selectedApps)
  const dirtyOutsideCone = listDirtyOutsideCone(readDirtyFiles(root), targetCone)
  const dependencyPlan = resolveDependencyPlan(root)
  const warnings = []
  if (dirtyOutsideCone.length > 0) {
    warnings.push(
      `${dirtyOutsideCone.length} uncommitted file(s) outside the cone are no longer part of the cone; staged changes may leave the worktree until --restore`
    )
  }
  if (hiddenApps.length === 0) {
    warnings.push('no app would be hidden; this selection keeps all apps')
  }

  const commands = [
    ['git', 'sparse-checkout', 'init', '--cone'],
    ['git', 'sparse-checkout', 'set', '--cone', ...targetCone]
  ]
  if (dependencyPlan.mode === 'sync') commands.push([PNPM_BIN, ...DEPENDENCY_SYNC])

  const report = {
    action: options.action,
    apps: selectedApps,
    knownApps,
    hiddenApps,
    rootEntries: keepRootDirs,
    cone: targetCone,
    dirtyOutsideCone,
    dependencies:
      dependencyPlan.mode === 'sync'
        ? { status: 'would-sync' }
        : { status: 'skipped', reason: dependencyPlan.reason },
    commands,
    warnings
  }

  if (options.action === 'check') {
    const verdict =
      previousConeMode === 'non-cone'
        ? {
            matches: false,
            current: previousCone ?? [],
            expected: targetCone,
            missing: targetCone,
            extra: []
          }
        : compareCone(previousCone ?? [], targetCone)
    const advice =
      previousConeMode === 'non-cone'
        ? 'worktree is in non-cone sparse mode; re-apply with --app <dir-name>...'
        : verdict.matches
          ? 'the cone matches this --app selection'
          : previousCone
            ? 'the cone drifted from this --app selection; re-apply with --app <dir-name>...'
            : 'the worktree is full; apply the isolation with --app <dir-name>...'
    writeReport(
      {
        ...report,
        cone: undefined,
        dependencies: undefined,
        commands: undefined,
        warnings: [advice],
        sparse: Boolean(previousCone),
        coneMode: previousConeMode,
        matches: verdict.matches,
        expectedCone: verdict.expected,
        currentCone: verdict.current,
        missing: verdict.missing,
        extra: verdict.extra
      },
      options.json
    )
    return verdict.matches ? EXIT_OK : EXIT_FAILURE
  }

  if (options.dryRun) {
    writeReport({ ...report, dryRun: true, sparse: Boolean(previousCone), coneMode: previousConeMode }, options.json)
    return EXIT_OK
  }

  let applied = false
  let synced = false
  try {
    applied = true
    warnings.push(...applyCone(root, targetCone))
    const dependencies = syncDependencies(root, dependencyPlan)
    synced = dependencies.status === 'synced'
    if (dependencies.status === 'skipped') {
      warnings.push(
        `dependencies were not synced (${dependencies.reason}); run pnpm install --frozen-lockfile before pnpm scripts or hooks`
      )
    }
    const finalCone = readSparseCone(root) ?? targetCone
    writeReport(
      {
        ...report,
        sparse: true,
        coneMode: 'cone',
        cone: finalCone,
        dependencies,
        reminders: [
          'packages/ and all root directories remain full; only unselected apps/* are hidden',
          'use `git grep <pattern> HEAD` when searching across hidden apps',
          'test-scripts, check-context and check-policy refuse a sparse worktree: run --restore or leave them to CI',
          'pass --app <dir-name>... again to switch apps idempotently, or --restore to materialize all apps'
        ]
      },
      options.json
    )
    return EXIT_OK
  } catch (error) {
    restorePreviousState(root, previousCone, { applied, synced }, error)
    throw error
  }
}

export function main(argv) {
  try {
    const options = parseArgs(argv)
    if (options.action === 'help') {
      process.stdout.write(USAGE)
      return EXIT_OK
    }
    const root = resolveRoot()
    if (options.action === 'status') return printStatus(root, options.json)
    if (options.action === 'restore') return restore(root, options.json)
    return applyApps(root, options)
  } catch (error) {
    if (error instanceof ScopeError) {
      process.stderr.write(`apps-sparse-checkout: ${error.message}\n`)
      if (error.detail) process.stderr.write(`${error.detail}\n`)
      return error.exitCode
    }
    process.stderr.write(`apps-sparse-checkout: unexpected failure: ${error?.stack ?? String(error)}\n`)
    return EXIT_FAILURE
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(fs.realpathSync(path.resolve(process.argv[1]))).href : ''
const modulePath = pathToFileURL(fs.realpathSync(fileURLToPath(import.meta.url))).href
if (entrypoint === modulePath) process.exitCode = main(process.argv.slice(2))
