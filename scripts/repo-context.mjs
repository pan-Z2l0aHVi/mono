import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2).filter(argument => argument !== '--')
const command = args.shift() ?? 'impact'
const useJson = args.includes('--json')
const changedPaths = args.filter(argument => argument !== '--json')

if (!['impact', 'verify'].includes(command) || changedPaths.length === 0) {
  console.error('Usage: node scripts/repo-context.mjs <impact|verify> [--json] <changed-path>...')
  process.exit(1)
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function listWorkspaceManifests(directory) {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return []

  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(absolute, entry.name, 'package.json'))
    .filter(file => fs.existsSync(file))
}

function normalizePath(file) {
  const absolute = path.resolve(root, file)
  return path.relative(root, absolute).split(path.sep).join('/')
}

function getWorkspaceKind(relativeRoot) {
  if (relativeRoot.startsWith('packages/')) return 'package'
  if (relativeRoot.startsWith('apps/')) return 'app'
  return 'root'
}

const manifests = [
  ...listWorkspaceManifests('packages'),
  ...['apps/react-web-ui-demo/package.json', 'apps/vue-web-ui-demo/package.json']
    .map(file => path.join(root, file))
    .filter(file => fs.existsSync(file))
]
const workspaces = manifests
  .map(file => {
    const manifest = readJson(file)
    return {
      name: manifest.name,
      private: manifest.private === true,
      root: path.relative(root, path.dirname(file)).split(path.sep).join('/'),
      kind: getWorkspaceKind(path.relative(root, path.dirname(file)).split(path.sep).join('/')),
      scripts: manifest.scripts ?? {},
      dependencies: Object.keys({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies
      }).filter(name => name.startsWith('@greypan/'))
    }
  })
  .filter(workspace => workspace.name)

const workspaceByName = new Map(workspaces.map(workspace => [workspace.name, workspace]))
const dependentsByDependency = new Map()
for (const workspace of workspaces) {
  for (const dependency of workspace.dependencies) {
    const dependents = dependentsByDependency.get(dependency) ?? []
    dependents.push(workspace.name)
    dependentsByDependency.set(dependency, dependents)
  }
}

const normalizedPaths = changedPaths.map(normalizePath)
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

const directlyChanged = directWorkspaces.map(name => workspaceByName.get(name))
const hasContextChange = normalizedPaths.some(
  file =>
    ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'package.json', 'pnpm-workspace.yaml', 'turbo.json'].includes(file) ||
    file.startsWith('.agents/') ||
    file.startsWith('.claude/') ||
    file.startsWith('docs/agents/') ||
    file.startsWith('docs/adr/') ||
    file.startsWith('scripts/context-check') ||
    file.startsWith('scripts/repo-context')
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
const hasBrowserRuntimeChange = normalizedPaths.some(
  file =>
    file.startsWith('packages/web-ui/src/components/') ||
    file.startsWith('packages/web-ui/src/shared/') ||
    file.startsWith('packages/web-ui/src/assets/') ||
    file.startsWith('apps/react-web-ui-demo/src/') ||
    file.startsWith('apps/vue-web-ui-demo/src/')
)

const verification = []
function addVerification(level, command, reason) {
  if (!verification.some(item => item.command === command)) verification.push({ level, command, reason })
}

if (hasContextChange)
  addVerification('required', 'pnpm run check:context', '共享 Agent context、路由或其校验脚本发生变化。')
if (hasCodeChange)
  addVerification('required', 'pnpm run check:code', '代码或配置发生变化，需要执行格式化、lint 和类型检查。')
if (directWorkspaces.length > 0) {
  for (const workspace of directlyChanged) {
    if (typeof workspace.scripts.test === 'string') {
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
}
if (hasPackageContractChange)
  addVerification('required', 'pnpm run test', '可发布 package 的源码、入口或 manifest 发生变化。')
if (hasBuildArtifactChange || hasPackageContractChange) {
  addVerification('required', 'pnpm run build', '构建配置、发布产物或可发布 package 契约发生变化。')
  addVerification('required', 'pnpm run check:contracts', '构建后需要验证 package exports、类型入口与发布文件。')
}
if (hasBrowserRuntimeChange) {
  addVerification('required', '相关 *.browser.spec.ts', 'web-ui 或 Demo 的浏览器运行时行为发生变化。')
  addVerification('required', 'React/Vue demo 真实浏览器验证', 'UI、UX 或跨框架集成表面发生变化。')
}
if (verification.length === 0)
  addVerification('recommended', 'pnpm run check:code', '未识别到特定高风险契约；按局部改动执行最小充分验证。')

const result = {
  command,
  changedPaths: normalizedPaths,
  directWorkspaces,
  affectedWorkspaces: [...affected].sort(),
  risk: {
    context: hasContextChange,
    publicPackageContract: hasPackageContractChange,
    buildArtifact: hasBuildArtifactChange,
    browserRuntime: hasBrowserRuntimeChange
  },
  verification
}

if (useJson) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log(`${command} report`)
  console.log(`changed: ${result.changedPaths.join(', ')}`)
  console.log(`direct workspaces: ${result.directWorkspaces.join(', ') || '(root only)'}`)
  console.log(`affected workspaces: ${result.affectedWorkspaces.join(', ') || '(none)'}`)
  console.log(
    `risk: context=${result.risk.context}, public-package-contract=${result.risk.publicPackageContract}, build-artifact=${result.risk.buildArtifact}, browser-runtime=${result.risk.browserRuntime}`
  )
  console.log('verification:')
  for (const item of result.verification) console.log(`- [${item.level}] ${item.command} — ${item.reason}`)
}
