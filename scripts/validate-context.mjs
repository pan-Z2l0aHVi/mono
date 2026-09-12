import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { listPnpmWorkspaceManifests, readPnpmWorkspacePatterns } from './workspace-manifests.mjs'

const root = path.resolve(import.meta.dirname, '..')
const errors = []

// 结构化 handoff 的必填字段；根 AGENTS.md 与 task-packet.md 必须保持一致，缺失即视为流程漂移。
const handoffFields = [
  'Goal（目标）',
  'Scope（范围）',
  'Acceptance（验收标准）',
  'Test commands（测试命令）',
  'Open decisions（未解决决策）'
]

// 角色 → 执行体的默认绑定。唯一权威绑定表在根 AGENTS.md「多 Agent 编排」；角色契约各自述执行体。
// 副本之间的一致性由本文件机械校验，避免任一处改表后静默漂移。默认模型与思考强度是推荐分档（非强制，见 ADR-0011），不参与机械校验。
// 默认模型与思考强度是推荐分档（非强制，见 ADR-0011），不参与机械校验。
const roleBindings = [
  { label: 'Manager', executor: 'Claude Code' },
  { label: 'Designer', executor: 'Claude Code' },
  { label: 'Lib Coder', executor: 'Codex CLI' },
  { label: 'Biz Coder', executor: 'Codex CLI' },
  { label: 'Reviewer', executor: 'Claude Code' }
]
const executors = roleBindings
  .map(binding => binding.executor)
  .filter((value, index, all) => all.indexOf(value) === index)
// 单元格可能写成 Markdown 链接、加粗或行内代码；归一化后再比对，避免格式变化绕过校验。
const stripMarkup = value => value.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '')
const normalizeRole = value => stripMarkup(value).trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
const normalizeExecutor = value => stripMarkup(value).trim()
const bindings = new Map(roleBindings.map(binding => [normalizeRole(binding.label), binding]))
const roleContractFile = label => `.agents/agents/${label.toLowerCase().replace(/ /g, '-')}.md`

// 表头必须精确是「角色/Role」与「执行体/Executor」两列。用精确匹配而不是子串匹配，
// 避免 Reviewer、Controller 这类含 "role" 的列名被误判成绑定表。
const isRoleHeader = cell => /^(?:角色|role)$/i.test(normalizeExecutor(cell))
const isExecutorHeader = cell => /^(?:执行体|executor)$/i.test(normalizeExecutor(cell))
function bindingColumns(cells) {
  const role = cells.findIndex(isRoleHeader)
  const executor = cells.findIndex(isExecutorHeader)
  return role >= 0 && executor >= 0 ? { role, executor } : null
}

const splitRow = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
const isSeparatorRow = cells => cells.some(cell => cell.includes('-')) && cells.every(cell => /^[\s:|-]*$/.test(cell))

// 执行体必须以词边界结束，避免 "Claude Coder" 这类前缀变体被当成 "Claude Code" 放过。
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const declaresExecutor = (declared, executor) => new RegExp(`^${escapeRegExp(executor)}(?![A-Za-z])`).test(declared)

