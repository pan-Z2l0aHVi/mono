import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { globSync } from 'glob'

import { byCodeUnit } from '../shared/order.mjs'
import { findRepoRoot } from '../shared/repo-root.mjs'

import { BAND_WIDTH, OFFSET_STRIDE, TEST_API_PORT_NAMES, testApiPort } from './test-ports.mjs'

// 默认行为必须与「固定的段基地址」等价，否则迁移本身会改变现有的并行布局。
const DEFAULTS = {
  'react-web-ui-demo': 63410,
  'vue-web-ui-demo': 63420,
  'interweave-frontend': 63430,
  'web-ui': 63440,
  'web-ui-reduced-motion': 63450,
  'browser-kit': 63460
}

// 名单以模块为准：加了段位却忘了更新测试，这里会立刻发现，而不是靠手抄的数组悄悄漏测。
assert.deepEqual([...TEST_API_PORT_NAMES].sort(), Object.keys(DEFAULTS).sort())
for (const [name, port] of Object.entries(DEFAULTS)) {
  assert.equal(testApiPort(name, {}), port, `${name} 的基端口变了`)
}

// 空字符串按未设置处理：CI 里常见的 `VAR=` 不应让配置直接报错。
assert.equal(testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '' }), 63440)

// 偏移整体平移，表内相对间隔不变。
assert.equal(testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '300' }), 63740)

// 段间距、段不一致与全表跨度这几条都由模块加载期守卫保证——不成立时 import 阶段就抛，
// 本文件根本跑不到这里，所以不在这里重复断言。改成断言常量，把「段宽 10、步长 100」这两个
// 写进文档的约定钉住：改动它们要同时改 docs/agents/build.md 的说明。
assert.equal(BAND_WIDTH, 10)
assert.equal(OFFSET_STRIDE, 100)

// 跨 worktree：不同偏移的两组端口必须互不相交，而这正是这张表存在的原因。
function portsFor(offset) {
  return new Set(TEST_API_PORT_NAMES.map(name => testApiPort(name, { GREYPAN_TEST_PORT_OFFSET: String(offset) })))
}

for (const [left, right] of [
  [0, OFFSET_STRIDE],
  [OFFSET_STRIDE, 2 * OFFSET_STRIDE],
  [0, 3 * OFFSET_STRIDE]
]) {
  const overlap = [...portsFor(left)].filter(port => portsFor(right).has(port))
  assert.deepEqual(overlap, [], `偏移 ${left} 与 ${right} 的端口集合重叠`)
}

// 全表跨度不超过步长是上面「互不相交」的前提，同样由模块加载期守卫负责。

// 非法输入要显式失败，不能静默退回默认端口。
assert.throws(() => testApiPort('not-a-project', {}), /未知项目/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '-100' }), /非负整数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: 'abc' }), /非负整数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '1.5' }), /非负整数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '10' }), /100 的倍数/)
assert.throws(() => testApiPort('web-ui', { GREYPAN_TEST_PORT_OFFSET: '65500' }), /超出端口上限/)

// 表是手写的，调用点分散在各 workspace 的 vite.config.ts：新增 browser project 忘了登记段位，
// 或改名后表里留下死条目，两边都不会在运行时报错——只会悄悄落到别人的端口上。这里要求两边
// 完全相等：多、少、重复都失败。非字面量实参（如传变量）会让调用数与字面量匹配数不等，
// 同样失败，避免加一层入口后守卫自己失效。
const root = findRepoRoot()
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
  [...TEST_API_PORT_NAMES].sort(byCodeUnit),
  'vite.config.ts 里的 testApiPort 调用与端口表不一致'
)
for (const [name, count] of usage) {
  assert.equal(count, 1, `${name} 被 ${count} 个 project 引用；一个段位只能给一个 project`)
}

console.log('test-ports.test.mjs passed')
