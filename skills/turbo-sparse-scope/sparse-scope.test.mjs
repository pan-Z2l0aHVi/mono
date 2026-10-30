import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  assertActionAllowed,
  buildCone,
  dependencySyncPlan,
  findUnknownTargets,
  isPathInCone,
  listDirtyOutsideCone,
  listHiddenPackages,
  normalizeConePath,
  parseArgs,
  parsePorcelainZ,
  parseTurboLsJson,
  parseTurboLsText,
  resolveTargets,
  validateConfig
} from './sparse-scope.mjs'

// 被测脚本是 turbo-sparse-scope 的内置脚本（只依赖 Node 内置模块），测试与它同住 skill 目录。
// 执行端是根 `test-scripts` 的全仓 glob（`*.test.mjs`，tracked-only）。前半段测纯函数，
// 后半段在临时 git 仓里用假 turbo 跑完整动作，锁住「先恢复全树再算闭包」这条安全契约。

// --- parseArgs ---

assert.deepEqual(parseArgs(['web']), { action: 'set', json: false, dryRun: false, targets: ['web'] })
assert.deepEqual(parseArgs(['web', '--dry-run']), { action: 'set', json: false, dryRun: true, targets: ['web'] })
assert.deepEqual(parseArgs(['a', 'b', '--add', '--json']), { action: 'add', json: true, dryRun: false, targets: ['a', 'b'] })
assert.equal(parseArgs(['a', '--reset']).action, 'reset')
assert.deepEqual(parseArgs(['--status']), { action: 'status', json: false })
assert.deepEqual(parseArgs(['--restore', '--json']), { action: 'restore', json: true })
assert.equal(parseArgs(['--help']).action, 'help')

assert.throws(() => parseArgs([]), /requires at least one target/)
assert.throws(() => parseArgs(['--add']), /--add requires at least one target/)
assert.throws(() => parseArgs(['--add', '--reset', 'a']), /conflicting actions/)
assert.throws(() => parseArgs(['--status', 'web']), /does not accept targets/)
assert.throws(() => parseArgs(['--restore', '--dry-run']), /cannot be combined/)
assert.throws(() => parseArgs(['--status', '--dry-run']), /cannot be combined/)
assert.throws(() => parseArgs(['--nope', 'web']), /unknown argument/)

// --- normalizeConePath ---

assert.equal(normalizeConePath('packages/web-ui'), 'packages/web-ui')
assert.equal(normalizeConePath('./packages/web-ui/'), 'packages/web-ui')
assert.equal(normalizeConePath('  docs  '), 'docs')
assert.throws(() => normalizeConePath('./'), /repo-relative/)
assert.throws(() => normalizeConePath('.'), /repo-relative/)
assert.throws(() => normalizeConePath(''), /empty path/)
assert.throws(() => normalizeConePath('/abs'), /repo-relative/)
assert.throws(() => normalizeConePath('a/../b'), /stay inside/)
assert.throws(() => normalizeConePath('a/./b'), /stay inside/)

// --- validateConfig ---

const config = validateConfig({
  sparseScope: {
    keepDirs: ['scripts', 'docs', './scripts/', '.agents'],
    keepPackages: ['@greypan/monorepo-kit', '@greypan/monorepo-kit']
  }
})
assert.deepEqual(config, {
  keepDirs: ['.agents', 'docs', 'scripts'],
  keepPackages: ['@greypan/monorepo-kit']
})
assert.deepEqual(validateConfig({ sparseScope: { keepDirs: ['docs'] } }).keepPackages, [])
assert.throws(() => validateConfig(null), /JSON object/)
assert.throws(() => validateConfig([]), /JSON object/)
assert.throws(() => validateConfig({}), /missing "sparseScope"/)
assert.throws(() => validateConfig({ sparseScope: { keepDirs: [] } }), /must not be empty/)
assert.throws(() => validateConfig({ sparseScope: { keepDirs: 'docs' } }), /must be an array/)
assert.throws(() => validateConfig({ sparseScope: { keepDirs: [''] } }), /non-empty strings/)
assert.throws(() => validateConfig({ sparseScope: { keepDirs: ['docs'], keepPackages: [1] } }), /non-empty strings/)

// --- turbo ls output ---

