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

async function detail(result: Promise<string | void>): Promise<string> {
  const value = await result
  assert.ok(value, 'readme-locales returned no detail')
  return value
}

it('readme-locales', async () => {
  const valid = makeFixture()
  addPackage(valid, 'pub', { readme: '[简体中文](./README.CN.md)\n', cn: '[English](./README.md)\n' })
  addPackage(valid, 'priv', { privatePackage: true, readme: '# private\n' })
  write(valid, 'packages/priv/__tests__/fixtures/README.md', '# fixture\n')
  assert.match(
    await detail(readmeLocales.run({ root: valid })),
    /1 bilingual README pair\(s\), 1 published package\(s\)/
  )

  const absolute = makeFixture()
  write(absolute, 'docs/README.md', `[简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/docs/README.CN.md)\n`)
  write(absolute, 'docs/README.CN.md', `[English](https://github.com/pan-Z2l0aHVi/mono/blob/main/docs/README.md)\n`)
  await readmeLocales.run({ root: absolute })

  const fragments = makeFixture()
  write(fragments, 'README.md', '[简体中文](./README.CN.md#概述 "中文版")\n')
  write(fragments, 'README.CN.md', '[English](./README.md)\n')
  await readmeLocales.run({ root: fragments })

  const missingLocale = makeFixture()
  addPackage(missingLocale, 'pub', { readme: '# pub\n' })
  await assert.rejects(
    readmeLocales.run({ root: missingLocale }),
    /@greypan\/pub: published package is missing README\.CN\.md/
  )

  const missingBase = makeFixture()
  addPackage(missingBase, 'pub', { cn: '[English](./README.md)\n' })
  await assert.rejects(
    readmeLocales.run({ root: missingBase }),
    /@greypan\/pub: published package is missing README\.md/
  )

  const missingForward = makeFixture()
  addPackage(missingForward, 'pub', { readme: '# pub\n', cn: '[English](./README.md)\n' })
  await assert.rejects(
    readmeLocales.run({ root: missingForward }),
    /packages\/pub\/README\.md: no link to packages\/pub\/README\.CN\.md/
  )

  const missingBack = makeFixture()
  addPackage(missingBack, 'pub', { readme: '[简体中文](./README.CN.md)\n', cn: '# 中文\n' })
  await assert.rejects(
    readmeLocales.run({ root: missingBack }),
    /packages\/pub\/README\.CN\.md: no link to packages\/pub\/README\.md/
  )

  const wrongTarget = makeFixture()
  addPackage(wrongTarget, 'pub', {
    readme: '[简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/other/README.CN.md)\n',
    cn: '[English](./README.md)\n'
  })
  await assert.rejects(readmeLocales.run({ root: wrongTarget }), /README\.md: no link to packages\/pub\/README\.CN\.md/)

  const orphan = makeFixture()
  write(orphan, 'docs/README.CN.md', '# 中文\n')
  await assert.rejects(readmeLocales.run({ root: orphan }), /docs\/README\.CN\.md: no docs\/README\.md to translate/)

  const externalOnly = makeFixture()
  write(externalOnly, 'README.md', '[文档](https://example.com/README.CN.md)\n')
  write(externalOnly, 'README.CN.md', '[docs](https://example.com/README.md)\n')
  await assert.rejects(readmeLocales.run({ root: externalOnly }), /no link to README\.CN\.md/)
})

it('readme-locales options drive locales and skipped directories', async () => {
  const readmeJp = defineReadmeLocales({ locales: ['JP'], skippedDirectories: ['fixtures'] })
  const root = makeFixture()
  write(root, 'packages/pub/package.json', JSON.stringify({ name: '@greypan/pub' }))
  write(root, 'packages/pub/README.md', '[日本語](./README.JP.md)\n')
  write(root, 'packages/pub/README.JP.md', '[English](./README.md)\n')
  write(root, 'packages/pub/fixtures/README.JP.md', '# 夹具里的译文，没有主版\n')
  assert.match(await detail(readmeJp.run({ root })), /1 bilingual README pair\(s\), 1 published package\(s\)/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
