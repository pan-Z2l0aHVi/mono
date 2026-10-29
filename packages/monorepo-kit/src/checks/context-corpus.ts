import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { listPnpmWorkspaceManifests, readPnpmWorkspacePatterns } from '../plugins/workspace'
import type { CheckUnit } from '../runner/check-runner'
import { byCodeUnit } from '../shared/order'

import {
  contentDigest,
  countNonWhitespace,
  findMissingAuthorizationPointers,
  findRetiredAdrMarkers,
  findUnmarkedReferenceDocs,
  findUnroutedAgentDocs,
  isUnqualifiedRelativeTarget,
  parseLocalLinkTarget,
  readInlineLinkTarget,
  scanVolatilePhrases,
  stripCodeSegments
} from './context-invariants'

// 指令文档语料的结构不变量。判据都在这里，语料根、workspace 目录、skill 出处、软链对应表与
// commit scope 来源是消费仓库的事实，经 options 传入；组合点见 `docs/agents/agent-context.md`
// 「语料门禁」「链接面与指令面」，取舍见 ADR-0026。
export interface SkillsSurface {
  /** 上游件的锁定清单，JSON 里 `skills` 对象的键 */
  readonly lockFile: string
  /** 自撰 skill 与依赖镜像的实体目录 */
  readonly entity: string
  /** agent 读取 skill 的消费面，逐 skill 软链到实体 */
  readonly surface: string
  /** 其余第三方 skill 的实体目录 */
  readonly vendored: string
  /** 位于实体根、没有消费面对应路径的门面文档，按真实路径入面 */
  readonly facades: readonly string[]
}

export interface ContextCorpusOptions {
  /** 根入口文档：必须存在，并承载 task routing 表 */
  readonly entry: string
  /** 入口文档必须链接到的文件；缺一条就没有加载路径 */
  readonly entryMarkers: readonly string[]
  /** 仓库根下的文档，存在即进入指令面 */
  readonly rootDocuments: readonly string[]
  /** 禁止存在的根文档与理由 */
  readonly forbiddenRootFiles: readonly { readonly path: string; readonly reason: string }[]
  /** task-specific 文档目录：每篇都必须从入口被路由 */
  readonly agentDocs: string
  /** ADR 目录：编号文件必须有入站链接 */
  readonly adrDocs: string
  /** 递归收集 Markdown 的资源目录，如 rules 与 skill 容器 */
  readonly agentAssets: string
  /** task-specific rules 目录：每篇都必须有加载路径 */
  readonly rules: string
  /** skill 的锁定清单、实体家、消费面与上游件目录 */
  readonly skills: SkillsSurface
  /** workspace 根目录：递归要求入口文档，直接子目录收集入口文档与 README */
  readonly workspaces: readonly string[]
  /** 必须有 README 的应用目录；写 workspace 相对路径前缀 */
  readonly applicationDirs: readonly string[]
  /** 研究/设计语料：必须有非权威标记，并进入内容指纹 */
  readonly referenceDirs: readonly string[]
  /** 根 `package.json` 必须提供的 script */
  readonly requiredScripts: readonly string[]
  /** 客户端权限文件；显式放行共享 worktree 的 Git 改写时失败 */
  readonly clientPermissions?: string
  /** 会话角色契约路径；是软链或被 git 跟踪即失败 */
  readonly sessionRoles?: string
  /** 架构索引文档与被要求链接它的 README */
  readonly architecture?: { readonly file: string; readonly readmes: readonly string[] }
  /** 交互式提交 scope 的权威清单 */
  readonly commitScopes?: {
    readonly file: string
    readonly rootScope: string
    readonly pick: (config: unknown) => readonly string[]
  }
  /** 必须存在的软链：路径 → 目标 */
  readonly symlinks: readonly { readonly path: string; readonly target: string }[]
  /** 远端写命令必须指向的授权入口，及该入口的 owner 文档 */
  readonly authorization: { readonly pointer: string; readonly owner: string }
}

