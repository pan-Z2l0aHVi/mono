import fs from 'node:fs'
import path from 'node:path'

import { globSync } from 'glob'

import type { CheckUnit } from '../../runner/check-runner'
import { byCodeUnit } from '../../shared/order'
import { defineWorkspace } from '../workspace/workspace'

import { defineTurbo } from './turbo'

// turbo 对指向不存在文件的正模式输入不报错：它只是收不到任何文件，于是「改了这份实现就重跑这个
// 任务」这条失效链静默消失，测试继续命中旧缓存给出绿色。目录改名最容易踩到它，所以这条判断常驻
// 提交边界。要扫的配置从 `pnpm-workspace.yaml` 派生（每个 workspace 清单所在目录的 `turbo.json`
// 加根 `turbo.json`），待判条目是配置里所有以 `$TURBO_ROOT$` 开头的字符串，本包不写仓库路径。
// `!$TURBO_ROOT$/…` 排除项不判：排除项落空只会让任务多失效，方向保守，不是本守卫要防的失效。

const ROOT_PREFIX = '$TURBO_ROOT$'
const GLOB_METACHARACTERS = /[*?[\]{}]/

interface InputPath {
  /** 配置文件，仓库相对 */
  readonly file: string
  /** 配置里的位置，例如 `tasks.test.inputs[1]` */
  readonly trail: string
  /** 原样的条目，含 `$TURBO_ROOT$` 前缀 */
  readonly entry: string
}

function collect(value: unknown, file: string, trail: string, found: InputPath[], exclusions: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, file, `${trail}[${index}]`, found, exclusions))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value))
      collect(item, file, trail ? `${trail}.${key}` : key, found, exclusions)
    return
  }
  if (typeof value !== 'string') return
  if (value.startsWith(`!${ROOT_PREFIX}`)) exclusions.push(value)
  else if (value.startsWith(ROOT_PREFIX)) found.push({ file, trail, entry: value })
}

export function defineTurboInputPaths(): CheckUnit {
  const plugins = defineWorkspace().use(defineTurbo())

  return {
    name: 'turbo-input-paths',
    async run({ root }: { root: string }): Promise<string> {
      const { config, manifests } = plugins.make({ root })

      const candidates = new Set(['turbo.json'])
      for (const manifest of manifests()) {
        const directory = path.posix.dirname(manifest)
        candidates.add(directory === '.' ? 'turbo.json' : `${directory}/turbo.json`)
      }
      const configs = [...candidates].filter(file => fs.existsSync(path.join(root, file))).sort(byCodeUnit)
      if (configs.length === 0) throw new Error('no turbo.json found: this check would idle')

      const inputs: InputPath[] = []
      const exclusions: string[] = []
      for (const file of configs) collect(config(file), file, '', inputs, exclusions)

      const misses = inputs
        .filter(({ entry }) => {
          const target = entry.slice(ROOT_PREFIX.length).replace(/^\/+/, '')
          if (!target) return true
          if (GLOB_METACHARACTERS.test(target)) {
            return globSync(target, { cwd: root, nodir: true, dot: true, ignore: ['**/node_modules/**'] }).length === 0
          }
          return !fs.existsSync(path.join(root, target))
        })
        .map(({ file, trail, entry }) => `  ${file} ${trail}: ${entry}`)

      if (misses.length > 0)
        throw new Error(
          `these $TURBO_ROOT$ inputs match no file, so the tasks that list them stop invalidating silently:\n` +
            `${misses.join('\n')}\n` +
            `point them at the moved files or drop them — turbo does not fail on an input that matches nothing`
        )

      return `${inputs.length} $TURBO_ROOT$ input(s) in ${configs.length} turbo config(s) resolve; ${exclusions.length} exclusion(s) unchecked`
    }
  }
}