// 绑定表镜像一致性：绑定表内每一行的执行体都必须与默认绑定一致。
function checkBindingMirrors() {
  const scope = [
    ...['AGENTS.md', 'CONTRIBUTING.md', 'CLAUDE.md'].filter(exists),
    ...walk('docs/agents', file => file.endsWith('.md')).map(relative),
    ...walk('.agents/agents', file => file.endsWith('.md')).map(relative)
  ]
  for (const file of scope) {
    const lines = read(file).split('\n')
    let columns = null
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].trim().startsWith('|')) {
        columns = null
        continue
      }
      const cells = splitRow(lines[index])
      if (isSeparatorRow(cells)) continue
      // 每个表格的表头都重新判定一次，紧邻的两个表格之间不会串用列索引。
      if (isSeparatorRow(splitRow(lines[index + 1] ?? ''))) {
        columns = bindingColumns(cells)
        continue
      }
      if (!columns) continue
      const binding = bindings.get(normalizeRole(cells[columns.role] ?? ''))
      if (!binding) continue
      const declared = normalizeExecutor(cells[columns.executor] ?? '')
      // Reviewer 按风险路由执行体（高风险 -> Claude Code，小功能快速迭代 -> Codex CLI），表中允许精确写「按风险路由」而非单一执行体；
      // 全等比对避免「Codex CLI 按风险路由」这类丢掉高风险一路的写法静默通过。
      if (binding.label === 'Reviewer' && declared.replace(/（[^）]*）$/, '').trim() === '按风险路由') continue
      if (!declaresExecutor(declared, binding.executor))
        addError(`${file}: ${binding.label} is bound to "${declared}" but the default binding is "${binding.executor}"`)
    }
  }

  // 角色契约必须自述执行体，且不得同时声明另一个执行体。模型与思考强度是推荐分档，不参与校验。
  for (const binding of roleBindings) {
    const file = roleContractFile(binding.label)
    if (!exists(file)) continue
    const source = read(file)
    // 自述句允许在执行体后附带模型括注，如「Reviewer 由 **Claude Code**（GLM-5.3 Flash）担任主审」。
    const executorClause = executor =>
      `${binding.label}\\s*由\\s*\\*{0,2}${executor}\\*{0,2}(?:\\s*（[^）]*）)?\\s*(?:承担|担任)`
    if (!new RegExp(executorClause(binding.executor)).test(source))
      addError(`${file}: must self-declare its executor binding as "${binding.label} 由 ${binding.executor} 承担"`)
    for (const executor of executors) {
      if (executor === binding.executor) continue
      if (new RegExp(executorClause(executor)).test(source))
        addError(`${file}: ${binding.label} must not also be bound to ${executor}`)
    }
  }
}

// Reviewer 按风险路由执行体后不再有「审查层级」两层结构；这里的自述断言只要求高风险主审执行体。
// 「二次审查」是单层风险路由之前的旧结构表述；除 ADR 历史快照外不得再出现。
function checkRetiredReviewStructure() {
  const scope = [
    ...['AGENTS.md', 'CONTRIBUTING.md', 'CLAUDE.md'].filter(exists),
    ...walk('docs/agents', file => file.endsWith('.md')).map(relative),
    ...walk('.agents/agents', file => file.endsWith('.md')).map(relative)
  ]
  for (const file of scope) {
    if (read(file).includes('二次审查'))
      addError(`${file}: contains retired review structure "二次审查"; review is single-layer risk-routed per ADR-0010`)
  }
}

const relative = file => path.relative(root, file) || '.'
// context index 要与 worktree 的绝对路径无关：先归一为正斜杠，跨平台才能得到稳定指纹。
const relativePosix = file => relative(file).split(path.sep).join('/')
const exists = file => fs.existsSync(path.join(root, file))
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

function walk(directory, predicate = () => true) {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) return []
  const files = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const file = path.join(absolute, entry.name)
    if (entry.isDirectory()) files.push(...walk(path.relative(root, file), predicate))
    else if (predicate(file)) files.push(file)
  }
  return files
}

function addError(message) {
  errors.push(message)
}

for (const file of [
  'AGENTS.md',
  'CLAUDE.md',
  'CONTEXT.md',
  'ARCHITECTURE.md',
  'CONTRIBUTING.md',
  'docs/agents/context.md'
]) {
  if (!exists(file)) addError(`missing required context file: ${file}`)
}

for (const file of [
  'docs/agents/workflow.md',
  'docs/agents/worktrees.md',
  'docs/agents/release.md',
  'docs/agents/task-packet.md'
]) {
  if (!exists(file)) addError(`missing required workflow context file: ${file}`)
}

