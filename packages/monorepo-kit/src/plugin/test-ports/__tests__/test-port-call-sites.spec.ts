import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineTestPortCallSites } from '../test-port-call-sites'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-test-port-call-sites-'))
let fixture = 0

// 扫描面与调用名是消费仓库的事实，测试自带一份：这里钉的是 check 的判据，
// 真实取值由 `scripts/policies/test-port-call-sites.mjs` 决定，并由门禁本身的运行来兑现。
const check = defineTestPortCallSites({
  configGlobs: ['apps/**/vite.config.ts', 'packages/**/vite.config.ts'],
  callName: 'testApiPort'
})

const allocation = {
  testPorts: { bandWidth: 10, offsetStride: 100, ports: { alpha: 30000, beta: 30010 } }
}

function write(root: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), content)
}

function makeFixture(): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  write(root, 'monorepo.json', JSON.stringify(allocation))
  return root
}

async function detail(result: Promise<string | void>): Promise<string> {
  const value = await result
  assert.ok(value, 'test-port-call-sites returned no detail')
  return value
}

it('test-port-call-sites', async () => {
  const valid = makeFixture()
  write(
    valid,
    'apps/a/vite.config.ts',
    "import { testApiPort } from '@greypan/monorepo-kit'\nexport default { server: { port: testApiPort('alpha') } }\n"
  )
  write(valid, 'packages/b/vite.config.ts', "export const port = testApiPort('beta')\n")
  assert.match(await detail(check.run({ root: valid })), /2 config file\(s\), 2 call site\(s\)/)

  // 一个调用点都没有时判据会空转，必须显式失败。
  const noFiles = makeFixture()
  await assert.rejects(check.run({ root: noFiles }), /matched no files/)

  const missing = makeFixture()
  write(missing, 'apps/a/vite.config.ts', "testApiPort('alpha')\n")
  await assert.rejects(check.run({ root: missing }), /allocated projects with no testApiPort call site: beta/)

  const unknown = makeFixture()
  write(unknown, 'apps/a/vite.config.ts', "testApiPort('alpha')\ntestApiPort('gamma')\n")
  await assert.rejects(check.run({ root: unknown }), /not in the allocation: gamma/)

  // 两个 project 抢同一段位时，Vite 的 +1 重试会让它们在运行时互相踩，而调用点看不出来。
  const duplicate = makeFixture()
  write(duplicate, 'apps/a/vite.config.ts', "testApiPort('alpha')\n")
  write(duplicate, 'packages/b/vite.config.ts', "testApiPort('alpha')\ntestApiPort('beta')\n")
  await assert.rejects(
    check.run({ root: duplicate }),
    /alpha is used by 2 call sites \(apps\/a\/vite\.config\.ts, packages\/b\/vite\.config\.ts\)/
  )

  // 动态实参不进调用点集合：已登记 project 只剩动态调用时按「没有调用点」失败。
  const dynamic = makeFixture()
  write(dynamic, 'apps/a/vite.config.ts', 'testApiPort(projectName)\n')
  await assert.rejects(check.run({ root: dynamic }), /allocated projects with no testApiPort call site: alpha, beta/)

  // 注释里提到 `testApiPort(` 不是调用点；按「任意调用 vs 字面量调用」计数会把这种提及判成失败。
  const mentioned = makeFixture()
  write(
    mentioned,
    'apps/a/vite.config.ts',
    "// 段位由 testApiPort(name) 决定\nexport default { server: { port: testApiPort('alpha') } }\n"
  )
  write(mentioned, 'packages/b/vite.config.ts', "export const port = testApiPort('beta')\n")
  assert.match(await detail(check.run({ root: mentioned })), /2 config file\(s\), 2 call site\(s\)/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
