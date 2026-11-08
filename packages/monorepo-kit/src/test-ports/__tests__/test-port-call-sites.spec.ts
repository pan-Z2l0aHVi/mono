import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineTestPortCallSites } from '../test-port-call-sites'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-test-port-call-sites-'))
let fixture = 0

// 扫描面与插件名是消费仓库的事实，测试自带一份：这里钉的是 check 的判据，
// 真实取值由 `scripts/policies/test-port-call-sites.mjs` 决定，并由门禁本身的运行来兑现。
const check = defineTestPortCallSites({
  configGlobs: ['apps/**/vite.config.ts', 'packages/**/vite.config.ts'],
  callName: 'testPorts'
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

// env 显式给一份不依赖开发者 shell 的副本，偏移类变量不能让同一份夹具给出不同端口段。
function run(root: string) {
  return check.make({ root, env: { ...process.env } }).run()
}

async function failure(root: string): Promise<string> {
  const result = await run(root)
  if (result.ok) assert.fail('expected test-port-call-sites to fail')
  return result.error
}

it('test-port-call-sites', async () => {
  // 两份夹具各写一种键序：判据只认 `project:` 是字面量，不认它排在第几个键上。
  const valid = makeFixture()
  write(
    valid,
    'apps/a/vite.config.ts',
    "import { testPorts } from '@greypan/monorepo-kit/vite'\nexport default { plugins: [testPorts({ project: 'alpha', testName: 'browser' })] }\n"
  )
  write(
    valid,
    'packages/b/vite.config.ts',
    "export default { plugins: [testPorts({ testName: 'browser', project: 'beta' })] }\n"
  )
  assert.ok((await run(valid)).ok)

  // 一个调用点都没有时判据会空转，必须显式失败。
  const noFiles = makeFixture()
  assert.match(await failure(noFiles), /^port: cannot run: .*matched no files/)

  const missing = makeFixture()
  write(missing, 'apps/a/vite.config.ts', "testPorts({ project: 'alpha' })\n")
  assert.match(await failure(missing), /^port: allocated projects with no testPorts call site: beta/)

  const unknown = makeFixture()
  write(unknown, 'apps/a/vite.config.ts', "testPorts({ project: 'alpha' })\ntestPorts({ project: 'gamma' })\n")
  // 这条夹具同时缺 beta 的调用点，两条违规按换行拼接，所以前缀与正文分开锚定。
  const unknownMessage = await failure(unknown)
  assert.match(unknownMessage, /^port: /)
  assert.match(unknownMessage, /call sites reference projects that are not in the allocation: gamma/)

  // 两个 project 抢同一段位时，Vite 的 +1 重试会让它们在运行时互相踩，而调用点看不出来。
  const duplicate = makeFixture()
  write(duplicate, 'apps/a/vite.config.ts', "testPorts({ project: 'alpha' })\n")
  write(duplicate, 'packages/b/vite.config.ts', "testPorts({ project: 'alpha' })\ntestPorts({ project: 'beta' })\n")
  assert.match(
    await failure(duplicate),
    /^port: alpha is used by 2 call sites \(apps\/a\/vite\.config\.ts, packages\/b\/vite\.config\.ts\): one band per project/
  )

  // 动态实参不进调用点集合：已登记 project 只剩动态调用时按「没有调用点」失败。
  const dynamic = makeFixture()
  write(dynamic, 'apps/a/vite.config.ts', 'testPorts({ project: projectName })\n')
  assert.match(await failure(dynamic), /^port: allocated projects with no testPorts call site: alpha, beta/)

  // 注释里提到 `testPorts({ project })` 不是调用点；按「任意提及 vs 字面量调用」计数会把这种说明判成失败。
  const mentioned = makeFixture()
  write(
    mentioned,
    'apps/a/vite.config.ts',
    "// 段位由 testPorts({ project }) 决定\nexport default { plugins: [testPorts({ project: 'alpha' })] }\n"
  )
  write(mentioned, 'packages/b/vite.config.ts', "export default { plugins: [testPorts({ project: 'beta' })] }\n")
  assert.ok((await run(mentioned)).ok)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