if (exists('AGENTS.md')) {
  const agents = read('AGENTS.md')
  for (const marker of [
    '## Mutation Gate',
    '## 多 Agent 编排',
    'docs/agents/workflow.md',
    'agent:workflow init',
    ...handoffFields
  ]) {
    if (!agents.includes(marker)) addError(`AGENTS.md is missing mandatory marker: ${marker}`)
  }
}

if (exists('.vite-hooks/pre-commit') && !read('.vite-hooks/pre-commit').includes('agent:workflow guard-commit'))
  addError('.vite-hooks/pre-commit is missing the workflow commit guard')

if (
  exists('CONTRIBUTING.md') &&
  !read('CONTRIBUTING.md').includes('agent:workflow check --task <task-id> --phase edit')
)
  addError('CONTRIBUTING.md is missing the workflow edit gate')

// Manager 契约只需自包含 workflow gate 指针与 init 命令；gate 处方以根 AGENTS.md Mutation Gate 和 workflow.md 为权威，不复制。
if (exists('.agents/agents/manager.md')) {
  const manager = read('.agents/agents/manager.md')
  if (!manager.includes('agent:workflow init') || !manager.includes('docs/agents/workflow.md'))
    addError('.agents/agents/manager.md is missing the Manager workflow gate pointer')
}

if (exists('docs/agents/workflow.md')) {
  const workflow = read('docs/agents/workflow.md')
  for (const section of [
    '## 先建立任务',
    '## 状态机',
    '## 角色与执行体',
    '## 编排模式',
    '## 角色和边界',
    '## 并发原则',
    '## Release 和 hotfix',
    '## 失败和恢复'
  ]) {
    if (!workflow.includes(section)) addError(`docs/agents/workflow.md is missing required section ${section}`)
  }
  for (const forbidden of ['持久开发 worktree：每个活跃子包', 'Reviewer worktree', 'Harness 选择', 'Agent 启动权限']) {
    if (workflow.includes(forbidden)) addError(`docs/agents/workflow.md contains retired workflow model: ${forbidden}`)
  }
  for (const pattern of [
    /^[ \t]*[-*][ \t]+\*\*Integrator\*\*/m,
    /^[ \t]*#{1,6}[ \t]*Integrator/m,
    /^\|\s*Integrator\s*\|/m
  ]) {
    if (pattern.test(workflow)) addError('docs/agents/workflow.md must not keep a separate Integrator role layer')
  }
  // handoff 字段枚举只保留在根 AGENTS.md 与 task-packet.md 两处权威；workflow.md 改为指针后不再复制字段名。
  if (workflow.includes('Goal（目标）') && !workflow.includes('task-packet.md'))
    addError('docs/agents/workflow.md must point to task-packet.md for the handoff template')
}

checkBindingMirrors()
checkRetiredReviewStructure()

if (exists('docs/agents/task-packet.md')) {
  const taskPacket = read('docs/agents/task-packet.md')
  for (const field of handoffFields) {
    if (!taskPacket.includes(field)) addError(`docs/agents/task-packet.md is missing handoff field ${field}`)
  }
}

if (exists('CLAUDE.md')) {
  const claudeStat = fs.lstatSync(path.join(root, 'CLAUDE.md'))
  const claudeSource = read('CLAUDE.md')
  if (claudeStat.isSymbolicLink()) addError('CLAUDE.md must remain a thin regular-file adapter, not a symlink')
  if (!claudeSource.includes('薄适配入口') || !claudeSource.includes('AGENTS.md'))
    addError('CLAUDE.md is missing the shared-entry adapter contract')
}

