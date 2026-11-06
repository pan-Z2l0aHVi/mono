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

// 只读 package.json，不 spawn 子进程：env 用 process.env 即可。
type Conventions = ReturnType<typeof defineCommandConventions>

function run(plugin: Conventions, root: string) {
  return plugin.make({ root, env: process.env }).run()
}

async function failure(plugin: Conventions, root: string): Promise<string> {
  const result = await run(plugin, root)
  if (result.ok) assert.fail('expected command-conventions to fail')
  return result.error
}

it('command-conventions', async () => {
  assert.ok(
    (
      await run(
        commandConventions,
        makeFixture({
          build: 'turbo build',
          test: 'turbo test',
          'check-policy': 'node scripts/checks/check-policy.mjs',
          'agent:env-doctor': 'node scripts/maintenance/env-doctor.mjs',
          'test-scripts': 'node scripts/checks/test-scripts.mjs',
          'dev:react-web-ui-demo': 'turbo run dev'
        })
      )
    ).ok
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
    assert.ok((await run(commandConventions, makeFixture({ [accepted]: 'true' }))).ok)
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
    assert.match(await failure(commandConventions, makeFixture({ [rejected]: 'true' })), /^script:.*must match/)
  }

  // namespace 闭集来自组合点：换一份名单，同一个命令的判定随之改变。
  const docsOnly = defineCommandConventions({ namespaces: ['docs'] })
  assert.match(await failure(docsOnly, makeFixture({ 'ci:release': 'true' })), /^script:.*must match/)
  assert.ok((await run(docsOnly, makeFixture({ 'docs:build-site': 'true' }))).ok)

  assert.match(await failure(commandConventions, makeFixture({})), /^script: package\.json scripts is empty/)

  const notObject = path.join(tempRoot, 'not-object')
  fs.mkdirSync(notObject, { recursive: true })
  fs.writeFileSync(path.join(notObject, 'package.json'), JSON.stringify({ scripts: [] }) + '\n')
  assert.match(await failure(commandConventions, notObject), /^script: package\.json has no scripts object/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
