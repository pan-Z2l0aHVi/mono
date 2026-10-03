/**
 * Validate the agent-skill layout across the repo's three surfaces.
 *
 * Surfaces (see skills/README.md):
 * - `<repo>/skills/` — real directories, the GitHub discovery surface for
 *   `npx skills add pan-Z2l0aHVi/mono`. Holds the repo-authored skills plus
 *   "dependency mirrors": third-party skills that a repo-authored skill links
 *   to as a sibling dependency.
 * - `<repo>/.agents/skills-vendored/` — real directories for every other
 *   third-party skill tracked in the repo-root `skills-lock.json`. This dir is
 *   not scanned by the skills CLI, so those skills are never offered to
 *   GitHub-source consumers.
 * - `<repo>/.agents/skills/` — the agent instruction surface: one symlink per
 *   skill pointing at its real home. Agent clients follow symlinks; the skills
 *   CLI skips them, which keeps vendored skills out of discovery. A real
 *   directory appearing here means an in-repo `skills update` clobbered a
 *   symlink and must be reconciled (see skills/README.md).
 *
 * GitHub is the only distribution channel: consumers install from
 * `pan-Z2l0aHVi/mono` with `npx skills add`. The repo-authored subset is
 * exposed directly from `<repo>/skills/` as-is.
 */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')

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

export function main() {
  const { repoAuthored, mirrored } = checkRepoLayout({
    rootSkillsDir: join(repoRoot, 'skills'),
    agentsSkillsDir: join(repoRoot, '.agents', 'skills'),
    vendoredDir: join(repoRoot, '.agents', 'skills-vendored'),
    lockFile: join(repoRoot, 'skills-lock.json')
  })
  console.error(
    `skills layout ok; ${repoAuthored.length} repo-authored, ${mirrored.length} dependency mirror(s) exposed via GitHub`
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
