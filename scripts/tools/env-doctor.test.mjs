import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// env-doctor 的两条 mise env 断言（TURBO_CACHE_DIR 必须指向共享缓存、当前 node 必须等于
// .mise.toml 钉住的版本）靠子进程黑盒钉住：只有把它们放在另一个进程里跑，才能自己构造 env。
// 判据不读调用者所在的 shell——CI 把 TURBO_CACHE_DIR 覆盖回 workspace 内路径也不会让用例变红。
// 约定见 docs/agents/worktree.md「mise exec 与命令外壳」。
const root = path.resolve(import.meta.dirname, '../..')

function runDoctor(env) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'tools', 'env-doctor.mjs'), '--json'], {
    cwd: root,
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

console.log('scripts/tools/env-doctor.test.mjs: all assertions passed')
