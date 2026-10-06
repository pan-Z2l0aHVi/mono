import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

// 根命令面的命名约定：{namespace}:{do}-{something}，动宾用 `-` 连接，无 something 时省略。
// namespace 表达「谁拥有它」，取值是闭集；无 namespace 同样是合法形状（`build`、`test` 这类基础命令）。
// 完整理由与受众规则见 docs/agents/commands.md，这里只钉住可机检的形状。
const NAMESPACES = new Set(['agent', 'ci', 'dev'])
const SCRIPT_NAME = /^([a-z]+:)?[a-z]+(-[a-z]+)*$/

const namespaceOf = name => (name.includes(':') ? name.slice(0, name.indexOf(':')) : undefined)

function invalidScriptNames(scripts) {
  return Object.keys(scripts).filter(
    name => !SCRIPT_NAME.test(name) || (namespaceOf(name) !== undefined && !NAMESPACES.has(namespaceOf(name)))
  )
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const scripts = manifest.scripts ?? {}
assert.ok(Object.keys(scripts).length > 0, 'package.json must declare scripts for this check to mean anything')
assert.deepEqual(
  invalidScriptNames(scripts),
  [],
  `root script names must match {namespace}:{do}-{something} with namespace ∈ {[...NAMESPACES].join(', ')}: ${invalidScriptNames(scripts).join(', ')}`
)

// 约定本身也要有反向断言，否则这个测试只证明「当前 manifest 恰好合法」：形状一旦被放宽，
// 没有任何东西会失败。逐个钉住被拒的类别，比只钉住正例更能说明边界在哪。
// 反例用「形状相同但不是任何历史命令名」的写法：这里要验的是被拒的形状，不是那几个具体名字，
// 顺带让「指令面不留旧命令名」这条 grep 不被本守卫自己的 fixture 命中。
const rejected = [
  ['check:Code', '大写'],
  ['check_code', '下划线'],
  ['agent:task!', '非法字符'],
  ['ci:measure:', '空 action 段'],
  [':code', '空 namespace'],
  ['build:all', '未登记的 namespace'],
  ['ci:validate_context', 'namespace 内用下划线'],
  ['dev:react:web', '两个 namespace'],
  ['', '空名字']
]
for (const [name, reason] of rejected)
  assert.ok(invalidScriptNames({ [name]: '' }).includes(name), `must reject ${JSON.stringify(name)} (${reason})`)

// 合法形状的正例，防止正则被收得过紧。
for (const name of ['build', 'agent:task', 'ci:measure', 'check-code', 'fix-go', 'dev:react-web-ui-demo'])
  assert.deepEqual(invalidScriptNames({ [name]: '' }), [], `must accept ${JSON.stringify(name)}`)

console.log('command-conventions tests passed')
