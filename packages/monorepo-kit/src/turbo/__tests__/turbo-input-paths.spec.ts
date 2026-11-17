import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineTurboInputPaths } from '../turbo-input-paths'

const turboInputPaths = defineTurboInputPaths()

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-turbo-input-paths-'))
let counter = 0

// 判定对 Git 索引做，fixture 必须是真仓库：staged 的文件就是 tracked，`git add` 不需要提交身份。
function git(root: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
}

// 一个最小 pnpm workspace：根 turbo.json 加一个包。`deep` 让包落在 apps/nested/deep，
// 用来验证配置集合是从清单派生的，不是只扫容器目录的直接子目录。
function fixture(deep = false): string {
  const root = path.join(tempRoot, `fixture-${counter++}`)
  const packageDir = deep ? 'apps/nested/deep' : 'apps/demo'
  fs.mkdirSync(path.join(root, packageDir), { recursive: true })
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/**'\n`)
  fs.writeFileSync(path.join(root, `${packageDir}/package.json`), JSON.stringify({ name: 'demo', private: true }))
  git(root, 'init', '--quiet')
  return root
}

function write(root: string, file: string, contents: unknown): void {
  const absolute = path.join(root, file)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, `${JSON.stringify(contents, null, 2)}\n`)
}

function touch(root: string, file: string): void {
  const absolute = path.join(root, file)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, 'export const value = 1\n')
}

// 根配置给空 tasks，包配置给待判的 inputs 清单，让条目计数只由这一处决定。
function packageInputs(root: string, inputs: string[], deep = false): string {
  const packageDir = deep ? 'apps/nested/deep' : 'apps/demo'
  write(root, 'turbo.json', { tasks: {} })
  write(root, `${packageDir}/turbo.json`, { extends: ['//'], tasks: { test: { inputs } } })
  return root
}

function stage(root: string): void {
  git(root, 'add', '--all')
}

// 把已 staged 的文件从磁盘删掉但留在 index 里：稀疏检出对守卫呈现的就是这个状态。
function hide(root: string, file: string): void {
  fs.rmSync(path.join(root, file))
}

function run(root: string) {
  return turboInputPaths.make({ root, env: { ...process.env } }).run()
}

async function failure(root: string): Promise<string> {
  const result = await run(root)
  if (result.ok) assert.fail('expected turbo-input-paths to fail')
  return result.error
}

it('turbo-input-paths', async () => {
  const resolved = fixture()
  touch(resolved, 'packages/kit/index.ts')
  packageInputs(resolved, [
    '$TURBO_DEFAULT$',
    '$TURBO_ROOT$/packages/kit/index.ts',
    '$TURBO_ROOT$/packages/kit/**/*.ts',
    '!$TURBO_ROOT$/packages/kit/**/*_test.go'
  ])
  stage(resolved)
  assert.ok((await run(resolved)).ok)

  const loose = fixture()
  touch(loose, 'mise.toml')
  write(loose, 'turbo.json', { globalDependencies: ['$TURBO_ROOT$/mise.toml'] })
  stage(loose)
  assert.ok((await run(loose)).ok)

  const none = packageInputs(fixture(), ['$TURBO_DEFAULT$', '!**/*.md'])
  stage(none)
  assert.ok((await run(none)).ok)

  const bare = path.join(tempRoot, 'bare')
  fs.mkdirSync(bare, { recursive: true })
  fs.writeFileSync(path.join(bare, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/**'\n`)
  git(bare, 'init', '--quiet')
  assert.match(await failure(bare), /^turbo: no turbo\.json found/)
})

it('turbo-input-paths fails on inputs that match nothing', async () => {
  const literalMiss = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/index.ts'])
  stage(literalMiss)
  assert.match(
    await failure(literalMiss),
    /^turbo: these \$TURBO_ROOT\$ inputs match no tracked file[\s\S]*apps\/demo\/turbo\.json tasks\.test\.inputs\[0\]: \$TURBO_ROOT\$\/packages\/kit\/index\.ts/
  )

  const globMiss = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/**/*.go'])
  stage(globMiss)
  assert.match(
    await failure(globMiss),
    /^turbo: these \$TURBO_ROOT\$ inputs match no tracked file[\s\S]*packages\/kit\/\*\*\/\*\.go/
  )

  const emptyTarget = packageInputs(fixture(), ['$TURBO_ROOT$'])
  stage(emptyTarget)
  assert.match(await failure(emptyTarget), /inputs\[0\]: \$TURBO_ROOT\$\n/)

  const nestedMiss = packageInputs(fixture(true), ['$TURBO_ROOT$/apps/nested/deep/missing.css'], true)
  stage(nestedMiss)
  assert.match(await failure(nestedMiss), /apps\/nested\/deep\/turbo\.json tasks\.test\.inputs/)

  const exclusionOnly = packageInputs(fixture(), ['!$TURBO_ROOT$/packages/kit/**/*.go'])
  stage(exclusionOnly)
  assert.ok((await run(exclusionOnly)).ok)
})

