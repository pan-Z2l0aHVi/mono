import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineTestPorts } from '../test-ports'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-test-ports-'))
let fixture = 0

// 端口表由消费仓库的根配置提供，测试自带一份夹具：这里钉的是读取、校验与偏移的判据，
// 真实取值由 `monorepo.json` 与 `scripts/policies/test-port-call-sites.mjs` 决定。
const allocation = {
  testPorts: { bandWidth: 10, offsetStride: 100, ports: { alpha: 30000, beta: 30010, gamma: 30020 } }
}

function makeFixture(raw: unknown): string {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'monorepo.json'), typeof raw === 'string' ? raw : JSON.stringify(raw))
  return root
}

function ports(raw: unknown = allocation) {
  return defineTestPorts().make({ root: makeFixture(raw) })
}

it('test-ports', () => {
  const api = ports()
  assert.deepEqual(api.names(), ['alpha', 'beta', 'gamma'])

  // 空字符串按未设置处理：CI 里常见的 `VAR=` 不应让配置直接报错。
  assert.equal(api.port('alpha', { GREYPAN_TEST_PORT_OFFSET: '' }), 30000)
  assert.equal(api.port('alpha', {}), 30000)

  // 偏移整体平移，表内相对间隔不变。
  assert.equal(api.port('alpha', { GREYPAN_TEST_PORT_OFFSET: '300' }), 30000 + 300)
  assert.equal(api.port('beta', { GREYPAN_TEST_PORT_OFFSET: '300' }), 30010 + 300)

  // 跨 worktree：不同偏移的两组端口必须互不相交，而这正是这份分配存在的原因。
  function portsFor(offset: number): Set<number> {
    return new Set(api.names().map(project => api.port(project, { GREYPAN_TEST_PORT_OFFSET: String(offset) })))
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
  assert.throws(() => api.port('delta', {}), /未知项目/)
  assert.throws(() => api.port('delta', {}), /可选：/)
  assert.throws(() => api.port('alpha', { GREYPAN_TEST_PORT_OFFSET: '-100' }), /非负整数/)
  assert.throws(() => api.port('alpha', { GREYPAN_TEST_PORT_OFFSET: 'abc' }), /非负整数/)
  assert.throws(() => api.port('alpha', { GREYPAN_TEST_PORT_OFFSET: '1.5' }), /非负整数/)
  assert.throws(() => api.port('alpha', { GREYPAN_TEST_PORT_OFFSET: '101' }), /倍数/)
  assert.throws(() => api.port('alpha', { GREYPAN_TEST_PORT_OFFSET: '1000000' }), /超出端口上限/)

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

  // 配置本身写坏时第一次调用就抛，不把问题推迟到某个 project 的端口上。
  assert.throws(() => ports({}).names(), /缺少 testPorts 对象/)
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

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