const packages = parseTurboLsJson(
  JSON.stringify({
    packageManager: 'pnpm',
    packages: {
      count: 2,
      items: [
        { name: '@greypan/web-ui', path: 'packages/web-ui' },
        { name: '@greypan/js-kit', path: './packages/js-kit/' }
      ]
    }
  })
)
assert.deepEqual(packages, [
  { name: '@greypan/web-ui', path: 'packages/web-ui' },
  { name: '@greypan/js-kit', path: 'packages/js-kit' }
])
assert.throws(() => parseTurboLsJson('not json'), /did not return JSON/)
assert.throws(() => parseTurboLsJson('{"packages":{}}'), /missing packages.items/)
assert.throws(
  () => parseTurboLsJson('{"packages":{"items":[{"name":"x"}]}}'),
  /malformed package entry/
)

assert.deepEqual(
  parseTurboLsText(
    ['2 packages', 'Package  Path', '@greypan/a  apps/a', '', '• @greypan/b  packages/b', 'x No package found'].join('\n')
  ),
  [
    { name: '@greypan/a', path: 'apps/a' },
    { name: '@greypan/b', path: 'packages/b' }
  ]
)
assert.deepEqual(parseTurboLsText('---\nsingle-token-line\n'), [])

// --- 闭包、目标与 cone 路径 ---

const known = [
  { name: '@greypan/web-ui', path: 'packages/web-ui' },
  { name: '@greypan/js-kit', path: 'packages/js-kit' },
  { name: '@greypan/react-demo', path: 'apps/react-demo' }
]

assert.deepEqual(findUnknownTargets(['@greypan/web-ui', 'packages/js-kit', 'nope'], known), ['nope'])
assert.deepEqual(findUnknownTargets(['./packages/js-kit/'], known), [])
assert.deepEqual(
  resolveTargets(['@greypan/web-ui', 'packages/web-ui', './packages/js-kit/'], known),
  [known[0], known[1]]
)
assert.deepEqual(resolveTargets(['nope'], known), [])
assert.deepEqual(buildCone(['b', 'a', 'b', './a/']), ['a', 'b'])

const cone = ['apps/react-demo', 'packages/web-ui']
assert.equal(isPathInCone('monorepo.json', cone), true)
assert.equal(isPathInCone('packages/web-ui/src/index.ts', cone), true)
assert.equal(isPathInCone('apps/react-demo', cone), true)
assert.equal(isPathInCone('packages/js-kit/src/index.ts', cone), false)
assert.equal(isPathInCone('apps/react-demo-extra/x.ts', cone), false)

// --- git status --porcelain -z ---

assert.deepEqual(parsePorcelainZ(' M apps/a/file.ts\0?? docs/new.md\0R  apps/b/renamed.ts\0apps/b/old.ts\0'), [
  'apps/a/file.ts',
  'docs/new.md',
  'apps/b/renamed.ts'
])
assert.deepEqual(parsePorcelainZ(''), [])
assert.deepEqual(listDirtyOutsideCone(['docs/x.md', 'apps/react-demo/y.ts', 'packages/js-kit/z.ts'], cone), [
  'docs/x.md',
  'packages/js-kit/z.ts'
])
assert.deepEqual(
  listHiddenPackages(known, cone).map(pkg => pkg.name),
  ['@greypan/js-kit']
)

// --- 稀疏树上的动作限制 ---

assert.doesNotThrow(() => assertActionAllowed({ sparseCone: null, action: 'set', dryRun: false }))
assert.throws(
  () => assertActionAllowed({ sparseCone: ['apps/a'], action: 'set', dryRun: false }),
  /pass --add to union the new closure or --reset/
)
assert.doesNotThrow(() => assertActionAllowed({ sparseCone: ['apps/a'], action: 'add', dryRun: false }))
assert.doesNotThrow(() => assertActionAllowed({ sparseCone: ['apps/a'], action: 'reset', dryRun: false }))
assert.throws(
  () => assertActionAllowed({ sparseCone: ['apps/a'], action: 'set', dryRun: true }),
  /dry-run needs a full worktree/
)

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

// --- 集成：临时仓 + 假 turbo ---

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'turbo-sparse-scope-'))
const repoRoot = path.join(tmpRoot, 'repo')
const turboBinDir = path.join(tmpRoot, 'bin')
const turboMarker = path.join(tmpRoot, 'turbo-ls-on-sparse.log')
const pnpmMarker = path.join(tmpRoot, 'pnpm-install.log')
const gitConfigFile = path.join(tmpRoot, 'gitconfig')
const scopeScript = path.join(repoRoot, 'skills/turbo-sparse-scope/sparse-scope.mjs')
const scopeSymlink = path.join(repoRoot, '.agents/skills/turbo-sparse-scope/sparse-scope.mjs')

