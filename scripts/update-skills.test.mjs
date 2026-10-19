// update-skills.mjs 的测试：收割流程（reconcileUpdatedSkills）与三层布局校验器
// （checkRepoLayout、parseFrontmatter、parseSiblingSkillLinks）同住一个模块，测试也同住这里。
// 不跑 CLI（网络），全部对着临时夹具仓库断言；对真实仓库布局的判定单独一段，防夹具与实态漂移。
import assert from 'node:assert/strict'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { checkRepoLayout, parseFrontmatter, parseSiblingSkillLinks, reconcileUpdatedSkills } from './update-skills.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const agentsSkillsDir = join(repoRoot, '.agents', 'skills')
const lockFile = join(repoRoot, 'skills-lock.json')

const writeSkill = (dir, name, body = `${name} body`) => {
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

// ── checkRepoLayout 对真实仓库状态 ──

const realLayout = checkRepoLayout({
  rootSkillsDir: join(repoRoot, 'skills'),
  agentsSkillsDir,
  vendoredDir: join(repoRoot, '.agents', 'skills-vendored'),
  lockFile
})
assert.deepEqual(realLayout.repoAuthored, ['monorepo-change-impact'])
assert.deepEqual(realLayout.mirrored, [])
assert.deepEqual(realLayout.vendored, ['apple-design', 'emil-design-eng', 'review-animations', 'wizard'])
// skills/ 根的 README.md 是 GitHub 通道的安装说明，必须存在且可读。
assert.match(readFileSync(join(repoRoot, 'skills', 'README.md'), 'utf8'), /npx skills add/)

// ── checkRepoLayout 反例：每条不变量一个 ──

// 无人引用的依赖镜像必须被拒。
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

// 兄弟依赖链接没有镜像。
withLayout(options => {
  writeSkill(options.rootSkillsDir, 'demo', 'uses [missing](../missing/SKILL.md)')
  assert.throws(() => checkRepoLayout(options), /dependency mirror.*not found/)
})

// lock 登记项没有真实家。
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

// 实体目录 clobber 软链面（本仓误跑 skills update 的典型残留）。
withLayout(options => {
  rmSync(join(options.agentsSkillsDir, 'plain'))
  writeSkill(options.agentsSkillsDir, 'plain')
  assert.throws(() => checkRepoLayout(options), /must be a symlink/)
})

// 悬空或指向错误的软链。
withLayout(options => {
  rmSync(join(options.agentsSkillsDir, 'demo'))
  symlinkSync('../../skills/nonexistent', join(options.agentsSkillsDir, 'demo'))
  assert.throws(() => checkRepoLayout(options), /dangling symlink/)
  rmSync(join(options.agentsSkillsDir, 'demo'))
  symlinkSync('../skills-vendored/plain', join(options.agentsSkillsDir, 'demo'))
  assert.throws(() => checkRepoLayout(options), /must symlink to the skill's real home/)
})

// 指令面缺链：每个 skill 都必须出现在 .agents/skills/。
withLayout(options => {
  rmSync(join(options.agentsSkillsDir, 'plain'))
  assert.throws(() => checkRepoLayout(options), /missing from \.agents\/skills/)
})

// skill 目录里的杂散文件（两个表面都查）。
withLayout(options => {
  writeFileSync(join(options.rootSkillsDir, 'loose.txt'), 'not a skill')
  assert.throws(() => checkRepoLayout(options), /unexpected file "loose\.txt"/)
})
withLayout(options => {
  writeFileSync(join(options.vendoredDir, 'loose.txt'), 'not a skill')
  assert.throws(() => checkRepoLayout(options), /unexpected file "loose\.txt"/)
})

// 同时镜像与 vendored：每个 skill 只有一个真实家。
withLayout(options => {
  writeSkill(options.vendoredDir, 'dep')
  assert.throws(() => checkRepoLayout(options), /both mirrored and vendored/)
})

// vendored 面出现未登记 skill。
withLayout(options => {
  writeSkill(options.vendoredDir, 'homemade')
  assert.throws(() => checkRepoLayout(options), /not registered in skills-lock\.json/)
})

// lock 损坏时给出可行动报错。
withLayout(options => {
  writeFileSync(options.lockFile, '{not json')
  assert.throws(() => checkRepoLayout(options), /not valid JSON/)
})

// ── parseFrontmatter / parseSiblingSkillLinks ──

assert.deepEqual(parseFrontmatter('---\nname: demo\ndescription: Does things\n---\n\n# body'), {
  name: 'demo',
  description: 'Does things'
})
assert.equal(parseFrontmatter('# just a heading'), null)
assert.deepEqual(
  parseSiblingSkillLinks(
    'see [herdr](../herdr/SKILL.md), [anchored](../other/SKILL.md#section) and [x](https://example.com)'
  ),
  ['herdr', 'other']
)

// ── reconcileUpdatedSkills：收割流程 ──

const tmpRoot = mkdtempSync(join(tmpdir(), 'update-skills-'))

// 夹具仓库：skills/ 放自撰 skill 与依赖镜像，skills-vendored/ 放一个普通第三方。
const fixtureRoot = join(tmpRoot, 'repo')
const fixtureSkillsDir = join(fixtureRoot, 'skills')
const fixtureVendoredDir = join(fixtureRoot, '.agents', 'skills-vendored')
const fixtureAgentsSkillsDir = join(fixtureRoot, '.agents', 'skills')
mkdirSync(fixtureSkillsDir, { recursive: true })
mkdirSync(fixtureVendoredDir, { recursive: true })
mkdirSync(fixtureAgentsSkillsDir, { recursive: true })

writeSkill(fixtureSkillsDir, 'demo', 'uses [dep](../dep/SKILL.md)')
writeSkill(fixtureSkillsDir, 'dep', 'third-party dependency mirror')
writeSkill(fixtureVendoredDir, 'plain', 'plain third-party skill')

const lock = {
  version: 1,
  skills: {
    dep: { source: 'someone/dep', sourceType: 'github', computedHash: 'old-dep-hash' },
    plain: { source: 'someone/plain', sourceType: 'github', computedHash: 'plain-hash' }
  }
}
const fixtureLockPath = join(fixtureRoot, 'skills-lock.json')
writeFileSync(fixtureLockPath, JSON.stringify(lock, null, 2))

const link = (name, target) => symlinkSync(target, join(fixtureAgentsSkillsDir, name))
link('demo', '../../skills/demo')
link('dep', '../../skills/dep')
link('plain', '../skills-vendored/plain')

const layoutOptions = () => ({
  rootSkillsDir: fixtureSkillsDir,
  agentsSkillsDir: fixtureAgentsSkillsDir,
  vendoredDir: fixtureVendoredDir,
  lockFile: fixtureLockPath
})

// 基线：夹具布局本身合法。
checkRepoLayout(layoutOptions())

// 模拟一次 update：dep 内容变化（hash 更新），plain 未变。
const workspace = join(tmpRoot, 'update-workspace')
mkdirSync(join(workspace, '.agents', 'skills'), { recursive: true })
cpSync(join(fixtureSkillsDir, 'dep'), join(workspace, '.agents', 'skills', 'dep'), { recursive: true })
writeFileSync(
  join(workspace, '.agents', 'skills', 'dep', 'SKILL.md'),
  '---\nname: dep\ndescription: dep skill\n---\n\nupdated body\n'
)
const lockAfter = {
  version: 1,
  skills: {
    dep: { source: 'someone/dep', sourceType: 'github', computedHash: 'new-dep-hash' },
    plain: { source: 'someone/plain', sourceType: 'github', computedHash: 'plain-hash' }
  }
}

const changed = reconcileUpdatedSkills({
  repoRoot: fixtureRoot,
  tmpAgentsSkillsDir: join(workspace, '.agents', 'skills'),
  lockBefore: lock,
  lockAfter
})

// 只有变更项被收割。
assert.deepEqual(changed, ['dep'])
// 镜像内容更新、软链仍解析到真实家。
assert.equal(readFileSync(join(fixtureSkillsDir, 'dep', 'SKILL.md'), 'utf8').includes('updated body'), true)
assert.equal(realpathSync(join(fixtureAgentsSkillsDir, 'dep')), realpathSync(join(fixtureSkillsDir, 'dep')))
// 未变更的 vendored skill 不动，软链完好。
assert.equal(readFileSync(join(fixtureVendoredDir, 'plain', 'SKILL.md'), 'utf8').includes('plain third-party'), true)
assert.equal(statSync(join(fixtureAgentsSkillsDir, 'plain')).isDirectory(), true)
// lock 回写为更新后的内容。
assert.equal(JSON.parse(readFileSync(fixtureLockPath, 'utf8')).skills.dep.computedHash, 'new-dep-hash')
// 收割后布局不变量仍成立。
checkRepoLayout(layoutOptions())

// 反例：clobber（update 直写 .agents/skills 留下实体目录）必须被 check 拦下。
rmSync(join(fixtureAgentsSkillsDir, 'plain'))
cpSync(join(fixtureVendoredDir, 'plain'), join(fixtureAgentsSkillsDir, 'plain'), { recursive: true })
assert.throws(() => checkRepoLayout(layoutOptions()), /must be a symlink/)
rmSync(join(fixtureAgentsSkillsDir, 'plain'), { recursive: true, force: true })
symlinkSync('../skills-vendored/plain', join(fixtureAgentsSkillsDir, 'plain'))
checkRepoLayout(layoutOptions())

rmSync(tmpRoot, { recursive: true, force: true })
console.log('scripts/update-skills.test.mjs: all assertions passed')
