// monorepo-change-impact skill 的内置查询脚本，self-contained：不 import 本仓任何脚本，
// 只依赖 Node 内置模块。workspace 图完全从宿主仓库的 pnpm-workspace.yaml 与各
// package.json 派生（内部依赖 = 依赖名命中 workspace 名集合；可发布 = manifest 未标
// private），不硬编码 scope 或目录布局。标记为 host policy 的段落是宿主仓库的 context
// 与验证策略，其他 monorepo 采纳本 skill 时按自己的约定调整这一段。
//
// Usage:
//   node skills/monorepo-change-impact/repo-query.mjs verify [--json] [--base <git-ref> | --staged | --worktree] <changed-path>...
//   node skills/monorepo-change-impact/repo-query.mjs contract [--json] <workspace-name>
//   node skills/monorepo-change-impact/repo-query.mjs contract-diff --base <git-ref> [--json]

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const rawArgs = process.argv.slice(2)
const command = rawArgs.shift() ?? 'verify'
const options = parseOptions(rawArgs)
const contractTarget = command === 'contract' ? (options.paths.shift() ?? '') : ''

const VALID_COMMANDS = ['verify', 'contract', 'contract-diff']

if (
  !VALID_COMMANDS.includes(command) ||
  (command === 'contract' &&
    (options.paths.length > 0 || !contractTarget || options.base || options.staged || options.worktree)) ||
  (command === 'contract-diff' && (options.paths.length > 0 || !options.base || options.staged || options.worktree)) ||
  (command === 'verify' && options.paths.length === 0 && !options.base && !options.staged && !options.worktree)
) {
  console.error(
    'Usage: node skills/monorepo-change-impact/repo-query.mjs verify [--json] [--base <git-ref> | --staged | --worktree] <changed-path>...\n       node skills/monorepo-change-impact/repo-query.mjs contract [--json] <workspace-name>\n       node skills/monorepo-change-impact/repo-query.mjs contract-diff --base <git-ref> [--json]'
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
        console.error('repo-query: --base requires a Git ref')
        process.exit(1)
      }
      result.base = base
      index += 1
      continue
    }
    result.paths.push(argument)
  }

  if ([result.base, result.staged, result.worktree].filter(Boolean).length > 1) {
    console.error('repo-query: --base, --staged and --worktree are mutually exclusive')
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
    console.error(`repo-query: cannot read Git change set: ${detail}`)
    process.exit(1)
  }
}

// --- self-contained pnpm workspace loading（等价于宿主仓 packages/monorepo-kit/src/shared/workspace-manifests.ts，
//     但用内置的正则 glob 匹配替代 glob 依赖，保持零外部依赖） ---

