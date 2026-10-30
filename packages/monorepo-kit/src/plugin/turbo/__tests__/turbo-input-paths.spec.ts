import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineTurboInputPaths } from '../turbo-input-paths'

const turboInputPaths = defineTurboInputPaths()

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-turbo-input-paths-'))
let counter = 0

// 一个最小 pnpm workspace：根 turbo.json 加一个包。`deep` 让包落在 apps/nested/deep，
// 用来验证配置集合是从清单派生的，不是只扫容器目录的直接子目录。
function fixture(deep = false): string {
  const root = path.join(tempRoot, `fixture-${counter++}`)
  const packageDir = deep ? 'apps/nested/deep' : 'apps/demo'
  fs.mkdirSync(path.join(root, packageDir), { recursive: true })
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/**'\n`)
  fs.writeFileSync(path.join(root, `${packageDir}/package.json`), JSON.stringify({ name: 'demo', private: true }))
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

// `run` 的返回类型允许 void（检查可以不给细节），断言细节前先把它收成 string。
async function detail(root: string): Promise<string> {
  const value = await turboInputPaths.run({ root })
  assert.ok(typeof value === 'string', 'turbo-input-paths returned no detail')
  return value
}

it('turbo-input-paths', async () => {
  const resolved = fixture()
  touch(resolved, 'packages/kit/index.ts')
  assert.match(
    await detail(
      packageInputs(resolved, [
        '$TURBO_DEFAULT$',
        '$TURBO_ROOT$/packages/kit/index.ts',
        '$TURBO_ROOT$/packages/kit/**/*.ts',
        '!$TURBO_ROOT$/packages/kit/**/*_test.go'
      ])
    ),
    /2 \$TURBO_ROOT\$ input\(s\) in 2 turbo config\(s\) resolve; 1 exclusion\(s\) unchecked/
  )

  const loose = fixture()
  touch(loose, 'mise.toml')
  write(loose, 'turbo.json', { globalDependencies: ['$TURBO_ROOT$/mise.toml'] })
  assert.match(await detail(loose), /1 \$TURBO_ROOT\$ input\(s\) in 1 turbo config\(s\) resolve/)

  const none = packageInputs(fixture(), ['$TURBO_DEFAULT$', '!**/*.md'])
  assert.match(await detail(none), /0 \$TURBO_ROOT\$ input\(s\)/)

  const bare = path.join(tempRoot, 'bare')
  fs.mkdirSync(bare, { recursive: true })
  fs.writeFileSync(path.join(bare, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/**'\n`)
  await assert.rejects(turboInputPaths.run({ root: bare }), /no turbo\.json found/)
})

it('turbo-input-paths fails on inputs that match nothing', async () => {
  const literalMiss = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/index.ts'])
  await assert.rejects(
    turboInputPaths.run({ root: literalMiss }),
    /apps\/demo\/turbo\.json tasks\.test\.inputs\[0\]: \$TURBO_ROOT\$\/packages\/kit\/index\.ts/
  )

  const globMiss = packageInputs(fixture(), ['$TURBO_ROOT$/packages/kit/**/*.go'])
  await assert.rejects(turboInputPaths.run({ root: globMiss }), /packages\/kit\/\*\*\/\*\.go/)

  const emptyTarget = packageInputs(fixture(), ['$TURBO_ROOT$'])
  await assert.rejects(turboInputPaths.run({ root: emptyTarget }), /inputs\[0\]: \$TURBO_ROOT\$\n/)

  const nestedMiss = packageInputs(fixture(true), ['$TURBO_ROOT$/apps/nested/deep/missing.css'], true)
  await assert.rejects(turboInputPaths.run({ root: nestedMiss }), /apps\/nested\/deep\/turbo\.json tasks\.test\.inputs/)

  const exclusionOnly = packageInputs(fixture(), ['!$TURBO_ROOT$/packages/kit/**/*.go'])
  assert.match(
    await detail(exclusionOnly),
    /0 \$TURBO_ROOT\$ input\(s\) in 2 turbo config\(s\) resolve; 1 exclusion\(s\) unchecked/
  )
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
