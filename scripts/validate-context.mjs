import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { listPnpmWorkspaceManifests, readPnpmWorkspacePatterns } from './workspace-manifests.mjs'

const root = path.resolve(import.meta.dirname, '..')
const errors = []

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

// skill 出处以 skills-lock.json 为权威：登记在册的是第三方上游件，正文由上游维护（见 AGENTS.md 语言纪律），
// 其中的示例路径不作为本仓链接；未登记的即本仓自撰，必须列在下面。两边都不在就是出处未定。
const repoAuthoredSkills = new Set(['contract-change-review', 'herdr-agents'])
const lockedSkills = new Set(Object.keys(JSON.parse(read('skills-lock.json')).skills))

function fromLockedSkill(file) {
  const [first, second, third] = relative(file).split(path.sep)
  return first === '.agents' && second === 'skills' && lockedSkills.has(third)
}

// 入口面必须存在；其余门禁钉通用 context 能力：断链、锚点、frontmatter、skill/role 出处、入口指针与软链。
// 被删掉的是「指令文档语料必须存在」——它会随内容演进膨胀，反而阻止删减；被引用的文档由断链检查负责。
for (const file of ['AGENTS.md', 'CLAUDE.md']) {
  if (!exists(file)) addError(`missing required context file: ${file}`)
}

// AGENTS.md 的章节标题与叙述措辞不再是契约。入口断言只保留「必经链接 + init 命令」两条；
// 结构不变量锚点（<!-- invariant:... -->）是惰性注释，保留供人工检索，不再有机器校验（audit:instructions 已删除，见 ADR-0014）。
if (exists('AGENTS.md')) {
  const agents = read('AGENTS.md')
  for (const marker of ['docs/agents/workflow.md', 'pnpm task new']) {
    if (!agents.includes(marker)) addError(`AGENTS.md is missing mandatory marker: ${marker}`)
  }
}

if (exists('.vite-hooks/pre-commit') && !read('.vite-hooks/pre-commit').includes('pnpm task guard'))
  addError('.vite-hooks/pre-commit is missing the task commit guard')

if (exists('CONTRIBUTING.md') && !read('CONTRIBUTING.md').includes('pnpm task start --task <task-id>'))
  addError('CONTRIBUTING.md is missing the workflow edit gate')

