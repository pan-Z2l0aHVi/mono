/**
 * Validate the `@greypan/ai-skill` package layout. This package owns the
 * repo-authored agent skills as their single source of truth and publishes
 * them as an npm package following the `skills/<name>/SKILL.md` convention.
 *
 * Invariants enforced here (and by the tests):
 * - every directory under `skills/` is a skill: it contains a SKILL.md whose
 *   frontmatter declares a `name` matching the directory and a non-empty
 *   `description`
 * - no skill in `skills/` is registered in the repo-root `skills-lock.json`:
 *   that lock tracks third-party vendored skills, which stay in
 *   `.agents/skills/` and are never published from here
 * - `.agents/skills/` holds exactly two kinds of entries: third-party skills
 *   (real directories registered in `skills-lock.json`) and repo-authored
 *   skills (symlinks resolving into this package's `skills/`)
 */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
 * Check the package layout and return the sorted names of the repo-authored
 * skills published from `skills/`. Throws with an actionable message on the
 * first violation.
 *
 * @param {{ skillsDir: string, agentsSkillsDir: string, lockFile: string }} options
 * @returns {string[]} sorted skill names
 */
export function checkSkills({ skillsDir, agentsSkillsDir, lockFile }) {
  let lock
  try {
    lock = JSON.parse(readFileSync(lockFile, 'utf8'))
  } catch (error) {
    throw new Error(`skills-lock.json at ${lockFile} is missing or not valid JSON: ${error.message}`)
  }
  if (!lock.skills || typeof lock.skills !== 'object') {
    throw new Error(`skills-lock.json at ${lockFile} must have a "skills" object`)
  }

  for (const entry of readdirSync(skillsDir)) {
    if (!statSync(join(skillsDir, entry)).isDirectory()) {
      throw new Error(`unexpected file "${entry}" under ${skillsDir}; only skill directories belong there`)
    }
  }
  const names = readdirSync(skillsDir)
  if (names.length === 0) throw new Error(`no skills found under ${skillsDir}`)

  for (const name of names) {
    if (lock.skills[name]) {
      throw new Error(
        `skill "${name}" is registered in skills-lock.json; third-party skills must not be published from this package`
      )
    }
    const skillMdPath = join(skillsDir, name, 'SKILL.md')
    if (!existsSync(skillMdPath)) {
      throw new Error(`skill "${name}" is missing its SKILL.md (${skillMdPath})`)
    }
    const frontmatter = parseFrontmatter(readFileSync(skillMdPath, 'utf8'))
    if (!frontmatter) throw new Error(`skill "${name}" has a SKILL.md without frontmatter`)
    if (frontmatter.name !== name) {
      throw new Error(
        `skill "${name}" frontmatter name is "${frontmatter.name ?? ''}"; it must match the directory name`
      )
    }
    if (!frontmatter.description) throw new Error(`skill "${name}" frontmatter is missing a description`)
  }

  for (const entry of readdirSync(agentsSkillsDir)) {
    const entryPath = join(agentsSkillsDir, entry)
    if (lstatSync(entryPath).isSymbolicLink()) {
      let target
      try {
        target = realpathSync(entryPath)
      } catch {
        throw new Error(
          `.agents/skills/${entry} is a dangling symlink; it must point at this package's skills/${entry}`
        )
      }
      const expected = join(skillsDir, entry)
      if (!existsSync(expected)) {
        throw new Error(
          `.agents/skills/${entry} symlinks to a skill this package does not publish; add skills/${entry} or remove the symlink`
        )
      }
      if (target !== realpathSync(expected)) {
        throw new Error(`.agents/skills/${entry} must symlink into this package's skills/ directory, got ${target}`)
      }
    } else if (statSync(entryPath).isDirectory()) {
      if (!lock.skills[entry]) {
        throw new Error(
          `.agents/skills/${entry} is an unregistered real directory; it is either a third-party skill missing from skills-lock.json or a repo-authored skill that should live in this package`
        )
      }
    } else if (!lock.skills[entry]) {
      throw new Error(`.agents/skills/${entry} is an unexpected file; skill entries must be directories or symlinks`)
    }
  }

  return names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export function main() {
  const names = checkSkills({
    skillsDir: join(packageRoot, 'skills'),
    agentsSkillsDir: join(packageRoot, '..', '..', '.agents', 'skills'),
    lockFile: join(packageRoot, '..', '..', 'skills-lock.json')
  })
  // stderr：prepack 会在 pnpm/npm pack --json 期间运行本脚本，stdout 必须留给 pack 的 JSON。
  console.error(`skills package ok: ${names.join(', ')}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