if (exists('.claude/settings.local.json')) {
  try {
    const settings = JSON.parse(read('.claude/settings.local.json'))
    const unsafeGitAllowances = (settings.permissions?.allow ?? []).filter(
      allowance =>
        typeof allowance === 'string' && /^Bash\(git (?:stash|switch|checkout|reset|clean)(?: |\))/.test(allowance)
    )
    if (unsafeGitAllowances.length > 0) {
      addError(
        `.claude/settings.local.json explicitly allows shared-worktree Git mutations: ${unsafeGitAllowances.join(', ')}`
      )
    }
  } catch (error) {
    addError(`.claude/settings.local.json cannot be parsed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (exists('package.json')) {
  try {
    const packageJson = JSON.parse(read('package.json'))
    for (const script of [
      'agent:workflow',
      'validate:context',
      'check:pack',
      'find:usages',
      'audit:instructions',
      'inspect:contract',
      'diff:contract',
      'test:scripts'
    ]) {
      if (typeof packageJson.scripts?.[script] !== 'string') addError(`package.json is missing scripts.${script}`)
    }
  } catch (error) {
    addError(`package.json cannot be parsed: ${error instanceof Error ? error.message : String(error)}`)
  }
} else {
  addError('missing required context file: package.json')
}

let workspaceManifests = []
try {
  readPnpmWorkspacePatterns(root)
  workspaceManifests = listPnpmWorkspaceManifests(root)
} catch (error) {
  addError(`pnpm workspace config cannot be parsed: ${error instanceof Error ? error.message : String(error)}`)
}

if (exists('ARCHITECTURE.md')) {
  const architecture = read('ARCHITECTURE.md')
  for (const manifestFile of workspaceManifests) {
    const relativeRoot = path.relative(root, path.dirname(manifestFile)).replaceAll('\\', '/')
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
      if (!architecture.includes(`\`${relativeRoot}\``))
        addError(`ARCHITECTURE.md does not index workspace root ${relativeRoot}`)
      if (manifest.name && !architecture.includes(`\`${manifest.name}\``))
        addError(`ARCHITECTURE.md does not mention workspace ${manifest.name}`)
    } catch (error) {
      addError(
        `${path.relative(root, manifestFile)} cannot be parsed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

if (exists('README.md') && !read('README.md').includes('./ARCHITECTURE.md'))
  addError('README.md must link to ARCHITECTURE.md')
if (exists('README.CN.md') && !read('README.CN.md').includes('./ARCHITECTURE.md'))
  addError('README.CN.md must link to ARCHITECTURE.md')

for (const directory of ['packages', 'apps']) {
  const absolute = path.join(root, directory)
  if (!fs.existsSync(absolute)) continue

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const workspaceRoot = path.join(absolute, entry.name)
    if (
      fs.existsSync(path.join(workspaceRoot, 'package.json')) &&
      !fs.existsSync(path.join(workspaceRoot, 'AGENTS.md'))
    ) {
      addError(`${directory}/${entry.name}: missing nearest AGENTS.md for workspace context routing`)
    }
  }
}

for (const manifestFile of workspaceManifests) {
  const workspaceRoot = path.dirname(manifestFile)
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  const relativeRoot = path.relative(root, workspaceRoot).replaceAll('\\', '/')
  if (manifest.private !== true && !fs.existsSync(path.join(workspaceRoot, 'README.md')))
    addError(`${relativeRoot}: published workspace is missing README.md`)
  if (relativeRoot.startsWith('apps/') && !fs.existsSync(path.join(workspaceRoot, 'README.md')))
    addError(`${relativeRoot}: app workspace is missing README.md`)
}

const symlinks = {
  '.claude/rules': '../.agents/rules',
  '.claude/skills': '../.agents/skills',
  '.claude/agents': '../.agents/agents'
}
for (const [file, expectedTarget] of Object.entries(symlinks)) {
  const absolute = path.join(root, file)
  try {
    const stat = fs.lstatSync(absolute)
    if (!stat.isSymbolicLink()) addError(`${file} must be a symlink to ${expectedTarget}`)
    else if (fs.readlinkSync(absolute) !== expectedTarget) addError(`${file} must target ${expectedTarget}`)
    else if (!fs.existsSync(absolute)) addError(`${file} points to a missing target`)
  } catch {
    addError(`missing required symlink: ${file}`)
  }
}

const markdownFiles = [
  ...['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md']
    .filter(exists)
    .map(file => path.join(root, file)),
  ...walk('docs/agents', file => file.endsWith('.md')),
  ...walk('docs/adr', file => file.endsWith('.md')),
  ...walk('.agents', file => file.endsWith('.md')),
  ...walk('packages', file => path.basename(file) === 'AGENTS.md'),
  ...walk('apps', file => path.basename(file) === 'AGENTS.md')
]
const linkPattern = /(?<!!?)\[[^\]]*\]\(([^)]+)\)/g
for (const file of markdownFiles) {
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1].trim()
    if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue
    const location = target.split('#', 1)[0]
    if (!location) continue
    const resolved = path.resolve(path.dirname(file), location)
    if (!fs.existsSync(resolved)) addError(`${relative(file)}: broken local link ${target}`)
  }
}

function parseFrontmatter(file) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.startsWith('---\n')) {
    addError(`${relative(file)}: missing YAML frontmatter`)
    return
  }
  const closing = source.indexOf('\n---\n', 4)
  if (closing < 0) {
    addError(`${relative(file)}: unterminated YAML frontmatter`)
    return
  }
  const frontmatter = source.slice(4, closing)
  for (const key of ['name', 'description']) {
    if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(frontmatter)) {
      addError(`${relative(file)}: frontmatter requires ${key}`)
    }
  }
}

for (const file of walk('.agents/skills', file => path.basename(file) === 'SKILL.md')) parseFrontmatter(file)

const roleProfiles = new Map([
  ['manager.md', 'manager'],
  ['designer.md', 'designer'],
  ['lib-coder.md', 'lib-coder'],
  ['biz-coder.md', 'biz-coder'],
  ['reviewer.md', 'reviewer']
])
const roleSections = [
  '# Role',
  '## Identity',
  '## Mission',
  '## Responsibilities',
  '## Boundaries',
  '## Collaboration',
  '## Definition of Done'
]
const roleFiles = walk('.agents/agents', file => file.endsWith('.md'))

for (const file of roleFiles) {
  parseFrontmatter(file)
  const filename = path.basename(file)
  if (!roleProfiles.has(filename)) {
    addError(`${relative(file)}: unsupported Agent Role; .agents/agents only contains the five shared Role Contracts`)
    continue
  }

  const source = fs.readFileSync(file, 'utf8')
  const expectedName = roleProfiles.get(filename)
  if (!new RegExp(`^name:\\s*${expectedName}\\s*$`, 'm').test(source))
    addError(`${relative(file)}: frontmatter name must be ${expectedName}`)
  for (const section of roleSections) {
    if (!source.includes(`\n${section}\n`)) addError(`${relative(file)}: missing required Role section ${section}`)
  }
}

for (const filename of roleProfiles.keys()) {
  if (!roleFiles.some(file => path.basename(file) === filename))
    addError(`.agents/agents: missing required Agent Role ${filename}`)
}

if (exists('CONTEXT.md')) {
  const context = read('CONTEXT.md')
  const adrDirectory = path.join(root, 'docs/adr')
  if (fs.existsSync(adrDirectory)) {
    for (const file of fs.readdirSync(adrDirectory).filter(file => file.endsWith('.md'))) {
      if (!context.includes(`docs/adr/${file}`)) addError(`CONTEXT.md does not index docs/adr/${file}`)
    }
  } else {
    addError('missing required directory: docs/adr')
  }
}

if (errors.length) {
  console.error(`validate-context failed with ${errors.length} error(s):`)
  console.error(errors.map(error => `- ${error}`).join('\n'))
  process.exit(1)
}

const contextIndex = [...new Set(markdownFiles.map(relativePosix))].sort()
const digest = crypto.createHash('sha256').update(contextIndex.join('\n')).digest('hex').slice(0, 12)
console.log(`validate-context passed (${contextIndex.length} Markdown files, index ${digest})`)
