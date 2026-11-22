import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildCone,
  compareCone,
  computeAppsCone,
  dependencySyncPlan,
  filterKeptRootDirs,
  isPathInCone,
  listDirtyOutsideCone,
  listHiddenApps,
  normalizeAppName,
  normalizeConePath,
  parseArgs,
  parsePorcelainZ,
  resolveAppTargets
} from './sparse-checkout.mjs'

// 被测脚本是 apps-sparse-checkout 的自包含内置脚本（只依赖 Node 内置模块），测试与它同住 skill 目录。
// 执行端是根 `test-scripts` 的全仓 glob（`*.test.mjs`，tracked-only）。前半段测纯函数，
// 后半段在临时 git 仓里（无 turbo，带假 pnpm）跑完整动作与失败回滚。

// --- parseArgs ---

assert.deepEqual(parseArgs(['--app', 'react-web-ui-demo']), {
  action: 'app',
  json: false,
  dryRun: false,
  apps: ['react-web-ui-demo']
})
assert.deepEqual(parseArgs(['--app', 'interweave', 'react-web-ui-demo', '--dry-run', '--json']), {
  action: 'app',
  json: true,
  dryRun: true,
  apps: ['interweave', 'react-web-ui-demo']
})
assert.deepEqual(parseArgs(['--app', 'a', '--app=b']), {
  action: 'app',
  json: false,
  dryRun: false,
  apps: ['a', 'b']
})
assert.deepEqual(parseArgs(['--app', 'a', '--check', '--json']), {
  action: 'check',
  json: true,
  dryRun: false,
  apps: ['a']
})
assert.deepEqual(parseArgs(['--status']), { action: 'status', json: false })
assert.deepEqual(parseArgs(['--restore', '--json']), { action: 'restore', json: true })
assert.equal(parseArgs(['--help']).action, 'help')
assert.equal(parseArgs(['-h']).action, 'help')

assert.throws(() => parseArgs([]), /missing action/)
assert.throws(() => parseArgs(['--app']), /--app requires at least one app directory name/)
assert.throws(() => parseArgs(['--app', '--json']), /--app requires at least one app directory name/)
assert.throws(() => parseArgs(['--app=']), /--app requires at least one app directory name/)
assert.throws(() => parseArgs(['react-web-ui-demo']), /unexpected positional argument/)
assert.throws(() => parseArgs(['--check']), /--check requires --app/)
assert.throws(() => parseArgs(['--status', '--restore']), /conflicting actions/)
assert.throws(() => parseArgs(['--status', '--app', 'a']), /--app cannot be combined with --status/)
assert.throws(() => parseArgs(['--restore', '--check']), /--check cannot be combined with --restore/)
assert.throws(() => parseArgs(['--restore', '--dry-run']), /--dry-run cannot be combined with --restore/)
assert.throws(() => parseArgs(['--status', '--dry-run']), /--dry-run cannot be combined with --status/)
assert.throws(() => parseArgs(['--app', 'a', '--check', '--dry-run']), /--dry-run cannot be combined with --check/)
assert.throws(() => parseArgs(['--nope']), /unknown argument/)

// --- normalizeAppName & resolveAppTargets ---

assert.equal(normalizeAppName('interweave'), 'interweave')
assert.equal(normalizeAppName('  react-web-ui-demo  '), 'react-web-ui-demo')
assert.throws(() => normalizeAppName(''), /must not be empty/)
assert.throws(() => normalizeAppName('.'), /invalid app directory name/)
assert.throws(() => normalizeAppName('..'), /invalid app directory name/)
assert.throws(() => normalizeAppName('apps/interweave'), /invalid app directory name/)
assert.throws(() => normalizeAppName('./interweave'), /invalid app directory name/)
assert.throws(() => normalizeAppName('interweave/'), /invalid app directory name/)
assert.throws(() => normalizeAppName('interweave/frontend'), /invalid app directory name/)
assert.throws(() => normalizeAppName('../packages'), /invalid app directory name/)
assert.throws(() => normalizeAppName('a\\b'), /invalid app directory name/)

