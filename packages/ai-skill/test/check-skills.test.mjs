import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { checkSkills, parseFrontmatter } from '../scripts/check-skills.mjs'

const packageRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(packageRoot, '..', '..')
const skillsDir = join(packageRoot, 'skills')
const agentsSkillsDir = join(repoRoot, '.agents', 'skills')
const lockFile = join(repoRoot, 'skills-lock.json')

/** @type {string | undefined} */
let tmpDir

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'skills-check-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = undefined
})

function writeSkill(root, name) {
  mkdirSync(join(root, name), { recursive: true })
  writeFileSync(join(root, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} skill\n---\n\nbody\n`)
}

describe('checkSkills against the real repo state', () => {
  it('publishes the repo-authored skills and passes all layout invariants', () => {
    const names = checkSkills({ skillsDir, agentsSkillsDir, lockFile })
    expect(names).toEqual(['contract-change-review', 'herdr-agents'])
  })

  it('never publishes a third-party skill', () => {
    const lock = JSON.parse(readFileSync(lockFile, 'utf8'))
    const names = checkSkills({ skillsDir, agentsSkillsDir, lockFile })
    for (const name of names) expect(lock.skills[name]).toBeUndefined()
  })

  it('exposes every published skill from .agents/skills through a symlink', () => {
    for (const name of checkSkills({ skillsDir, agentsSkillsDir, lockFile })) {
      const entry = join(agentsSkillsDir, name)
      expect(lstatSync(entry).isSymbolicLink(), `${entry} should be a symlink`).toBe(true)
    }
  })
})

describe('checkSkills violations', () => {
  function layout() {
    const root = /** @type {string} */ (tmpDir)
    const skills = join(root, 'skills')
    const agents = join(root, 'agents-skills')
    const lock = join(root, 'skills-lock.json')
    mkdirSync(skills, { recursive: true })
    mkdirSync(agents, { recursive: true })
    writeFileSync(lock, JSON.stringify({ version: 1, skills: {} }))
    return { skills, agents, lock }
  }

  it('rejects a skill directory without SKILL.md', () => {
    const { skills, agents, lock } = layout()
    mkdirSync(join(skills, 'broken'))
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /missing its SKILL\.md/
    )
  })

  it('rejects a frontmatter name that does not match the directory', () => {
    const { skills, agents, lock } = layout()
    mkdirSync(join(skills, 'demo'), { recursive: true })
    writeFileSync(join(skills, 'demo', 'SKILL.md'), '---\nname: other\ndescription: x\n---\n')
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /must match the directory name/
    )
  })

  it('rejects a skill registered as third-party in skills-lock.json', () => {
    const { skills, agents, lock } = layout()
    writeSkill(skills, 'vendored')
    writeFileSync(lock, JSON.stringify({ version: 1, skills: { vendored: { source: 'someone/else' } } }))
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /must not be published/
    )
  })

  it('rejects a stray real directory in .agents/skills that is not in the lock', () => {
    const { skills, agents, lock } = layout()
    writeSkill(skills, 'demo')
    writeSkill(agents, 'stray')
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /unregistered real directory/
    )
  })

  it('rejects an .agents/skills symlink pointing outside the package', () => {
    const { skills, agents, lock } = layout()
    writeSkill(skills, 'demo')
    const elsewhere = join(/** @type {string} */ (tmpDir), 'elsewhere')
    writeSkill(elsewhere, 'demo')
    symlinkSync(elsewhere, join(agents, 'demo'), 'dir')
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /must symlink into/
    )
  })

  it('rejects a dangling symlink in .agents/skills with an actionable message', () => {
    const { skills, agents, lock } = layout()
    writeSkill(skills, 'demo')
    symlinkSync(join(agents, 'missing-target'), join(agents, 'demo'))
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /dangling symlink/
    )
  })

  it('rejects an unexpected file in .agents/skills', () => {
    const { skills, agents, lock } = layout()
    writeSkill(skills, 'demo')
    writeFileSync(join(agents, 'loose.txt'), 'not a skill')
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /unexpected file/
    )
  })

  it('rejects an unexpected file at the top level of skills/', () => {
    const { skills, agents, lock } = layout()
    writeSkill(skills, 'demo')
    writeFileSync(join(skills, 'stray.txt'), 'not a skill')
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /unexpected file "stray\.txt"/
    )
  })

  it('rejects a malformed skills-lock.json with an actionable message', () => {
    const { skills, agents, lock } = layout()
    writeSkill(skills, 'demo')
    writeFileSync(lock, '{not json')
    expect(() => checkSkills({ skillsDir: skills, agentsSkillsDir: agents, lockFile: lock })).toThrowError(
      /not valid JSON/
    )
  })
})

describe('parseFrontmatter', () => {
  it('reads name and description from a frontmatter block', () => {
    expect(parseFrontmatter('---\nname: demo\ndescription: Does things\n---\n\n# body')).toEqual({
      name: 'demo',
      description: 'Does things'
    })
  })

  it('returns null without frontmatter', () => {
    expect(parseFrontmatter('# just a heading')).toBeNull()
  })
})