const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: gitConfigFile,
  GIT_CONFIG_SYSTEM: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  FAKE_TURBO_MARKER: turboMarker,
  FAKE_PNPM_MARKER: pnpmMarker,
  PATH: `${turboBinDir}${path.delimiter}${process.env.PATH ?? ''}`
}
// 外层 git hook 或测试运行器可能注入这些变量，把临时仓的 git 调用重定向到别处。
for (const key of [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CEILING_DIRECTORIES',
  'GIT_PREFIX'
])
  delete env[key]

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
  if (result.status === 0)
    return result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .sort()
  assert.match(result.stderr, /not sparse/i)
  return null
}

function runScope(args, { viaSymlink = false } = {}) {
  return spawnSync(process.execPath, [viaSymlink ? scopeSymlink : scopeScript, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env
  })
}

// 假 turbo 按 @scope/a → @scope/lib、@scope/b → @scope/lib 的依赖回答 `ls --filter`；
// @scope/tool → @scope/tool-dep 不被任何目标依赖，只能靠 keepPackages 的传递闭包进入 cone。
// 它在稀疏树上收到 `ls` 就记一行：计算闭包必须发生在恢复全树之后，这条记录为空即契约成立。
const fakeTurbo = [
  '#!/usr/bin/env node',
  "const fs = require('node:fs')",
  "const { spawnSync } = require('node:child_process')",
  'const args = process.argv.slice(2)',
  "if (args.includes('--version')) {",
  "  console.log('9.9.9-fake')",
  '  process.exit(0)',
  '}',
  'const packages = [',
  "  { name: '@scope/a', path: 'apps/a' },",
  "  { name: '@scope/b', path: 'apps/b' },",
  "  { name: '@scope/lib', path: 'packages/lib' },",
  "  { name: '@scope/tool', path: 'packages/tool' },",
  "  { name: '@scope/tool-dep', path: 'packages/tool-dep' }",
  ']',
  "const deps = { '@scope/a': ['@scope/lib'], '@scope/b': ['@scope/lib'], '@scope/lib': [], '@scope/tool': ['@scope/tool-dep'], '@scope/tool-dep': [] }",
  'const filters = []',
  'for (let index = 0; index < args.length; index += 1) {',
  "  if (args[index] === '--filter') filters.push(args[index + 1].replace(/\\.\\.\\.$/, ''))",
  '}',
  "const marker = process.env.FAKE_TURBO_MARKER",
  "const sparse = spawnSync('git', ['sparse-checkout', 'list']).status === 0",
  "if (marker && sparse && args.includes('ls')) fs.appendFileSync(marker, args.join(' ') + '\\n')",
  'const selected = new Set()',
  'for (const name of filters) {',
  '  if (!(name in deps)) {',
  '    console.error("unknown package: " + name)',
  '    process.exit(1)',
  '  }',
  '  selected.add(name)',
  '  for (const dependency of deps[name]) selected.add(dependency)',
  '}',
  'const items = filters.length > 0 ? packages.filter(pkg => selected.has(pkg.name)) : packages',
  'process.stdout.write(JSON.stringify({ packages: { count: items.length, items } }) + "\\n")'
].join('\n')

// 假 pnpm 只关心 `--version` 与 frozen install：前者用于可用性探测，后者记录收缩后是否真的同步了依赖。
const fakePnpm = [
  '#!/usr/bin/env node',
  "const fs = require('node:fs')",
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
  "  if (marker) fs.appendFileSync(marker, args.join(' ') + '\\n')",
  '  process.exit(0)',
  '}',
  "console.error('unexpected pnpm args: ' + args.join(' '))",
  'process.exit(1)'
].join('\n')

