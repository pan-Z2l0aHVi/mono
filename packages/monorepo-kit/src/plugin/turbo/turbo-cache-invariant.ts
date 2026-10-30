import type { CheckUnit } from '../../runner/check-runner'

import { defineTurbo } from './turbo'

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

function requireArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a bracketed array of strings`)
  for (const item of value) {
    if (typeof item !== 'string' || !ITEM_SHAPE.test(item))
      throw new Error(`${label}: unsupported pattern item (extended glob syntax is not interpreted): ${String(item)}`)
  }
  return value as string[]
}

interface TurboConfig {
  tasks?: Record<string, { dependsOn?: unknown; outputs?: unknown; inputs?: unknown }>
}

export function defineTurboCacheInvariant(): CheckUnit {
  const turbo = defineTurbo()

  return {
    name: 'turbo-cache-invariant',
    async run({ root }: { root: string }): Promise<string> {
      const config = turbo.make({ root }).config<TurboConfig>()
      const test = config.tasks?.test
      const build = config.tasks?.build
      if (!test || typeof test !== 'object') throw new Error('cannot read tasks.test from turbo.json')
      if (!build || typeof build !== 'object') throw new Error('cannot read tasks.build from turbo.json')

      if (test.dependsOn === undefined)
        throw new Error('tasks.test.dependsOn is missing; test must run after upstream builds restore dist')
      const dependsOn = requireArray(test.dependsOn, 'tasks.test.dependsOn')
      if (!dependsOn.includes('^build'))
        throw new Error(
          'tasks.test.dependsOn must include "^build" so cached upstream build outputs are restored before the dependent task runs'
        )

      if (build.outputs === undefined)
        throw new Error('tasks.build.outputs is missing; build must declare its cacheable outputs')
      const outputs = requireArray(build.outputs, 'tasks.build.outputs')
      if (outputs.length === 0)
        throw new Error('tasks.build.outputs must be a non-empty array of strings containing "dist/**"')
      for (const item of outputs) {
        if (item.startsWith('!') && mayMatchDist(item.slice(1)))
          throw new Error(
            `tasks.build.outputs: negative pattern "${item}" may exclude dist/** after the output was declared; dist must remain recoverable`
          )
      }
      if (!outputs.includes('dist/**'))
        throw new Error('tasks.build.outputs must include "dist/**" so a cached build restores the package dist tree')

      if (test.inputs !== undefined) {
        const inputs = requireArray(test.inputs, 'tasks.test.inputs')
        for (const item of inputs) {
          if (!item.startsWith('!') && mayMatchDist(item))
            throw new Error(
              `tasks.test.inputs: positive pattern "${item}" may include dist/**; dist is gitignored and must stay out of the test input key`
            )
        }
      }

      return 'test.dependsOn, build.outputs and test.inputs are consistent'
    }
  }
}
