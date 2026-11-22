import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// env-doctor 的两条 mise env 断言（TURBO_CACHE_DIR 必须指向共享缓存、当前 node 必须等于
// .mise.toml 钉住的版本）靠子进程黑盒钉住：只有把它们放在另一个进程里跑，才能自己构造 env。
// 判据不读调用者所在的 shell——CI 把 TURBO_CACHE_DIR 覆盖回 workspace 内路径也不会让用例变红。
// 约定见 docs/agents/worktree.md「mise exec 与命令外壳」。
const root = path.resolve(import.meta.dirname, '../..')

function runDoctor(env, cwd = root) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'maintenance', 'env-doctor.mjs'), '--json'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env }
  })
  assert.notEqual(result.status, null, `env-doctor did not run: ${result.error?.message ?? ''}`)
  return JSON.parse(result.stdout)
}

function entry(report, id) {
  const found = report.find(item => item.id === id)
  assert.ok(found, `env-doctor must report a "${id}" entry`)
  return found
}

const miseConfig = fs.readFileSync(path.join(root, '.mise.toml'), 'utf8')
const pinnedNode = /^\s*node\s*=\s*"([^"]+)"\s*$/m.exec(miseConfig)?.[1]
assert.ok(pinnedNode, '.mise.toml must pin a node version for the node-version assertion to mean anything')

const resolvedCache = spawnSync('sh', [path.join(root, 'scripts', 'lib', 'turbo-cache-dir.sh'), '--root', root], {
  cwd: root,
  encoding: 'utf8'
})
assert.equal(resolvedCache.status, 0, resolvedCache.stderr)
const sharedCache = resolvedCache.stdout.trim()
assert.ok(path.isAbsolute(sharedCache), 'cache helper must return an absolute path')

// 注入了正确值 → ok。缓存目录还不存在也是合法的（第一次 turbo 运行时才创建）。
assert.equal(entry(runDoctor({ TURBO_CACHE_DIR: sharedCache }), 'turbo-cache').level, 'ok')

// 未注入 → fail，这是裸 shell（agent 工具宿主、bash -c、外部脚本）的形态，也是本断言存在的理由。
assert.equal(entry(runDoctor({ TURBO_CACHE_DIR: '' }), 'turbo-cache').level, 'fail')

// 注入了但指向别处 → fail：CI 式的 workspace 内覆盖与 per-worktree 冷缓存都命中这一支。
assert.equal(entry(runDoctor({ TURBO_CACHE_DIR: path.join(root, '.turbo') }), 'turbo-cache').level, 'fail')

// node 版本：判定的期望值随运行本测试的 node 走，任何环境都自洽——裸跑（宿主 node 26）报 fail，
// mise exec 下（钉住的 24.18.0）报 ok，两种都不需要改这份用例。
const expectedNodeLevel = process.version.replace(/^v/, '') === pinnedNode ? 'ok' : 'fail'
assert.equal(entry(runDoctor({}), 'node-version').level, expectedNodeLevel)

// git-hooks 的判定分支由 packages/monorepo-kit/src/git/__tests__/git-hooks-status.spec.ts 覆盖；这里只钉住 env-doctor
// 把它接进了输出，避免测试里重复实现判定逻辑、变成自证式断言。
assert.ok(['ok', 'warn', 'fail'].includes(entry(runDoctor({}), 'git-hooks').level))

// 真实工作区下的 agent-symlinks 体检应通过。
assert.equal(entry(runDoctor({}), 'agent-symlinks').level, 'ok')