export function defineContextCorpus(options: ContextCorpusOptions): CheckUnit {
  return {
    name: 'check-context',
    async run({ root, mode }: { root: string; mode?: string }): Promise<string> {
      const errors: string[] = []
      const reportMode = mode === 'report'

      const relative = (file: string): string => path.relative(root, file) || '.'
      // context index 要与 worktree 的绝对路径无关：先归一为正斜杠，跨平台才能得到稳定指纹。
      const relativePosix = (file: string): string => relative(file).split(path.sep).join('/')
      const exists = (file: string): boolean => fs.existsSync(path.join(root, file))
      const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8')

      function walk(directory: string, predicate: (file: string) => boolean = () => true): string[] {
        const absolute = path.join(root, directory)
        if (!fs.existsSync(absolute)) return []
        const files: string[] = []
        for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
          const file = path.join(absolute, entry.name)
          if (entry.isDirectory()) files.push(...walk(path.relative(root, file), predicate))
          else if (predicate(file)) files.push(file)
        }
        return files
      }

      function addError(message: string): void {
        errors.push(message)
      }

      // skill 出处以锁定清单为权威：登记在册的是第三方上游件，正文由上游维护（见 AGENTS.md 语言纪律），
      // 其中的示例路径不作为本仓链接；未登记但实体在 skill 实体目录的即本仓自撰。两边都不在就是出处未定。
      // 自撰集合从目录推导，新增 skill 不需要同步任何清单。
      const lockedSkills = new Set<string>(Object.keys(JSON.parse(read(options.skills.lockFile)).skills))
      const skillsRoot = path.join(root, options.skills.entity)
      const repoAuthoredSkills = new Set<string>(
        fs.existsSync(skillsRoot)
          ? fs
              .readdirSync(skillsRoot, { withFileTypes: true })
              .filter(entry => entry.isDirectory())
              .map(entry => entry.name)
              .filter(name => !lockedSkills.has(name))
          : []
      )

      // 上游件的实体家：实体目录只放自撰与依赖镜像，其余在 vendored 目录；
      // 消费面里是逐 skill 软链（walk 不会深入，但存在性检查会经过）。
      function fromLockedSkill(file: string): boolean {
        const relativeFile = relativePosix(file)
        for (const directory of [options.skills.entity, options.skills.vendored, options.skills.surface]) {
          if (!relativeFile.startsWith(`${directory}/`)) continue
          return lockedSkills.has(relativeFile.slice(directory.length + 1).split('/')[0])
        }
        return false
      }

      // 入口面必须存在；其余门禁钉通用 context 能力：断链、锚点、frontmatter、skill/role 出处、入口指针与软链。
      // 「指令文档语料必须存在」这道门禁不设：它会随内容演进膨胀，反而阻止删减；被引用的文档由断链检查负责。
      if (!exists(options.entry)) addError(`missing required context file: ${options.entry}`)

      // 入口的章节标题与叙述措辞不再是契约。入口断言只保留必经链接；
      // 具体命令由 task-ledger skill 与 CLI 承担。
      // 结构不变量锚点（<!-- invariant:... -->）是惰性注释，保留供人工检索，没有机器校验（见 ADR-0014）。
      if (exists(options.entry)) {
        const entry = read(options.entry)
        for (const marker of options.entryMarkers) {
          if (!entry.includes(marker)) addError(`${options.entry} is missing mandatory marker: ${marker}`)
        }
      }

      // 根目录不放客户端适配文件：只要根目录存在它，客户端的原生发现就整条不生效，
      // 包级指令会静默退回到靠模型自觉 Read。理由逐条写在组合点。
      for (const { path: file, reason } of options.forbiddenRootFiles) {
        if (exists(file)) addError(`${file} must not exist: ${reason}`)
      }

      if (options.clientPermissions && exists(options.clientPermissions)) {
        try {
          const settings = JSON.parse(read(options.clientPermissions))
          const unsafeGitAllowances: unknown[] = (settings.permissions?.allow ?? []).filter(
            (allowance: unknown) =>
              typeof allowance === 'string' &&
              /^Bash\(git (?:stash|switch|checkout|reset|clean)(?: |\))/.test(allowance)
          )
          if (unsafeGitAllowances.length > 0) {
            addError(
              `${options.clientPermissions} explicitly allows shared-worktree Git mutations: ${unsafeGitAllowances.join(', ')}`
            )
          }
        } catch (error) {
          addError(
            `${options.clientPermissions} cannot be parsed: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      let rootScripts = new Set<string>()
      if (exists('package.json')) {
        try {
          const packageJson: { scripts?: Record<string, unknown> } = JSON.parse(read('package.json'))
          rootScripts = new Set(Object.keys(packageJson.scripts ?? {}))
          for (const script of options.requiredScripts) {
            if (typeof packageJson.scripts?.[script] !== 'string') addError(`package.json is missing scripts.${script}`)
          }
        } catch (error) {
          addError(`package.json cannot be parsed: ${error instanceof Error ? error.message : String(error)}`)
        }
      } else {
        addError('missing required context file: package.json')
      }

      let workspaceManifests: string[] = []
      try {
        readPnpmWorkspacePatterns(root)
        workspaceManifests = listPnpmWorkspaceManifests(root)
      } catch (error) {
        addError(`pnpm workspace config cannot be parsed: ${error instanceof Error ? error.message : String(error)}`)
      }

      if (options.architecture) {
        const { file: architectureFile, readmes } = options.architecture
        if (exists(architectureFile)) {
          const architecture = read(architectureFile)
          for (const manifestFile of workspaceManifests) {
            const relativeRoot = path.relative(root, path.dirname(manifestFile)).replaceAll('\\', '/')
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
              if (!architecture.includes(`\`${relativeRoot}\``))
                addError(`${architectureFile} does not index workspace root ${relativeRoot}`)
              if (manifest.name && !architecture.includes(`\`${manifest.name}\``))
                addError(`${architectureFile} does not mention workspace ${manifest.name}`)
            } catch (error) {
              addError(
                `${path.relative(root, manifestFile)} cannot be parsed: ${error instanceof Error ? error.message : String(error)}`
              )
            }
          }
        }
        for (const readme of readmes) {
          if (exists(readme) && !read(readme).includes(`./${architectureFile}`))
            addError(`${readme} must link to ${architectureFile}`)
        }
      }

      for (const directory of options.workspaces) {
        const absolute = path.join(root, directory)
        if (!fs.existsSync(absolute)) continue

        // workspace 的局部约束必须有家：它自己的入口文档，或最近一个含入口文档的祖先目录。
        // 包级约束不收进架构索引的表，所以这里没有「表格豁免」退路——缺文件就是路由缺口。
        // 用递归而非直接子目录：嵌套 workspace（包目录比顶层 workspace 再深一层）同样必须可定位。
        // 嵌套 workspace 的约束可并回最近的有入口文档的祖先。根目录入口是全部 workspace 的公共入口，
        // 不能算「最近祖先」，否则所有包都会走此豁免、这道校验被静默关闭。
        function coveredByAncestorEntry(workspaceRoot: string): boolean {
          let parent = path.dirname(workspaceRoot)
          while (parent !== root && parent.startsWith(root)) {
            if (fs.existsSync(path.join(parent, options.entry))) return true
            parent = path.dirname(parent)
          }
          return false
        }

        function findWorkspaceRoots(dir: string): void {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            if (!entry.isDirectory()) continue
            // 跳过依赖/产物目录，避免误判 node_modules 里的 package.json 为成 workspace。
            if (['node_modules', 'dist', 'coverage', '.turbo'].includes(entry.name)) continue
            const candidate = path.join(dir, entry.name)
            if (fs.existsSync(path.join(candidate, 'package.json'))) {
              const workspaceRoot = candidate
              const tracked =
                fs.existsSync(path.join(workspaceRoot, options.entry)) || coveredByAncestorEntry(workspaceRoot)
              if (!tracked)
                addError(
                  `${relative(workspaceRoot)}: workspace needs its own ${options.entry}, or an ancestor directory that has one`
                )
            }
            // 无论自身是否有入口文档，都必须递归进入子目录，才能覆盖嵌套 workspace。
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
        if (
          options.applicationDirs.some(
            directory => relativeRoot === directory || relativeRoot.startsWith(`${directory}/`)
          ) &&
          !fs.existsSync(path.join(workspaceRoot, 'README.md'))
        )
          addError(`${relativeRoot}: app workspace is missing README.md`)
      }

      // 交互式提交的 scope 清单必须与 workspace manifests 的包名一致：少一个名字，该 workspace 的改动
      // 在提交入口里选不到；多一个已删除的包名，会留下选了也无所指的假 option。
      // 清单是硬编码的，所以只能靠这道检查防漂移。判据是集合相等且无重复，
      // 顺序不参与比较：prompt 里的顺序只是展示顺序，调整它不该让检查变红。
      if (options.commitScopes) {
        const { file, rootScope, pick } = options.commitScopes
        if (exists(file)) {
          let declaredScopes: readonly string[] = []
          try {
            const imported = await import(pathToFileURL(path.join(root, file)).href)
            declaredScopes = [...pick(imported.default)]
          } catch (error) {
            addError(`${file} cannot be imported: ${error instanceof Error ? error.message : String(error)}`)
          }

          const expectedScopes = new Set([rootScope])
          for (const manifestFile of workspaceManifests) {
            const { name } = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
            expectedScopes.add(name.replace(/^@[^/]+\//, ''))
          }
          const declared = new Set<string>(declaredScopes)
          if (declared.size !== declaredScopes.length) addError(`${file} prompt.scopes has duplicate entries`)
          for (const scope of [...expectedScopes].filter(item => !declared.has(item)).sort(byCodeUnit))
            addError(`${file} prompt.scopes is missing workspace scope: ${scope}`)
          for (const scope of [...declared].filter(item => !expectedScopes.has(item)).sort(byCodeUnit))
            addError(`${file} prompt.scopes lists an unknown scope: ${scope}`)
        }
      }

      for (const { path: file, target } of options.symlinks) {
        const absolute = path.join(root, file)
        try {
          const stat = fs.lstatSync(absolute)
          if (!stat.isSymbolicLink()) addError(`${file} must be a symlink to ${target}`)
          else if (fs.readlinkSync(absolute) !== target) addError(`${file} must target ${target}`)
          else if (!fs.existsSync(absolute)) addError(`${file} points to a missing target`)
        } catch {
          addError(`missing required symlink: ${file}`)
        }
      }

      // 会话角色不属于本仓契约：角色由客户端与会话本身承担，仓库内不注册 role 契约。
      if (options.sessionRoles) {
        const sessionRoles = options.sessionRoles
        try {
          if (fs.lstatSync(path.join(root, sessionRoles)).isSymbolicLink())
            addError(`${sessionRoles} must not be a symlink; the repo ships no session-role contracts`)
        } catch (error) {
          const failure = error as NodeJS.ErrnoException
          if (failure.code !== 'ENOENT') addError(`${sessionRoles}: cannot inspect path: ${failure.message}`)
        }

        const trackedRoles = spawnSync('git', ['ls-files', '--', sessionRoles], { cwd: root, encoding: 'utf8' })
        if (trackedRoles.error || trackedRoles.status !== 0)
          addError(
            `${sessionRoles}: cannot check whether it is tracked: ${trackedRoles.error?.message ?? `git ls-files exited ${trackedRoles.status}`}`
          )
        else if (trackedRoles.stdout.trim())
          addError(`${sessionRoles} must not be tracked by git:\n${trackedRoles.stdout.trim()}`)
      }

      const markdownFiles = [
        ...options.rootDocuments.filter(exists).map(file => path.join(root, file)),
        ...walk(options.agentDocs, file => file.endsWith('.md')),
        ...walk(options.adrDocs, file => file.endsWith('.md')),
        ...walk(options.agentAssets, file => file.endsWith('.md')).filter(file => !fromLockedSkill(file)),
        // 自撰写 skill 的实体在实体目录（消费面里只是逐 skill 软链，walk 不跟随）。
        // skill 文档里的相对链接是按 agent 经消费面读取的位置写的，深度与实体路径不同，
        // 所以检查时把这些文件映射回消费面路径——内容相同（软链），链接按消费面解析。
        // 第三方依赖镜像也是锁定的上游件，同样按 fromLockedSkill 排除出链接面。
        ...walk(options.skills.entity, file => file.endsWith('.md'))
          .filter(file => !fromLockedSkill(file))
          // 实体根的门面文档不在任何 skill 目录内，没有对应的消费面路径——按真实路径入面即可。
          .filter(file => path.dirname(relativePosix(file)) !== options.skills.entity)
          .map(file =>
            path.join(root, options.skills.surface, path.relative(path.join(root, options.skills.entity), file))
          ),
        ...options.skills.facades.filter(exists).map(file => path.join(root, file)),
        ...options.workspaces.flatMap(directory => walk(directory, file => path.basename(file) === options.entry)),
        // workspace README 与包级入口文档同属指令面，但只能列一层：walk 会连 node_modules 与 dist 一起吞进来。
        ...options.workspaces.flatMap(directory =>
          exists(directory)
            ? fs
                .readdirSync(path.join(root, directory), { withFileTypes: true })
                .filter(entry => entry.isDirectory() && exists(`${directory}/${entry.name}/README.md`))
                .map(entry => path.join(root, directory, entry.name, 'README.md'))
            : []
        )
      ]
      // 语料门禁只检查可客观判定的漂移属性（ADR-0026）：路由完整性、外部状态快照、授权指针与非权威标记。
      // 文风与 concern 归属不在此列，交给 review。
      const corpus = [...new Set(markdownFiles.map(relativePosix))].sort().map(file => ({ file, source: read(file) }))
      // 研究记录与设计资产不在指令面的链接/命令扫描内，但属于 RAG 语料：必须有非权威标记，并进入内容指纹。
      const referenceCorpus = options.referenceDirs
        .flatMap(directory => walk(directory, file => file.endsWith('.md')))
        .map(file => ({ file: relativePosix(file), source: read(relativePosix(file)) }))

      const unroutedAgentDocs = exists(options.entry)
        ? findUnroutedAgentDocs(
            read(options.entry),
            corpus.map(entry => entry.file),
            options.agentDocs
          )
        : []
      for (const file of unroutedAgentDocs)
        addError(`${file}: no loading path from the ${options.entry} task routing table`)

      for (const { file, phrase } of scanVolatilePhrases(corpus))
        addError(`${file}: volatile snapshot phrase "${phrase}"; write an invariant and point to the authority instead`)

      for (const file of findMissingAuthorizationPointers(corpus, {
        ...options.authorization,
        entry: options.entry,
        agentDocs: options.agentDocs,
        rules: options.rules
      }))
        addError(`${file}: remote write commands require the authorization pointer ${options.authorization.pointer}`)

      const unmarkedReferenceDocs = findUnmarkedReferenceDocs(referenceCorpus)
      for (const file of unmarkedReferenceDocs)
        addError(`${file}: reference corpus requires the corpus-status marker and the non-authoritative banner`)

      // 链接面比指令面大：不入路由、不参与互指与命令检查的语料（研究记录、根 README、CHANGELOG、changeset）
      // 仍然是读者会点开的文档，target 失效就是失效，不因「时点性」而豁免——历史结论可以旧，链接不能死。
      // 面 = 指令面 ∪ 已跟踪 Markdown，第三方上游件（锁定清单登记、正文由上游维护）除外。
      const trackedMarkdown = (() => {
        const listed = spawnSync('git', ['ls-files', '-z', '--', '*.md'], { cwd: root, encoding: 'utf8' })
        // git 不可用时只扫指令面：断链门禁照常提供，不因取不到跟踪清单而整体失效。
        if (listed.error || listed.status !== 0) return []
        return (
          listed.stdout
            .split('\0')
            .filter(Boolean)
            .map(file => path.join(root, file))
            // 已删除但尚未暂存的跟踪文件没有内容可读，不该让整道门禁崩掉。
            .filter(file => fs.existsSync(file))
        )
      })()
      // 软链让同一篇文档有两条路径：指令面按消费面写成 `.agents/skills/x/SKILL.md`，实体在 `skills/x/SKILL.md`。
      // 身份按 realpath 归一，同一文件只扫一遍；扫的那条用实体路径——GitHub 渲染的就是它，读者点的也是它，
      // 消费面路径比实体多一层目录，`../` 会解析到别处，按它判链接会把正确的写法判成断链。
      const identityOf = (file: string): string => {
        try {
          return fs.realpathSync(file)
        } catch {
          // 两次读取之间消失时退化成按字面路径识别；可读性由下面的读取报错。
          return path.resolve(file)
        }
      }
      const instructionSurface = new Set(markdownFiles.map(identityOf))
      // 实体路径优先：`trackedMarkdown` 里是实体路径，`markdownFiles` 里是映射出来的消费面路径。
      const linkSurface: string[] = []
      const linkSurfaceSeen = new Set<string>()
      for (const candidate of [...trackedMarkdown, ...markdownFiles]) {
        const file = path.resolve(candidate)
        if (fromLockedSkill(file)) continue
        // 入面的一律是 realpath：软链路径只是访问方式，不是文档所在位置。
        const identity = identityOf(file)
        if (linkSurfaceSeen.has(identity)) continue
        linkSurfaceSeen.add(identity)
        linkSurface.push(identity)
      }
      // 同一份文档会被多篇引用，剥代码片段的结果按文件缓存，锚点另有 anchorCache。
      const linkSourceCache = new Map<string, string>()
      function linkSource(file: string): string {
        const cached = linkSourceCache.get(file)
        if (cached !== undefined) return cached
        const stripped = stripCodeSegments(fs.readFileSync(file, 'utf8'))
        linkSourceCache.set(file, stripped)
        return stripped
      }

      // (?<!!?) 的 `!?` 允许匹配空串，lookbehind 恒假，链接扫描因此从未跑过；这里要求前面确实不是 `!`（图片语法）。
      // 只定位到 `](`，target 由 readInlineLinkTarget 读出：destination 里的括号合法（`./a_(b)/c.md`），
      // 用 `[^)]+` 截断会把它切成半截路径，报成断链。
      const linkPattern = /(?<!!)\[[^\]]*\]\(/g
      // 只校验节级锚点：文件存在性由下方文件存在校验负责；`#fragment` 可能是节锚点（`#title`）或显式锚点（`{#custom}`）。
      // Markdown 引擎把节标题转成 GitHub 风格 anchor：小写、去标点、空格转 `-`、连续/首尾 `-` 折叠；显式 `{#name}` 优先。
      const ghAnchor = (text: string): string =>
        text
          .toLowerCase()
          .replace(/[^\p{Alphabetic}\p{N}\s-]/gu, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      function collectAnchors(file: string): Set<string> {
        const anchors = new Set<string>()
        let source = ''
        try {
          source = fs.readFileSync(file, 'utf8')
        } catch {
          return anchors
        }
        for (const match of source.matchAll(/^#{1,6}\s+(.*)$/gm)) {
          const heading = match[1].trim()
          const explicit = /^(.+?)\s*\{#([^}]+)\}$/.exec(heading)
          anchors.add(explicit ? explicit[2].trim() : ghAnchor(heading))
        }
        return anchors
      }
      const anchorCache = new Map<string, Set<string>>()
      function anchoredTargets(file: string): Set<string> {
        const cached = anchorCache.get(file)
        if (cached !== undefined) return cached
        const anchors = collectAnchors(file)
        anchorCache.set(file, anchors)
        return anchors
      }
      // 只有编号 ADR 需要被发现；ADR 目录下的其他 Markdown（如索引 README）算指令面，它的链接可以提供入站。
      const adrDocuments = new Set(
        walk(options.adrDocs, file => file.endsWith('.md') && /^\d{4}-/.test(path.basename(file)))
      )
      // rules 目录是 Task-specific 层，只有被路由（根入口的 task routing）或权威文档指针命中才会加载。
      // 被另一个 rules 文件引用不算加载路径——rules 文件自身也不常驻加载，互相引用只是两个孤岛。代价：靠「已路由的
      // rules 文件链式引出另一个规则」的写法不被承认为加载路径，需要时改为直接路由或挂到权威文档。
      const rulesDir = path.join(root, options.rules)
      const isRulesFile = (file: string): boolean => file.startsWith(`${rulesDir}${path.sep}`)
      const inboundTargets = new Set<string>()
      const rulesLoadPaths = new Set<string>()
      let localLinksChecked = 0
      // 同一篇文档里同一个 target 常出现多次（目录表反复引用同一入口）；按文件+target 去重，避免同因刷屏。
      const reportedUnqualified = new Set<string>()
      for (const file of linkSurface) {
        const source = linkSource(file)
        const isAdr = adrDocuments.has(file)
        // 入站与「加载路径」都只认指令面的链接：研究记录或 changelog 里的引用不能替代路由。
        const onInstructionSurface = instructionSurface.has(identityOf(file))
        for (const match of source.matchAll(linkPattern)) {
          const rawTarget = readInlineLinkTarget(source, match.index + match[0].length)
          if (rawTarget === null) continue
          const target = rawTarget.trim()
          const parsed = parseLocalLinkTarget(target)
          if (!parsed) continue
          const { location, fragment } = parsed
          localLinksChecked += 1
          const resolved = path.resolve(path.dirname(file), location)
          const targetExists = fs.existsSync(resolved)
          if (!targetExists) addError(`${relative(file)}: broken local link ${target}`)
          // 相对 target 有两种解析习惯：按当前文件所在目录，或按仓库根。仓库根下的文档两种解析结果相同，
          // 写 `docs/agents/build.md` 没问题；更深的文档不同——`docs/input.md` 可能两边都存在，指向的却是
          // 两个不同文件，换个查看器就跳错。所以非根文档一律要求 `./` 或 `../` 起头，把解析方式写死。
          else if (
            path.dirname(relative(file)) !== '.' &&
            isUnqualifiedRelativeTarget(location) &&
            !reportedUnqualified.has(`${file}\u0000${location}`)
          ) {
            reportedUnqualified.add(`${file}\u0000${location}`)
            addError(
              `${relative(file)}: unqualified relative link ${target}; write ./${location} so every renderer resolves it the same way`
            )
          }
          if (onInstructionSurface && !isAdr) inboundTargets.add(resolved)
          // 链接可能经客户端消费面（软链）写成，或用 `..`/软链绕路；realpath 归一后再比对。
          // 只计真实存在的目标：断链已由上面的 `broken local link` 报过。
          if (onInstructionSurface && !isRulesFile(file) && targetExists) rulesLoadPaths.add(fs.realpathSync(resolved))
          if (
            fragment &&
            targetExists &&
            fs.statSync(resolved).isFile() &&
            !anchoredTargets(resolved).has(ghAnchor(fragment))
          )
            addError(`${relative(file)}: broken local anchor ${target}`)
        }
      }
      // ADR 的发现性钉在「必须有入站链接」上，而不是「CONTEXT.md 必须逐条索引」：
      // 后者把索引文档的体积变成契约，阻止精简这份文档。
      for (const file of [...adrDocuments].sort(byCodeUnit)) {
        if (!inboundTargets.has(file)) addError(`${relative(file)}: no inbound link from the instruction surface`)
      }
      // rules 文件的加载路径同样钉在「必须有入站链接」上：路由那一行被删掉后，断链、锚点、出处检查都不会变红，
      // 文件会静默变成孤岛，所以单列一条断言。
      for (const file of walk(options.rules, candidate => candidate.endsWith('.md')).sort()) {
        if (!rulesLoadPaths.has(fs.realpathSync(file)))
          addError(`${relative(file)}: no inbound link from the instruction surface`)
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
      //   - ADR 在覆盖范围内：ADR 是承载现行基础设施指引的活文档，命令名陈旧就是陈旧，照判。
      //   - 研究记录按构造不在范围内（markdownFiles 不收它）：那是点时性研究记录，保持历史原貌。
      // 指令面没有其他收窄。
      // 只收 `[a-zA-Z]` 开头的 token：pnpm 的全局 flag（`--filter`/`-F`/`--dir`）和 flag 后的值都不是 script 引用。
      const pnpmRunForm = /\bpnpm run ([a-zA-Z][a-zA-Z0-9:._-]*)/g
      const pnpmBareForm = /\bpnpm ([a-zA-Z][a-zA-Z0-9:._-]*)/g
      for (const file of markdownFiles) {
        const source = fs.readFileSync(file, 'utf8')
        const reported = new Set<string>()
        const check = (name: string): void => {
          // 同一个名字在同一个文件里重复出现只报一次，否则一次整段重写会刷出几十行同因错误。
          if (rootScripts.has(name) || reported.has(name)) return
          reported.add(name)
          addError(`${relative(file)}: references root command \`${name}\`, which is not in package.json scripts`)
        }
        for (const match of source.matchAll(pnpmRunForm)) check(match[1])
        for (const match of source.matchAll(pnpmBareForm)) if (/[:-]/.test(match[1])) check(match[1])
      }

      function parseFrontmatter(file: string): void {
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

      // skill 的实体家是自撰与依赖镜像目录，以及第三方的 vendored 目录；
      // 消费面里只有逐 skill 软链，walk 不跟随，所以出处检查直接走两个实体目录。
      for (const name of repoAuthoredSkills)
        if (!exists(`${options.skills.entity}/${name}/SKILL.md`))
          addError(`repoAuthoredSkills lists a skill without SKILL.md: ${options.skills.entity}/${name}`)
      for (const file of [
        ...walk(options.skills.entity, file => path.basename(file) === 'SKILL.md'),
        ...walk(options.skills.vendored, file => path.basename(file) === 'SKILL.md')
      ]) {
        parseFrontmatter(file)
        const name = path.basename(path.dirname(file))
        if (repoAuthoredSkills.has(name) === lockedSkills.has(name))
          addError(
            `${options.skills.entity}/${name}: provenance must be either ${options.skills.lockFile} or repoAuthoredSkills, not both or neither`
          )
      }

      // 只读报表：把需要人工判断的语料卫生信号集中列出，不作为 CI 门禁。
      if (reportMode) {
        const sizes = corpus.map(({ file, source }) => ({ file, size: countNonWhitespace(source) }))
        const largest = [...sizes].sort((a, b) => b.size - a.size || (a.file < b.file ? -1 : 1)).slice(0, 10)
        const zeroInbound = corpus
          .filter(
            ({ file }) =>
              file.startsWith(`${options.agentDocs}/`) ||
              (file.startsWith(`${options.adrDocs}/`) && /^\d{4}-/.test(file.slice(options.adrDocs.length + 1)))
          )
          .filter(({ file }) => !inboundTargets.has(path.join(root, file)))
          .map(({ file }) => file)
        const retired = findRetiredAdrMarkers(corpus, options.adrDocs)

        console.log('Context corpus report\n')
        console.log(`link surface (${linkSurface.length} files, ${localLinksChecked} local links)`)
        console.log(`unrouted ${options.agentDocs} files (${unroutedAgentDocs.length})`)
        for (const file of unroutedAgentDocs) console.log(`  ${file}`)
        console.log(`\ninstruction docs with no inbound link (${zeroInbound.length})`)
        for (const file of zeroInbound) console.log(`  ${file}`)
        console.log(`\nreference docs missing the non-authoritative marker (${unmarkedReferenceDocs.length})`)
        for (const file of unmarkedReferenceDocs) console.log(`  ${file}`)
        console.log(`\nlive ADRs with retired-section markers (${retired.length})`)
        for (const { file, line, phrase } of retired) console.log(`  ${file}:${line} ${phrase}`)
        console.log('\nlargest corpus docs')
        for (const { file, size } of largest) console.log(`  ${String(size).padStart(6)}  ${file}`)
        console.log('')
      }

      if (errors.length) {
        throw new Error(`failed with ${errors.length} error(s):\n${errors.map(error => `- ${error}`).join('\n')}`)
      }
      if (reportMode) return 'report printed'

      // 指纹覆盖内容而不只是路径：只哈希路径时，改写正文不会改变指纹，外部索引无从判断是否需要重建。
      const digest = contentDigest([...corpus, ...referenceCorpus])
      return `${corpus.length + referenceCorpus.length} Markdown files, ${linkSurface.length} link-scanned files / ${localLinksChecked} local links, corpus ${digest}`
    }
  }
}
