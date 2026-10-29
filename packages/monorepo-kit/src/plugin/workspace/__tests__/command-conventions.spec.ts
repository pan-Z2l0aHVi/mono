import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineCommandConventions } from '../command-conventions'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-command-conventions-'))
let fixture = 0

const commandConventions = defineCommandConventions({ namespaces: ['agent', 'ci', 'dev'] })

function makeFixture(scripts: Record<string, string>): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts }, null, 2) + '\n')
  return root
}

async function detail(promise: Promise<string | void>): Promise<string> {
  const value = await promise
  assert.ok(value, 'command-conventions returned no detail')
  return value
}

function check(root: string): Promise<string> {
  return detail(commandConventions.run({ root }))
}

it('command-conventions', async () => {
  assert.match(
    await check(
      makeFixture({
        build: 'turbo build',
        test: 'turbo test',
        'check-policy': 'node scripts/checks/check-policy.mjs',
        'agent:env-doctor': 'node scripts/maintenance/env-doctor.mjs',
        'test-scripts': 'node scripts/checks/test-scripts.mjs',
        'dev:react-web-ui-demo': 'turbo run dev'
      })
    ),
    /6 root commands/
  )

  // 形状一旦放宽，命令面会重新膨胀而不惊动任何人：逐个钉住被拒类别，而不是只断言当前 manifest 合法。
  for (const accepted of [
    'build',
    'agent:env-doctor',
    'check-code',
    'check-pre-commit',
    'check-policy',
    'fix-go',
    'dev:react-web-ui-demo'
  ]) {
    assert.match(await check(makeFixture({ [accepted]: 'true' })), /1 root commands/)
  }
  for (const rejected of [
    'check:Code',
    'check_code',
    'agent:task!',
    'ci:validate:',
    ':code',
    'build:all',
    'ci:validate_context',
    'dev:react:web',
    'docs:build',
    ''
  ]) {
    await assert.rejects(check(makeFixture({ [rejected]: 'true' })), /must match/)
  }

  // namespace 闭集来自组合点：换一份名单，同一个命令的判定随之改变。
  const docsOnly = defineCommandConventions({ namespaces: ['docs'] })
  await assert.rejects(docsOnly.run({ root: makeFixture({ 'ci:release': 'true' }) }), /must match/)
  assert.match(await detail(docsOnly.run({ root: makeFixture({ 'docs:build-site': 'true' }) })), /1 root commands/)

  await assert.rejects(commandConventions.run({ root: makeFixture({}) }), /scripts is empty/)

  const notObject = path.join(tempRoot, 'not-object')
  fs.mkdirSync(notObject, { recursive: true })
  fs.writeFileSync(path.join(notObject, 'package.json'), JSON.stringify({ scripts: [] }) + '\n')
  await assert.rejects(commandConventions.run({ root: notObject }), /no scripts object/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
