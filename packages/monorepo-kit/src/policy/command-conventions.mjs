import path from 'node:path'

import { readJsonFile } from '../shared/config.mjs'

// 根命令面支持分组 CLI（以管理对象命名，动作由子命令提供）和单动作 CLI；单动作命名为
// {namespace}:{do}-{something}，动宾用 `-` 连接，无 something 时省略。
// namespace 表达「谁拥有它」，取值是闭集；无 namespace 同样是合法形状：`build`、`test`
// 这类基础命令与门禁入口 `check-*` 都属于这一类。形状一旦放宽，命令面会重新膨胀而不惊动
// 任何人，所以这里逐个钉住被拒类别，而不是只断言当前 manifest 恰好合法。
// 本检查只读 package.json，不执行任何脚本。归属与命名理由以 docs/agents/commands.md 为权威。
export const name = 'command-conventions'

const NAME_SHAPE = /^(?:(?:agent|ci|dev):)?[a-z]+(?:-[a-z]+)*$/
const REJECTED_SHAPES = [
  'check:Code',
  'check_code',
  'agent:task!',
  'ci:validate:',
  ':code',
  'build:all',
  'ci:validate_context',
  'dev:react:web',
  ''
]
const ACCEPTED_SHAPES = [
  'build',
  'agent:env-doctor',
  'check-code',
  'check-pre-commit',
  'check-policy',
  'fix-go',
  'dev:react-web-ui-demo'
]

export async function run({ root }) {
  /** @type {{ scripts?: Record<string, string> }} */
  const manifest = readJsonFile(path.join(root, 'package.json'))
  const scripts = manifest.scripts
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts))
    throw new Error('package.json has no scripts object')

  const names = Object.keys(scripts)
  if (names.length === 0) throw new Error('package.json scripts is empty')

  const invalid = names.filter(scriptName => !NAME_SHAPE.test(scriptName))
  if (invalid.length > 0)
    throw new Error(
      `root script names must match {namespace}:{do}-{something} with namespace ∈ {agent, ci, dev}: ${invalid
        .map(scriptName => `'${scriptName}'`)
        .join(', ')}`
    )

  for (const rejected of REJECTED_SHAPES) {
    if (NAME_SHAPE.test(rejected)) throw new Error(`validator must reject shape: ${JSON.stringify(rejected)}`)
  }
  for (const accepted of ACCEPTED_SHAPES) {
    if (!NAME_SHAPE.test(accepted)) throw new Error(`validator must accept ${accepted}`)
  }

  return `${names.length} root commands`
}
