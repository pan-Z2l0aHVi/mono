import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { run } from './web-ui-docs-inputs.mjs'

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

try {
  const valid = makeFixture()
  assert.match(await run({ root: valid.root }), /1 corpus files/)

  fs.mkdirSync(path.join(valid.packageRoot, '__tests__'), { recursive: true })
  fs.writeFileSync(path.join(valid.packageRoot, '__tests__', 'fixture.md'), '# fixture\n')
  await run({ root: valid.root })

  fs.writeFileSync(path.join(valid.packageRoot, 'notes.md'), '# stray\n')
  await assert.rejects(run({ root: valid.root }), /not in the allowlist/)
  fs.rmSync(path.join(valid.packageRoot, 'notes.md'))

  const missingDocs = makeFixture({ docs: false })
  await assert.rejects(run({ root: missingDocs.root }), /does not exist/)

  const wrongExtends = makeFixture({ extendsValue: ['//', 'packages/web-ui'] })
  await assert.rejects(run({ root: wrongExtends.root }), /extends must be \["\/\/"\]/)

  const missingDefault = makeFixture({ buildInputs: ['!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md'] })
  await assert.rejects(run({ root: missingDefault.root }), /missing \$TURBO_DEFAULT\$/)

  const coversDocs = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!**/docs/**']
  })
  await assert.rejects(run({ root: coversDocs.root }), /covers the docs\/ corpus/)

  const missesProse = makeFixture({
    testInputs: ['$TURBO_DEFAULT$', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md']
  })
  await assert.rejects(run({ root: missesProse.root }), /missing !README\.md/)

  const unsupported = makeFixture({
    buildInputs: ['$TURBO_DEFAULT$', '!README.md', '!README.CN.md', '!AGENTS.md', '!CHANGELOG.md', '!{docs,x}/**']
  })
  await assert.rejects(run({ root: unsupported.root }), /covers the docs\/ corpus/)

  process.stdout.write('scripts/lib/web-ui-docs-inputs.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
