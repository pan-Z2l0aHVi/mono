import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'
import { minimatch } from 'minimatch'

import { defineGit, type GitApi } from '../git/git'
import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { errorMessage } from '../shared/errors'
import { byCodeUnit } from '../shared/order'
import { defineWorkspace, type WorkspaceApi } from '../workspace/workspace'

import { defineTurbo, type TurboApi } from './turbo'

const { andThen, err, ok } = rust

// turbo 对指向不存在文件的正模式输入不报错：它只是收不到任何文件，于是「改了这份实现就重跑这个
// 任务」这条失效链静默消失，测试继续命中旧缓存给出绿色。目录改名最容易踩到它，所以这条判断常驻
// 提交边界。要扫的配置从 `pnpm-workspace.yaml` 派生（每个 workspace 清单所在目录的 `turbo.json`
// 加根 `turbo.json`），待判条目是配置里所有以 `$TURBO_ROOT$` 开头的字符串，本包不写仓库路径。
// 判定对 Git 索引做，不对工作区磁盘做：稀疏检出隐藏的是工作区文件，不是 tracked 路径，扫磁盘会把
// cone 外的输入误报成失配；cone 外的配置也从 index 补读，隐藏包的跨界输入同样在射程内。输入只认
// tracked 文件——`$TURBO_DEFAULT$` 本身就尊重 Git 跟踪，指向未跟踪文件的配置同样是失效链断裂。
// `!$TURBO_ROOT$/…` 排除项不判：排除项落空只会让任务多失效，方向保守，不是本守卫要防的失效。

const ROOT_PREFIX = '$TURBO_ROOT$'
const GLOB_METACHARACTERS = /[*?[\]{}]/
// `dot: true` 对齐 turbo 的口径：点开头的文件同样是任务输入。minimatch 的段语义与 turbo 一致：
// `*` 不跨 `/`，`**/` 可匹配零段，`?` 与字符类只落在单段内。
const MATCH_OPTIONS = { dot: true } as const

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

/** tracked 的 workspace 清单：按 `pnpm-workspace.yaml` 模式对 Git 索引匹配，含磁盘上看不到的清单。 */
function indexManifests(tracked: readonly string[], patterns: readonly string[]): string[] {
  const positive = patterns.filter(pattern => !pattern.startsWith('!'))
  const excluded = patterns
    .filter(pattern => pattern.startsWith('!'))
    .map(pattern => pattern.slice(1).replace(/\/+$/, ''))
  return tracked.filter(
    file =>
      positive.some(pattern => minimatch(file, `${pattern.replace(/\/+$/, '')}/package.json`, MATCH_OPTIONS)) &&
      !excluded.some(pattern => minimatch(file, `${pattern}/package.json`, MATCH_OPTIONS))
  )
}

/** 磁盘上被稀疏检出的配置只能从 index 读，解析失败要带上文件名，不能静默成「配置缺失」。 */
function parseIndexConfig(source: string, file: string): unknown {
  try {
    return JSON.parse(source) as unknown
  } catch (error) {
    throw new Error(`cannot parse ${file} from the git index: ${errorMessage(error)}`)
  }
}

/**
 * `$TURBO_ROOT$` 输入路径的判定，链上以 `turbo: ` 起头归因。一份配置都扫不到时按失败报：
 * 那时「没有失配」只是这道门禁空转。
 */
export const defineTurboInputPaths = (): Chain =>
  defineRunner()
    .use(defineWorkspace())
    .use(defineTurbo())
    .use(defineGit())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & WorkspaceApi & TurboApi & GitApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const tracked = ctx.trackedFiles()
            const trackedSet = new Set(tracked)
            const matchesTracked = (target: string): boolean =>
              GLOB_METACHARACTERS.test(target)
                ? tracked.some(file => minimatch(file, target, MATCH_OPTIONS))
                : trackedSet.has(target)

            const manifestFiles = new Set(ctx.manifests())
            for (const file of indexManifests(tracked, ctx.patterns())) manifestFiles.add(file)
            const candidates = new Set(['turbo.json'])
            for (const manifest of manifestFiles) {
              const directory = path.posix.dirname(manifest)
              candidates.add(directory === '.' ? 'turbo.json' : `${directory}/turbo.json`)
            }

            const configs: { file: string; parsed: unknown }[] = []
            for (const file of [...candidates].sort(byCodeUnit)) {
              if (fs.existsSync(path.join(ctx.root, file))) {
                configs.push({ file, parsed: ctx.config(file) })
              } else if (trackedSet.has(file)) {
                configs.push({ file, parsed: parseIndexConfig(ctx.indexFile(file), file) })
              }
            }
            if (configs.length === 0) return err('turbo: no turbo.json found: this check would idle')

            const inputs: InputPath[] = []
            for (const { file, parsed } of configs) collect(parsed, file, '', inputs)

            const misses = inputs
              .filter(({ entry }) => {
                const target = entry.slice(ROOT_PREFIX.length).replace(/^\/+/, '')
                if (!target) return true
                return !matchesTracked(target)
              })
              .map(({ file, trail, entry }) => `  ${file} ${trail}: ${entry}`)

            if (misses.length > 0)
              return err(
                `turbo: these $TURBO_ROOT$ inputs match no tracked file, so the tasks that list them stop invalidating silently:\n` +
                  `${misses.join('\n')}\n` +
                  `point them at the moved files or drop them — turbo does not fail on an input that matches nothing`
              )

            return ok(undefined)
          })
      }))
    )
