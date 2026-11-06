import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineReadmeLocales } from '../readme-locales'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-readme-locales-'))
let fixture = 0

// 译文集合与跳过目录是消费仓库的事实，测试自带一份：这里钉的是 check 的判据，
// 真实取值由 `scripts/policies/readme-locales.mjs` 决定，并由门禁本身的运行来兑现。
const readmeLocales = defineReadmeLocales({
  locales: ['CN'],
  skippedDirectories: ['node_modules', 'dist', '__tests__']
})

function write(root: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), content)
}

function makeFixture(): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  write(root, 'pnpm-workspace.yaml', "packages:\n  - 'packages/**'\n")
  return root
}

function addPackage(
  root: string,
  name: string,
  { privatePackage = false, readme, cn }: { privatePackage?: boolean; readme?: string; cn?: string } = {}
): void {
  write(root, `packages/${name}/package.json`, JSON.stringify({ name: `@greypan/${name}`, private: privatePackage }))
  if (readme !== undefined) write(root, `packages/${name}/README.md`, readme)
  if (cn !== undefined) write(root, `packages/${name}/README.CN.md`, cn)
}

// 只扫磁盘、不 spawn 子进程：env 用 process.env 即可。
type Locales = ReturnType<typeof defineReadmeLocales>

function run(plugin: Locales, root: string) {
  return plugin.make({ root, env: process.env }).run()
}

async function failure(plugin: Locales, root: string): Promise<string> {
  const result = await run(plugin, root)
  if (result.ok) assert.fail('expected readme-locales to fail')
  return result.error
}

it('readme-locales', async () => {
  const valid = makeFixture()
  addPackage(valid, 'pub', { readme: '[简体中文](./README.CN.md)\n', cn: '[English](./README.md)\n' })
  addPackage(valid, 'priv', { privatePackage: true, readme: '# private\n' })
  write(valid, 'packages/priv/__tests__/fixtures/README.md', '# fixture\n')
  assert.ok((await run(readmeLocales, valid)).ok)

  const absolute = makeFixture()
  write(absolute, 'docs/README.md', `[简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/docs/README.CN.md)\n`)
  write(absolute, 'docs/README.CN.md', `[English](https://github.com/pan-Z2l0aHVi/mono/blob/main/docs/README.md)\n`)
  assert.ok((await run(readmeLocales, absolute)).ok)

  const fragments = makeFixture()
  write(fragments, 'README.md', '[简体中文](./README.CN.md#概述 "中文版")\n')
  write(fragments, 'README.CN.md', '[English](./README.md)\n')
  assert.ok((await run(readmeLocales, fragments)).ok)

  const missingLocale = makeFixture()
  addPackage(missingLocale, 'pub', { readme: '# pub\n' })
  assert.match(
    await failure(readmeLocales, missingLocale),
    /^md:[\s\S]*@greypan\/pub: published package is missing README\.CN\.md/
  )

  const missingBase = makeFixture()
  addPackage(missingBase, 'pub', { cn: '[English](./README.md)\n' })
  assert.match(
    await failure(readmeLocales, missingBase),
    /^md:[\s\S]*@greypan\/pub: published package is missing README\.md/
  )

  const missingForward = makeFixture()
  addPackage(missingForward, 'pub', { readme: '# pub\n', cn: '[English](./README.md)\n' })
  assert.match(
    await failure(readmeLocales, missingForward),
    /^md:[\s\S]*packages\/pub\/README\.md: no link to packages\/pub\/README\.CN\.md/
  )

  const missingBack = makeFixture()
  addPackage(missingBack, 'pub', { readme: '[简体中文](./README.CN.md)\n', cn: '# 中文\n' })
  assert.match(
    await failure(readmeLocales, missingBack),
    /^md:[\s\S]*packages\/pub\/README\.CN\.md: no link to packages\/pub\/README\.md/
  )

  const wrongTarget = makeFixture()
  addPackage(wrongTarget, 'pub', {
    readme: '[简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/other/README.CN.md)\n',
    cn: '[English](./README.md)\n'
  })
  assert.match(
    await failure(readmeLocales, wrongTarget),
    /^md:[\s\S]*README\.md: no link to packages\/pub\/README\.CN\.md/
  )

  const orphan = makeFixture()
  write(orphan, 'docs/README.CN.md', '# 中文\n')
  assert.match(
    await failure(readmeLocales, orphan),
    /^md:[\s\S]*docs\/README\.CN\.md: no docs\/README\.md to translate/
  )

  const externalOnly = makeFixture()
  write(externalOnly, 'README.md', '[文档](https://example.com/README.CN.md)\n')
  write(externalOnly, 'README.CN.md', '[docs](https://example.com/README.md)\n')
  assert.match(await failure(readmeLocales, externalOnly), /^md:[\s\S]*no link to README\.CN\.md/)
})

it('readme-locales options drive locales and skipped directories', async () => {
  const readmeJp = defineReadmeLocales({ locales: ['JP'], skippedDirectories: ['fixtures'] })
  const root = makeFixture()
  write(root, 'packages/pub/package.json', JSON.stringify({ name: '@greypan/pub' }))
  write(root, 'packages/pub/README.md', '[日本語](./README.JP.md)\n')
  write(root, 'packages/pub/README.JP.md', '[English](./README.md)\n')
  write(root, 'packages/pub/fixtures/README.JP.md', '# 夹具里的译文，没有主版\n')
  assert.ok((await run(readmeJp, root)).ok)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