// agent-symlinks 必须严格基于调用方 cwd（而非脚本所在仓库），并覆盖各种失效形态。
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'env-doctor-symlinks-'))
let fixtureIndex = 0
function makeSymlinkFixture(customize = () => {}) {
  const fixture = path.join(tempRoot, `fixture-${fixtureIndex++}`)
  fs.mkdirSync(path.join(fixture, '.agents', 'rules'), { recursive: true })
  fs.mkdirSync(path.join(fixture, '.agents', 'skills'), { recursive: true })
  fs.mkdirSync(path.join(fixture, '.claude'), { recursive: true })
  fs.mkdirSync(path.join(fixture, 'skills', 'sample'), { recursive: true })
  fs.writeFileSync(path.join(fixture, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
  fs.writeFileSync(path.join(fixture, '.mise.toml'), `[tools]\nnode = "${pinnedNode}"\n`)
  fs.writeFileSync(path.join(fixture, 'skills', 'sample', 'SKILL.md'), '---\nname: sample\ndescription: demo\n---\n')
  fs.symlinkSync('../.agents/rules', path.join(fixture, '.claude', 'rules'))
  fs.symlinkSync('../.agents/skills', path.join(fixture, '.claude', 'skills'))
  fs.symlinkSync('../../skills/sample', path.join(fixture, '.agents', 'skills', 'sample'))
  // 隐藏文件（如 .DS_Store）应被跳过，不误判为失效 symlink。
  fs.writeFileSync(path.join(fixture, '.agents', 'skills', '.DS_Store'), 'junk')
  customize(fixture)
  return fixture
}

try {
  const validFixture = makeSymlinkFixture()
  const validEntry = entry(runDoctor({}, validFixture), 'agent-symlinks')
  assert.equal(validEntry.level, 'ok', validEntry.detail)

  const missingContext = makeSymlinkFixture(fixture => {
    fs.unlinkSync(path.join(fixture, '.claude', 'rules'))
  })
  const missingContextEntry = entry(runDoctor({}, missingContext), 'agent-symlinks')
  assert.equal(missingContextEntry.level, 'fail')
  assert.match(missingContextEntry.detail, /\.claude\/rules/)

  const dirNotSymlink = makeSymlinkFixture(fixture => {
    fs.unlinkSync(path.join(fixture, '.claude', 'skills'))
    fs.mkdirSync(path.join(fixture, '.claude', 'skills'))
  })
  const dirEntry = entry(runDoctor({}, dirNotSymlink), 'agent-symlinks')
  assert.equal(dirEntry.level, 'fail')
  assert.match(dirEntry.detail, /\.claude\/skills must be a symlink/)

  const wrongTarget = makeSymlinkFixture(fixture => {
    fs.unlinkSync(path.join(fixture, '.claude', 'rules'))
    fs.symlinkSync('../.agents/./rules', path.join(fixture, '.claude', 'rules'))
  })
  const wrongTargetEntry = entry(runDoctor({}, wrongTarget), 'agent-symlinks')
  assert.equal(wrongTargetEntry.level, 'fail')
  assert.match(wrongTargetEntry.detail, /\.claude\/rules targets/)

  const danglingContext = makeSymlinkFixture(fixture => {
    fs.rmSync(path.join(fixture, '.agents', 'rules'), { recursive: true, force: true })
  })
  const danglingContextEntry = entry(runDoctor({}, danglingContext), 'agent-symlinks')
  assert.equal(danglingContextEntry.level, 'fail')
  assert.match(danglingContextEntry.detail, /missing target/)

  const skillRealDir = makeSymlinkFixture(fixture => {
    fs.unlinkSync(path.join(fixture, '.agents', 'skills', 'sample'))
    fs.mkdirSync(path.join(fixture, '.agents', 'skills', 'sample'))
    fs.writeFileSync(path.join(fixture, '.agents', 'skills', 'sample', 'SKILL.md'), 'real dir\n')
  })
  const skillRealDirEntry = entry(runDoctor({}, skillRealDir), 'agent-symlinks')
  assert.equal(skillRealDirEntry.level, 'fail')
  assert.match(skillRealDirEntry.detail, /\.agents\/skills\/sample must be a symlink/)

  const danglingSkill = makeSymlinkFixture(fixture => {
    fs.rmSync(path.join(fixture, 'skills', 'sample'), { recursive: true, force: true })
  })
  const danglingSkillEntry = entry(runDoctor({}, danglingSkill), 'agent-symlinks')
  assert.equal(danglingSkillEntry.level, 'fail')
  assert.match(danglingSkillEntry.detail, /\.agents\/skills\/sample.*missing target/)

  const missingSkillMd = makeSymlinkFixture(fixture => {
    fs.unlinkSync(path.join(fixture, 'skills', 'sample', 'SKILL.md'))
  })
  const missingSkillMdEntry = entry(runDoctor({}, missingSkillMd), 'agent-symlinks')
  assert.equal(missingSkillMdEntry.level, 'fail')
  assert.match(missingSkillMdEntry.detail, /missing reachable SKILL\.md/)

  const missingSkillsDir = makeSymlinkFixture(fixture => {
    fs.rmSync(path.join(fixture, '.agents', 'skills'), { recursive: true, force: true })
  })
  const missingSkillsDirEntry = entry(runDoctor({}, missingSkillsDir), 'agent-symlinks')
  assert.equal(missingSkillsDirEntry.level, 'fail')
  assert.match(missingSkillsDirEntry.detail, /\.agents\/skills/)
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}

console.log('scripts/maintenance/env-doctor.test.mjs: all assertions passed')
