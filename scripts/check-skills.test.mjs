import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, it } from 'node:test'

import { checkRepoLayout, parseFrontmatter, parseSiblingSkillLinks } from './check-skills.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const agentsSkillsDir = join(repoRoot, '.agents', 'skills')
const lockFile = join(repoRoot, 'skills-lock.json')

function writeSkill(dir, name, body = `${name} body`) {
  mkdirSync(join(dir, name), { recursive: true })
  writeFileSync(join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} skill\n---\n\n${body}\n`)
}

/**
 * Build a minimal valid fixture under a fresh temp dir and run `fn` against
 * it, cleaning the temp dir up afterwards.
 *
 * @param {(options: { rootSkillsDir: string, agentsSkillsDir: string, vendoredDir: string, lockFile: string }) => void} fn
 */
function withLayout(fn) {
  const root = mkdtempSync(join(tmpdir(), 'skills-check-'))
  try {
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
    fn({ rootSkillsDir, agentsSkillsDir: agentsDir, vendoredDir, lockFile: lockFileFixture })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('checkRepoLayout against the real repo state', () => {
  it('classifies skills and passes all layout invariants', () => {
    const { repoAuthored, mirrored, vendored } = checkRepoLayout({
      rootSkillsDir: join(repoRoot, 'skills'),
      agentsSkillsDir,
      vendoredDir: join(repoRoot, '.agents', 'skills-vendored'),
      lockFile
    })
    assert.deepEqual(repoAuthored, ['contract-change-review'])
    assert.deepEqual(mirrored, [])
    assert.deepEqual(vendored, ['apple-design', 'emil-design-eng', 'review-animations', 'wizard'])
  })

  it('ships a README.md install doc at the skills/ root', () => {
    assert.match(readFileSync(join(repoRoot, 'skills', 'README.md'), 'utf8'), /npx skills add/)
  })
})

describe('checkRepoLayout violations', () => {
  it('rejects a mirror that no repo-authored skill references', () => {
    withLayout(options => {
      writeSkill(options.rootSkillsDir, 'orphan')
      writeFileSync(
        options.lockFile,
        JSON.stringify({
          version: 1,
          skills: { dep: { source: 'o/r' }, plain: { source: 'o/r2' }, orphan: { source: 'o/r3' } }
        })
      )
      assert.throws(() => checkRepoLayout(options), /not referenced by any repo-authored skill/)
    })
  })

  it('rejects a sibling dependency link without a mirror', () => {
    withLayout(options => {
      writeSkill(options.rootSkillsDir, 'demo', 'uses [missing](../missing/SKILL.md)')
      assert.throws(() => checkRepoLayout(options), /dependency mirror.*not found/)
    })
  })

  it('rejects a lock-registered skill with no real home', () => {
    withLayout(options => {
      writeFileSync(
        options.lockFile,
        JSON.stringify({
          version: 1,
          skills: { dep: { source: 'o/r' }, plain: { source: 'o/r2' }, ghost: { source: 'o/r3' } }
        })
      )
      assert.throws(() => checkRepoLayout(options), /no real home/)
    })
  })

  it('rejects a real directory clobbering the .agents/skills symlink surface', () => {
    withLayout(options => {
      rmSync(join(options.agentsSkillsDir, 'plain'))
      writeSkill(options.agentsSkillsDir, 'plain')
      assert.throws(() => checkRepoLayout(options), /must be a symlink/)
    })
  })

  it('rejects a dangling or wrongly pointed symlink', () => {
    withLayout(options => {
      rmSync(join(options.agentsSkillsDir, 'demo'))
      symlinkSync('../../skills/nonexistent', join(options.agentsSkillsDir, 'demo'))
      assert.throws(() => checkRepoLayout(options), /dangling symlink/)
      rmSync(join(options.agentsSkillsDir, 'demo'))
      symlinkSync('../skills-vendored/plain', join(options.agentsSkillsDir, 'demo'))
      assert.throws(() => checkRepoLayout(options), /must symlink to the skill's real home/)
    })
  })

  it('rejects a skill missing from the agent instruction surface', () => {
    withLayout(options => {
      rmSync(join(options.agentsSkillsDir, 'plain'))
      assert.throws(() => checkRepoLayout(options), /missing from \.agents\/skills/)
    })
  })

  it('rejects an unexpected loose file in a skill surface directory', () => {
    withLayout(options => {
      writeFileSync(join(options.rootSkillsDir, 'loose.txt'), 'not a skill')
      assert.throws(() => checkRepoLayout(options), /unexpected file "loose\.txt"/)
    })
    withLayout(options => {
      writeFileSync(join(options.vendoredDir, 'loose.txt'), 'not a skill')
      assert.throws(() => checkRepoLayout(options), /unexpected file "loose\.txt"/)
    })
  })

  it('rejects a skill that is both mirrored and vendored', () => {
    withLayout(options => {
      writeSkill(options.vendoredDir, 'dep')
      assert.throws(() => checkRepoLayout(options), /both mirrored and vendored/)
    })
  })

  it('rejects an unregistered skill in the vendored surface', () => {
    withLayout(options => {
      writeSkill(options.vendoredDir, 'homemade')
      assert.throws(() => checkRepoLayout(options), /not registered in skills-lock\.json/)
    })
  })

  it('rejects a malformed skills-lock.json with an actionable message', () => {
    withLayout(options => {
      writeFileSync(options.lockFile, '{not json')
      assert.throws(() => checkRepoLayout(options), /not valid JSON/)
    })
  })
})

describe('parseFrontmatter / parseSiblingSkillLinks', () => {
  it('reads name and description from a frontmatter block', () => {
    assert.deepEqual(parseFrontmatter('---\nname: demo\ndescription: Does things\n---\n\n# body'), {
      name: 'demo',
      description: 'Does things'
    })
  })

  it('returns null without frontmatter', () => {
    assert.equal(parseFrontmatter('# just a heading'), null)
  })

  it('extracts sibling skill dependency links, including anchored forms', () => {
    const content = 'see [herdr](../herdr/SKILL.md), [anchored](../other/SKILL.md#section) and [x](https://example.com)'
    assert.deepEqual(parseSiblingSkillLinks(content), ['herdr', 'other'])
  })
})
