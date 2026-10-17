import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { listPnpmWorkspaceManifests } from '../../scripts/workspace-manifests.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const rawArgs = process.argv.slice(2)
const command = rawArgs.shift() ?? ''
const options = parseOptions(rawArgs)
const contractTarget = command === 'contract' ? (options.paths.shift() ?? '') : ''

if (
  !['contract', 'contract-diff'].includes(command) ||
  (command === 'contract' &&
    (options.paths.length > 0 || !contractTarget || options.base || options.staged || options.worktree)) ||
  (command === 'contract-diff' && (options.paths.length > 0 || !options.base || options.staged || options.worktree))
) {
  console.error(
    'Usage: node skills/contract-change-review/contract-query.mjs contract [--json] <workspace-name>\n       node skills/contract-change-review/contract-query.mjs contract-diff --base <git-ref> [--json]'
  )
  process.exit(1)
}

function parseOptions(args) {
  const result = { base: '', json: false, paths: [], staged: false, worktree: false }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--') continue
    if (argument === '--json') {
      result.json = true
      continue
    }
    if (argument === '--staged') {
      result.staged = true
      continue
    }
    if (argument === '--worktree') {
      result.worktree = true
      continue
    }
    if (argument === '--base') {
      const base = args[index + 1]
      if (!base || base.startsWith('--')) {
        console.error('contract-query: --base requires a Git ref')
        process.exit(1)
      }
      result.base = base
      index += 1
      continue
    }
    result.paths.push(argument)
  }

  if ([result.base, result.staged, result.worktree].filter(Boolean).length > 1) {
    console.error('contract-query: --base, --staged and --worktree are mutually exclusive')
    process.exit(1)
  }

  return result
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function getWorkspaceKind(relativeRoot) {
  if (relativeRoot.startsWith('packages/')) return 'package'
  if (relativeRoot.startsWith('apps/')) return 'app'
  return 'root'
}

let manifests
try {
  manifests = listPnpmWorkspaceManifests(root)
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  console.error(`contract-query: cannot load pnpm workspace manifests: ${detail}`)
  process.exit(1)
}

function collectWorkspaceDependencyEdges(manifest) {
  const sections = [
    ['dependencies', 'runtime'],
    ['devDependencies', 'development'],
    ['peerDependencies', 'peer']
  ]

  return sections.flatMap(([field, type]) =>
    Object.keys(manifest[field] ?? {})
      .filter(name => name.startsWith('@greypan/'))
      .map(to => ({ to, type }))
  )
}

const workspaces = manifests
  .map(file => {
    const manifest = readJson(file)
    const relativeRoot = path.relative(root, path.dirname(file)).split(path.sep).join('/')
    const dependencyEdges = collectWorkspaceDependencyEdges(manifest)
    return {
      name: manifest.name,
      private: manifest.private === true,
      root: relativeRoot,
      kind: getWorkspaceKind(relativeRoot),
      scripts: manifest.scripts ?? {},
      dependencyEdges,
      dependencies: [...new Set(dependencyEdges.map(edge => edge.to))]
    }
  })
  .filter(workspace => workspace.name)

const workspaceByName = new Map(workspaces.map(workspace => [workspace.name, workspace]))
const manifestByName = new Map(
  manifests.map(file => {
    const manifest = readJson(file)
    return [manifest.name, manifest]
  })
)
const dependentsByDependency = new Map()
for (const workspace of workspaces) {
  for (const edge of workspace.dependencyEdges) {
    const dependents = dependentsByDependency.get(edge.to) ?? []
    dependents.push(workspace.name)
    dependentsByDependency.set(edge.to, dependents)
  }
}

function getGitPaths(gitArgs) {
  try {
    return execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`contract-query: cannot read Git change set: ${detail}`)
    process.exit(1)
  }
}

function readGitFile(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8' })
  } catch {
    return ''
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, stableJson(value[key])])
  )
}

function isEqual(left, right) {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right))
}

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []
}

