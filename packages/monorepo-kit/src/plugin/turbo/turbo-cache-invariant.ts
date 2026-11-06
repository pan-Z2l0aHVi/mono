import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../../runner/runner'

import { defineTurbo, type TurboApi } from './turbo'

const { andThen, err, ok } = rust

// Turbo cache 的正确性依赖三件事：test 先跑依赖包的 build，build 缓存恢复 dist/**，
// 以及 test inputs 不显式把 gitignored 的 dist 拉进 key。任何一项被改掉，缓存命中就可能
// 复现一份被污染的 dist，而测试仍然是绿；本检查只在提交边界核对这条形状，不执行构建。

const ITEM_SHAPE = /^[\]a-zA-Z0-9_.$^/*?!-]+$/

function globToRegExp(glob: string): RegExp {
  let source = '^'
  for (const char of glob) {
    if (char === '*') source += '.*'
    else if (char === '?') source += '.'
    else source += /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char
  }
  return new RegExp(`${source}$`)
}

function mayMatchDist(pattern: string): boolean {
  if (pattern === '$TURBO_DEFAULT$') return false
  const normalized = pattern.replaceAll('\\', '/').replace(/^\.\//, '')
  if (normalized.startsWith('/')) return true
  return globToRegExp(normalized.split('/')[0]).test('dist')
}

function requireArray(value: unknown, label: string): rust.Result<string[], string> {
  if (!Array.isArray(value)) return err(`turbo: ${label} must be a bracketed array of strings`)
  for (const item of value) {
    if (typeof item !== 'string' || !ITEM_SHAPE.test(item))
      return err(`turbo: ${label}: unsupported pattern item (extended glob syntax is not interpreted): ${String(item)}`)
  }
  return ok(value as string[])
}

interface TurboConfig {
  tasks?: Record<string, { dependsOn?: unknown; outputs?: unknown; inputs?: unknown }>
}

/**
 * Turbo 缓存形状的判定，链上以 `turbo: ` 起头归因。只核对配置形状，不执行构建。
 */
export const defineTurboCacheInvariant = (): Chain =>
  defineRunner()
    .use(defineTurbo())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & TurboApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const config = ctx.config<TurboConfig>()
            const test = config.tasks?.test
            const build = config.tasks?.build
            if (!test || typeof test !== 'object') return err('turbo: cannot read tasks.test from turbo.json')
            if (!build || typeof build !== 'object') return err('turbo: cannot read tasks.build from turbo.json')

            if (test.dependsOn === undefined)
              return err('turbo: tasks.test.dependsOn is missing; test must run after upstream builds restore dist')
            const dependsOn = requireArray(test.dependsOn, 'tasks.test.dependsOn')
            if (!dependsOn.ok) return err(dependsOn.error)
            if (!dependsOn.value.includes('^build'))
              return err(
                'turbo: tasks.test.dependsOn must include "^build" so cached upstream build outputs are restored before the dependent task runs'
              )

            if (build.outputs === undefined)
              return err('turbo: tasks.build.outputs is missing; build must declare its cacheable outputs')
            const outputs = requireArray(build.outputs, 'tasks.build.outputs')
            if (!outputs.ok) return err(outputs.error)
            if (outputs.value.length === 0)
              return err('turbo: tasks.build.outputs must be a non-empty array of strings containing "dist/**"')
            for (const item of outputs.value) {
              if (item.startsWith('!') && mayMatchDist(item.slice(1)))
                return err(
                  `turbo: tasks.build.outputs: negative pattern "${item}" may exclude dist/** after the output was declared; dist must remain recoverable`
                )
            }
            if (!outputs.value.includes('dist/**'))
              return err(
                'turbo: tasks.build.outputs must include "dist/**" so a cached build restores the package dist tree'
              )

            if (test.inputs !== undefined) {
              const inputs = requireArray(test.inputs, 'tasks.test.inputs')
              if (!inputs.ok) return err(inputs.error)
              for (const item of inputs.value) {
                if (!item.startsWith('!') && mayMatchDist(item))
                  return err(
                    `turbo: tasks.test.inputs: positive pattern "${item}" may include dist/**; dist is gitignored and must stay out of the test input key`
                  )
              }
            }

            return ok(undefined)
          })
      }))
    )