try {
  fs.mkdirSync(turboBinDir, { recursive: true })
  fs.writeFileSync(gitConfigFile, '')
  fs.writeFileSync(turboMarker, '')
  fs.writeFileSync(pnpmMarker, '')
  fs.writeFileSync(path.join(turboBinDir, 'turbo'), fakeTurbo, { mode: 0o755 })
  fs.writeFileSync(path.join(turboBinDir, 'pnpm'), fakePnpm, { mode: 0o755 })

  fs.mkdirSync(repoRoot, { recursive: true })
  gitChecked(['-c', 'init.defaultBranch=main', 'init'])
  writeRepoFile(
    'monorepo.json',
    `${JSON.stringify({ sparseScope: { keepDirs: ['scripts', 'skills'], keepPackages: ['@scope/lib', '@scope/tool'] } }, null, 2)}\n`
  )
  writeRepoFile('scripts/check.sh', '#!/bin/sh\necho ok\n')
  writeRepoFile('pnpm-workspace.yaml', 'packages:\n  - apps/*\n  - packages/*\n')
  writeRepoFile('apps/a/src/index.js', 'export const a = 1\n')
  writeRepoFile('apps/b/src/index.js', 'export const b = 1\n')
  writeRepoFile('packages/lib/src/index.js', 'export const lib = 1\n')
  writeRepoFile('packages/tool/src/index.js', 'export const tool = 1\n')
  writeRepoFile('packages/tool-dep/src/index.js', 'export const toolDep = 1\n')
  fs.mkdirSync(path.dirname(scopeScript), { recursive: true })
  fs.copyFileSync(fileURLToPath(new URL('./sparse-scope.mjs', import.meta.url)), scopeScript)
  gitChecked(['add', '.'])
  gitChecked(['-c', 'user.name=Scope Test', '-c', 'user.email=scope@example.com', 'commit', '-m', 'init'])
  fs.mkdirSync(path.dirname(path.join(repoRoot, '.agents/skills/turbo-sparse-scope')), { recursive: true })
  fs.symlinkSync('../../skills/turbo-sparse-scope', path.join(repoRoot, '.agents/skills/turbo-sparse-scope'), 'dir')

  assert.equal(currentCone(), null, 'a fresh worktree is not sparse')

  // 经 .agents/skills 软链调用也要真的执行，而不是被入口判断静默跳过。
  const first = runScope(['@scope/a', '--json'], { viaSymlink: true })
  assert.equal(first.status, 0, first.stderr)
  const firstReport = JSON.parse(first.stdout)
  assert.deepEqual(
    new Set(firstReport.cone),
    new Set(['apps/a', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])
  )
  assert.deepEqual(
    firstReport.hiddenPackages.map(pkg => pkg.name),
    ['@scope/b']
  )
  assert.deepEqual(currentCone(), ['apps/a', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/b/src/index.js')), false)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/src/index.js')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'packages/tool/src/index.js')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'packages/tool-dep/src/index.js')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'scripts/check.sh')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'monorepo.json')), true)
  assert.equal(firstReport.dependencies.status, 'synced')
  assert.deepEqual(fs.readFileSync(pnpmMarker, 'utf8').trim().split('\n'), ['install --frozen-lockfile'])

  const installsBeforeRepeat = fs.readFileSync(pnpmMarker, 'utf8')
  const repeat = runScope(['@scope/b'])
  assert.equal(repeat.status, 2)
  assert.match(repeat.stderr, /already sparse/)
  assert.match(repeat.stderr, /current cone:\napps\/a/)
  assert.deepEqual(currentCone(), ['apps/a', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])
  assert.equal(fs.readFileSync(pnpmMarker, 'utf8'), installsBeforeRepeat, 'a rejected action must not install')

  const added = runScope(['@scope/b', '--add'])
  assert.equal(added.status, 0, added.stderr)
  assert.deepEqual(currentCone(), [
    'apps/a',
    'apps/b',
    'packages/lib',
    'packages/tool',
    'packages/tool-dep',
    'scripts',
    'skills'
  ])

  const reset = runScope(['@scope/b', '--reset'])
  assert.equal(reset.status, 0, reset.stderr)
  assert.deepEqual(currentCone(), ['apps/b', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/src/index.js')), false)

  const status = runScope(['--status', '--json'])
  assert.equal(status.status, 0, status.stderr)
  const statusReport = JSON.parse(status.stdout)
  assert.equal(statusReport.sparse, true)
  assert.equal(statusReport.config.present, true)
  assert.deepEqual(
    [...statusReport.cone].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    ['apps/b', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills']
  )

  // 未知目标要在恢复全树之后才能出现在 turbo 图里；校验失败时必须把上一个 cone 装回去，而不是留下全树。
  const unknown = runScope(['@scope/nope', '--reset'])
  assert.equal(unknown.status, 2)
  assert.match(unknown.stderr, /unknown target\(s\): @scope\/nope/)
  assert.match(unknown.stderr, /note: previous sparse cone restored/)
  assert.doesNotMatch(unknown.stderr, /worktree is now full/)
  assert.deepEqual(currentCone(), ['apps/b', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/src/index.js')), false)

  const restored = runScope(['--restore'])
  assert.equal(restored.status, 0, restored.stderr)
  assert.equal(currentCone(), null)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/src/index.js')), true)

  // 收缩后要靠一次 frozen 安装把 node_modules 对齐到新 workspace 集；dry-run 只报告计划，不执行。
  const installsBeforeDryRun = fs.readFileSync(pnpmMarker, 'utf8')
  const dryRun = runScope(['@scope/a', '--dry-run', '--json'])
  assert.equal(dryRun.status, 0, dryRun.stderr)
  const dryReport = JSON.parse(dryRun.stdout)
  assert.equal(dryReport.dryRun, true)
  assert.deepEqual(dryReport.cone, ['apps/a', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])
  assert.equal(dryReport.dependencies.status, 'would-sync')
  assert.equal(currentCone(), null, 'dry-run does not touch the worktree')
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/b/src/index.js')), true)
  assert.equal(fs.readFileSync(pnpmMarker, 'utf8'), installsBeforeDryRun, 'dry-run must not install')

  // cone 外的未提交文件只告警，不会被删除。
  fs.writeFileSync(path.join(repoRoot, 'apps/a/scratch.txt'), 'draft\n')
  const dirty = runScope(['@scope/b'])
  assert.equal(dirty.status, 0, dirty.stderr)
  assert.match(dirty.stdout, /dirtyOutsideCone:[\s\S]*apps\/a\/scratch\.txt/)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/scratch.txt')), true)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/src/index.js')), false)

  const blocked = runScope(['@scope/a', '--dry-run'])
  assert.equal(blocked.status, 2)
  assert.match(blocked.stderr, /dry-run needs a full worktree/)
  assert.match(blocked.stderr, /current cone:\napps\/b/)

  const restoredAfterDirty = runScope(['--restore'])
  assert.equal(restoredAfterDirty.status, 0, restoredAfterDirty.stderr)
  assert.equal(currentCone(), null)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/src/index.js')), true)

  // 同步依赖失败时也要回到失败前的状态：全树起步就保持全树，稀疏起步就装回旧 cone。
  env.FAKE_PNPM_FAIL_INSTALL = '1'
  const failedFull = runScope(['@scope/a'])
  assert.equal(failedFull.status, 1)
  assert.match(failedFull.stderr, /pnpm install --frozen-lockfile failed/)
  assert.match(failedFull.stderr, /sparse checkout disabled; the worktree is full/)
  assert.equal(currentCone(), null)
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/b/src/index.js')), true)

  delete env.FAKE_PNPM_FAIL_INSTALL
  const reseeded = runScope(['@scope/a'])
  assert.equal(reseeded.status, 0, reseeded.stderr)
  assert.deepEqual(currentCone(), ['apps/a', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])

  env.FAKE_PNPM_FAIL_INSTALL = '1'
  const failedReset = runScope(['@scope/b', '--reset'])
  assert.equal(failedReset.status, 1)
  assert.match(failedReset.stderr, /previous sparse cone restored/)
  assert.doesNotMatch(failedReset.stderr, /worktree is full/)
  assert.deepEqual(currentCone(), ['apps/a', 'packages/lib', 'packages/tool', 'packages/tool-dep', 'scripts', 'skills'])
  assert.equal(fs.existsSync(path.join(repoRoot, 'apps/a/src/index.js')), true)
  delete env.FAKE_PNPM_FAIL_INSTALL

  const restoredAfterFailure = runScope(['--restore'])
  assert.equal(restoredAfterFailure.status, 0, restoredAfterFailure.stderr)
  assert.equal(currentCone(), null)

  const noopRestore = runScope(['--restore', '--json'])
  assert.equal(noopRestore.status, 0, noopRestore.stderr)
  assert.deepEqual(JSON.parse(noopRestore.stdout).previousCone, [])

  const configFile = path.join(repoRoot, 'monorepo.json')
  fs.renameSync(configFile, `${configFile}.bak`)
  const missing = runScope(['@scope/a', '--dry-run'])
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /monorepo\.json not found at the repository root/)
  const statusNoConfig = runScope(['--status', '--json'])
  assert.equal(statusNoConfig.status, 0, statusNoConfig.stderr)
  const noConfigReport = JSON.parse(statusNoConfig.stdout)
  assert.equal(noConfigReport.config.present, false)
  assert.match(noConfigReport.warnings.join('\n'), /monorepo\.json not found/)
  fs.renameSync(`${configFile}.bak`, configFile)

  assert.equal(fs.readFileSync(turboMarker, 'utf8').trim(), '', 'turbo ls must never compute on a sparse tree')
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true })
}
