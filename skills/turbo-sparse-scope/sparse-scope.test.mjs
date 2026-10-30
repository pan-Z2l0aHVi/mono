import assert from 'node:assert/strict'

import {
  assertActionAllowed,
  buildCone,
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
// 执行端是根 `test-scripts` 的全仓 glob（`*.test.mjs`，tracked-only）。这里只测纯函数；
// 真实的 git/turbo 行为由 skill 的验收步骤覆盖。

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
