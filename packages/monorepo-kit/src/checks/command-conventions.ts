import path from 'node:path'

import type { CheckUnit } from '../policy/check-runner'
import { readJsonFile } from '../shared/config'

// 根命令面支持分组 CLI（以管理对象命名，动作由子命令提供）和单动作 CLI；单动作命名为
// {namespace}:{do}-{something}，动宾用 `-` 连接，无 something 时省略。
// namespace 表达「谁拥有它」，取值是闭集，由消费仓库传入；无 namespace 同样是合法形状：
// `build`、`test` 这类基础命令与门禁入口 `check-*` 都属于这一类。形状一旦放宽，命令面会
// 重新膨胀而不惊动任何人，所以这里逐个钉住被拒类别，而不是只断言当前 manifest 恰好合法。
// 本检查只读 package.json，不执行任何脚本。归属与命名理由以 docs/agents/commands.md 为权威。
export interface CommandConventionsOptions {
  /** 允许出现在 `{namespace}:{do}-{something}` 里的 namespace 闭集 */
  readonly namespaces: readonly string[]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function defineCommandConventions({ namespaces }: CommandConventionsOptions): CheckUnit {
  const prefix = namespaces.length === 0 ? '' : `(?:(?:${namespaces.map(escapeRegExp).join('|')}):)?`
  const shape = new RegExp(`^${prefix}[a-z]+(?:-[a-z]+)*$`)

  return {
    name: 'command-conventions',
    async run({ root }: { root: string }): Promise<string> {
      const manifest = readJsonFile<{ scripts?: Record<string, string> }>(path.join(root, 'package.json'))
      const scripts = manifest.scripts
      if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts))
        throw new Error('package.json has no scripts object')

      const names = Object.keys(scripts)
      if (names.length === 0) throw new Error('package.json scripts is empty')

      const invalid = names.filter(scriptName => !shape.test(scriptName))
      if (invalid.length > 0)
        throw new Error(
          `root script names must match {namespace}:{do}-{something} with namespace ∈ {${namespaces.join(', ')}}: ${invalid
            .map(scriptName => `'${scriptName}'`)
            .join(', ')}`
        )

      return `${names.length} root commands`
    }
  }
}
