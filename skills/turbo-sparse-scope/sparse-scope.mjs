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
const CONFIG_FILE = 'monorepo.json'
const CONFIG_KEY = 'sparseScope'
const USAGE = `Usage:
  node sparse-scope.mjs <package|path>... [--dry-run] [--add|--reset] [--json]
  node sparse-scope.mjs --status [--json]
  node sparse-scope.mjs --restore [--json]

Actions:
  (default)   compute the closure and replace the sparse cone
  --add       union the new closure with the current cone (requires a full-tree recompute)
  --reset     replace the current cone with the new closure
  --restore   disable sparse checkout and materialize the full worktree
  --status    read-only: current cone, config and reminders
  --dry-run   print the computed cone and commands without touching the worktree
  --json      machine-readable output on stdout

Exit codes: 0 success, 1 environment/runtime failure, 2 usage or target error.
`

const CONFIG_TEMPLATE = `{
  "${CONFIG_KEY}": {
    "keepDirs": ["docs", ".agents", ".claude", "skills", "scripts", ".vite-hooks", ".github"],
    "keepPackages": ["@scope/tooling-package"]
  }
}`

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
  if (!raw) throw new ScopeError('empty path in config or turbo output', EXIT_FAILURE)
  const normalized = raw.replace(/^\.\/+/, '').replace(/\/+$/, '')
  const segments = normalized.split('/')
  if (!normalized || normalized === '.' || path.posix.isAbsolute(normalized))
    throw new ScopeError(`path must be repo-relative: ${raw}`, EXIT_FAILURE)
  if (segments.includes('..') || segments.includes('.'))
    throw new ScopeError(`path must stay inside the repository: ${raw}`, EXIT_FAILURE)
  return normalized
}

function normalizeTarget(value) {
  return String(value)
    .trim()
    .replace(/^\.\/+/, '')
    .replace(/\/+$/, '')
}

function normalizeStringList(value, label) {
  if (!Array.isArray(value)) throw new ScopeError(`${CONFIG_KEY}.${label} must be an array of strings`, EXIT_FAILURE)
  const normalized = []
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim().length === 0)
      throw new ScopeError(`${CONFIG_KEY}.${label} entries must be non-empty strings`, EXIT_FAILURE)
    normalized.push(entry.trim())
  }
  return [...new Set(normalized)].sort(compareText)
}

