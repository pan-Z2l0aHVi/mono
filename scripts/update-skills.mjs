import { spawnSync } from 'node:child_process'
// 第三方 skill 的自动更新入口：官方 `skills update` 引擎 + 收割式落盘。
//
// 为什么不直接在仓库根跑 `npx skills update`：update 会把变更的第三方 skill
// 重装成实体目录写进 `.agents/skills/<name>`，覆盖指向真实家的软链（本仓的
// .agents/skills 全部是软链，见 skills/README.md）。这里把 update
// 隔离在临时目录里跑——lock 复制过去，CLI 照常重解析源、比对 computedHash、
// 只装变更项、更新 lock——然后由 reconcile 把变更内容搬回真实家：
//   - 被自撰 skill 依赖而镜像在根 skills/ 的 → 根 skills/<name>
//   - 其余 → .agents/skills-vendored/<name>
// 并刷新 .agents/skills 软链、把更新过的 lock 拷回仓库根，最后跑
// checkRepoLayout 确认三层布局不变量完好。
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── 三层布局契约（校验器自 update 之前独立成文件的时代并入本文件，唯一运行时消费者是下方的 main）──
// skills 生态的三个表面，完整约定见 skills/README.md：
// - `skills/` — 真实目录，GitHub 发现面（`npx skills add pan-Z2l0aHVi/mono`）：
//   自撰 skill 加「依赖镜像」（被自撰 SKILL.md 兄弟链接引用的第三方 skill）。
// - `.agents/skills-vendored/` — 其余 lock 登记项的真实目录；skills CLI 不扫描
//   此目录，这些 skill 永不进入 GitHub 发现面。
// - `.agents/skills/` — agent 指令面：每个 skill 一个软链指回真实家。这里出现
//   实体目录 = 有人在仓内直接跑了 skills update，必须归一（见 relinkAgentSurface）。

/**
 * Extract `name` and `description` from a SKILL.md YAML frontmatter block.
 * Returns `null` when the file has no well-formed frontmatter.
 *
 * @param {string} content
 * @returns {{ name?: string, description?: string } | null}
 */
export function parseFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
  if (!match) return null
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^(name|description):\s*(.*)$/.exec(line)
    if (entry) fields[entry[1]] = entry[2].trim()
  }
  return fields
}

/**
 * Sibling skill references in a SKILL.md body: markdown links of the form
 * `../<name>/SKILL.md`, the convention for cross-skill dependencies.
 *
 * @param {string} content
 * @returns {string[]}
 */
