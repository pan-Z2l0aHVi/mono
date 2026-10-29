import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineDocsInputs } from '../docs-inputs'

const docsInputs = defineDocsInputs({
  name: 'web-ui-docs-inputs',
  packageDir: 'packages/web-ui',
  corpusDir: 'docs',
  proseNames: ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']
})

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-web-ui-docs-'))
let fixture = 0

const prose = () => {
  return ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']
}

function makeFixture({
  buildInputs = ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'],
  testInputs = ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'],
  extendsValue = ['//'],
  docs = true
} = {}) {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  const packageRoot = path.join(root, 'packages', 'web-ui')
  fs.mkdirSync(packageRoot, { recursive: true })
  if (docs) {
    fs.mkdirSync(path.join(packageRoot, 'docs'), { recursive: true })
    fs.writeFileSync(path.join(packageRoot, 'docs', 'example.md'), '# example\n')
  }
  for (const file of prose()) fs.writeFileSync(path.join(packageRoot, file), `# ${file}\n`)
  fs.writeFileSync(
    path.join(packageRoot, 'turbo.json'),
    JSON.stringify(
      { extends: extendsValue, tasks: { build: { inputs: buildInputs }, test: { inputs: testInputs } } },
      null,
      2
    ) + '\n'
  )
  return { root, packageRoot }
}

async function detail(result: Promise<string | void>): Promise<string> {
  const value = await result
  assert.ok(value, 'web-ui-docs-inputs returned no detail')
  return value
}

it('web-ui-docs-inputs', async () => {
  const valid = makeFixture()
  assert.match(await detail(docsInputs.run({ root: valid.root })), /1 corpus files/)

  fs.mkdirSync(path.join(valid.packageRoot, '__tests__'), { recursive: true })
  fs.writeFileSync(path.join(valid.packageRoot, '__tests__', 'fixture.md'), '# fixture\n')
  await docsInputs.run({ root: valid.root })

  fs.writeFileSync(path.join(valid.packageRoot, 'notes.md'), '# stray\n')
  await assert.rejects(docsInputs.run({ root: valid.root }), /not in the allowlist/)
  fs.rmSync(path.join(valid.packageRoot, 'notes.md'))

  const missingDocs = makeFixture({ docs: false })
  await assert.rejects(docsInputs.run({ root: missingDocs.root }), /does not exist/)

  const wrongExtends = makeFixture({ extendsValue: ['//', 'packages/web-ui'] })
  await assert.rejects(docsInputs.run({ root: wrongExtends.root }), /extends must be \["\/\/"\]/)

  const missingDefault = makeFixture({ buildInputs: ['!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'] })
  await assert.rejects(docsInputs.run({ root: missingDefault.root }), /missing \$TURBO_DEFAULT\$/)

  const coversDocs = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!**/docs/**']
  })
  await assert.rejects(docsInputs.run({ root: coversDocs.root }), /covers the docs\/ corpus/)

  const missesProse = makeFixture({
    testInputs: ['$TURBO_DEFAULT$', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md']
  })
  await assert.rejects(docsInputs.run({ root: missesProse.root }), /missing !README\.md/)

  const unsupported = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!{docs,x}/**']
  })
  await assert.rejects(docsInputs.run({ root: unsupported.root }), /covers the docs\/ corpus/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
