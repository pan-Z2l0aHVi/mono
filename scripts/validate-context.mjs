import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { listPnpmWorkspaceManifests, readPnpmWorkspacePatterns } from './workspace-manifests.mjs'

const root = path.resolve(import.meta.dirname, '..')
const errors = []
let rootScripts = new Set()

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
const repoAuthoredSkills = new Set(['contract-change-review', 'herdr-cos'])
const lockedSkills = new Set(Object.keys(JSON.parse(read('skills-lock.json')).skills))

function fromLockedSkill(file) {
  const [first, second, third] = relative(file).split(path.sep)
  // 第三方 skill 的实体家：根 skills/ 只放依赖镜像，其余在 .agents/skills-vendored/；
  // .agents/skills/<name> 现在是逐 skill 软链（walk 不会深入，但存在性检查会经过）。
  if (first === 'skills') return lockedSkills.has(second)
  if (first === '.agents' && second === 'skills-vendored') return lockedSkills.has(third)
  return first === '.agents' && second === 'skills' && lockedSkills.has(third)
}

// 入口面必须存在；其余门禁钉通用 context 能力：断链、锚点、frontmatter、skill/role 出处、入口指针与软链。
// 被删掉的是「指令文档语料必须存在」——它会随内容演进膨胀，反而阻止删减；被引用的文档由断链检查负责。
if (!exists('AGENTS.md')) addError('missing required context file: AGENTS.md')

// AGENTS.md 的章节标题与叙述措辞不再是契约。入口断言只保留「必经链接 + init 命令」两条；
// 结构不变量锚点（<!-- invariant:... -->）是惰性注释，保留供人工检索，不再有机器校验（audit:instructions 已删除，见 ADR-0014）。
if (exists('AGENTS.md')) {
  const agents = read('AGENTS.md')
  for (const marker of ['docs/agents/workflow.md', 'pnpm agent:task new']) {
    if (!agents.includes(marker)) addError(`AGENTS.md is missing mandatory marker: ${marker}`)
  }
}

if (exists('.vite-hooks/pre-commit') && !read('.vite-hooks/pre-commit').includes('pnpm agent:task guard'))
  addError('.vite-hooks/pre-commit is missing the task commit guard')

if (exists('CONTRIBUTING.md') && !read('CONTRIBUTING.md').includes('pnpm agent:task start --task <task-id>'))
  addError('CONTRIBUTING.md is missing the workflow edit gate')

