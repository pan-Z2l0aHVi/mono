import path from 'node:path'

import type { Plugin, ViteDevServer } from 'vite'

import { checkArtifacts, writeArtifacts } from './emit'
import { generate } from './generate'
import type { SampleFlavor } from './highlight'
import type { GeneratedFile, MdToCompConfig } from './types'

/**
 * 宿主插件的配置面：`input` / `output` 写成相对 Vite root 的路径，两个 demo 的 root 就是各自的包目录，
 * 于是同一份配置在 react 与 vue 两侧逐字相同。其余字段与生成器配置一一对应。
 */
export interface MdToCompViteOptions extends Omit<MdToCompConfig, 'input'> {
  /** markdown 源目录，相对 Vite root 解析。 */
  input: string
  /** 产物目录，相对 Vite root 解析。默认 `src/generated`。 */
  output?: string
}

const DEFAULT_OUTPUT = 'src/generated'

/** markdown 常被编辑器连写保存，一次改动会连着来几串事件；合成一次生成就够了。 */
const REGEN_DEBOUNCE_MS = 50

function resolveOptions(root: string, options: MdToCompViteOptions, flavor: SampleFlavor) {
  return {
    ...options,
    input: path.resolve(root, options.input),
    outputs: [{ output: path.resolve(root, options.output ?? DEFAULT_OUTPUT), flavor }]
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
export function createMdToCompVite(options: MdToCompViteOptions, flavor: SampleFlavor): Plugin {
  let resolved: ReturnType<typeof resolveOptions> | undefined
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
      resolved = resolveOptions(config.root, options, flavor)
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
