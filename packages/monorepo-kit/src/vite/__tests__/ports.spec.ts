import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { type TestPortsTargetConfig, applyTestPorts, readTestPorts } from '../ports'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-test-ports-'))
let fixture = 0

// 端口表由消费仓库的根配置提供，测试自带一份夹具：这里钉的是读取、校验、偏移与写进 Vite 配置的
// 判据，真实取值由 `monorepo.json` 与 `scripts/policies/test-port-call-sites.mjs` 决定。
const allocation = {
  testPorts: { bandWidth: 10, offsetStride: 100, ports: { alpha: 30000, beta: 30010, gamma: 30020 } }
}

function makeFixture(raw: unknown): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'monorepo.json'), typeof raw === 'string' ? raw : JSON.stringify(raw))
  return root
}

// 偏移量来自 env，所以每份读数显式给出 GREYPAN_TEST_PORT_OFFSET：undefined 就是未设置，
// 开发者 shell 里残留的偏移不会影响结果。
function ports(raw: unknown = allocation, offset?: string) {
  return readTestPorts({ root: makeFixture(raw), env: { ...process.env, GREYPAN_TEST_PORT_OFFSET: offset } })
}

it('test-ports', () => {
  const api = ports()
  assert.deepEqual(api.names(), ['alpha', 'beta', 'gamma'])

  // 空字符串按未设置处理：CI 里常见的 `VAR=` 不应让配置直接报错。
  assert.equal(ports(allocation, '').port('alpha'), 30000)
  assert.equal(api.port('alpha'), 30000)

  // 偏移整体平移，表内相对间隔不变。
  const shifted = ports(allocation, '300')
  assert.equal(shifted.port('alpha'), 30000 + 300)
  assert.equal(shifted.port('beta'), 30010 + 300)

  // 跨 worktree：不同偏移的两组端口必须互不相交，而这正是这份分配存在的原因。
  function portsFor(offset: number): Set<number> {
    const scoped = ports(allocation, String(offset))
    return new Set(scoped.names().map(project => scoped.port(project)))
  }

  for (const [left, right] of [
    [0, 100],
    [100, 200],
    [0, 300]
  ]) {
    const overlap = [...portsFor(left)].filter(port => portsFor(right).has(port))
    assert.deepEqual(overlap, [], `偏移 ${left} 与 ${right} 的端口集合重叠`)
  }

  // 非法输入要显式失败，不能静默退回默认端口。
  // 锚定域名前缀用 { message } 形式：裸正则匹配的是错误的字符串表示，那里以 "Error: " 起头。
  assert.throws(() => api.port('delta'), { message: /^test-ports: 未知项目 "delta"；可选：alpha, beta, gamma/ })
  assert.throws(() => api.port('delta'), /可选：/)
  assert.throws(() => ports(allocation, '-100').port('alpha'), {
    message: /^test-ports: GREYPAN_TEST_PORT_OFFSET 必须是非负整数，收到 "-100"/
  })
  assert.throws(() => ports(allocation, 'abc').port('alpha'), /非负整数/)
  assert.throws(() => ports(allocation, '1.5').port('alpha'), /非负整数/)
  assert.throws(() => ports(allocation, '101').port('alpha'), /倍数/)
  assert.throws(() => ports(allocation, '1000000').port('alpha'), /超出端口上限/)

  // 段没有真占住自己的宽度时，两个 project 会在同一批端口上互相 +1 抢位。
  assert.throws(
    () => ports({ testPorts: { bandWidth: 10, offsetStride: 100, ports: { alpha: 30000, beta: 30005 } } }).names(),
    /相距不足 10/
  )

  // 跨度超过步长时，相邻两档偏移的 worktree 会抢同一批端口。
  assert.throws(
    () => ports({ testPorts: { bandWidth: 10, offsetStride: 100, ports: { alpha: 30000, beta: 30095 } } }).names(),
    /超过偏移步长 100/
  )

  // 配置本身写坏时第一次读数就抛，不把问题推迟到某个 project 的端口上。
  assert.throws(() => ports({}).names(), { message: /^test-ports: monorepo\.json 缺少 testPorts 对象/ })
  assert.throws(
    () => ports({ testPorts: { bandWidth: 0, offsetStride: 100, ports: { alpha: 30000 } } }).names(),
    /正整数/
  )
  assert.throws(() => ports({ testPorts: { bandWidth: 10, offsetStride: 100, ports: {} } }).names(), /必须是非空对象/)
  assert.throws(
    () => ports({ testPorts: { bandWidth: 10, offsetStride: 100, ports: { alpha: 0 } } }).names(),
    /1\.\.65535/
  )
  assert.throws(() => ports('not json').names(), /is not valid JSON/)
})

