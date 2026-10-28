import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { run } from './no-mutual-links.mjs'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-mutual-links-'))
let fixture = 0

function makeFixture() {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(path.join(root, 'docs', 'agents'), { recursive: true })
  fs.mkdirSync(path.join(root, 'docs', 'adr'), { recursive: true })
  fs.writeFileSync(path.join(root, 'skills-lock.json'), JSON.stringify({ skills: {} }) + '\n')
  return root
}

function write(root, file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), content)
}

try {
  const valid = makeFixture()
  write(valid, 'docs/agents/a.md', '[policy](../adr/0001-policy.md)\n')
  write(valid, 'docs/adr/0001-policy.md', '# policy\n')
  assert.match(await run({ root: valid }), /local edges/)

  const docsToRules = makeFixture()
  write(docsToRules, 'docs/agents/a.md', '[rule](../../.agents/rules/x.md)\n')
  write(docsToRules, '.agents/rules/x.md', '# rule\n')
  await assert.rejects(run({ root: docsToRules }), /docs-to-rules link forbidden/)

  const mutual = makeFixture()
  write(mutual, 'docs/agents/a.md', '[b](b.md)\n')
  write(mutual, 'docs/agents/b.md', '[a](a.md)\n')
  await assert.rejects(run({ root: mutual }), /mutual links forbidden/)

  const exempt = makeFixture()
  write(exempt, 'docs/agents/MAP.md', '[a](a.md)\n')
  write(exempt, 'docs/agents/a.md', '[map](MAP.md)\n')
  await run({ root: exempt })

  const noEdges = makeFixture()
  write(noEdges, 'docs/agents/a.md', '[external](https://example.com)\n')
  await assert.rejects(run({ root: noEdges }), /found 0 local Markdown links/)

  const noLock = makeFixture()
  fs.rmSync(path.join(noLock, 'skills-lock.json'))
  await assert.rejects(run({ root: noLock }), /skills-lock\.json is missing/)

  process.stdout.write('packages/monorepo-kit/src/policy/no-mutual-links.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
