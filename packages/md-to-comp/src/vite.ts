import path from 'node:path'

import type { Plugin, ViteDevServer } from 'vite'

import { checkArtifacts, writeArtifacts } from './emit'
import { generate } from './generate'
import type { FenceFlavor } from './highlight'
import type { GenerateOptions, GeneratedFile, MdToCompConfig } from './types'

/** 一处产物落点：`locale` 决定取哪份语料，落哪个目录；flavor 由插件入口钉死。 */
export interface MdToCompViteOutput {
  /** 产物目录，相对 Vite root 解析。 */
  output: string
  /** 这一份取哪一语种的文档，必须出现在 `locales` 里。 */
  locale: string
}

/**
 * 宿主插件的配置面：路径写成相对 Vite root 的路径，两个 demo 的 root 就是各自的包目录，于是
 * 共享部分（语料目录、锚点、flavors、语种表、外观选择器）在 react 与 vue 两侧逐字相同；差异只在
 * `outputs`——React 出中英两份，Vue 只出中文。
 */
export interface MdToCompViteOptions extends Omit<MdToCompConfig, 'input'> {
  /** markdown 源目录，相对 Vite root 解析。 */
  input: string
  /** 每语种一份产物；同一次生成里目录不能重复。 */
  outputs: readonly MdToCompViteOutput[]
  /** `examples.css` 的落点，相对 Vite root 解析。省略时每个 output 各写一份。 */
  styles?: string
}

/** markdown 常被编辑器连写保存，一次改动会连着来几串事件；合成一次生成就够了。 */
const REGEN_DEBOUNCE_MS = 50

/**
 * Vite 侧配置 → 生成器配置：把相对 root 的路径解析成绝对路径，并把本入口的 flavor 钉到每个
 * output 上。CI 的 check-generated 也调这一处，配置解析只有这一个口径。
 */
export function resolveGenerateOptions(
  root: string,
  options: MdToCompViteOptions,
  flavor: FenceFlavor
): GenerateOptions {
  return {
    ...options,
    input: path.resolve(root, options.input),
    outputs: options.outputs.map(output => ({
      output: path.resolve(root, output.output),
      flavor,
      locale: output.locale
    })),
    styles: options.styles ? path.resolve(root, options.styles) : undefined
  }
}

/**
 * 判据只有一处：测试期只判不改，dev 与 build 期落盘。两条产出路径（`buildStart` 与 watcher 触发的
 * `regenerate`）都走它——判据若只贴在其中一条上，另一条就会在测试期改写工作区。
 * 落盘不自己发 HMR：字节写进产物目录后，宿主自己的 watcher 会接住这次改动。
 */
function applyArtifacts(files: GeneratedFile[], demosDirs: string[]): void {
  if (process.env.VITEST) checkArtifacts(files, demosDirs)
  else writeArtifacts(files, demosDirs)
}

/**
 * 把生成挂到 Vite 生命周期上：dev 启动与 build 都跑一遍，产物目录被 watcher 之外的原因改动后
 * 由下一次生成收敛。两个入口（`./react`、`./vue`）只是钉死 flavor 的薄壳。
 *
 * 测试期只判不改（`checkArtifacts`），理由见 `emit.ts`；dev 与 build 期落盘（`writeArtifacts`）。
 */
export function createMdToCompVite(options: MdToCompViteOptions, flavor: FenceFlavor): Plugin {
  let resolved: ReturnType<typeof resolveGenerateOptions> | undefined
  const requireResolved = () => {
    if (!resolved) throw new Error('md-to-comp: 插件钩子在 configResolved 之前被调用')
    return resolved
  }

  async function regenerate(server: ViteDevServer) {
    try {
      const { files, demosDirs } = await generate(requireResolved())
      applyArtifacts(files, demosDirs)
    } catch (error) {
      server.config.logger.error(`[md-to-comp] 生成失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    name: `md-to-comp:${flavor}`,

    configResolved(config) {
      resolved = resolveGenerateOptions(config.root, options, flavor)
    },

    async buildStart() {
      const { files, demosDirs } = await generate(requireResolved())
      applyArtifacts(files, demosDirs)
    },

    configureServer(server) {
      const generation = requireResolved()
      // markdown 源目录在 app root 之外（或至少不在默认 watch 面里），要显式加进来。
      server.watcher.add(generation.input)
      let timer: ReturnType<typeof setTimeout> | undefined
      const schedule = (file: string) => {
        if (file !== generation.input && !file.startsWith(`${generation.input}${path.sep}`)) return
        clearTimeout(timer)
        timer = setTimeout(() => void regenerate(server), REGEN_DEBOUNCE_MS)
      }
      for (const event of ['add', 'change', 'unlink'] as const) server.watcher.on(event, schedule)
    }
  }
}
