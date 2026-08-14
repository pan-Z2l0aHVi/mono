import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { listPnpmWorkspaceManifests } from './workspace-manifests.mjs'

const root = path.resolve(import.meta.dirname, '..')
const rawArgs = process.argv.slice(2)
const command = rawArgs.shift() ?? 'verify'
const options = parseOptions(rawArgs)
const contractTarget = command === 'contract' ? (options.paths.shift() ?? '') : ''

if (
  !['verify', 'contract', 'contract-diff'].includes(command) ||
  (command === 'contract' &&
    (options.paths.length > 0 || !contractTarget || options.base || options.staged || options.worktree)) ||
  (command === 'contract-diff' && (options.paths.length > 0 || !options.base || options.staged || options.worktree)) ||
  (command === 'verify' && options.paths.length === 0 && !options.base && !options.staged && !options.worktree)
) {
  console.error(
    'Usage: node scripts/repo-context.mjs verify [--json] [--base <git-ref> | --staged | --worktree] <changed-path>...\n       node scripts/repo-context.mjs contract [--json] <workspace-name>\n       node scripts/repo-context.mjs contract-diff --base <git-ref> [--json]'
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
        console.error('repo-context: --base requires a Git ref')
        process.exit(1)
      }
      result.base = base
      index += 1
      continue
    }
    result.paths.push(argument)
  }

  if ([result.base, result.staged, result.worktree].filter(Boolean).length > 1) {
    console.error('repo-context: --base, --staged and --worktree are mutually exclusive')
    process.exit(1)
  }

  return result
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function normalizePath(file) {
  const absolute = path.resolve(root, file)
  return path.relative(root, absolute).split(path.sep).join('/')
}

function getGitPaths(gitArgs) {
  try {
    return execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`repo-context: cannot read Git change set: ${detail}`)
    process.exit(1)
  }
}