function readPnpmWorkspacePatterns(root) {
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml')
  if (!fs.existsSync(workspaceFile)) throw new Error('missing pnpm-workspace.yaml')

  const lines = fs.readFileSync(workspaceFile, 'utf8').split(/\r?\n/)
  const start = lines.findIndex(line => /^packages:\s*(?:#.*)?$/.test(line))
  if (start < 0) throw new Error('pnpm-workspace.yaml is missing a top-level packages list')

  const patterns = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim() || /^\s*#/.test(line)) continue
    if (!/^\s/.test(line)) break

    const match = line.match(/^\s+-\s+(?<value>.+)$/)
    if (!match?.groups?.value) throw new Error(`pnpm-workspace.yaml:${index + 1} must be a packages list entry`)
    const trimmed = match.groups.value.trim()
    const quoted = trimmed.match(/^(?:"(?<double>.*)"|'(?<single>.*)')\s*(?:#.*)?$/)
    const unquoted = trimmed.match(/^(?<value>[^#\s][^#]*?)\s*(?:#.*)?$/)
    const pattern = (quoted?.groups?.double ?? quoted?.groups?.single ?? unquoted?.groups?.value ?? '').trim()
    if (!pattern) throw new Error(`pnpm-workspace.yaml:${index + 1} contains an invalid packages pattern`)
    patterns.push(pattern)
  }

  if (patterns.length === 0) throw new Error('pnpm-workspace.yaml packages list must not be empty')
  if (!patterns.some(pattern => !pattern.startsWith('!')))
    throw new Error('pnpm-workspace.yaml packages list must include a positive pattern')

  return patterns
}

function globToRegExp(pattern) {
  const source = pattern
    .split('/')
    .map(segment => {
      if (segment === '**') return '(?:(?:[^/]+/)*[^/]+)?'
      return segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')
    })
    .join('/')
  return new RegExp(`^${source}$`)
}

function walkFiles(directory, emit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) walkFiles(filePath, emit)
    else emit(filePath)
  }
}

function listWorkspaceManifests(root) {
  const patterns = readPnpmWorkspacePatterns(root)
  const ignored = patterns.filter(pattern => pattern.startsWith('!')).map(pattern => globToRegExp(pattern.slice(1)))
  const matchers = patterns.filter(pattern => !pattern.startsWith('!')).map(globToRegExp)
  const manifests = new Set()
  walkFiles(root, filePath => {
    if (!filePath.endsWith(`${path.sep}package.json`)) return
    // pattern 约定的是 workspace 目录；把 manifest 路径剥掉 package.json 再按目录匹配
    const relativePath = path.relative(root, filePath).split(path.sep).join('/')
    const directoryPath = relativePath.replace(/\/package\.json$/, '')
    if (ignored.some(regex => regex.test(directoryPath))) return
    if (matchers.some(regex => regex.test(directoryPath))) manifests.add(filePath)
  })
  return [...manifests].sort()
}

let manifests
try {
  manifests = listWorkspaceManifests(root).map(file => ({ file, manifest: readJson(file) }))
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  console.error(`repo-query: cannot load pnpm workspace manifests: ${detail}`)
  process.exit(1)
}

// --- workspace 图：内部依赖 = 依赖名命中 workspace 名集合，从配置推导，不硬编码 scope ---

const workspaceNames = new Set(manifests.map(({ manifest }) => manifest.name).filter(Boolean))

const workspaces = manifests
  .map(({ file, manifest }) => {
    const relativeRoot = path.relative(root, path.dirname(file)).split(path.sep).join('/')
    const sections = [
      ['dependencies', 'runtime'],
      ['devDependencies', 'development'],
      ['peerDependencies', 'peer']
    ]
    const dependencyEdges = sections.flatMap(([field, type]) =>
      Object.keys(manifest[field] ?? {})
        .filter(name => workspaceNames.has(name))
        .map(to => ({ to, type }))
    )
    return {
      name: manifest.name,
      private: manifest.private === true,
      root: relativeRoot,
      scripts: manifest.scripts ?? {},
      dependencyEdges,
      dependencies: [...new Set(dependencyEdges.map(edge => edge.to))]
    }
  })
  .filter(workspace => workspace.name)

const workspaceByName = new Map(workspaces.map(workspace => [workspace.name, workspace]))
const dependentsByDependency = new Map()
for (const workspace of workspaces) {
  for (const edge of workspace.dependencyEdges) {
    const dependents = dependentsByDependency.get(edge.to) ?? []
    dependents.push(workspace.name)
    dependentsByDependency.set(edge.to, dependents)
  }
}

// --- contract：当前 manifest 契约（可发布 = 未标 private） ---

if (command === 'contract') {
  const workspace = workspaceByName.get(contractTarget)
  if (!workspace) {
    console.error(`repo-query: unknown workspace ${contractTarget}`)
    process.exit(1)
  }
  if (workspace.private) {
    console.error(`repo-query: ${contractTarget} is not a published package`)
    process.exit(1)
  }

  const manifest = manifests.find(({ manifest }) => manifest.name === contractTarget).manifest
  const directConsumers = [...new Set(dependentsByDependency.get(contractTarget) ?? [])].sort()
  const rootScripts = readJson(path.join(root, 'package.json')).scripts ?? {}
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
      'docs/agents/verification.md'
    ].filter(file => fs.existsSync(path.join(root, file))),
    verification: [
      ...(typeof rootScripts.build === 'string' ? ['pnpm run build'] : []),
      ...(typeof rootScripts['check-pack'] === 'string' ? ['pnpm run check-pack'] : []),
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
    console.log('peerDependencies:')
    console.log(JSON.stringify(result.package.peerDependencies, null, 2))
    console.log(`sideEffects: ${JSON.stringify(result.package.sideEffects)}`)
    console.log('verification:')
    for (const item of result.verification) console.log(`- ${item}`)
  }
  process.exit(0)
}

// --- contract-diff：manifest-level semver 候选（基线扫描全仓 manifest，按 private 过滤） ---

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

function readGitFile(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8' })
  } catch {
    return ''
  }
}

function getPublishedPackagesAt(ref) {
  const files = getGitPaths(['ls-tree', '-r', '--name-only', ref]).filter(
    file => file.endsWith('/package.json') && !file.includes('/node_modules/')
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
  for (const { manifest } of manifests) {
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

// --- verify：影响面与最小充分验证建议 ---

function getChangedPaths() {
  const paths = [...options.paths]
  // 删除与重命名的旧路径同样是消费者可见的变更；--no-renames 让重命名拆成 D + A，
  // 避免只报新路径而漏掉旧 import/export 的影响面。
  const diffFilter = ['--diff-filter=ACMRD', '--no-renames']
  if (options.base)
    paths.push(...getGitPaths(['diff', '--name-only', ...diffFilter, `${options.base}...HEAD`]))
  if (options.staged) paths.push(...getGitPaths(['diff', '--name-only', ...diffFilter, '--cached']))
  if (options.worktree) {
    paths.push(...getGitPaths(['diff', '--name-only', ...diffFilter, 'HEAD']))
    paths.push(...getGitPaths(['ls-files', '--others', '--exclude-standard']))
  }

  return [...new Set(paths.map(normalizePath))]
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
  if (workspace.private) return false
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
    let current = path.dirname(absolute)
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

// host policy：context 体系路径（AGENTS.md / docs/agents / .agents 等）。其他仓库按自己的
// context 布局调整本段与下面的验证目录。
// 仓自撰 skill（实体在 skills/<name>/）同时承载 agent 指令与配套工具脚本；直接从目录派生，
// 新增 skill 时无需同步任何前缀清单。skills-lock.json 登记的上游件不算仓自撰。
const skillsRoot = path.join(root, 'skills')
const lockPath = path.join(root, 'skills-lock.json')
const lockedSkills = fs.existsSync(lockPath)
  ? new Set(Object.keys(JSON.parse(fs.readFileSync(lockPath, 'utf8')).skills))
  : new Set()
const selfAuthoredSkillPaths = fs.existsSync(skillsRoot)
  ? fs
      .readdirSync(skillsRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !lockedSkills.has(entry.name))
      .filter(entry => fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
      .map(entry => `skills/${entry.name}/`)
  : []
const hasContextChange = normalizedPaths.some(
  file =>
    ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'package.json', 'pnpm-workspace.yaml', 'turbo.json'].includes(file) ||
    file.startsWith('.agents/') ||
    file.startsWith('.claude/') ||
    file.startsWith('docs/agents/') ||
    file.startsWith('docs/adr/') ||
    file.startsWith('scripts/checks/check-context') ||
    file.startsWith('scripts/policies/context-corpus') ||
    file.startsWith('packages/monorepo-kit/src/checks/context-') ||
    file.startsWith('packages/monorepo-kit/src/shared/workspace-manifests') ||
    selfAuthoredSkillPaths.some(prefix => file.startsWith(prefix))
)
const hasAgentToolChange = normalizedPaths.some(
  file =>
    file === 'pnpm-workspace.yaml' ||
    file.startsWith('scripts/checks/check-context') ||
    file.startsWith('scripts/checks/test-scripts') ||
    // 门禁实现整体在 monorepo-kit 里（ADR-0030）：改这个包的任何分区都算改 agent 工具，
    // 测试运行器、context 语料与发布契约都从那里读。
    file.startsWith('packages/monorepo-kit/') ||
    selfAuthoredSkillPaths.some(prefix => file.startsWith(prefix)) ||
    (file.startsWith('scripts/') && file.endsWith('.test.mjs'))
)
const hasContractToolChange = normalizedPaths.some(
  file => file.startsWith('scripts/checks/check-pack') || file.startsWith('packages/monorepo-kit/src/policy/package-contract')
)
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
// host policy：浏览器运行时与生成物路径。
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
// 公开面是 main.go 的 Service 注册与 library/native 的 service 包；core/storage 等内部实现
// 不直接出现在 bindings 里，测试文件也不改变公开 API。
const hasWailsPublicApiChange = normalizedPaths.some(
  file =>
    file === 'apps/interweave/main.go' ||
    (/^apps\/interweave\/backend\/(?:library|native)\/service\/[^/]+\.go$/.test(file) &&
      !file.endsWith('_test.go'))
)

const context = new Set()
if (normalizedPaths.length > 0) addContext(context, 'AGENTS.md')
for (const workspace of directlyChanged) addContext(context, `${workspace.root}/AGENTS.md`)
if (hasCodeChange) addContext(context, '.agents/rules/code-style.md')
if (hasContextChange) {
  addContext(context, 'docs/agents/agent-context.md')
  addContext(context, 'CONTEXT.md')
  addContext(context, 'docs/adr/0004-progressive-agent-context-architecture.md')
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
  addContext(context, 'docs/agents/verification.md')
}
if (hasBrowserRuntimeChange) {
  addContext(context, 'docs/agents/runtime-verification.md')
  if (normalizedPaths.some(file => file.startsWith('packages/web-ui/'))) addContext(context, 'docs/agents/web-ui.md')
}

const verification = []
function addVerification(level, command, reason) {
  if (!verification.some(item => item.command === command)) verification.push({ level, command, reason })
}

if (hasContextChange)
  addVerification('required', 'pnpm run check-context', '共享 Agent context、路由或其校验脚本发生变化。')
if (hasAgentToolChange) addVerification('required', 'pnpm run test-scripts', '影响分析或 context 校验工具发生变化。')
if (hasContractToolChange) addVerification('required', 'pnpm run test-scripts', '发布产物契约检查器发生变化。')
if (hasCodeChange)
  addVerification('required', 'pnpm run check-code', '代码或配置发生变化，需要执行 lint、类型检查和语言专属静态检查。')
if (hasReactRouteSourceChange)
  addVerification(
    'required',
    'pnpm --filter @greypan/react-web-ui-demo build',
    'TanStack Router 文件路由变更必须由 Vite plugin 更新 routeTree.gen.ts；禁止手动编辑生成路由树。'
  )
if (hasWailsPublicApiChange)
  addVerification(
    'required',
    'pnpm --filter @greypan/interweave-frontend build',
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
  if (workspace.private && typeof workspace.scripts.build === 'string') {
    addVerification(
      'recommended',
      `pnpm --filter ${workspace.name} build`,
      `${workspace.name} 是直接受影响的集成应用或私有包。`
    )
  }
}
if (hasPackageContractChange)
  addVerification('required', 'pnpm run test', '可发布 package 的源码、入口或 manifest 发生变化。')
if (hasBuildArtifactChange || hasPackageContractChange || hasContractToolChange) {
  addVerification('required', 'pnpm run build', '构建配置、发布产物或可发布 package 契约发生变化。')
  addVerification('required', 'pnpm run check-pack', '构建后需要验证 package exports、类型入口与发布文件。')
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
  addVerification('recommended', 'pnpm run check-code', '未识别到特定高风险契约；按局部改动执行最小充分验证。')

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
    'apps/interweave/frontend/package.json build -> frontend/bindings/**',
    '公开 Go API 的 bindings 必须由 Wails generator 更新，不得手工编辑。'
  )
if (hasContextChange)
  addEvidence(
    'context-system',
    'packages/monorepo-kit/src/checks/context-corpus.ts + scripts/policies/context-corpus.mjs + current diff',
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