// 根目录不再有客户端适配文件。实测 Claude Code 2.1.283 已原生发现 AGENTS.md，但只要根目录存在 CLAUDE.md，
// 它的原生发现就整条不生效：默认的 claude-md-or-agents-md 只在项目没有 CLAUDE.md 时才读 AGENTS.md，显式声明
// claude-md-and-agents-md 也救不回来（两种模式下包级 AGENTS.md 都不再按需注入）。根入口因此只保留 AGENTS.md，
// Claude Code 与 Codex 读同一份层级文件。这道断言拦住的是「放回一行 @AGENTS.md shim」——它看起来是零副作用的
// 兼容保险，实际会让全部包级指令静默退回到靠模型自觉 Read。
if (exists('CLAUDE.md'))
  addError(
    'root CLAUDE.md must not exist: it silently disables Claude Code AGENTS.md discovery and package-level injection'
  )

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
    rootScripts = new Set(Object.keys(packageJson.scripts ?? {}))
    for (const script of [
      'agent:task',
      'ci:validate-context',
      'check-pack',
      'agent:find-usages',
      'agent:inspect-contract',
      'agent:diff-contract',
      'ci:test-scripts'
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
  // 自撰写 skill 的实体在根 skills/（.agents/skills 里只是逐 skill 软链，walk 不跟随）。
  // skill 文档里的相对链接是按 agent 经 .agents/skills 软链读取的消费面写的，深度与实体路径不同，
  // 所以检查时把这些文件映射回 .agents/skills 路径——内容相同（软链），链接按消费面解析。
  // 第三方依赖镜像（如 herdr）也是锁定的上游件，同样按 fromLockedSkill 排除出链接面。
  ...walk('skills', file => file.endsWith('.md'))
    .filter(file => !fromLockedSkill(file))
    // skills/ 根的 README.md 是 GitHub 通道门面文档，不在任何 skill 目录内，
    // 没有对应的 .agents/skills 软链消费路径——按真实路径入面即可。
    .filter(file => path.dirname(relativePosix(file)) !== 'skills')
    .map(file => path.join(root, '.agents', 'skills', path.relative(path.join(root, 'skills'), file))),
  ...(exists('skills/README.md') ? [path.join(root, 'skills', 'README.md')] : []),
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

// 根命令存在性：文档里写的根命令必须在 package.json scripts 里真的存在，否则读者照抄必然失败。
// 断链检查管不到这种「链接本身没坏、但它指向的东西被改名或删了」的引用面，所以单列一条。
//
// 只断言两种无歧义的形态：
//   1. `pnpm run <name>` —— pnpm 的显式形式，永远指根 script。
//   2. `pnpm <name>` 且 `<name>` 含 `:` 或 `-` —— 本仓 script 名的形状，正是重命名会留下的陈旧形态。
// 不断言裸单词形态（`pnpm test` / `pnpm dev` / `pnpm install` / `pnpm changeset publish` / `pnpm workspace`）：
// 它与 pnpm 自身的子命令、本地可解析的二进制和散文用词无法区分，误报会淹没真信号。
// 已知代价：
//   - 「加了 namespace 之前的旧形态」那种裸单词写法抓不到，陈旧性由 review 兜。
//   - flag 插入形态不覆盖：`pnpm run --silent <cmd>` 这类中间插 flag 的写法匹配不到，本仓当前扫描面内无此形态。
//   - `pnpm run <name>` 形态未来若文档引用包级 script（如 `pnpm run dev`）会误报；当前扫描面内无此形态，
//     所以没有为它加白名单——真出现时按「包级引用应写成 `pnpm --filter <pkg> <script>`」修正文档，而不是放宽检查。
// 约定见 docs/agents/commands.md。
//
// 范围就是上面的 markdownFiles，也就是「指令面」。两个说明避免把覆盖范围读错：
//   - docs/adr/** 在覆盖范围内：ADR 是承载现行基础设施指引的活文档，命令名陈旧就是陈旧，照判。
//   - docs/research/** 按构造不在范围内（markdownFiles 不收它）：那是点时性研究记录，保持历史原貌。
// 指令面没有其他收窄：herdr-cos skill 的命令引用已指引化到 docs/agents/commands.md，随本检查一同覆盖。
// 只收 `[a-zA-Z]` 开头的 token：pnpm 的全局开关（`--filter`/`-F`/`--dir`）和 flag 后的值都不是 script 引用。
const pnpmRunForm = /\bpnpm run ([a-zA-Z][a-zA-Z0-9:._-]*)/g
const pnpmBareForm = /\bpnpm ([a-zA-Z][a-zA-Z0-9:._-]*)/g
for (const file of markdownFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const reported = new Set()
  const check = name => {
    // 同一个名字在同一个文件里重复出现只报一次，否则一次整段重写会刷出几十行同因错误。
    if (rootScripts.has(name) || reported.has(name)) return
    reported.add(name)
    addError(`${relative(file)}: references root command \`${name}\`, which is not in package.json scripts`)
  }
  for (const match of source.matchAll(pnpmRunForm)) check(match[1])
  for (const match of source.matchAll(pnpmBareForm)) if (/[:-]/.test(match[1])) check(match[1])
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

// skill 的实体家是根 skills/（自撰写 + 依赖镜像）与 .agents/skills-vendored/（其余第三方）；
// .agents/skills/ 里只有逐 skill 软链，walk 不跟随，所以出处检查直接走两个实体目录。
for (const file of [
  ...walk('skills', file => path.basename(file) === 'SKILL.md'),
  ...walk('.agents/skills-vendored', file => path.basename(file) === 'SKILL.md')
]) {
  parseFrontmatter(file)
  const name = path.basename(path.dirname(file))
  if (repoAuthoredSkills.has(name) === lockedSkills.has(name))
    addError(`skills/${name}: provenance must be either skills-lock.json or repoAuthoredSkills, not both or neither`)
}
for (const name of repoAuthoredSkills)
  if (!exists(`skills/${name}/SKILL.md`)) addError(`repoAuthoredSkills lists a skill without SKILL.md: skills/${name}`)

// Role Contract 数量和职责可以演进；每个文件自身的 frontmatter 身份仍必须可加载且与文件名一致。
// 这条检查不维护角色名单，因此新增 supervisor 或未来 Role 不需要同步修改 validator。
for (const file of walk('skills/herdr-cos/roles', file => file.endsWith('.md'))) {
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