it('turbo-input-paths counts index entries that are missing from disk (sparse checkout)', async () => {
  // 精确路径与 glob 两种形态：staged 后从磁盘删掉，index 里还在，判定必须通过。
  const exact = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/index.ts'])
  touch(exact, 'packages/kit/index.ts')
  stage(exact)
  hide(exact, 'packages/kit/index.ts')
  assert.ok((await run(exact)).ok)

  const globbed = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/**'])
  touch(globbed, 'packages/kit/nested/deep.ts')
  stage(globbed)
  fs.rmSync(path.join(globbed, 'packages/kit'), { recursive: true })
  assert.ok((await run(globbed)).ok)

  // 磁盘上存在但从未 staged 的文件不算 tracked：指向它的输入同样是静默失效链。
  const untracked = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/index.ts'])
  touch(untracked, 'packages/kit/index.ts')
  assert.match(await failure(untracked), /inputs\[0\]: \$TURBO_ROOT\$\/packages\/kit\/index\.ts/)
})

it('turbo-input-paths keeps turbo glob semantics: segments, dots, single chars', async () => {
  // `*` 不跨 `/`：只有嵌套文件时单星模式必须 0 命中。
  const singleStar = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/*.ts'])
  touch(singleStar, 'packages/kit/nested/deep.ts')
  stage(singleStar)
  assert.match(await failure(singleStar), /inputs\[0\]: \$TURBO_ROOT\$\/packages\/kit\/\*\.ts/)

  // `**/` 可匹配零段：`packages/**/index.ts` 命中 `packages/kit/index.ts`。
  const doubleStar = packageInputs(fixture(), ['$TURBO_ROOT$/packages/**/index.ts'])
  touch(doubleStar, 'packages/kit/index.ts')
  stage(doubleStar)
  assert.ok((await run(doubleStar)).ok)

  // `?` 与字符类落在单段内。
  const singleChar = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/a?.ts'])
  touch(singleChar, 'packages/kit/a1.ts')
  stage(singleChar)
  assert.ok((await run(singleChar)).ok)

  const charClass = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/a[0-9].ts'])
  touch(charClass, 'packages/kit/a7.ts')
  stage(charClass)
  assert.ok((await run(charClass)).ok)

  // `dot: true`：点开头的文件同样是输入，`**` 必须命中它。
  const dotfile = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/**'])
  touch(dotfile, 'packages/kit/.hidden.ts')
  stage(dotfile)
  assert.ok((await run(dotfile)).ok)
})

it('turbo-input-paths scans configs of packages hidden from disk', async () => {
  // 整个包 staged 后从磁盘消失（稀疏 cone 外）：它的 turbo.json 从 index 补读，跨界输入仍在射程内。
  const root = fixture()
  touch(root, 'packages/kit/index.ts')
  packageInputs(root, ['$TURBO_ROOT$/packages/kit/index.ts', '$TURBO_ROOT$/packages/kit/missing.css'])
  stage(root)
  fs.rmSync(path.join(root, 'apps/demo'), { recursive: true })
  assert.match(
    await failure(root),
    /apps\/demo\/turbo\.json tasks\.test\.inputs\[1\]: \$TURBO_ROOT\$\/packages\/kit\/missing\.css/
  )
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
