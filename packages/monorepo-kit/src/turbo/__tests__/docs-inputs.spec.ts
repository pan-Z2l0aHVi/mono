import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineDocsInputs } from '../docs-inputs'

const docsInputs = defineDocsInputs({
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

function run(root: string) {
  return docsInputs.make({ root, env: { ...process.env } }).run()
}

async function failure(root: string): Promise<string> {
  const result = await run(root)
  if (result.ok) assert.fail('expected web-ui-docs-inputs to fail')
  return result.error
}

it('web-ui-docs-inputs', async () => {
  const valid = makeFixture()
  assert.ok((await run(valid.root)).ok)

  fs.mkdirSync(path.join(valid.packageRoot, '__tests__'), { recursive: true })
  fs.writeFileSync(path.join(valid.packageRoot, '__tests__', 'fixture.md'), '# fixture\n')
  assert.ok((await run(valid.root)).ok)

  fs.writeFileSync(path.join(valid.packageRoot, 'notes.md'), '# stray\n')
  assert.match(await failure(valid.root), /^turbo: packages\/web-ui: these Markdown files are not in the allowlist/)
  fs.rmSync(path.join(valid.packageRoot, 'notes.md'))

  const missingDocs = makeFixture({ docs: false })
  assert.match(await failure(missingDocs.root), /^turbo: packages\/web-ui: docs\/ does not exist/)

  const wrongExtends = makeFixture({ extendsValue: ['//', 'packages/web-ui'] })
  assert.match(await failure(wrongExtends.root), /^turbo: packages\/web-ui: turbo\.json extends must be \["\/\/"\]/)

  const missingDefault = makeFixture({ buildInputs: ['!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'] })
  assert.match(
    await failure(missingDefault.root),
    /^turbo: packages\/web-ui: tasks\.build\.inputs is missing \$TURBO_DEFAULT\$/
  )

  const coversDocs = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!**/docs/**']
  })
  assert.match(await failure(coversDocs.root), /^turbo: packages\/web-ui: .*covers the docs\/ corpus/)

  const missesProse = makeFixture({
    testInputs: ['$TURBO_DEFAULT$', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md']
  })
  assert.match(await failure(missesProse.root), /^turbo: packages\/web-ui: tasks\.test\.inputs is missing !README\.md/)

  const unsupported = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!{docs,x}/**']
  })
  assert.match(await failure(unsupported.root), /^turbo: packages\/web-ui: .*covers the docs\/ corpus/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