export function validateConfig(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    throw new ScopeError(`${CONFIG_FILE} must contain a JSON object`, EXIT_FAILURE)
  const scope = raw[CONFIG_KEY]
  if (scope === null || typeof scope !== 'object' || Array.isArray(scope))
    throw new ScopeError(`${CONFIG_FILE} is missing "${CONFIG_KEY}"`, EXIT_FAILURE, CONFIG_TEMPLATE)
  const keepDirs = [...new Set(normalizeStringList(scope.keepDirs, 'keepDirs').map(normalizeConePath))].sort(compareText)
  if (keepDirs.length === 0) throw new ScopeError(`${CONFIG_KEY}.keepDirs must not be empty`, EXIT_FAILURE)
  const keepPackages = normalizeStringList(scope.keepPackages ?? [], 'keepPackages')
  return { keepDirs, keepPackages }
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

export function findUnknownTargets(rawTargets, packages) {
  const byName = new Set(packages.map(pkg => pkg.name))
  const byPath = new Set(packages.map(pkg => pkg.path))
  return rawTargets.filter(target => !byName.has(target) && !byPath.has(normalizeTarget(target)))
}

export function resolveTargets(rawTargets, packages) {
  const byName = new Map(packages.map(pkg => [pkg.name, pkg]))
  const byPath = new Map(packages.map(pkg => [pkg.path, pkg]))
  const resolved = []
  for (const target of rawTargets) {
    const pkg = byName.get(target) ?? byPath.get(normalizeTarget(target))
    if (pkg && !resolved.some(existing => existing.name === pkg.name)) resolved.push(pkg)
  }
  return resolved
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

function readConfig(root) {
  const file = path.join(root, CONFIG_FILE)
  if (!fs.existsSync(file))
    throw new ScopeError(`${CONFIG_FILE} not found at the repository root`, EXIT_FAILURE, CONFIG_TEMPLATE)
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    throw new ScopeError(`${CONFIG_FILE} is not valid JSON: ${error.message}`, EXIT_FAILURE)
  }
  const config = validateConfig(raw)
  for (const dir of config.keepDirs) {
    const absolute = path.join(root, dir)
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory())
      throw new ScopeError(`${CONFIG_KEY}.keepDirs entry is not a directory: ${dir}`, EXIT_FAILURE)
  }
  return config
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

function resolveClosure(root, turbo, names) {
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
    'closure',
    'keepDirs',
    'keepPackages',
    'cone',
    'hiddenPackages',
    'dirtyOutsideCone',
    'commands',
    'config',
    'warnings',
    'reminders'
  ]
  const lines = []
  for (const key of order) {
    const value = report[key]
    if (value === undefined) continue
    if (key === 'config') {
      lines.push(
        value.present
          ? `config: ok (keepDirs: ${value.keepDirs.join(', ')}; keepPackages: ${value.keepPackages.join(', ') || 'none'})`
          : 'config: missing or invalid'
      )
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
  let config = { present: false }
  try {
    config = { present: true, ...readConfig(root) }
  } catch (error) {
    if (error instanceof ScopeError) warnings.push(error.message)
    else throw error
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
    config,
    dirtyOutsideCone: dirty,
    reminders: [
      'use `git grep <pattern> HEAD` for cross-package search',
      'run --restore before monorepo-change-impact or repo-wide gates'
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

  const config = readConfig(root)
  const turbo = resolveTurbo(root)

  // Hidden packages are absent from turbo's graph, so any recomputation needs the full tree first.
  if (previousCone) disableSparse(root)

  let packages
  let targets
  let closure
  let keepClosure
  try {
    packages = listPackages(root, turbo)
    const unknownTargets = findUnknownTargets(options.targets, packages)
    if (unknownTargets.length > 0) {
      throw new ScopeError(
        `unknown target(s): ${unknownTargets.join(', ')}`,
        EXIT_USAGE,
        `known packages:\n${packages.map(pkg => pkg.name).sort(compareText).join('\n')}`
      )
    }
    const unknownKeep = config.keepPackages.filter(name => !packages.some(pkg => pkg.name === name))
    if (unknownKeep.length > 0)
      throw new ScopeError(`${CONFIG_KEY}.keepPackages has unknown package(s): ${unknownKeep.join(', ')}`, EXIT_FAILURE)

    targets = resolveTargets(options.targets, packages)
    closure = resolveClosure(
      root,
      turbo,
      targets.map(pkg => pkg.name)
    )
    keepClosure = config.keepPackages.length > 0 ? resolveClosure(root, turbo, config.keepPackages) : []
  } catch (error) {
    if (previousCone && error instanceof ScopeError)
      error.detail = `${error.detail}\nnote: sparse checkout was disabled before recomputation; the worktree is now full`.trim()
    throw error
  }

  const cone = buildCone([
    ...closure.map(pkg => pkg.path),
    ...keepClosure.map(pkg => pkg.path),
    ...config.keepDirs,
    ...targets.map(pkg => pkg.path)
  ])

  const skillDir = path
    .relative(root, path.dirname(fs.realpathSync(fileURLToPath(import.meta.url))))
    .split(path.sep)
    .join('/')
  if (!isPathInCone(skillDir, cone))
    throw new ScopeError(
      `the computed cone would hide this skill (${skillDir}); add its parent directory to ${CONFIG_KEY}.keepDirs`,
      EXIT_FAILURE,
      previousCone ? 'note: sparse checkout was disabled before recomputation; the worktree is now full' : ''
    )

  const targetCone = options.action === 'add' && previousCone ? buildCone([...previousCone, ...cone]) : cone
  const hidden = listHiddenPackages(packages, targetCone)
  const dirtyOutsideCone = listDirtyOutsideCone(readDirtyFiles(root), targetCone)
  const warnings = []
  if (dirtyOutsideCone.length > 0)
    warnings.push(
      `${dirtyOutsideCone.length} uncommitted file(s) outside the cone are no longer part of the cone; staged changes may leave the worktree until --restore`
    )
  if (hidden.length === 0) warnings.push('no package would be hidden; this scope does not shrink the worktree')

  const commands = [
    ['git', 'sparse-checkout', 'init', '--cone'],
    ['git', 'sparse-checkout', 'set', '--cone', ...targetCone]
  ]

  if (options.dryRun) {
    writeReport(
      {
        action: options.action,
        dryRun: true,
        sparse: Boolean(previousCone),
        targets,
        closure,
        keepDirs: config.keepDirs,
        keepPackages: config.keepPackages,
        cone: targetCone,
        hiddenPackages: hidden,
        dirtyOutsideCone,
        commands,
        warnings
      },
      options.json
    )
    return EXIT_OK
  }

  warnings.push(...applyCone(root, targetCone))
  const finalCone = readSparseCone(root) ?? targetCone
  writeReport(
    {
      action: options.action,
      sparse: true,
      targets,
      closure,
      keepDirs: config.keepDirs,
      keepPackages: config.keepPackages,
      cone: finalCone,
      hiddenPackages: hidden,
      dirtyOutsideCone,
      warnings,
      reminders: [
        'use `git grep <pattern> HEAD` for cross-package search',
        'local gates only cover the cone; restore before full-repo verification',
        'use --add to widen the scope and --restore to materialize the full worktree'
      ]
    },
    options.json
  )
  return EXIT_OK
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