// 薄适配入口用尺寸契约替代措辞契约：措辞可以随模型换代重写，只要它仍是不复制规则的短入口。
const CLAUDE_ADAPTER_MAX_CHARACTERS = 800
if (exists('CLAUDE.md')) {
  const claudeStat = fs.lstatSync(path.join(root, 'CLAUDE.md'))
  const claudeSource = read('CLAUDE.md')
  if (claudeStat.isSymbolicLink()) addError('CLAUDE.md must remain a thin regular-file adapter, not a symlink')
  if (!claudeSource.includes('AGENTS.md')) addError('CLAUDE.md must point at the shared AGENTS.md entry')
  if (claudeSource.length > CLAUDE_ADAPTER_MAX_CHARACTERS)
    addError(
      `CLAUDE.md is ${claudeSource.length} characters; the thin adapter ceiling is ${CLAUDE_ADAPTER_MAX_CHARACTERS}`
    )
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
      'task',
      'validate:context',
      'check:pack',
      'find:usages',
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

  // 「包级约束」区域：路由到该 workspace 的权威要么是它自己的 AGENTS.md，要么是 ARCHITECTURE.md「包级约束」表中的一行。
  // 薄约束包（无独立 AGENTS.md 的 workspace）必须出现在该表中才能被 agent 定位，否则视为路由缺口。
  // 用递归而非直接子目录：嵌套 workspace（如 apps/interweave/frontend）同样必须可定位。
  const constraintsArea = (() => {
    const architecture = exists('ARCHITECTURE.md') ? read('ARCHITECTURE.md') : ''
    const heading = /#{1,6}[ \t]+5\.[ \t]*包级约束/.exec(architecture)
    return heading ? architecture.slice(heading.index) : ''
  })()

  // 嵌套 workspace 的约束可并回最近的有 AGENTS.md 的祖先（如 apps/interweave/frontend 并入 apps/interweave/AGENTS.md），
  // 此时不强制它单列入约束表；只有最近含 AGENTS.md 的祖先存在才视为已可定位。
  // 根目录 AGENTS.md 是全部 workspace 的公共入口，不能算「最近祖先」，否则所有包都会走此豁免、包级约束表校验被静默关闭。
  function coveredByAncestorAgents(workspaceRoot) {
    let parent = path.dirname(workspaceRoot)
    while (parent !== root && parent.startsWith(root)) {
      if (fs.existsSync(path.join(parent, 'AGENTS.md'))) return true
      parent = path.dirname(parent)
    }
    return false
  }

  function findWorkspaceRoots(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      // 跳过依赖/产物目录，避免误判 node_modules 里的 package.json 为成 workspace。
      if (['node_modules', 'dist', 'coverage', '.turbo'].includes(entry.name)) continue
      const candidate = path.join(dir, entry.name)
      if (fs.existsSync(path.join(candidate, 'package.json'))) {
        const workspaceRoot = candidate
        const hasOwnAgents = fs.existsSync(path.join(workspaceRoot, 'AGENTS.md'))
        let tracked = hasOwnAgents || coveredByAncestorAgents(workspaceRoot)
        if (!tracked) {
          try {
            const manifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'))
            if (manifest.name && constraintsArea.includes(`\`${manifest.name}\``)) tracked = true
          } catch {
            // 不可解析的 manifest 由下方 workspace manifest 校验统一报错，这里不重复。
          }
        }
        if (!tracked)
          addError(
            `${relative(workspaceRoot)}: workspace without its own AGENTS.md must be tracked in ARCHITECTURE.md「包级约束」表 or have an AGENTS.md ancestor`
          )
      }
      // 无论自身是否有 AGENTS.md，都必须递归进入子目录，才能覆盖嵌套 workspace（如 apps/interweave/frontend）。
      findWorkspaceRoots(candidate)
    }
  }
  findWorkspaceRoots(absolute)
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
  '.claude/skills': '../.agents/skills'
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

// Role Contract 是显式 herdr skill 的输入，不是 Claude Code subagent。保留这条独立的
// 注册形态检查，但不把它与固定 Role 集合、绑定表或 handoff 字段镜像绑在一起。
try {
  if (fs.lstatSync(path.join(root, '.claude/agents')).isSymbolicLink())
    addError('.claude/agents must not be a symlink; Role Contracts are opt-in session roles, not Claude Code subagents')
} catch (error) {
  if (error.code !== 'ENOENT') addError(`.claude/agents: cannot inspect path: ${error.message}`)
}

const trackedAgents = spawnSync('git', ['ls-files', '--', '.claude/agents'], { cwd: root, encoding: 'utf8' })
if (trackedAgents.error || trackedAgents.status !== 0)
  addError(
    `.claude/agents: cannot check whether it is tracked: ${trackedAgents.error?.message ?? `git ls-files exited ${trackedAgents.status}`}`
  )
else if (trackedAgents.stdout.trim())
  addError(`.claude/agents must not be tracked by git:\n${trackedAgents.stdout.trim()}`)