it('applyTestPorts 只把端口段写进指定的那个 project', () => {
  const api = ports()

  function projectsConfig(): TestPortsTargetConfig {
    return { test: { projects: [{ test: { name: 'jsdom' } }, { test: { name: 'browser' } }] } }
  }

  // host 与 strictPort 跟着端口一起写：它们不是调用点的偏好，而是这次分配能落回自己段内的前提。
  const config = projectsConfig()
  applyTestPorts(config, api, { project: 'alpha', testName: 'browser' })
  assert.deepEqual(config.test?.projects?.[1]?.test?.api, { host: '127.0.0.1', port: 30000, strictPort: false })
  assert.equal(config.test?.projects?.[0]?.test?.api, undefined, 'jsdom project 不该抢这个端口')

  // 没有 projects 的单包配置写根 test 块。
  const root: TestPortsTargetConfig = { test: {} }
  applyTestPorts(root, api, { project: 'beta' })
  assert.deepEqual(root.test?.api, { host: '127.0.0.1', port: 30010, strictPort: false })

  // vitest 5 还会为每个跑到的 project 单独求值一遍，那一遍手里没有 projects 数组。插件只动根那一遍，
  // 于是根上写进去的值随合并原样带过来（左），没被点名的 project 也拿不到别人的端口（右）。
  const inherited: TestPortsTargetConfig = { test: { name: 'browser', api: { host: '127.0.0.1', port: 30000 } } }
  applyTestPorts(inherited, api, { project: 'alpha', testName: 'browser' })
  assert.deepEqual(inherited.test?.api, { host: '127.0.0.1', port: 30000 })

  const jsdomPass: TestPortsTargetConfig = { test: { name: 'jsdom' } }
  applyTestPorts(jsdomPass, api, { project: 'alpha', testName: 'browser' })
  assert.equal(jsdomPass.test?.api, undefined, 'jsdom 那一遍不该拿到 browser 的端口')

  // 指错 project 必须响亮失败：静默什么都不写时，这一路退回 vitest 的默认 63315，而那正是同机并行
  // 的其他 worktree 与同一轮 turbo test 里其他包共同起点的端口。
  assert.throws(() => applyTestPorts(projectsConfig(), api, { project: 'alpha', testName: 'worker' }), {
    message: /^test-ports: 配置里没有 test\.name 为 "worker" 的 project/
  })
  assert.throws(() => applyTestPorts({}, api, { project: 'alpha' }), /没有 test 块/)

  // 两处都能写 api 时生效的那一处取决于合并顺序，所以直接判配置写坏了。
  const both: TestPortsTargetConfig = { test: { projects: [{ test: { name: 'browser', api: { port: 1234 } } }] } }
  assert.throws(() => applyTestPorts(both, api, { project: 'alpha', testName: 'browser' }), /已经写了 test\.api/)

  // host 是调用点唯一可以改写的默认值，偏移照样生效。
  const custom: TestPortsTargetConfig = { test: {} }
  applyTestPorts(custom, ports(allocation, '100'), { project: 'alpha', host: 'localhost' })
  assert.deepEqual(custom.test?.api, { host: 'localhost', port: 30100, strictPort: false })
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