function getChangedPaths() {
  const paths = [...options.paths]
  if (options.base) paths.push(...getGitPaths(['diff', '--name-only', '--diff-filter=ACMR', `${options.base}...HEAD`]))
  if (options.staged) paths.push(...getGitPaths(['diff', '--name-only', '--diff-filter=ACMR', '--cached']))
  if (options.worktree) {
    paths.push(...getGitPaths(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']))
    paths.push(...getGitPaths(['ls-files', '--others', '--exclude-standard']))
  }

  return [...new Set(paths.map(normalizePath))]
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
  console.error(`repo-context: cannot load pnpm workspace manifests: ${detail}`)
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

if (command === 'contract') {
  const workspace = workspaceByName.get(contractTarget)
  const manifest = manifestByName.get(contractTarget)
  if (!workspace || !manifest) {
    console.error(`repo-context: unknown workspace ${contractTarget}`)
    process.exit(1)
  }
  if (workspace.kind !== 'package' || workspace.private) {
    console.error(`repo-context: ${contractTarget} is not a published package contract`)
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
      'docs/agents/testing.md'
    ].filter(file => fs.existsSync(path.join(root, file))),
    verification: [
      'pnpm run build',
      'pnpm run check:contracts',
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
    for (const command of result.verification) console.log(`- ${command}`)
  }
  process.exit(0)
}

const normalizedPaths = getChangedPaths()
const rootScopedChange = normalizedPaths.some(
  file => !workspaces.some(workspace => file === workspace.root || file.startsWith(`${workspace.root}/`))
)

function findOwner(file) {
  return workspaces
    .filter(workspace => file === workspace.root || file.startsWith(`${workspace.root}/`))
    .sort((left, right) => right.root.length - left.root.length)[0]
}

const directWorkspaces = [
  ...new Set(
    normalizedPaths
      .map(findOwner)
      .filter(Boolean)
      .map(workspace => workspace.name)
  )
]
const affected = new Set(rootScopedChange ? workspaces.map(workspace => workspace.name) : directWorkspaces)
const queue = [...affected]
while (queue.length > 0) {
  const dependency = queue.shift()
  for (const dependent of dependentsByDependency.get(dependency) ?? []) {
    if (!affected.has(dependent)) {
      affected.add(dependent)
      queue.push(dependent)
    }
  }
}

function belongsToWorkspace(file, workspace) {
  return file === workspace.root || file.startsWith(`${workspace.root}/`)
}

function isSourceChange(file, workspace) {
  return (
    belongsToWorkspace(file, workspace) && file.startsWith(`${workspace.root}/src/`) && !file.includes('/__tests__/')
  )
}

function isPackageContractChange(file, workspace) {
  if (workspace.kind !== 'package' || workspace.private) return false
  return (
    file === `${workspace.root}/package.json` ||
    file === `${workspace.root}/vite.config.ts` ||
    isSourceChange(file, workspace) ||
    file.startsWith(`${workspace.root}/scripts/`)
  )
}

function addContext(context, file) {
  if (fs.existsSync(path.join(root, file))) context.add(file)
}

function findFocusedTestDirectories(workspace, files) {
  if (typeof workspace.scripts.test !== 'string') return []

  const directories = new Set()
  for (const file of files.filter(file => belongsToWorkspace(file, workspace))) {
    const absolute = path.join(root, file)
    let current = file.includes('/__tests__/') ? path.dirname(absolute) : path.dirname(absolute)
    const workspaceRoot = path.join(root, workspace.root)

    while (current.startsWith(workspaceRoot)) {
      const tests = current.endsWith('__tests__') ? current : path.join(current, '__tests__')
      if (fs.existsSync(tests) && fs.statSync(tests).isDirectory()) {
        directories.add(path.relative(path.join(root, workspace.root), tests).split(path.sep).join('/'))
        break
      }
      if (current === workspaceRoot) break
      current = path.dirname(current)
    }
  }

  return [...directories].sort()
}

const directlyChanged = directWorkspaces.map(name => workspaceByName.get(name))
const focusedTests = Object.fromEntries(
  directlyChanged.map(workspace => [workspace.name, findFocusedTestDirectories(workspace, normalizedPaths)])
)
const hasContextChange = normalizedPaths.some(
  file =>
    ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'package.json', 'pnpm-workspace.yaml', 'turbo.json'].includes(file) ||
    file.startsWith('.agents/') ||
    file.startsWith('.claude/') ||
    file.startsWith('docs/agents/') ||
    file.startsWith('docs/adr/') ||
    file.startsWith('scripts/context-check') ||
    file.startsWith('scripts/context-audit') ||
    file.startsWith('scripts/repo-context') ||
    file.startsWith('scripts/workspace-manifests')
)
const hasAgentToolChange = normalizedPaths.some(
  file =>
    file === 'pnpm-workspace.yaml' ||
    file.startsWith('scripts/repo-context') ||
    file.startsWith('scripts/context-check') ||
    file.startsWith('scripts/context-audit') ||
    file.startsWith('scripts/workspace-manifests') ||
    file.startsWith('scripts/repo-tools')
)
const hasContractToolChange = normalizedPaths.some(file => file.startsWith('scripts/package-contract-check'))
const hasPackageContractChange = normalizedPaths.some(file =>
  directlyChanged.some(workspace => isPackageContractChange(file, workspace))
)
const hasBuildArtifactChange =
  hasPackageContractChange ||
  normalizedPaths.some(
    file =>
      file === 'package.json' ||
      file === 'turbo.json' ||
      file === 'pnpm-workspace.yaml' ||
      file.startsWith('.github/workflows/') ||
      directlyChanged.some(
        workspace =>
          file === `${workspace.root}/package.json` ||
          file === `${workspace.root}/vite.config.ts` ||
          file.startsWith(`${workspace.root}/scripts/`)
      )
  )
const hasCodeChange = normalizedPaths.some(file => /\.(?:[cm]?js|[jt]sx?|vue|css|html|json)$/.test(file))
const hasBrowserRuntimeChange = normalizedPaths.some(
  file =>
    file.startsWith('packages/web-ui/src/components/') ||
    file.startsWith('packages/web-ui/src/shared/') ||
    file.startsWith('packages/web-ui/src/assets/') ||
    file.startsWith('apps/react-web-ui-demo/src/') ||
    file.startsWith('apps/vue-web-ui-demo/src/')
)
const hasReactRouteSourceChange = normalizedPaths.some(
  file => file.startsWith('apps/react-web-ui-demo/src/routes/') && !file.endsWith('/routeTree.gen.ts')
)
const hasWailsPublicApiChange = normalizedPaths.some(file =>
  ['apps/weave/index.go', 'apps/weave/types.go'].includes(file)
)

const context = new Set()
if (normalizedPaths.length > 0) addContext(context, 'AGENTS.md')
for (const workspace of directlyChanged) addContext(context, `${workspace.root}/AGENTS.md`)
if (hasCodeChange) addContext(context, '.agents/rules/code-style.md')
if (hasContextChange) {
  addContext(context, 'docs/agents/context.md')
  addContext(context, 'CONTEXT.md')
  addContext(context, 'docs/adr/0012-progressive-agent-context-architecture.md')
}
if (
  hasPackageContractChange ||
  hasBuildArtifactChange ||
  hasContractToolChange ||
  hasReactRouteSourceChange ||
  hasWailsPublicApiChange
)
  addContext(context, 'docs/agents/build.md')
if (hasPackageContractChange || hasBrowserRuntimeChange) {
  addContext(context, '.agents/rules/testing.md')
  addContext(context, 'docs/agents/testing.md')
}
if (hasBrowserRuntimeChange) {
  addContext(context, 'docs/agents/browser-verification.md')
  if (normalizedPaths.some(file => file.startsWith('packages/web-ui/'))) addContext(context, 'docs/agents/web-ui.md')
}
if (normalizedPaths.some(file => file.startsWith('apps/react-web-ui-demo/')))
  addContext(context, '.agents/rules/react.md')

const verification = []
function addVerification(level, command, reason) {
  if (!verification.some(item => item.command === command)) verification.push({ level, command, reason })
}

if (hasContextChange)
  addVerification('required', 'pnpm run check:context', '共享 Agent context、路由或其校验脚本发生变化。')
if (hasAgentToolChange) addVerification('required', 'pnpm run test:repo-tools', '影响分析或 context 校验工具发生变化。')
if (hasContractToolChange) addVerification('required', 'pnpm run test:repo-tools', '发布产物契约检查器发生变化。')
if (hasCodeChange)
  addVerification('required', 'pnpm run check:code', '代码或配置发生变化，需要执行格式化、lint 和类型检查。')
if (hasReactRouteSourceChange)
  addVerification(
    'required',
    'pnpm --filter @greypan/react-web-ui-demo build',
    'TanStack Router 文件路由变更必须由 Vite plugin 更新 routeTree.gen.ts；禁止手动编辑生成路由树。'
  )
if (hasWailsPublicApiChange)
  addVerification(
    'required',
    'pnpm --filter @greypan/weave-frontend build',
    'Wails 公开 Go API 变更必须生成 frontend bindings，并验证 TypeScript 消费端。'
  )
for (const workspace of directlyChanged) {
  const testDirectories = focusedTests[workspace.name]
  if (testDirectories.length > 0) {
    for (const directory of testDirectories) {
      addVerification(
        'recommended',
        `pnpm --filter ${workspace.name} test ${directory}`,
        `${workspace.name} 在 ${directory} 中已有邻近聚焦测试。`
      )
    }
  } else if (typeof workspace.scripts.test === 'string') {
    addVerification(
      'recommended',
      `pnpm --filter ${workspace.name} test`,
      `${workspace.name} 是直接受影响且提供 test 命令的 workspace。`
    )
  }
  if (workspace.kind === 'app' && typeof workspace.scripts.build === 'string') {
    addVerification(
      'recommended',
      `pnpm --filter ${workspace.name} build`,
      `${workspace.name} 是直接受影响的集成应用。`
    )
  }
}
if (hasPackageContractChange)
  addVerification('required', 'pnpm run test', '可发布 package 的源码、入口或 manifest 发生变化。')
if (hasBuildArtifactChange || hasPackageContractChange || hasContractToolChange) {
  addVerification('required', 'pnpm run build', '构建配置、发布产物或可发布 package 契约发生变化。')
  addVerification('required', 'pnpm run check:contracts', '构建后需要验证 package exports、类型入口与发布文件。')
}
if (hasBrowserRuntimeChange) {
  addVerification('required', 'pnpm run test', 'browser-mode 测试与相关 package 测试由根 Turbo test 编排。')
  addVerification(
    'required',
    'chrome-devtools MCP 真实浏览器验证',
    'UI、UX 或跨框架集成表面必须在 MCP 浏览器中验证交互、console、network 与视口。'
  )
}
if (verification.length === 0 && normalizedPaths.length > 0)
  addVerification('recommended', 'pnpm run check:code', '未识别到特定高风险契约；按局部改动执行最小充分验证。')

const requiredEvidence = []
function addEvidence(kind, location, reason) {
  if (!requiredEvidence.some(item => item.location === location)) requiredEvidence.push({ kind, location, reason })
}

for (const file of context) addEvidence('context', file, '任务路由命中的最小上下文入口。')
for (const workspace of directlyChanged) {
  addEvidence('manifest', `${workspace.root}/package.json`, '确认 workspace scripts、exports、依赖和发布边界。')
  if (workspace.scripts.test)
    addEvidence('test', `${workspace.root}/src/**/__tests__`, '优先读取受影响目录的现有测试，而不是凭文档猜行为。')
}
if (hasPackageContractChange) {
  addEvidence('contract', 'package.json exports/files/peerDependencies', '公共 package 的 manifest 是发布契约证据。')
  addEvidence('consumer', 'direct workspace consumers', '确认直接消费者是否需要适配或验证。')
}
if (hasBrowserRuntimeChange)
  addEvidence('runtime', '相关 *.browser.spec.ts + React/Vue demo', 'jsdom/build 不能证明原生浏览器和集成行为。')
if (hasReactRouteSourceChange)
  addEvidence(
    'generator',
    'apps/react-web-ui-demo/vite.config.ts -> src/routeTree.gen.ts',
    '文件路由以 src/routes/** 为 source of truth；路由树必须由 TanStack Router generator 更新。'
  )
if (hasWailsPublicApiChange)
  addEvidence(
    'generator',
    'apps/weave/frontend/package.json build -> frontend/bindings/**',
    '公开 Go API 的 bindings 必须由 Wails generator 更新，不得手工编辑。'
  )
if (hasContextChange)
  addEvidence(
    'context-system',
    'scripts/context-check.mjs + current diff',
    'context 改动必须检查加载路径、链接、索引和重复风险。'
  )

const dependencyEdges = workspaces
  .flatMap(workspace => workspace.dependencyEdges.map(edge => ({ from: workspace.name, ...edge })))
  .filter(edge => directWorkspaces.includes(edge.from) || directWorkspaces.includes(edge.to))
  .sort((left, right) =>
    `${left.from}:${left.to}:${left.type}`.localeCompare(`${right.from}:${right.to}:${right.type}`)
  )

const result = {
  command,
  changedPaths: normalizedPaths,
  directWorkspaces,
  affectedWorkspaces: [...affected].sort(),
  dependencyEdges,
  context: [...context].sort(),
  requiredEvidence,
  focusedTests,
  risk: {
    context: hasContextChange,
    publicPackageContract: hasPackageContractChange,
    buildArtifact: hasBuildArtifactChange,
    browserRuntime: hasBrowserRuntimeChange
  },
  verification
}

if (options.json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log(`${command} report`)
  console.log(`changed: ${result.changedPaths.join(', ') || '(none)'}`)
  console.log(`direct workspaces: ${result.directWorkspaces.join(', ') || '(root only)'}`)
  console.log(`affected workspaces: ${result.affectedWorkspaces.join(', ') || '(none)'}`)
  if (result.dependencyEdges.length > 0) {
    console.log('dependency edges:')
    for (const edge of result.dependencyEdges) console.log(`- [${edge.type}] ${edge.from} -> ${edge.to}`)
  }
  console.log(
    `risk: context=${result.risk.context}, public-package-contract=${result.risk.publicPackageContract}, build-artifact=${result.risk.buildArtifact}, browser-runtime=${result.risk.browserRuntime}`
  )
  console.log(`read first: ${result.context.join(', ') || '(none)'}`)
  console.log('evidence:')
  for (const item of result.requiredEvidence) console.log(`- [${item.kind}] ${item.location} — ${item.reason}`)
  const testHints = Object.entries(result.focusedTests).flatMap(([workspace, directories]) =>
    directories.map(directory => `${workspace}:${directory}`)
  )
  if (testHints.length > 0) console.log(`focused tests: ${testHints.join(', ')}`)
  console.log('verification:')
  for (const item of result.verification) console.log(`- [${item.level}] ${item.command} — ${item.reason}`)
}
