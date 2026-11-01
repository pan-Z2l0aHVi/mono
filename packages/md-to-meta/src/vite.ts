import path from 'node:path'

import type { Plugin, ViteDevServer } from 'vite'

import { checkArtifacts, writeArtifacts } from './emit'
import { generate } from './generate'
import type { GenerateResult, MdToMetaOptions, ResolvedOptions } from './types'

/** markdown 常被编辑器连写保存，一次改动会连着来几串事件；合成一次生成就够了。 */
const REGEN_DEBOUNCE_MS = 50

/**
 * Vite 侧配置 → 生成器配置：把相对 root 的路径解析成绝对路径。CI 的 check-generated 也调这一处，
 * 配置解析只有这一个口径。
 */
export function resolveGenerateOptions(root: string, options: MdToMetaOptions): ResolvedOptions {
  return {
    root,
    input: typeof options.input === 'string' ? [options.input] : [...options.input],
    output: path.resolve(root, options.output),
    exec: options.exec ? [...options.exec] : [],
    darkSelector: options.darkSelector
  }
}

/**
 * 判据只有一处：测试期只判不改，dev 与 build 期落盘。两条产出路径（`buildStart` 与 watcher 触发的
 * `regenerate`）都走它——判据若只贴在其中一条上，另一条就会在测试期改写工作区。
 * 落盘不自己发 HMR：字节写进产物目录后，宿主自己的 watcher 会接住这次改动。
 */
function applyArtifacts(result: GenerateResult): void {
  if (process.env.VITEST) checkArtifacts(result.files, result.output)
  else writeArtifacts(result.files, result.output)
}

/**
 * 把生成挂到 Vite 生命周期上：dev 启动与 build 都跑一遍，产物目录被 watcher 之外的原因改动后
 * 由下一次生成收敛。每个宿主实例化一次、各自一个 output。
 *
 * 测试期只判不改（`checkArtifacts`），理由见 `emit.ts`；dev 与 build 期落盘（`writeArtifacts`）。
 */
export function mdToMeta(options: MdToMetaOptions): Plugin {
  let resolved: ResolvedOptions | undefined
  const requireResolved = () => {
    if (!resolved) throw new Error('md-to-meta: 插件钩子在 configResolved 之前被调用')
    return resolved
  }

  async function regenerate(server: ViteDevServer) {
    try {
      applyArtifacts(await generate(requireResolved()))
    } catch (error) {
      server.config.logger.error(`[md-to-meta] 生成失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    name: 'md-to-meta',

    configResolved(config) {
      resolved = resolveGenerateOptions(config.root, options)
    },

    async buildStart() {
      applyArtifacts(await generate(requireResolved()))
    },

    configureServer(server) {
      const generation = requireResolved()
      // input 命中的 markdown 可能不在 app root 的默认 watch 面里，要显式加进来。
      server.watcher.add(generation.input.map(pattern => path.resolve(generation.root, pattern.replace(/^\.\//, ''))))
      let timer: ReturnType<typeof setTimeout> | undefined
      const schedule = (file: string) => {
        // 本插件的 input 只接受 .md，产物目录里不会有这种文件，按后缀过滤足够精确。
        if (!file.endsWith('.md')) return
        clearTimeout(timer)
        timer = setTimeout(() => void regenerate(server), REGEN_DEBOUNCE_MS)
      }
      for (const event of ['add', 'change', 'unlink'] as const) server.watcher.on(event, schedule)
    }
  }
}