function classifyContractChange(name, previous = {}, current = {}) {
  const previousExports = objectKeys(previous.exports)
  const currentExports = objectKeys(current.exports)
  const removedExports = previousExports.filter(key => !currentExports.includes(key)).sort()
  const addedExports = currentExports.filter(key => !previousExports.includes(key)).sort()
  const changedExports = previousExports
    .filter(key => currentExports.includes(key) && !isEqual(previous.exports[key], current.exports[key]))
    .sort()
  const changedFields = ['files', 'peerDependencies', 'peerDependenciesMeta', 'sideEffects'].filter(
    field => !isEqual(previous[field], current[field])
  )

  return {
    name,
    added: !previous.name,
    removed: !current.name,
    removedExports,
    addedExports,
    changedExports,
    changedFields,
    semverReview: {
      breakingCandidates: [
        ...(current.name ? [] : ['package removed']),
        ...removedExports.map(key => `export removed: ${key}`),
        ...changedExports.map(key => `export target changed: ${key}`),
        ...changedFields.map(field => `public packaging field changed: ${field}`)
      ],
      additiveCandidates: [
        ...(previous.name ? [] : ['package added']),
        ...addedExports.map(key => `export added: ${key}`)
      ]
    }
  }
}

function getPublishedPackagesAt(ref) {
  const files = getGitPaths(['ls-tree', '-r', '--name-only', ref, '--', 'packages']).filter(file =>
    /^packages\/[^/]+\/package\.json$/.test(file)
  )
  const packages = new Map()
  for (const file of files) {
    const text = readGitFile(ref, file)
    if (!text) continue
    const manifest = JSON.parse(text)
    if (manifest.name && manifest.private !== true) packages.set(manifest.name, manifest)
  }
  return packages
}

function getCurrentPublishedPackages() {
  const packages = new Map()
  for (const file of manifests) {
    const manifest = readJson(file)
    if (manifest.name && manifest.private !== true) packages.set(manifest.name, manifest)
  }
  return packages
}

if (command === 'contract-diff') {
  const previous = getPublishedPackagesAt(options.base)
  const current = getCurrentPublishedPackages()
  const changes = [...new Set([...previous.keys(), ...current.keys()])]
    .sort()
    .map(name => classifyContractChange(name, previous.get(name), current.get(name)))
    .filter(
      change =>
        change.added ||
        change.removed ||
        change.removedExports.length > 0 ||
        change.addedExports.length > 0 ||
        change.changedExports.length > 0 ||
        change.changedFields.length > 0
    )
  const result = {
    command,
    base: options.base,
    changes,
    requiresSemverReview: changes.some(change => change.semverReview.breakingCandidates.length > 0),
    guidance:
      '结果只识别 manifest-level public contract 候选；API 类型和运行时语义仍需结合 diff、测试与 Changeset 人工判断。'
  }

  if (options.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`contract-diff report: ${options.base}...worktree`)
    if (result.changes.length === 0) console.log('No published package manifest contract changes.')
    for (const change of result.changes) {
      console.log(`- ${change.name}`)
      for (const item of change.semverReview.breakingCandidates) console.log(`  - [semver review] ${item}`)
      for (const item of change.semverReview.additiveCandidates) console.log(`  - [additive candidate] ${item}`)
    }
    console.log(`guidance: ${result.guidance}`)
  }
  process.exit(0)
}

const workspace = workspaceByName.get(contractTarget)
const manifest = manifestByName.get(contractTarget)
if (!workspace || !manifest) {
  console.error(`contract-query: unknown workspace ${contractTarget}`)
  process.exit(1)
}
if (workspace.kind !== 'package' || workspace.private) {
  console.error(`contract-query: ${contractTarget} is not a published package contract`)
  process.exit(1)
}

const directConsumers = [...new Set(dependentsByDependency.get(contractTarget) ?? [])].sort()
const result = {
  command,
  package: {
    name: workspace.name,
    root: workspace.root,
    exports: manifest.exports ?? {},
    peerDependencies: manifest.peerDependencies ?? {},
    sideEffects: manifest.sideEffects ?? false
  },
  directConsumers,
  readFirst: [
    'AGENTS.md',
    `${workspace.root}/AGENTS.md`,
    `${workspace.root}/README.md`,
    'docs/agents/build.md',
    'docs/agents/test-execution.md'
  ].filter(file => fs.existsSync(path.join(root, file))),
  verification: [
    'pnpm run build',
    'pnpm run check-pack',
    ...(typeof workspace.scripts.test === 'string' ? [`pnpm --filter ${workspace.name} test`] : [])
  ]
}

if (options.json) console.log(JSON.stringify(result, null, 2))
else {
  console.log(`contract report: ${result.package.name}`)
  console.log(`root: ${result.package.root}`)
  console.log(`direct consumers: ${result.directConsumers.join(', ') || '(none)'}`)
  console.log(`read first: ${result.readFirst.join(', ')}`)
  console.log('exports:')
  console.log(JSON.stringify(result.package.exports, null, 2))
  console.log('verification:')
  for (const item of result.verification) console.log(`- ${item}`)
}
