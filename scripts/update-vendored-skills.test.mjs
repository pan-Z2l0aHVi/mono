// reconcileUpdatedSkills 的夹具测试：不跑 CLI（网络），只验证收割逻辑——
// 变更 skill 回真实家、软链刷新、lock 回写、布局不变量在收割后仍然成立。
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
import { join } from 'node:path'

import { checkRepoLayout } from '../packages/ai-skill/scripts/check-skills.mjs'

import { reconcileUpdatedSkills } from './update-vendored-skills.mjs'

const tmpRoot = mkdtempSync(join(tmpdir(), 'update-vendored-'))

// 夹具仓库：skills/ 放自撰 skill 与依赖镜像，skills-vendored/ 放一个普通第三方。
const repoRoot = join(tmpRoot, 'repo')
const skillsDir = join(repoRoot, 'skills')
const vendoredDir = join(repoRoot, '.agents', 'skills-vendored')
const agentsSkillsDir = join(repoRoot, '.agents', 'skills')
mkdirSync(skillsDir, { recursive: true })
mkdirSync(vendoredDir, { recursive: true })
mkdirSync(agentsSkillsDir, { recursive: true })

const writeSkill = (dir, name, body) => {
  mkdirSync(join(dir, name), { recursive: true })
  writeFileSync(join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} skill\n---\n\n${body}\n`)
}

writeSkill(skillsDir, 'demo', 'uses [dep](../dep/SKILL.md)')
writeSkill(skillsDir, 'dep', 'third-party dependency mirror')
writeSkill(vendoredDir, 'plain', 'plain third-party skill')

const lock = {
  version: 1,
  skills: {
    dep: { source: 'someone/dep', sourceType: 'github', computedHash: 'old-dep-hash' },
    plain: { source: 'someone/plain', sourceType: 'github', computedHash: 'plain-hash' }
  }
}
const lockPath = join(repoRoot, 'skills-lock.json')
writeFileSync(lockPath, JSON.stringify(lock, null, 2))

const link = (name, target) => symlinkSync(target, join(agentsSkillsDir, name))
link('demo', '../../skills/demo')
link('dep', '../../skills/dep')
link('plain', '../skills-vendored/plain')

const layoutOptions = () => ({ rootSkillsDir: skillsDir, agentsSkillsDir, vendoredDir, lockFile: lockPath })

// 基线：夹具布局本身合法。
checkRepoLayout(layoutOptions())

// 模拟一次 update：dep 内容变化（hash 更新），plain 未变。
const workspace = join(tmpRoot, 'update-workspace')
mkdirSync(join(workspace, '.agents', 'skills'), { recursive: true })
cpSync(join(skillsDir, 'dep'), join(workspace, '.agents', 'skills', 'dep'), { recursive: true })
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
  repoRoot,
  tmpAgentsSkillsDir: join(workspace, '.agents', 'skills'),
  lockBefore: lock,
  lockAfter
})

// 只有变更项被收割。
assert.deepEqual(changed, ['dep'])
// 镜像内容更新、软链仍解析到真实家。
assert.equal(readFileSync(join(skillsDir, 'dep', 'SKILL.md'), 'utf8').includes('updated body'), true)
assert.equal(realpathSync(join(agentsSkillsDir, 'dep')), realpathSync(join(skillsDir, 'dep')))
// 未变更的 vendored skill 不动，软链完好。
assert.equal(readFileSync(join(vendoredDir, 'plain', 'SKILL.md'), 'utf8').includes('plain third-party'), true)
assert.equal(statSync(join(agentsSkillsDir, 'plain')).isDirectory(), true)
// lock 回写为更新后的内容。
assert.equal(JSON.parse(readFileSync(lockPath, 'utf8')).skills.dep.computedHash, 'new-dep-hash')
// 收割后布局不变量仍成立。
checkRepoLayout(layoutOptions())

// 反例：clobber（update 直写 .agents/skills 留下实体目录）必须被 check 拦下。
rmSync(join(agentsSkillsDir, 'plain'))
cpSync(join(vendoredDir, 'plain'), join(agentsSkillsDir, 'plain'), { recursive: true })
assert.throws(() => checkRepoLayout(layoutOptions()), /must be a symlink/)
rmSync(join(agentsSkillsDir, 'plain'), { recursive: true, force: true })
symlinkSync('../skills-vendored/plain', join(agentsSkillsDir, 'plain'))
checkRepoLayout(layoutOptions())

rmSync(tmpRoot, { recursive: true, force: true })
console.log('scripts/update-vendored-skills.test.mjs: all assertions passed')
