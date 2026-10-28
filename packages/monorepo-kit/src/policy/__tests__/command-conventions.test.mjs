import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { run } from '../command-conventions.mjs'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-command-conventions-'))
let fixture = 0

function makeFixture(scripts) {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts }, null, 2) + '\n')
  return root
}

try {
  assert.match(
    await run({
      root: makeFixture({
        build: 'turbo build',
        test: 'turbo test',
        'check-policy': 'node scripts/checks/check-policy.mjs',
        'agent:env-doctor': 'node scripts/maintenance/env-doctor.mjs',
        'test-scripts': 'node scripts/checks/test-scripts.mjs',
        'dev:react-web-ui-demo': 'turbo run dev'
      })
    }),
    /6 root commands/
  )

  await assert.rejects(run({ root: makeFixture({ Bad_Name: 'true' }) }), /must match/)
  await assert.rejects(run({ root: makeFixture({ 'build:all': 'true' }) }), /must match/)
  await assert.rejects(run({ root: makeFixture({}) }), /scripts is empty/)

  const notObject = path.join(tempRoot, 'not-object')
  fs.mkdirSync(notObject, { recursive: true })
  fs.writeFileSync(path.join(notObject, 'package.json'), JSON.stringify({ scripts: [] }) + '\n')
  await assert.rejects(run({ root: notObject }), /no scripts object/)

  process.stdout.write(
    'packages/monorepo-kit/src/policy/__tests__/command-conventions.test.mjs: all assertions passed\n'
  )
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
