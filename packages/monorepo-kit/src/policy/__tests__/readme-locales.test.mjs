import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { run } from '../readme-locales.mjs'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-readme-locales-'))
let fixture = 0

function write(root, file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), content)
}

function makeFixture() {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  write(root, 'pnpm-workspace.yaml', "packages:\n  - 'packages/**'\n")
  return root
}

function addPackage(root, name, { privatePackage = false, readme, cn } = {}) {
  write(root, `packages/${name}/package.json`, JSON.stringify({ name: `@greypan/${name}`, private: privatePackage }))
  if (readme !== undefined) write(root, `packages/${name}/README.md`, readme)
  if (cn !== undefined) write(root, `packages/${name}/README.CN.md`, cn)
}

try {
  const valid = makeFixture()
  addPackage(valid, 'pub', { readme: '[简体中文](./README.CN.md)\n', cn: '[English](./README.md)\n' })
  addPackage(valid, 'priv', { privatePackage: true, readme: '# private\n' })
  write(valid, 'packages/priv/__tests__/fixtures/README.md', '# fixture\n')
  assert.match(await run({ root: valid }), /1 bilingual README pair\(s\), 1 published package\(s\)/)

  const absolute = makeFixture()
  write(absolute, 'docs/README.md', `[简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/docs/README.CN.md)\n`)
  write(absolute, 'docs/README.CN.md', `[English](https://github.com/pan-Z2l0aHVi/mono/blob/main/docs/README.md)\n`)
  await run({ root: absolute })

  const fragments = makeFixture()
  write(fragments, 'README.md', '[简体中文](./README.CN.md#概述 "中文版")\n')
  write(fragments, 'README.CN.md', '[English](./README.md)\n')
  await run({ root: fragments })

  const missingLocale = makeFixture()
  addPackage(missingLocale, 'pub', { readme: '# pub\n' })
  await assert.rejects(run({ root: missingLocale }), /@greypan\/pub: published package is missing README\.CN\.md/)

  const missingBase = makeFixture()
  addPackage(missingBase, 'pub', { cn: '[English](./README.md)\n' })
  await assert.rejects(run({ root: missingBase }), /@greypan\/pub: published package is missing README\.md/)

  const missingForward = makeFixture()
  addPackage(missingForward, 'pub', { readme: '# pub\n', cn: '[English](./README.md)\n' })
  await assert.rejects(
    run({ root: missingForward }),
    /packages\/pub\/README\.md: no link to packages\/pub\/README\.CN\.md/
  )

  const missingBack = makeFixture()
  addPackage(missingBack, 'pub', { readme: '[简体中文](./README.CN.md)\n', cn: '# 中文\n' })
  await assert.rejects(
    run({ root: missingBack }),
    /packages\/pub\/README\.CN\.md: no link to packages\/pub\/README\.md/
  )

  const wrongTarget = makeFixture()
  addPackage(wrongTarget, 'pub', {
    readme: '[简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/other/README.CN.md)\n',
    cn: '[English](./README.md)\n'
  })
  await assert.rejects(run({ root: wrongTarget }), /README\.md: no link to packages\/pub\/README\.CN\.md/)

  const orphan = makeFixture()
  write(orphan, 'docs/README.CN.md', '# 中文\n')
  await assert.rejects(run({ root: orphan }), /docs\/README\.CN\.md: no docs\/README\.md to translate/)

  const externalOnly = makeFixture()
  write(externalOnly, 'README.md', '[文档](https://example.com/README.CN.md)\n')
  write(externalOnly, 'README.CN.md', '[docs](https://example.com/README.md)\n')
  await assert.rejects(run({ root: externalOnly }), /no link to README\.CN\.md/)

  process.stdout.write('packages/monorepo-kit/src/policy/__tests__/readme-locales.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