const markdownFiles = [
  ...['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md']
    .filter(exists)
    .map(file => path.join(root, file)),
  ...walk('docs/agents', file => file.endsWith('.md')),
  ...walk('docs/adr', file => file.endsWith('.md')),
  ...walk('.agents', file => file.endsWith('.md')).filter(file => !fromLockedSkill(file)),
  ...walk('packages', file => path.basename(file) === 'AGENTS.md'),
  ...walk('apps', file => path.basename(file) === 'AGENTS.md'),
  // workspace README 与包级 AGENTS.md 同属指令面，但只能列一层：walk 会连 apps/*/node_modules 与 dist 一起吞进来。
  ...['packages', 'apps'].flatMap(directory =>
    exists(directory)
      ? fs
          .readdirSync(path.join(root, directory), { withFileTypes: true })
          .filter(entry => entry.isDirectory() && exists(`${directory}/${entry.name}/README.md`))
          .map(entry => path.join(root, directory, entry.name, 'README.md'))
      : []
  )
]
// (?<!!?) 的 `!?` 允许匹配空串，lookbehind 恒假，链接扫描因此从未跑过；这里要求前面确实不是 `!`（图片语法）。
const linkPattern = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g
// 只校验节级锚点：文件存在性由下方文件存在校验负责；`#fragment` 可能是节锚点（`#title`）或显式锚点（`{#custom}`）。
// Markdown 引擎把节标题转成 GitHub 风格 anchor：小写、去标点、空格转 `-`、连续/首尾 `-` 折叠；显式 `{#name}` 优先。
const ghAnchor = text =>
  text
    .toLowerCase()
    .replace(/[^\p{Alphabetic}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
function collectAnchors(file) {
  const anchors = new Set()
  let source = ''
  try {
    source = fs.readFileSync(file, 'utf8')
  } catch {
    return anchors
  }
  for (const match of source.matchAll(/^#{1,6}\s+(.*)$/gm)) {
    let heading = match[1].trim()
    const explicit = /^(.+?)\s*\{#([^\}]+)\}$/.exec(heading)
    anchors.add(explicit ? explicit[2].trim() : ghAnchor(heading))
  }
  return anchors
}
const anchorCache = new Map()
function anchoredTargets(file) {
  if (!anchorCache.has(file)) anchorCache.set(file, collectAnchors(file))
  return anchorCache.get(file)
}
// 只有编号 ADR 需要被发现；docs/adr 下的其他 Markdown（如索引 README）算指令面，它的链接可以提供入站。
const adrDocuments = new Set(walk('docs/adr', file => file.endsWith('.md') && /^\d{4}-/.test(path.basename(file))))
const inboundTargets = new Set()
for (const file of markdownFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const isAdr = adrDocuments.has(file)
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1].trim()
    if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue
    const [locationPart, fragment] = target.split('#')
    const location = locationPart.trim()
    if (!location) continue
    const resolved = path.resolve(path.dirname(file), location)
    if (!fs.existsSync(resolved)) addError(`${relative(file)}: broken local link ${target}`)
    if (!isAdr) inboundTargets.add(resolved)
    if (fragment && fs.existsSync(resolved) && !anchoredTargets(resolved).has(ghAnchor(fragment.trim())))
      addError(`${relative(file)}: broken local anchor ${target}`)
  }
}
// ADR 的发现性钉在「必须有入站链接」上，而不是「CONTEXT.md 必须逐条索引」：
// 后者把 CONTEXT.md 的体积变成契约，阻止精简这份文档。
for (const file of [...adrDocuments].sort()) {
  if (!inboundTargets.has(file)) addError(`${relative(file)}: no inbound link from the instruction surface`)
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

for (const file of walk('.agents/skills', file => path.basename(file) === 'SKILL.md')) {
  parseFrontmatter(file)
  const name = path.basename(path.dirname(file))
  if (repoAuthoredSkills.has(name) === lockedSkills.has(name))
    addError(
      `.agents/skills/${name}: provenance must be either skills-lock.json or repoAuthoredSkills, not both or neither`
    )
}
for (const name of repoAuthoredSkills)
  if (!exists(`.agents/skills/${name}/SKILL.md`))
    addError(`repoAuthoredSkills lists a skill without SKILL.md: .agents/skills/${name}`)

// Role Contract 数量和职责可以演进；每个文件自身的 frontmatter 身份仍必须可加载且与文件名一致。
// 这条检查不维护角色名单，因此新增 supervisor 或未来 Role 不需要同步修改 validator。
for (const file of walk('.agents/skills/herdr-agents/roles', file => file.endsWith('.md'))) {
  parseFrontmatter(file)
  const expectedName = path.basename(file, '.md')
  const source = fs.readFileSync(file, 'utf8')
  const name = /^name:\s*(\S+)\s*$/m.exec(source)?.[1]
  if (name !== expectedName) addError(`${relative(file)}: frontmatter name must be ${expectedName}`)
}

if (errors.length) {
  console.error(`validate-context failed with ${errors.length} error(s):`)
  console.error(errors.map(error => `- ${error}`).join('\n'))
  process.exit(1)
}

const contextIndex = [...new Set(markdownFiles.map(relativePosix))].sort()
const digest = crypto.createHash('sha256').update(contextIndex.join('\n')).digest('hex').slice(0, 12)
console.log(`validate-context passed (${contextIndex.length} Markdown files, index ${digest})`)