assert.deepEqual(
  resolveAppTargets(['interweave', 'react-web-ui-demo', 'interweave'], ['interweave', 'react-web-ui-demo', 'vue-web-ui-demo']),
  ['interweave', 'react-web-ui-demo']
)
assert.throws(() => resolveAppTargets(['missing-app'], ['interweave']), /unknown app directory under apps\/: missing-app/)
assert.throws(
  () => resolveAppTargets(['anything'], []),
  error => /unknown app directory under apps\/: anything/.test(error.message) && /known apps:\n  \(none\)/.test(error.detail)
)

// --- normalizeConePath, filterKeptRootDirs & computeAppsCone ---

assert.equal(normalizeConePath('packages/web-ui'), 'packages/web-ui')
assert.equal(normalizeConePath('./packages/web-ui/'), 'packages/web-ui')
assert.equal(normalizeConePath('  docs  '), 'docs')
assert.throws(() => normalizeConePath('./'), /repo-relative/)
assert.throws(() => normalizeConePath('.'), /repo-relative/)
assert.throws(() => normalizeConePath(''), /empty path/)
assert.throws(() => normalizeConePath('/abs'), /repo-relative/)
assert.throws(() => normalizeConePath('a/../b'), /stay inside/)
assert.throws(() => normalizeConePath('a/./b'), /stay inside/)

assert.deepEqual(
  filterKeptRootDirs(['.agents', '.github', 'apps', 'docs', 'packages', 'scripts', 'skills']),
  ['.agents', '.github', 'docs', 'packages', 'scripts', 'skills']
)
assert.deepEqual(
  computeAppsCone(['apps', 'docs', 'packages', 'scripts', 'skills'], ['react-web-ui-demo']),
  ['apps/react-web-ui-demo', 'docs', 'packages', 'scripts', 'skills']
)
assert.deepEqual(buildCone(['b', 'a', 'b', './a/']), ['a', 'b'])

const cone = ['apps/react-demo', 'packages']
assert.equal(isPathInCone('turbo.json', cone), true)
assert.equal(isPathInCone('packages/web-ui/src/index.ts', cone), true)
assert.equal(isPathInCone('apps/react-demo/src/main.ts', cone), true)
assert.equal(isPathInCone('apps/vue-demo/src/main.ts', cone), false)
assert.equal(isPathInCone('apps/react-demo-extra/x.ts', cone), false)

// --- compareCone ---

assert.deepEqual(compareCone(['apps/a', 'packages'], ['packages', 'apps/a', 'apps/a']), {
  matches: true,
  current: ['apps/a', 'packages'],
  expected: ['apps/a', 'packages'],
  missing: [],
  extra: []
})
assert.equal(compareCone(['./apps/a/'], ['apps/a']).matches, true)
assert.deepEqual(compareCone(['apps/a'], ['apps/a', 'packages']).missing, ['packages'])
assert.deepEqual(compareCone(['apps/a', 'apps/b'], ['apps/a']).extra, ['apps/b'])

// --- git status --porcelain -z & helpers ---

assert.deepEqual(parsePorcelainZ(' M apps/a/file.ts\0?? docs/new.md\0R  apps/b/renamed.ts\0apps/b/old.ts\0'), [
  'apps/a/file.ts',
  'docs/new.md',
  'apps/b/renamed.ts'
])
assert.deepEqual(parsePorcelainZ(''), [])
assert.deepEqual(listDirtyOutsideCone(['docs/x.md', 'apps/react-demo/y.ts', 'apps/vue-demo/z.ts'], ['apps/react-demo', 'docs', 'packages']), [
  'apps/vue-demo/z.ts'
])
assert.deepEqual(listHiddenApps(['interweave', 'react-demo', 'vue-demo'], ['react-demo']), ['interweave', 'vue-demo'])

// --- 依赖同步计划 ---

assert.deepEqual(dependencySyncPlan({ hasWorkspaceFile: true, pnpmAvailable: true }), { mode: 'sync' })
assert.deepEqual(dependencySyncPlan({ hasWorkspaceFile: false, pnpmAvailable: true }), {
  mode: 'skip',
  reason: 'no pnpm-workspace.yaml at the repository root'
})
assert.deepEqual(dependencySyncPlan({ hasWorkspaceFile: true, pnpmAvailable: false }), {
  mode: 'skip',
  reason: 'pnpm is not available on PATH'
})

