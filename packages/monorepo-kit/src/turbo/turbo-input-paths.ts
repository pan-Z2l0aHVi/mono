import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'
import { globSync } from 'glob'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { byCodeUnit } from '../shared/order'
import { defineWorkspace, type WorkspaceApi } from '../workspace/workspace'

import { defineTurbo, type TurboApi } from './turbo'

const { andThen, err, ok } = rust

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

function collect(value: unknown, file: string, trail: string, found: InputPath[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, file, `${trail}[${index}]`, found))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collect(item, file, trail ? `${trail}.${key}` : key, found)
    return
  }
  if (typeof value === 'string' && value.startsWith(ROOT_PREFIX)) found.push({ file, trail, entry: value })
}

/**
 * `$TURBO_ROOT$` 输入路径的判定，链上以 `turbo: ` 起头归因。一份配置都扫不到时按失败报：
 * 那时「没有失配」只是这道门禁空转。
 */
export const defineTurboInputPaths = (): Chain =>
  defineRunner()
    .use(defineWorkspace())
    .use(defineTurbo())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & WorkspaceApi & TurboApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const candidates = new Set(['turbo.json'])
            for (const manifest of ctx.manifests()) {
              const directory = path.posix.dirname(manifest)
              candidates.add(directory === '.' ? 'turbo.json' : `${directory}/turbo.json`)
            }
            const configs = [...candidates].filter(file => fs.existsSync(path.join(ctx.root, file))).sort(byCodeUnit)
            if (configs.length === 0) return err('turbo: no turbo.json found: this check would idle')

            const inputs: InputPath[] = []
            for (const file of configs) collect(ctx.config(file), file, '', inputs)

            const misses = inputs
              .filter(({ entry }) => {
                const target = entry.slice(ROOT_PREFIX.length).replace(/^\/+/, '')
                if (!target) return true
                if (GLOB_METACHARACTERS.test(target)) {
                  return (
                    globSync(target, { cwd: ctx.root, nodir: true, dot: true, ignore: ['**/node_modules/**'] })
                      .length === 0
                  )
                }
                return !fs.existsSync(path.join(ctx.root, target))
              })
              .map(({ file, trail, entry }) => `  ${file} ${trail}: ${entry}`)

            if (misses.length > 0)
              return err(
                `turbo: these $TURBO_ROOT$ inputs match no file, so the tasks that list them stop invalidating silently:\n` +
                  `${misses.join('\n')}\n` +
                  `point them at the moved files or drop them — turbo does not fail on an input that matches nothing`
              )

            return ok(undefined)
          })
      }))
    )
