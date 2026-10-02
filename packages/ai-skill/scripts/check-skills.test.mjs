import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkRepoLayout, parseFrontmatter, parseSiblingSkillLinks, syncPackageSkills } from './check-skills.mjs'

const packageRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(packageRoot, '..', '..')
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

function writeSkill(dir, name, body = `${name} body`) {
  mkdirSync(join(dir, name), { recursive: true })
  writeFileSync(join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} skill\n---\n\n${body}\n`)
}

/** Minimal valid fixture: one repo-authored skill with one mirrored dependency, one vendored skill. */
function layout() {
  const root = /** @type {string} */ (tmpDir)
  const rootSkillsDir = join(root, 'skills')
  const vendoredDir = join(root, '.agents', 'skills-vendored')
  const agentsDir = join(root, '.agents', 'skills')
  const lockFileFixture = join(root, 'skills-lock.json')
  mkdirSync(rootSkillsDir, { recursive: true })
  mkdirSync(vendoredDir, { recursive: true })
  mkdirSync(agentsDir, { recursive: true })
  writeSkill(rootSkillsDir, 'demo', 'uses [dep](../dep/SKILL.md)')
  writeSkill(rootSkillsDir, 'dep')
  writeSkill(vendoredDir, 'plain')
  for (const [name, target] of [
    ['demo', '../../skills/demo'],
    ['dep', '../../skills/dep'],
    ['plain', '../skills-vendored/plain']
  ]) {
    symlinkSync(target, join(agentsDir, name))
  }
  writeFileSync(
    lockFileFixture,
    JSON.stringify({ version: 1, skills: { dep: { source: 'o/r' }, plain: { source: 'o/r2' } } })
  )
  return { rootSkillsDir, agentsSkillsDir: agentsDir, vendoredDir, lockFile: lockFileFixture }
}

describe('checkRepoLayout against the real repo state', () => {
  it('classifies skills and passes all layout invariants', () => {
    const { repoAuthored, mirrored, vendored } = checkRepoLayout({
      rootSkillsDir: join(repoRoot, 'skills'),
      agentsSkillsDir,
      vendoredDir: join(repoRoot, '.agents', 'skills-vendored'),
      lockFile
    })
    expect(repoAuthored).toEqual(['contract-change-review', 'herdr-cos'])
    expect(mirrored).toEqual(['herdr'])
    expect(vendored).toHaveLength(16)
    expect(vendored).not.toContain('herdr')
  })

  it('syncs exactly the repo-authored skills into the package artifact', () => {
    const { repoAuthored } = checkRepoLayout({
      rootSkillsDir: join(repoRoot, 'skills'),
      agentsSkillsDir,
      vendoredDir: join(repoRoot, '.agents', 'skills-vendored'),
      lockFile
    })
    const destDir = /** @type {string} */ (mkdtempSync(join(tmpdir(), 'skills-artifact-')))
    try {
      expect(syncPackageSkills({ rootSkillsDir: join(repoRoot, 'skills'), destDir, repoAuthored })).toEqual(
        repoAuthored
      )
      expect(readdirSync(destDir).sort()).toEqual(repoAuthored)
      expect(readdirSync(destDir)).not.toContain('herdr')
    } finally {
      rmSync(destDir, { recursive: true, force: true })
    }
  })
})

describe('checkRepoLayout violations', () => {
  it('rejects a mirror that no repo-authored skill references', () => {
    const options = layout()
    writeSkill(options.rootSkillsDir, 'orphan')
    writeFileSync(
      options.lockFile,
      JSON.stringify({
        version: 1,
        skills: { dep: { source: 'o/r' }, plain: { source: 'o/r2' }, orphan: { source: 'o/r3' } }
      })
    )
    expect(() => checkRepoLayout(options)).toThrowError(/not referenced by any repo-authored skill/)
  })

  it('rejects a sibling dependency link without a mirror', () => {
    const options = layout()
    writeSkill(options.rootSkillsDir, 'demo', 'uses [missing](../missing/SKILL.md)')
    expect(() => checkRepoLayout(options)).toThrowError(/dependency mirror.*not found/)
  })

  it('rejects a lock-registered skill with no real home', () => {
    const options = layout()
    writeFileSync(
      options.lockFile,
      JSON.stringify({
        version: 1,
        skills: { dep: { source: 'o/r' }, plain: { source: 'o/r2' }, ghost: { source: 'o/r3' } }
      })
    )
    expect(() => checkRepoLayout(options)).toThrowError(/no real home/)
  })

  it('rejects a real directory clobbering the .agents/skills symlink surface', () => {
    const options = layout()
    rmSync(join(options.agentsSkillsDir, 'plain'))
    writeSkill(options.agentsSkillsDir, 'plain')
    expect(() => checkRepoLayout(options)).toThrowError(/must be a symlink/)
  })

  it('rejects a dangling or wrongly pointed symlink', () => {
    const options = layout()
    rmSync(join(options.agentsSkillsDir, 'demo'))
    symlinkSync('../../skills/nonexistent', join(options.agentsSkillsDir, 'demo'))
    expect(() => checkRepoLayout(options)).toThrowError(/dangling symlink/)
    rmSync(join(options.agentsSkillsDir, 'demo'))
    symlinkSync('../skills-vendored/plain', join(options.agentsSkillsDir, 'demo'))
    expect(() => checkRepoLayout(options)).toThrowError(/must symlink to the skill's real home/)
  })

  it('rejects a skill missing from the agent instruction surface', () => {
    const options = layout()
    rmSync(join(options.agentsSkillsDir, 'plain'))
    expect(() => checkRepoLayout(options)).toThrowError(/missing from \.agents\/skills/)
  })

  it('rejects an unexpected file in a skill surface directory', () => {
    const options = layout()
    writeFileSync(join(options.rootSkillsDir, 'loose.txt'), 'not a skill')
    expect(() => checkRepoLayout(options)).toThrowError(/unexpected file "loose\.txt"/)
    writeFileSync(join(options.vendoredDir, 'loose.txt'), 'not a skill')
    expect(() => checkRepoLayout(options)).toThrowError(/unexpected file "loose\.txt"/)
  })

  it('rejects a skill that is both mirrored and vendored', () => {
    const options = layout()
    writeSkill(options.vendoredDir, 'dep')
    expect(() => checkRepoLayout(options)).toThrowError(/both mirrored and vendored/)
  })

  it('rejects an unregistered skill in the vendored surface', () => {
    const options = layout()
    writeSkill(options.vendoredDir, 'homemade')
    expect(() => checkRepoLayout(options)).toThrowError(/not registered in skills-lock\.json/)
  })

  it('rejects a malformed skills-lock.json with an actionable message', () => {
    const options = layout()
    writeFileSync(options.lockFile, '{not json')
    expect(() => checkRepoLayout(options)).toThrowError(/not valid JSON/)
  })
})

describe('parseFrontmatter / parseSiblingSkillLinks', () => {
  it('reads name and description from a frontmatter block', () => {
    expect(parseFrontmatter('---\nname: demo\ndescription: Does things\n---\n\n# body')).toEqual({
      name: 'demo',
      description: 'Does things'
    })
  })

  it('returns null without frontmatter', () => {
    expect(parseFrontmatter('# just a heading')).toBeNull()
  })

  it('extracts sibling skill dependency links, including anchored forms', () => {
    const content = 'see [herdr](../herdr/SKILL.md), [anchored](../other/SKILL.md#section) and [x](https://example.com)'
    expect(parseSiblingSkillLinks(content)).toEqual(['herdr', 'other'])
  })
})
