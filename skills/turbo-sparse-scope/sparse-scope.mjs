#!/usr/bin/env node
// 按 turbo 依赖闭包收缩 git sparse-checkout。契约与安全规则见同目录 SKILL.md。
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EXIT_OK = 0
const EXIT_FAILURE = 1
const EXIT_USAGE = 2
const WILDCARD = /[*?[\]{}]/
const USAGE = `Usage:
  node sparse-scope.mjs <path|package>... [--dry-run] [--add|--reset] [--json]
  node sparse-scope.mjs --status [--json]
  node sparse-scope.mjs --restore [--json]

Actions:
  (default)   compute the closure and replace the sparse cone
  --add       union the new closure with the current cone (requires a full-tree recompute)
  --reset     replace the current cone with the new closure
  --restore   disable sparse checkout and materialize the full worktree
  --status    read-only: current cone, workspace layout and reminders
  --dry-run   print the computed cone and commands without touching the worktree
  --json      machine-readable output on stdout

Exit codes: 0 success, 1 environment/runtime failure, 2 usage or target error.
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
  const targets = []
  const flags = new Set()
  for (const token of argv) {
    if (token === '-h' || token === '--help') flags.add('help')
    else if (token === '--dry-run') flags.add('dry-run')
    else if (token === '--add') flags.add('add')
    else if (token === '--reset') flags.add('reset')
    else if (token === '--restore') flags.add('restore')
    else if (token === '--status') flags.add('status')
    else if (token === '--json') flags.add('json')
    else if (token.startsWith('-')) throw new ScopeError(`unknown argument: ${token}`, EXIT_USAGE, USAGE)
    else targets.push(token)
  }

  const json = flags.has('json')
  if (flags.has('help')) return { action: 'help', json }

  const actions = ['add', 'reset', 'restore', 'status'].filter(action => flags.has(action))
  if (actions.length > 1) throw new ScopeError(`conflicting actions: ${actions.join(', ')}`, EXIT_USAGE, USAGE)

  const action = actions[0] ?? 'set'
  if (action === 'restore' || action === 'status') {
    if (targets.length > 0) throw new ScopeError(`--${action} does not accept targets`, EXIT_USAGE, USAGE)
    if (flags.has('dry-run')) throw new ScopeError(`--dry-run cannot be combined with --${action}`, EXIT_USAGE, USAGE)
    return { action, json }
  }

  if (targets.length === 0)
    throw new ScopeError(`${action === 'set' ? 'set' : `--${action}`} requires at least one target`, EXIT_USAGE, USAGE)
  return { action, json, dryRun: flags.has('dry-run'), targets }
}

export function normalizeConePath(value) {
  const raw = String(value).trim()
  if (!raw) throw new ScopeError('empty path in a target or turbo output', EXIT_FAILURE)
  const normalized = raw.replace(/^\.\/+/, '').replace(/\/+$/, '')
  const segments = normalized.split('/')
  if (!normalized || normalized === '.' || path.posix.isAbsolute(normalized))
    throw new ScopeError(`path must be repo-relative: ${raw}`, EXIT_FAILURE)
  if (segments.includes('..') || segments.includes('.'))
    throw new ScopeError(`path must stay inside the repository: ${raw}`, EXIT_FAILURE)
  return normalized
}

export function parseWorkspaceContainers(text) {
  const containers = new Set()
  let inPackages = false
  for (const rawLine of String(text).split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (/^packages\s*:\s*(?:#.*)?$/.test(trimmed)) {
      inPackages = true
      continue
    }
    if (!inPackages) continue
    if (!trimmed.startsWith('-')) {
      inPackages = false
      continue
    }
    let entry = trimmed.slice(1).trim()
    if (entry.startsWith('"') || entry.startsWith("'")) {
      const quote = entry[0]
      const end = entry.indexOf(quote, 1)
      entry = end > 0 ? entry.slice(1, end) : entry.slice(1)
    } else entry = entry.replace(/\s+#.*$/, '').trim()
    if (!entry || entry.startsWith('!')) continue
    const segments = entry.split('/').filter(Boolean)
    const wildcard = segments.findIndex(segment => WILDCARD.test(segment))
    if (wildcard === 0) continue
    const container = wildcard > 0 ? segments.slice(0, wildcard).join('/') : segments.slice(0, -1).join('/')
    if (container) containers.add(container)
  }
  return [...containers].sort(compareText)
}

export function isInsideContainer(target, containers) {
  return containers.some(container => target === container || target.startsWith(container + '/'))
}

export function isContainerAncestor(target, containers) {
  return containers.some(container => container.startsWith(target + '/'))
}

export function filterKeptRootDirs(dirs, containers) {
  return dirs.filter(dir => !isInsideContainer(dir, containers) && !isContainerAncestor(dir, containers))
}

export function selectRootDependencyPackages(rawPackage, packages) {
  const names = new Set([
    ...Object.keys(rawPackage?.dependencies ?? {}),
    ...Object.keys(rawPackage?.devDependencies ?? {})
  ])
  const byName = new Map(packages.map(pkg => [pkg.name, pkg]))
  return [...names]
    .filter(name => byName.has(name))
    .map(name => byName.get(name))
    .sort((a, b) => compareText(a.name, b.name))
}

export function resolveScopeTargets(rawTargets, packages, { containers, rootEntries }) {
  const byName = new Map(packages.map(pkg => [pkg.name, pkg]))
  const rootEntrySet = new Set(rootEntries)
  const ignorableRootEntries = new Set(
    [...rootEntrySet].filter(entry => !isContainerAncestor(entry, containers))
  )
  const targets = []
  const ignoredTargets = new Set()
  const addTarget = pkg => {
    if (!targets.some(existing => existing.name === pkg.name)) targets.push(pkg)
  }
  for (const rawTarget of rawTargets) {
    const name = String(rawTarget).trim()
    if (byName.has(name)) {
      addTarget(byName.get(name))
      continue
    }
    let normalized
    try {
      normalized = normalizeConePath(rawTarget)
    } catch (error) {
      if (error instanceof ScopeError) throw new ScopeError(error.message, EXIT_USAGE, USAGE)
      throw error
    }
    const exact = packages.find(pkg => pkg.path === normalized)
    if (exact) {
      addTarget(exact)
      continue
    }
    const containing = packages
      .filter(pkg => normalized.startsWith(pkg.path + '/'))
      .sort((a, b) => b.path.length - a.path.length || compareText(a.path, b.path))[0]
    if (containing) {
      addTarget(containing)
      continue
    }
    const top = normalized.split('/')[0]
    if (isInsideContainer(normalized, containers) || isContainerAncestor(normalized, containers))
      throw new ScopeError(
        `path is not inside a workspace package: ${normalized}`,
        EXIT_USAGE,
        'pass a path inside a package or a package name'
      )
    if (ignorableRootEntries.has(top)) {
      ignoredTargets.add(normalized)
      continue
    }
    throw new ScopeError(
      `unknown path: ${normalized}`,
      EXIT_USAGE,
      [
        'known root entries:',
        ...[...ignorableRootEntries].sort(compareText).map(entry => '  ' + entry),
        'workspace containers:',
        ...(containers.length > 0 ? containers.map(entry => '  ' + entry) : ['  (none)']),
        'known packages:',
        ...packages
          .map(pkg => pkg.name)
          .sort(compareText)
          .map(entry => '  ' + entry)
      ].join('\n')
    )
  }
  return { targets, ignoredTargets: [...ignoredTargets].sort(compareText) }
}

export function parseTurboLsJson(text) {
  let payload
  try {
    payload = JSON.parse(text.trim())
  } catch (error) {
    throw new ScopeError(`turbo ls --output=json did not return JSON: ${error.message}`, EXIT_FAILURE, preview(text))
  }
  const items = payload?.packages?.items
  if (!Array.isArray(items))
    throw new ScopeError('turbo ls --output=json is missing packages.items', EXIT_FAILURE, preview(text))
  return items.map(item => {
    if (item === null || typeof item !== 'object' || typeof item.name !== 'string' || typeof item.path !== 'string')
      throw new ScopeError('turbo ls --output=json returned a malformed package entry', EXIT_FAILURE)
    return { name: item.name, path: normalizeConePath(item.path) }
  })
}

export function parseTurboLsText(text) {
  const packages = []
  for (const line of text.split(/\r?\n/)) {
    let trimmed = line.trim()
    if (trimmed.startsWith('•')) trimmed = trimmed.slice(1).trim()
    if (!trimmed || trimmed.startsWith('x ')) continue
    if (/^\d+\s+packages?\b/.test(trimmed)) continue
    if (trimmed.startsWith('Package') || trimmed.startsWith('---') || trimmed.startsWith('>>>')) continue
    const tokens = trimmed.split(/\s+/)
    if (tokens.length !== 2) continue
    packages.push({ name: tokens[0], path: normalizeConePath(tokens[1]) })
  }
  return packages
}

const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export function buildCone(paths) {
  return [...new Set(paths.map(normalizeConePath))].sort(compareText)
}

function dedupePackages(packages) {
  const seen = new Set()
  return packages.filter(pkg => {
    if (seen.has(pkg.name)) return false
    seen.add(pkg.name)
    return true
  })
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

export function listHiddenPackages(packages, cone) {
  return packages.filter(pkg => !isPathInCone(pkg.path, cone)).sort((a, b) => compareText(a.name, b.name))
}

const DEPENDENCY_SYNC = ['install', '--frozen-lockfile']
const PNPM_BIN = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

export function dependencySyncPlan({ hasWorkspaceFile, pnpmAvailable }) {
  if (!hasWorkspaceFile) return { mode: 'skip', reason: 'no pnpm-workspace.yaml at the repository root' }
  if (!pnpmAvailable) return { mode: 'skip', reason: 'pnpm is not available on PATH' }
  return { mode: 'sync' }
}

export function assertActionAllowed({ sparseCone, action, dryRun }) {
  if (dryRun && sparseCone) {
    throw new ScopeError(
      'dry-run needs a full worktree: hidden packages are missing from the turbo graph; run --restore first',
      EXIT_USAGE,
      `current cone:\n${sparseCone.join('\n')}`
    )
  }
  if (sparseCone && action === 'set') {
    throw new ScopeError(
      'worktree is already sparse; pass --add to union the new closure or --reset to replace it',
      EXIT_USAGE,
      `current cone:\n${sparseCone.join('\n')}`
    )
  }
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
  if (result.status !== 0)
    throw new ScopeError(`${description} failed (exit ${result.status})`, EXIT_FAILURE, preview(result.stderr))
  return result.stdout
}

function resolveRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  if (result.error) throw new ScopeError(`cannot run git: ${result.error.message}`, EXIT_FAILURE)
  if (result.status !== 0) throw new ScopeError('not inside a Git worktree', EXIT_FAILURE, preview(result.stderr))
  return fs.realpathSync(result.stdout.trim())
}

function readWorkspaceContainers(root) {
  const file = path.join(root, 'pnpm-workspace.yaml')
  if (!fs.existsSync(file))
    return {
      containers: [],
      warning:
        'pnpm-workspace.yaml not found at the repository root; cannot identify workspace containers, so all root directories are kept and the cone does not shrink'
    }
  const containers = parseWorkspaceContainers(fs.readFileSync(file, 'utf8'))
  if (containers.length === 0)
    return {
      containers,
      warning:
        'pnpm-workspace.yaml has no recognized package patterns; cannot identify workspace containers, so all root directories are kept and the cone does not shrink'
    }
  return { containers, warning: null }
}

function listRootEntries(root) {
  const result = runGit(root, ['ls-tree', '--name-only', 'HEAD'])
  if (result.status !== 0) throw new ScopeError('cannot list root entries', EXIT_FAILURE, preview(result.stderr))
  return result.stdout.split(/\r?\n/).filter(Boolean)
}

function listRootDirs(root) {
  const result = runGit(root, ['ls-tree', '-d', '--name-only', 'HEAD'])
  if (result.status !== 0) throw new ScopeError('cannot list root entries', EXIT_FAILURE, preview(result.stderr))
  return result.stdout.split(/\r?\n/).filter(Boolean)
}

function listRootDependencyPackages(root, packages) {
  const file = path.join(root, 'package.json')
  if (!fs.existsSync(file)) return []
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    throw new ScopeError(
      'cannot read root package.json: ' + (error instanceof Error ? error.message : String(error)),
      EXIT_FAILURE
    )
  }
  return selectRootDependencyPackages(raw, packages)
}

function resolveTurbo(root) {
  const local = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'turbo.cmd' : 'turbo')
  if (fs.existsSync(local)) return [local]
  if (spawnSync('turbo', ['--version'], { cwd: root, encoding: 'utf8' }).status === 0) return ['turbo']
  if (spawnSync('pnpm', ['exec', 'turbo', '--version'], { cwd: root, encoding: 'utf8' }).status === 0)
    return ['pnpm', 'exec', 'turbo']
  throw new ScopeError('turbo is not available: install workspace dependencies or put turbo on PATH', EXIT_FAILURE)
}

function runTurbo(root, command, args) {
  const result = spawnSync(command[0], [...command.slice(1), ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' }
  })
  if (result.error) throw new ScopeError(`cannot run turbo: ${result.error.message}`, EXIT_FAILURE)
  return result
}

function listPackages(root, turbo) {
  const json = runTurbo(root, turbo, ['ls', '--output=json'])
  if (json.status === 0 && json.stdout.trim().startsWith('{')) return parseTurboLsJson(json.stdout)
  const text = runTurbo(root, turbo, ['ls'])
  if (text.status !== 0)
    throw new ScopeError(`turbo ls failed (exit ${text.status})`, EXIT_FAILURE, preview(text.stderr || text.stdout))
  const packages = parseTurboLsText(text.stdout)
  if (packages.length === 0)
    throw new ScopeError('turbo ls returned no packages', EXIT_FAILURE, preview(text.stdout))
  return packages
}

export function resolveClosure(root, turbo, names) {
  if (names.length === 0) return []
  const filters = names.map(name => ['--filter', `${name}...`]).flat()
  const json = runTurbo(root, turbo, ['ls', ...filters, '--output=json'])
  if (json.status === 0 && json.stdout.trim().startsWith('{')) return parseTurboLsJson(json.stdout)
  const text = runTurbo(root, turbo, ['ls', ...filters])
  if (text.status !== 0)
    throw new ScopeError(
      `turbo ls --filter failed (exit ${text.status})`,
      EXIT_FAILURE,
      preview(text.stderr || text.stdout)
    )
  const packages = parseTurboLsText(text.stdout)
  if (packages.length === 0)
    throw new ScopeError('turbo ls --filter returned no packages', EXIT_FAILURE, preview(text.stdout))
  return packages
}

function readSparseCone(root) {
  const result = runGit(root, ['sparse-checkout', 'list'])
  if (result.status === 0)
    return result.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  if (/not sparse/i.test(result.stderr)) return null
  throw new ScopeError('git sparse-checkout list failed', EXIT_FAILURE, preview(result.stderr))
}

function readDirtyFiles(root) {
  const result = runGit(root, ['status', '--porcelain', '-z'])
  if (result.status !== 0)
    throw new ScopeError('git status failed', EXIT_FAILURE, preview(result.stderr))
  return parsePorcelainZ(result.stdout)
}

function disableSparse(root) {
  const result = runGit(root, ['sparse-checkout', 'disable'])
  if (result.status !== 0 && !/not sparse/i.test(result.stderr))
    throw new ScopeError('git sparse-checkout disable failed', EXIT_FAILURE, preview(result.stderr))
}

function applyCone(root, cone) {
  gitOrThrow(root, ['sparse-checkout', 'init', '--cone'], 'git sparse-checkout init --cone')
  const result = runGit(root, ['sparse-checkout', 'set', '--cone', ...cone])
  if (result.status !== 0)
    throw new ScopeError('git sparse-checkout set failed', EXIT_FAILURE, preview(result.stderr))
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

// pnpm 在 `pnpm run` 前发现 node_modules 与缩小后的 workspace 集不一致时，会自行做非 frozen
// 安装并重写 lockfile；收缩后先做一次 frozen 安装，后续 pnpm 脚本与 hook 就不会再触发它。
function syncDependencies(root, plan) {
  if (plan.mode === 'skip') return { status: 'skipped', reason: plan.reason }
  const result = spawnSync(PNPM_BIN, DEPENDENCY_SYNC, { cwd: root, encoding: 'utf8' })
  if (result.error)
    throw new ScopeError(`cannot run pnpm install --frozen-lockfile: ${result.error.message}`, EXIT_FAILURE)
  if (result.status !== 0)
    throw new ScopeError(
      'pnpm install --frozen-lockfile failed',
      EXIT_FAILURE,
      preview(result.stderr || result.stdout)
    )
  return { status: 'synced' }
}

function restorePreviousState(root, previousCone, { applied, synced }, error) {
  // 稀疏起步时在重算前就 disable 了，即使还没 apply 也必须装回旧 cone。
  if (!previousCone && !applied) return
  try {
    const notes = []
    if (previousCone) {
      const warnings = applyCone(root, previousCone)
      notes.push('note: previous sparse cone restored', ...warnings)
    } else {
      disableSparse(root)
      notes.push('note: sparse checkout disabled; the worktree is full')
    }
    if (applied && !synced) notes.push('note: dependencies may be stale; run pnpm install --frozen-lockfile')
    if (error instanceof ScopeError) error.detail = `${error.detail}\n${notes.join('\n')}`.trim()
    else process.stderr.write(`${notes.join('\n')}\n`)
  } catch (restoreError) {
    const note = `note: the previous worktree state could not be restored: ${restoreError.message}`
    if (error instanceof ScopeError) error.detail = `${error.detail}\n${note}`.trim()
    else process.stderr.write(`${note}\n`)
  }
}

function formatEntry(entry) {
  if (typeof entry === 'string') return entry
  if (Array.isArray(entry)) return entry.join(' ')
  if (entry && typeof entry === 'object' && 'name' in entry && 'path' in entry) return `${entry.name} (${entry.path})`
  return JSON.stringify(entry)
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
    'targets',
    'ignoredTargets',
    'closure',
    'rootDependencyPackages',
    'rootEntries',
    'workspaceContainers',
    'cone',
    'hiddenPackages',
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
      for (const entry of value) lines.push(`  ${formatEntry(entry)}`)
      continue
    }
    lines.push(`${key}: ${value}`)
  }
  process.stdout.write(`${lines.join('\n')}\n`)
}

function printStatus(root, json) {
  const sparseCone = readSparseCone(root)
  const warnings = []
  const { containers, warning } = readWorkspaceContainers(root)
  if (warning) warnings.push(warning)
  const rootEntries = filterKeptRootDirs(listRootDirs(root), containers)
  let rootDependencyPackages = []
  if (!sparseCone) {
    try {
      const turbo = resolveTurbo(root)
      const packages = listPackages(root, turbo)
      rootDependencyPackages = resolveClosure(
        root,
        turbo,
        listRootDependencyPackages(root, packages).map(pkg => pkg.name)
      )
    } catch (error) {
      if (error instanceof ScopeError) warnings.push(error.message)
      else throw error
    }
  } else {
    warnings.push('root dependency packages are not computed on a sparse tree; run --restore first')
  }
  const dirty = sparseCone ? listDirtyOutsideCone(readDirtyFiles(root), sparseCone) : []
  if (dirty.length > 0)
    warnings.push(
      `${dirty.length} uncommitted file(s) outside the cone; staged changes may leave the worktree until --restore`
    )
  const report = {
    action: 'status',
    sparse: Boolean(sparseCone),
    cone: sparseCone ?? [],
    workspaceContainers: containers,
    rootEntries,
    rootDependencyPackages,
    dirtyOutsideCone: dirty,
    reminders: [
      'use `git grep <pattern> HEAD` for cross-package search',
      'monorepo-change-impact manifest queries can run while sparse; restore before repo-wide gates'
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
  disableSparse(root)
  writeReport({ action: 'restore', sparse: false, previousCone }, json)
  return EXIT_OK
}

function applyScope(root, options) {
  const previousCone = readSparseCone(root)
  assertActionAllowed({ sparseCone: previousCone, action: options.action, dryRun: Boolean(options.dryRun) })

  const { containers, warning: workspaceWarning } = readWorkspaceContainers(root)
  const rootEntries = listRootEntries(root)
  const keepRootDirs = filterKeptRootDirs(listRootDirs(root), containers)
  const turbo = resolveTurbo(root)
  const dependencyPlan = resolveDependencyPlan(root)

  // Hidden packages are absent from turbo's graph, so any recomputation needs the full tree first.
  if (previousCone) disableSparse(root)

  let applied = false
  let synced = false
  try {
    const packages = listPackages(root, turbo)
    const { targets, ignoredTargets } = resolveScopeTargets(options.targets, packages, {
      containers,
      rootEntries
    })
    const closure = resolveClosure(
      root,
      turbo,
      targets.map(pkg => pkg.name)
    )
    const rootDependencyPackages = resolveClosure(
      root,
      turbo,
      listRootDependencyPackages(root, packages).map(pkg => pkg.name)
    )
    const combinedClosure = dedupePackages([...closure, ...rootDependencyPackages])

    const cone = buildCone([
      ...combinedClosure.map(pkg => pkg.path),
      ...targets.map(pkg => pkg.path),
      ...keepRootDirs
    ])

    const skillDir = path
      .relative(root, path.dirname(fs.realpathSync(fileURLToPath(import.meta.url))))
      .split(path.sep)
      .join('/')
    const skillInsideRepo =
      skillDir !== '' && skillDir !== '..' && !skillDir.startsWith('../') && !path.isAbsolute(skillDir)
    const targetCone = options.action === 'add' && previousCone ? buildCone([...previousCone, ...cone]) : cone
    if (skillInsideRepo && !isPathInCone(skillDir, targetCone))
      throw new ScopeError(`the computed cone would hide this skill (${skillDir})`, EXIT_FAILURE)

    const hidden = listHiddenPackages(packages, targetCone)
    const dirtyOutsideCone = listDirtyOutsideCone(readDirtyFiles(root), targetCone)
    const warnings = workspaceWarning ? [workspaceWarning] : []
    if (dirtyOutsideCone.length > 0)
      warnings.push(
        `${dirtyOutsideCone.length} uncommitted file(s) outside the cone are no longer part of the cone; staged changes may leave the worktree until --restore`
      )
    if (hidden.length === 0) warnings.push('no package would be hidden; this scope does not shrink the worktree')

    const commands = [
      ['git', 'sparse-checkout', 'init', '--cone'],
      ['git', 'sparse-checkout', 'set', '--cone', ...targetCone]
    ]
    if (dependencyPlan.mode === 'sync') commands.push([PNPM_BIN, ...DEPENDENCY_SYNC])
    const report = {
      action: options.action,
      targets,
      ignoredTargets,
      closure: combinedClosure,
      rootDependencyPackages,
      rootEntries: keepRootDirs,
      workspaceContainers: containers,
      cone: targetCone,
      hiddenPackages: hidden,
      dirtyOutsideCone,
      dependencies:
        dependencyPlan.mode === 'sync'
          ? { status: 'would-sync' }
          : { status: 'skipped', reason: dependencyPlan.reason },
      commands,
      warnings
    }

    if (options.dryRun) {
      writeReport({ ...report, dryRun: true, sparse: Boolean(previousCone) }, options.json)
      return EXIT_OK
    }

    applied = true
    warnings.push(...applyCone(root, targetCone))
    const dependencies = syncDependencies(root, dependencyPlan)
    synced = dependencies.status === 'synced'
    if (dependencies.status === 'skipped')
      warnings.push(
        `dependencies were not synced (${dependencies.reason}); run pnpm install --frozen-lockfile before pnpm scripts or hooks`
      )
    const finalCone = readSparseCone(root) ?? targetCone
    writeReport(
      {
        ...report,
        sparse: true,
        cone: finalCone,
        dependencies,
        reminders: [
          'use `git grep <pattern> HEAD` for cross-package search',
          'local gates only cover the cone; restore before full-repo verification',
          'use --add to widen the scope and --restore to materialize the full worktree'
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
    return applyScope(root, options)
  } catch (error) {
    if (error instanceof ScopeError) {
      process.stderr.write(`turbo-sparse-scope: ${error.message}\n`)
      if (error.detail) process.stderr.write(`${error.detail}\n`)
      return error.exitCode
    }
    process.stderr.write(`turbo-sparse-scope: unexpected failure: ${error?.stack ?? String(error)}\n`)
    return EXIT_FAILURE
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(fs.realpathSync(path.resolve(process.argv[1]))).href : ''
const modulePath = pathToFileURL(fs.realpathSync(fileURLToPath(import.meta.url))).href
if (entrypoint === modulePath) process.exitCode = main(process.argv.slice(2))