export function parseSiblingSkillLinks(content) {
  return [...content.matchAll(/\]\(\.\.\/([A-Za-z0-9][A-Za-z0-9-]*)\/SKILL\.md(#[^)\s]*)?\)/g)].map(match => match[1])
}

/**
 * Validate the repo layout and return the skill classification.
 * Throws with an actionable message on the first violation.
 *
 * @param {{ rootSkillsDir: string, agentsSkillsDir: string, vendoredDir: string, lockFile: string }} options
 * @returns {{ repoAuthored: string[], mirrored: string[], vendored: string[] }} sorted name lists
 */
export function checkRepoLayout({ rootSkillsDir, agentsSkillsDir, vendoredDir, lockFile }) {
  let lock
  try {
    lock = JSON.parse(readFileSync(lockFile, 'utf8'))
  } catch (error) {
    throw new Error(`skills-lock.json at ${lockFile} is missing or not valid JSON: ${error.message}`)
  }
  if (!lock.skills || typeof lock.skills !== 'object') {
    throw new Error(`skills-lock.json at ${lockFile} must have a "skills" object`)
  }
  const locked = name => Boolean(lock.skills[name])
  const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  for (const [label, dir] of [
    ['skills/', rootSkillsDir],
    ['.agents/skills/', agentsSkillsDir],
    ['.agents/skills-vendored/', vendoredDir]
  ]) {
    if (!existsSync(dir)) {
      throw new Error(`skill surface directory ${label} does not exist (${dir}); recreate it per skills/README.md`)
    }
  }

  const assertRealSkillDir = (dir, name, location) => {
    const skillMdPath = join(dir, name, 'SKILL.md')
    if (!existsSync(skillMdPath)) {
      throw new Error(`skill "${name}" at ${location} is missing its SKILL.md (${skillMdPath})`)
    }
    const frontmatter = parseFrontmatter(readFileSync(skillMdPath, 'utf8'))
    if (!frontmatter) throw new Error(`skill "${name}" at ${location} has a SKILL.md without frontmatter`)
    if (frontmatter.name !== name) {
      throw new Error(
        `skill "${name}" at ${location} frontmatter name is "${frontmatter.name ?? ''}"; it must match the directory name`
      )
    }
    if (!frontmatter.description) {
      throw new Error(`skill "${name}" at ${location} frontmatter is missing a description`)
    }
  }

  // Surface 1: root skills/ — real dirs plus the README.md install doc;
  // directories are repo-authored or dependency mirrors.
  const rootNames = readdirSync(rootSkillsDir).filter(name => {
    if (name !== 'README.md') return true
    if (lstatSync(join(rootSkillsDir, name)).isDirectory()) {
      throw new Error(`"${name}" under ${rootSkillsDir} must be the install doc file, not a directory`)
    }
    return false
  })
  for (const name of rootNames) {
    if (!lstatSync(join(rootSkillsDir, name)).isDirectory()) {
      throw new Error(`unexpected file "${name}" under ${rootSkillsDir}; only real skill directories belong there`)
    }
    assertRealSkillDir(rootSkillsDir, name, 'skills/')
  }
  const repoAuthored = rootNames.filter(name => !locked(name)).sort(byName)
  const mirrored = rootNames.filter(locked).sort(byName)
  if (repoAuthored.length === 0) throw new Error(`no repo-authored skills found under ${rootSkillsDir}`)

  // Dependency rule: every third-party sibling link from a repo-authored skill
  // must be mirrored here, and every mirror must actually be referenced.
  const referenced = new Set()
  for (const name of repoAuthored) {
    const content = readFileSync(join(rootSkillsDir, name, 'SKILL.md'), 'utf8')
    for (const target of parseSiblingSkillLinks(content)) {
      if (!rootNames.includes(target)) {
        throw new Error(
          `skill "${name}" links to sibling skill "${target}"; it must be a real directory under ${rootSkillsDir} (dependency mirror), not found`
        )
      }
      referenced.add(target)
    }
  }
  for (const name of mirrored) {
    if (!referenced.has(name)) {
      throw new Error(
        `dependency mirror "${name}" under ${rootSkillsDir} is not referenced by any repo-authored skill; move it to ${vendoredDir} or fix the dependency links`
      )
    }
  }

  // Surface 2: skills-vendored/ — real dirs, exactly the lock entries not mirrored above.
  const vendoredNames = existsSync(vendoredDir) ? readdirSync(vendoredDir) : []
  for (const name of vendoredNames) {
    if (!lstatSync(join(vendoredDir, name)).isDirectory()) {
      throw new Error(`unexpected file "${name}" under ${vendoredDir}; only skill directories belong there`)
    }
    if (!locked(name)) {
      throw new Error(
        `vendored skill "${name}" is not registered in skills-lock.json; repo-authored skills belong under ${rootSkillsDir}`
      )
    }
    assertRealSkillDir(vendoredDir, name, '.agents/skills-vendored/')
  }
  const vendored = vendoredNames.sort(byName)
  const overlap = mirrored.filter(name => vendored.includes(name))
  if (overlap.length > 0) {
    throw new Error(`skills both mirrored and vendored: ${overlap.join(', ')}; each skill has exactly one real home`)
  }
  const unaccounted = Object.keys(lock.skills).filter(name => !mirrored.includes(name) && !vendored.includes(name))
  if (unaccounted.length > 0) {
    throw new Error(
      `lock-registered skills with no real home: ${unaccounted.join(', ')}; add them to ${rootSkillsDir} (dependency mirror) or ${vendoredDir}`
    )
  }

  // Surface 3: .agents/skills/ — symlinks only, one per skill, pointing home.
  const linkedNames = readdirSync(agentsSkillsDir)
  for (const name of linkedNames) {
    const entryPath = join(agentsSkillsDir, name)
    if (!lstatSync(entryPath).isSymbolicLink()) {
      throw new Error(
        `.agents/skills/${name} must be a symlink; a real directory here means an in-repo skills update clobbered the layout — reconcile via pnpm agent:update-skills or AGENTS.md`
      )
    }
    let target
    try {
      target = realpathSync(entryPath)
    } catch {
      throw new Error(`.agents/skills/${name} is a dangling symlink; recreate it pointing at the skill's real home`)
    }
    if (!rootNames.includes(name) && !vendored.includes(name)) {
      throw new Error(
        `.agents/skills/${name} points at "${name}" which has no real home under ${rootSkillsDir} or ${vendoredDir}`
      )
    }
    const expected = rootNames.includes(name)
      ? realpathSync(join(rootSkillsDir, name))
      : realpathSync(join(vendoredDir, name))
    if (target !== expected) {
      throw new Error(`.agents/skills/${name} must symlink to the skill's real home, got ${target}`)
    }
  }
  const allNames = [...rootNames, ...vendoredNames].sort(byName)
  const unlinked = allNames.filter(name => !linkedNames.includes(name))
  if (unlinked.length > 0) {
    throw new Error(
      `skills missing from .agents/skills/: ${unlinked.join(', ')}; the agent instruction surface must link every skill`
    )
  }

  return { repoAuthored, mirrored, vendored }
}

const symlinkTargetFor = (name, repoRoot) =>
  existsSync(join(repoRoot, 'skills', name)) ? join('..', '..', 'skills', name) : join('..', 'skills-vendored', name)

/**
 * Normalize the .agents/skills surface: every expected skill must be a symlink
 * to its real home. Repairs clobbered entries (a bare in-repo `skills update`
 * leaves real directories behind) and missing links, so re-running this script
 * is always a valid repair path.
 */
function relinkAgentSurface(repoRoot) {
  const agentsSkillsDir = join(repoRoot, '.agents', 'skills')
  // skills/ 根的 README.md 是 GitHub 通道的安装说明，不是 skill：它没有 SKILL.md，
  // 把它链进指令面会让 checkRepoLayout 的「每个软链都要有真实家」不变量失败。
  const names = new Set([
    ...readdirSync(join(repoRoot, 'skills'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name),
    ...readdirSync(join(repoRoot, '.agents', 'skills-vendored'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  ])
  for (const name of names) {
    const linkPath = join(agentsSkillsDir, name)
    const expectedTarget = symlinkTargetFor(name, repoRoot)
    const expectedReal = join(repoRoot, expectedTarget)
    const isCorrect = (() => {
      try {
        return lstatSync(linkPath).isSymbolicLink() && realpathSync(linkPath) === realpathSync(expectedReal)
      } catch {
        return false
      }
    })()
    if (!isCorrect) {
      rmSync(linkPath, { recursive: true, force: true })
      symlinkSync(expectedTarget, linkPath)
    }
  }
}

/**
 * Move updated skills from the temp update workspace back to their real homes,
 * refresh the .agents/skills symlinks, and write the updated lock back to the
 * repo root. Pure filesystem work over the given directories; the CLI run is
 * the caller's job (see main).
 *
 * @param {{
 *   repoRoot: string,
 *   tmpAgentsSkillsDir: string,
 *   lockBefore: { skills: Record<string, unknown> },
 *   lockAfter: { skills: Record<string, unknown> },
 * }} options
 * @returns {string[]} names of skills whose content changed
 */
export function reconcileUpdatedSkills({ repoRoot, tmpAgentsSkillsDir, lockBefore, lockAfter }) {
  const changed = Object.keys(lockAfter.skills).filter(name => {
    const before = /** @type {{ computedHash?: string } | undefined} */ (lockBefore.skills[name])
    const after = /** @type {{ computedHash?: string } | undefined} */ (lockAfter.skills[name])
    return before?.computedHash !== after?.computedHash
  })

  for (const name of changed) {
    const updated = join(tmpAgentsSkillsDir, name)
    if (!existsSync(updated)) {
      throw new Error(`skills update reported "${name}" as changed but ${updated} is missing; nothing to harvest`)
    }
    const home = existsSync(join(repoRoot, 'skills', name))
      ? join(repoRoot, 'skills', name)
      : join(repoRoot, '.agents', 'skills-vendored', name)
    rmSync(home, { recursive: true, force: true })
    cpSync(updated, home, { recursive: true })
  }
  // 无论有没有变更项都整面归一：clobber 过的实体目录、缺失或指向错误的软链在此修复，
  // 使「误跑 skills update 之后重放本命令」成为有效的修复路径。注意 harvest 非原子：
  // 先写真实家与软链、最后过 checkRepoLayout，检查失败时仓库处于部分更新状态（git 可回滚）。
  relinkAgentSurface(repoRoot)
  writeFileSync(join(repoRoot, 'skills-lock.json'), `${JSON.stringify(lockAfter, null, 2)}\n`)
  return changed.sort()
}

export function main() {
  const lockPath = join(root, 'skills-lock.json')
  const lockBefore = JSON.parse(readFileSync(lockPath, 'utf8'))
  const workspace = join(tmpdir(), `skills-update-${process.pid}-${Date.now()}`)
  mkdirSync(workspace, { recursive: true })
  try {
    writeFileSync(join(workspace, 'skills-lock.json'), JSON.stringify(lockBefore, null, 2))
    // -y：临时目录可自动判定为 project scope，跳过交互确认。
    const run = spawnSync('pnpm', ['dlx', 'skills@latest', 'update', '-y'], { cwd: workspace, stdio: 'inherit' })
    if (run.status !== 0) {
      throw new Error(`pnpm dlx skills update failed with exit code ${run.status}`)
    }
    const lockAfter = JSON.parse(readFileSync(join(workspace, 'skills-lock.json'), 'utf8'))
    const changed = reconcileUpdatedSkills({
      repoRoot: root,
      tmpAgentsSkillsDir: join(workspace, '.agents', 'skills'),
      lockBefore,
      lockAfter
    })
    console.log(`updated ${changed.length ? changed.join(', ') : 'no skills (all up to date)'}`)
    let layout
    try {
      layout = checkRepoLayout({
        rootSkillsDir: join(root, 'skills'),
        agentsSkillsDir: join(root, '.agents', 'skills'),
        vendoredDir: join(root, '.agents', 'skills-vendored'),
        lockFile: join(root, 'skills-lock.json')
      })
    } catch (error) {
      throw new Error(`layout check failed after harvesting updated skills: ${error.message}`)
    }
    console.log(
      `skills layout ok; ${layout.repoAuthored.length} repo-authored, ${layout.mirrored.length} dependency mirror(s) exposed via GitHub`
    )
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