// --- 集成：临时 git 仓（无 turbo，仅假 pnpm） ---

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apps-sparse-checkout-'))
const repoRoot = path.join(tmpRoot, 'repo')
const binDir = path.join(tmpRoot, 'bin')
const pnpmMarker = path.join(tmpRoot, 'pnpm-install.log')
const gitConfigFile = path.join(tmpRoot, 'gitconfig')
const scriptPath = path.join(repoRoot, 'skills/apps-sparse-checkout/sparse-checkout.mjs')
const symlinkPath = path.join(repoRoot, '.agents/skills/apps-sparse-checkout/sparse-checkout.mjs')

const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: gitConfigFile,
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  FAKE_PNPM_MARKER: pnpmMarker,
  PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`
}
for (const key of [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CEILING_DIRECTORIES',
  'GIT_PREFIX'
]) {
  delete env[key]
}

function writeRepoFile(relativePath, content) {
  const file = path.join(repoRoot, relativePath)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function git(args) {
  return spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', env })
}

function gitChecked(args) {
  const result = git(args)
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout
}

function currentCone() {
  const result = git(['sparse-checkout', 'list'])
  if (result.status === 0) {
    return result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .sort()
  }
  assert.match(result.stderr, /not sparse/i)
  return null
}

function runCli(args, { viaSymlink = false, customEnv = env } = {}) {
  return spawnSync(process.execPath, [viaSymlink ? symlinkPath : scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: customEnv
  })
}

const fakePnpm = [
  '#!/usr/bin/env node',
  "const fs = require('node:fs')",
  "const { spawnSync } = require('node:child_process')",
  'const args = process.argv.slice(2)',
  "if (args[0] === '--version') {",
  "  console.log('12.4.0-fake')",
  '  process.exit(0)',
  '}',
  "if (args[0] === 'install') {",
  "  if (process.env.FAKE_PNPM_FAIL_INSTALL === '1') {",
  "    console.error('fake pnpm: frozen install failed')",
  '    process.exit(1)',
  '  }',
  '  const marker = process.env.FAKE_PNPM_MARKER',
  "  const state = spawnSync('git', ['sparse-checkout', 'list'], { encoding: 'utf8' }).status === 0 ? 'sparse' : 'full'",
  "  if (marker) fs.appendFileSync(marker, args.join(' ') + ' ' + state + '\\n')",
  '  process.exit(0)',
  '}',
  "console.error('unexpected pnpm args: ' + args.join(' '))",
  'process.exit(1)'
].join('\n')

try {
  fs.mkdirSync(binDir, { recursive: true })
  fs.writeFileSync(gitConfigFile, '')
  fs.writeFileSync(pnpmMarker, '')
  fs.writeFileSync(path.join(binDir, 'pnpm'), fakePnpm, { mode: 0o755 })

  fs.mkdirSync(repoRoot, { recursive: true })
  gitChecked(['-c', 'init.defaultBranch=main', 'init'])
  writeRepoFile('package.json', '{"name":"fixture","private":true}\n')
  writeRepoFile('turbo.json', '{"tasks":{}}\n')
  writeRepoFile('pnpm-workspace.yaml', 'packages:\n  - apps/**\n  - packages/**\n')
  writeRepoFile('docs/guide.md', '# guide\n')
  writeRepoFile('scripts/check.sh', '#!/bin/sh\necho ok\n')
  writeRepoFile('apps/interweave/main.go', 'package main\n')
  writeRepoFile('apps/interweave/frontend/src/index.ts', 'export const iw = 1\n')
  writeRepoFile('apps/react-web-ui-demo/src/index.js', 'export const react = 1\n')
  writeRepoFile('apps/vue-web-ui-demo/src/index.js', 'export const vue = 1\n')
  writeRepoFile('packages/lib/src/index.js', 'export const lib = 1\n')
  writeRepoFile('packages/tool/src/index.js', 'export const tool = 1\n')
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true })
  fs.copyFileSync(fileURLToPath(new URL('./sparse-checkout.mjs', import.meta.url)), scriptPath)
  gitChecked(['add', '.'])
  gitChecked(['-c', 'user.name=Sparse Test', '-c', 'user.email=sparse@example.com', 'commit', '-m', 'init'])
  fs.mkdirSync(path.dirname(path.join(repoRoot, '.agents/skills/apps-sparse-checkout')), { recursive: true })
  fs.symlinkSync('../../skills/apps-sparse-checkout', path.join(repoRoot, '.agents/skills/apps-sparse-checkout'), 'dir')

  assert.equal(currentCone(), null, 'a fresh worktree is not sparse')

  const expectedReact = ['apps/react-web-ui-demo', 'docs', 'packages', 'scripts', 'skills']
  const expectedVue = ['apps/vue-web-ui-demo', 'docs', 'packages', 'scripts', 'skills']
  const expectedInterweave = ['apps/interweave', 'docs', 'packages', 'scripts', 'skills']

  // --help 输出用法并 exit 0。
  const help = runCli(['--help'])
  assert.equal(help.status, 0, help.stderr)
  assert.match(help.stdout, /--app <dir-name>\.\.\./)

  // 经 .agents/skills 软链调用并收缩到 react-web-ui-demo：packages/ 与根目录全部全量保留。
  const first = runCli(['--app', 'react-web-ui-demo', '--json'], { viaSymlink: true })
  assert.equal(first.status, 0, first.stderr)
  const firstReport = JSON.parse(first.stdout)
  assert.deepEqual(firstReport.apps, ['react-web-ui-demo'])
  assert.deepEqual(firstReport.knownApps, ['interweave', 'react-web-ui-demo', 'vue-web-ui-demo'])
  assert.deepEqual(firstReport.hiddenApps, ['interweave', 'vue-web-ui-demo'])
  assert.deepEqual(firstReport.rootEntries, ['docs', 'packages', 'scripts', 'skills'])
  assert.deepEqual(firstReport.cone, expectedReact)
  assert.equal(firstReport.dependencies.status, 'synced')
  assert.deepEqual(currentCone(), expectedReact)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/react-web-ui-demo/src/index.js')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/vue-web-ui-demo/src/index.js')), false)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/interweave/frontend/src/index.ts')), false)
  assert.equal(fs.existsSync(path.join(repoRoot, 'packages/lib/src/index.js')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'packages/tool/src/index.js')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs/guide.md')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'scripts/check.sh')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'turbo.json')), true)
  assert.deepEqual(fs.readFileSync(pnpmMarker, 'utf8').trim().split('\n'), ['install --frozen-lockfile sparse'])

  // 已稀疏态下直接调用 --app 幂等切换目标 App，无需先 --restore 或额外 flag。
  const switched = runCli(['--app', 'vue-web-ui-demo', '--json'])
  assert.equal(switched.status, 0, switched.stderr)
  assert.deepEqual(currentCone(), expectedVue)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/vue-web-ui-demo/src/index.js')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/react-web-ui-demo/src/index.js')), false)
  assert.equal(fs.existsSync(path.join(repoRoot, 'packages/lib/src/index.js')), true)

  // 重复调用相同 --app 幂等通过。
  const idempotent = runCli(['--app', 'vue-web-ui-demo', '--json'])
  assert.equal(idempotent.status, 0, idempotent.stderr)
  assert.deepEqual(currentCone(), expectedVue)

  // 切换到含嵌套前端的 interweave：保留 apps/interweave 整棵子树。
  const interweave = runCli(['--app', 'interweave', '--json'])
  assert.equal(interweave.status, 0, interweave.stderr)
  assert.deepEqual(currentCone(), expectedInterweave)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/interweave/main.go')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/interweave/frontend/src/index.ts')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/vue-web-ui-demo/src/index.js')), false)

  // --status 只读报告当前状态。
  const status = runCli(['--status', '--json'])
  assert.equal(status.status, 0, status.stderr)
  const statusReport = JSON.parse(status.stdout)
  assert.equal(statusReport.sparse, true)
  assert.equal(statusReport.coneMode, 'cone')
  assert.deepEqual(statusReport.visibleApps, ['interweave'])
  assert.deepEqual(statusReport.hiddenApps, ['react-web-ui-demo', 'vue-web-ui-demo'])
  assert.deepEqual(statusReport.cone, expectedInterweave)

  // 稀疏态下校验错误或路径穿越：exit 2，stderr 带 apps-sparse-checkout: 前缀，原 cone 保持不变。
  const badTarget = runCli(['--app', 'nonexistent'])
  assert.equal(badTarget.status, 2)
  assert.match(badTarget.stderr, /^apps-sparse-checkout: unknown app directory under apps\/: nonexistent/)
  assert.deepEqual(currentCone(), expectedInterweave)

  const traversal = runCli(['--app', '../packages'])
  assert.equal(traversal.status, 2)
  assert.match(traversal.stderr, /^apps-sparse-checkout: invalid app directory name/)
  assert.deepEqual(currentCone(), expectedInterweave)

  // --check 在稀疏态下校验一致（0）与漂移（1），且不触发 install。
  const installsBeforeCheck = fs.readFileSync(pnpmMarker, 'utf8')
  const checkOk = runCli(['--app', 'interweave', '--check', '--json'])
  assert.equal(checkOk.status, 0, checkOk.stderr)
  assert.equal(JSON.parse(checkOk.stdout).matches, true)
  const checkDrift = runCli(['--app', 'react-web-ui-demo', '--check', '--json'])
  assert.equal(checkDrift.status, 1)
  const driftReport = JSON.parse(checkDrift.stdout)
  assert.equal(driftReport.matches, false)
  assert.deepEqual(driftReport.missing, ['apps/react-web-ui-demo'])
  assert.deepEqual(driftReport.extra, ['apps/interweave'])
  assert.equal(fs.readFileSync(pnpmMarker, 'utf8'), installsBeforeCheck)

  // --dry-run 在稀疏态和全树下都能预览，不修改工作区也不跑 install。
  const drySparse = runCli(['--app', 'react-web-ui-demo', '--dry-run', '--json'])
  assert.equal(drySparse.status, 0, drySparse.stderr)
  const drySparseReport = JSON.parse(drySparse.stdout)
  assert.equal(drySparseReport.dryRun, true)
  assert.deepEqual(drySparseReport.cone, expectedReact)
  assert.equal(drySparseReport.dependencies.status, 'would-sync')
  assert.deepEqual(currentCone(), expectedInterweave)
  assert.equal(fs.readFileSync(pnpmMarker, 'utf8'), installsBeforeCheck)

  // cone 外的未提交文件只告警，不被删除。
  fs.writeFileSync(path.join(repoRoot, 'apps/interweave/scratch.txt'), 'draft\n')
  const dirty = runCli(['--app', 'react-web-ui-demo'])
  assert.equal(dirty.status, 0, dirty.stderr)
  assert.match(dirty.stdout, /dirtyOutsideCone:[\s\S]*apps\/interweave\/scratch\.txt/)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/interweave/scratch.txt')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/interweave/main.go')), false)

  // --restore 恢复全树并执行 pnpm install --frozen-lockfile。
  const installsBeforeRestore = fs.readFileSync(pnpmMarker, 'utf8').trim().split('\n').length
  const restored = runCli(['--restore', '--json'])
  assert.equal(restored.status, 0, restored.stderr)
  const restoreReport = JSON.parse(restored.stdout)
  assert.equal(restoreReport.sparse, false)
  assert.deepEqual(restoreReport.previousCone, expectedReact)
  assert.equal(restoreReport.dependencies.status, 'synced')
  assert.equal(currentCone(), null)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/interweave/main.go')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/vue-web-ui-demo/src/index.js')), true)
  const allInstalls = fs.readFileSync(pnpmMarker, 'utf8').trim().split('\n')
  assert.equal(allInstalls.length, installsBeforeRestore + 1)
  assert.equal(allInstalls.at(-1), 'install --frozen-lockfile full')

  // 已全树时再次 --restore 是幂等 no-op，不再重复 install。
  const noopRestore = runCli(['--restore', '--json'])
  assert.equal(noopRestore.status, 0, noopRestore.stderr)
  assert.deepEqual(JSON.parse(noopRestore.stdout).previousCone, [])
  assert.equal(fs.readFileSync(pnpmMarker, 'utf8').trim().split('\n').length, allInstalls.length)

  // 多选所有 App 时告警不会隐藏任何 App。
  const allApps = runCli(['--app', 'interweave', 'react-web-ui-demo', 'vue-web-ui-demo', '--json'])
  assert.equal(allApps.status, 0, allApps.stderr)
  const allAppsReport = JSON.parse(allApps.stdout)
  assert.deepEqual(allAppsReport.hiddenApps, [])
  assert.match(allAppsReport.warnings.join('\n'), /no app would be hidden/)
  assert.equal(runCli(['--restore']).status, 0)

  // 非 cone 稀疏态诊断：--status 与 --check 均报出 non-cone 告警。
  gitChecked(['sparse-checkout', 'init', '--no-cone'])
  const nonConeStatus = runCli(['--status', '--json'])
  assert.equal(nonConeStatus.status, 0, nonConeStatus.stderr)
  assert.equal(JSON.parse(nonConeStatus.stdout).coneMode, 'non-cone')
  assert.match(JSON.parse(nonConeStatus.stdout).warnings.join('\n'), /non-cone sparse mode/)
  const nonConeCheck = runCli(['--app', 'react-web-ui-demo', '--check', '--json'])
  assert.equal(nonConeCheck.status, 1)
  assert.equal(JSON.parse(nonConeCheck.stdout).matches, false)
  assert.equal(runCli(['--app', 'react-web-ui-demo']).status, 0, '--app repairs non-cone back to cone mode')
  assert.equal(runCli(['--restore']).status, 0)

  // 依赖同步失败时回滚到进入前状态：全树起步回全树，稀疏起步恢复原 cone；--restore 时保持全树并提示依赖可能陈旧。
  env.FAKE_PNPM_FAIL_INSTALL = '1'
  const failFromFull = runCli(['--app', 'react-web-ui-demo'])
  assert.equal(failFromFull.status, 1)
  assert.match(failFromFull.stderr, /^apps-sparse-checkout: pnpm install --frozen-lockfile failed/)
  assert.match(failFromFull.stderr, /sparse checkout disabled; the worktree is full/)
  assert.equal(currentCone(), null)

  delete env.FAKE_PNPM_FAIL_INSTALL
  assert.equal(runCli(['--app', 'react-web-ui-demo']).status, 0)
  env.FAKE_PNPM_FAIL_INSTALL = '1'
  const failFromSparse = runCli(['--app', 'vue-web-ui-demo'])
  assert.equal(failFromSparse.status, 1)
  assert.match(failFromSparse.stderr, /note: previous sparse cone restored/)
  assert.deepEqual(currentCone(), expectedReact)

  const failOnRestore = runCli(['--restore'])
  assert.equal(failOnRestore.status, 1)
  assert.match(failOnRestore.stderr, /note: sparse checkout disabled; the worktree is full/)
  assert.match(failOnRestore.stderr, /dependencies may be stale; run pnpm install --frozen-lockfile/)
  assert.equal(currentCone(), null)
  delete env.FAKE_PNPM_FAIL_INSTALL

  // 缺少 pnpm-workspace.yaml 时跳过依赖同步并告警，cone 照常生效。
  const workspaceFile = path.join(repoRoot, 'pnpm-workspace.yaml')
  fs.renameSync(workspaceFile, `${workspaceFile}.bak`)
  const installsBeforeSkip = fs.readFileSync(pnpmMarker, 'utf8')
  const skipped = runCli(['--app', 'vue-web-ui-demo', '--json'])
  assert.equal(skipped.status, 0, skipped.stderr)
  const skippedReport = JSON.parse(skipped.stdout)
  assert.deepEqual(skippedReport.dependencies, {
    status: 'skipped',
    reason: 'no pnpm-workspace.yaml at the repository root'
  })
  assert.match(skippedReport.warnings.join('\n'), /dependencies were not synced/)
  assert.equal(fs.readFileSync(pnpmMarker, 'utf8'), installsBeforeSkip)
  fs.renameSync(`${workspaceFile}.bak`, workspaceFile)
  assert.equal(runCli(['--restore']).status, 0)
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
}

console.log('skills/apps-sparse-checkout/sparse-checkout.test.mjs: all assertions passed')
