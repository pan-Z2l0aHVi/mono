import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { globSync } from 'glob'

import { byCodeUnit } from '../../shared/order.mjs'
import { findRepoRoot } from '../../shared/repo-root.mjs'
import { testApiPort, testApiPortNames } from '../test-ports.mjs'

const root = findRepoRoot()
const { offsetStride } = JSON.parse(fs.readFileSync(path.join(root, 'monorepo.json'), 'utf8')).testPorts

assert.ok(testApiPortNames().length > 0, '端口分配为空')

// 空字符串按未设置处理：CI 里常见的 `VAR=` 不应让配置直接报错。
assert.equal(testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '' }), testApiPort('web-ui', {}))

// 偏移整体平移，表内相对间隔不变。
assert.equal(
  testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: String(3 * offsetStride) }),
  testApiPort('web-ui', {}) + 3 * offsetStride
)

// 段间距、段不一致与全表跨度这几条由读取配置时校验：不成立时第一次调用就抛，
// 本文件根本走不到这里，所以不在这里重复断言。

// 跨 worktree：不同偏移的两组端口必须互不相交，而这正是这份分配存在的原因。
function portsFor(offset) {
  return new Set(testApiPortNames().map(name => testApiPort(name, { GREYPAN_TEST_PORT_OFFSET: String(offset) })))
}

for (const [left, right] of [
  [0, offsetStride],
  [offsetStride, 2 * offsetStride],
  [0, 3 * offsetStride]
]) {
  const overlap = [...portsFor(left)].filter(port => portsFor(right).has(port))
  assert.deepEqual(overlap, [], `偏移 ${left} 与 ${right} 的端口集合重叠`)
}

// 非法输入要显式失败，不能静默退回默认端口。
assert.throws(() => testApiPort('not-a-project', {}), /未知项目/)
assert.throws(() => testApiPort('not-a-project', {}), /可选：/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '-100' }), /非负整数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: 'abc' }), /非负整数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '1.5' }), /非负整数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: String(offsetStride + 1) }), /倍数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: String(offsetStride * 10000) }), /超出端口上限/)

// 配置是手写的，调用点分散在各 workspace 的 vite.config.ts：新增 browser project 忘了登记段位，
// 或改名后配置里留下死条目，两边都不会在运行时报错——只会悄悄落到别人的端口上。这里要求两边
// 完全相等：多、少、重复都失败。非字面量实参（如传变量）会让调用数与字面量匹配数不等，
// 同样失败，避免加一层入口后守卫自己失效。
const configs = globSync('{apps,packages}/**/vite.config.ts', {
  cwd: root,
  nodir: true,
  posix: true,
  ignore: ['**/node_modules/**']
})
assert.ok(configs.length > 0, '仓库里没有找到 vite.config.ts')

const usage = new Map()
for (const file of configs) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const calls = [...source.matchAll(/testApiPort\s*\(/g)].length
  const names = [...source.matchAll(/testApiPort\s*\(\s*(['"])([^'"]+)\1/g)].map(match => match[2])
  assert.equal(names.length, calls, `${file}: testApiPort 的实参必须是字符串字面量`)
  for (const name of names) usage.set(name, (usage.get(name) ?? 0) + 1)
}

assert.deepEqual(
  [...usage.keys()].sort(byCodeUnit),
  [...testApiPortNames()].sort(byCodeUnit),
  'vite.config.ts 里的 testApiPort 调用与端口分配不一致'
)
for (const [name, count] of usage) {
  assert.equal(count, 1, `${name} 被 ${count} 个 project 引用；一个段位只能给一个 project`)
}

// 文档里的端口表是同一份分配的人读副本；逐项比对，免得改一处忘另一处。
const docTable = [
  ...fs
    .readFileSync(path.join(root, 'docs/agents/build.md'), 'utf8')
    .matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*(\d+)\s*\|\s*$/gmu)
].map(([, name, port]) => [name, Number(port)])
assert.deepEqual(
  docTable.map(([name]) => name).sort(byCodeUnit),
  [...testApiPortNames()].sort(byCodeUnit),
  'docs/agents/build.md 的端口表与 monorepo.json 的分配不一致'
)
for (const [name, port] of docTable) {
  assert.equal(port, testApiPort(name, {}), `docs/agents/build.md 里 ${name} 的基端口与 monorepo.json 不一致`)
}

console.log('test-ports.test.mjs passed')
