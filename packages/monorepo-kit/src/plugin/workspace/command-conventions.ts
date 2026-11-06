import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../../runner/runner'
import { readJsonFile } from '../../shared/config'

const { andThen, err, ok } = rust

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

export const defineCommandConventions = ({ namespaces }: CommandConventionsOptions): Chain => {
  const prefix = namespaces.length === 0 ? '' : `(?:(?:${namespaces.map(escapeRegExp).join('|')}):)?`
  const shape = new RegExp(`^${prefix}[a-z]+(?:-[a-z]+)*$`)

  return defineRunner().use(
    definePlugin<{ run: Run }, KitCtx & { run: Run }>(ctx => ({
      run: () =>
        andThen(ctx.run(), async () => {
          const manifest = readJsonFile<{ scripts?: Record<string, string> }>(path.join(ctx.root, 'package.json'))
          const scripts = manifest.scripts
          if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts))
            return err('pack: package.json has no scripts object')

          const names = Object.keys(scripts)
          if (names.length === 0) return err('pack: package.json scripts is empty')

          const invalid = names.filter(scriptName => !shape.test(scriptName))
          if (invalid.length > 0)
            return err(
              `pack: root script names must match {namespace}:{do}-{something} with namespace ∈ {${namespaces.join(', ')}}: ${invalid
                .map(scriptName => `'${scriptName}'`)
                .join(', ')}`
            )

          return ok(undefined)
        })
    }))
  )
}
