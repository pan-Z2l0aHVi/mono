import { resolve, sep } from 'node:path'

import { type ArgumentType, debounce } from '@mono/utils-core'
import { createUnplugin, type VitePlugin } from 'unplugin'

interface Dep {
  name: string // 用于 npm 包名
  path?: string // 物理路径，如 './packages/ui/dist'，用于 npm link 或 monorepo 子包
  outputDir?: string
  extensions?: string[]
}

// 如果引入的子包是构建产物而非源码，用 full-reload 代替 hmr 更加合适
export const fullReload = createUnplugin<Dep[]>((deps = []) => {
  // 预处理：只保留绝对路径前缀和后缀正则
  // 统一处理成小写和正斜杠，消除跨平台差异 Window / Unix
  const configs = deps.map(({ name, path, outputDir = 'dist', extensions = ['.js', '.css'] }) => {
    const target = path ? resolve(path) : resolve('node_modules', name, outputDir)
    const normalizedTarget = target.split(sep).join('/').toLowerCase()
    const extPattern = extensions.map(e => e.replace(/^\./, '')).join('|')

    return {
      name,
      targetPath: normalizedTarget,
      extRegex: new RegExp(`\\.(${extPattern})$`)
    }
  })

  type ViteDevServer = ArgumentType<VitePlugin['hotUpdate']>['server']
  const fullReloadTrigger = debounce(
    (server: ViteDevServer) => {
      server.ws.send({ type: 'full-reload', path: '*' })
      server.config.logger.info(`\x1b[36m[deps-reload] Assets updated -> Browser reloaded\x1b[0m`, {
        timestamp: true
      })
    },
    { waitMs: 300, maxWaitMs: 1500 }
  )

  return {
    name: 'full-reload',
    vite: {
      apply: 'serve',

      hotUpdate(ctx) {
        const { file, server } = ctx
        // 滤掉 sourcemap
        if (file.endsWith('.map')) return

        const normalizedFile = file.split(sep).join('/').toLowerCase()
        const isMatched = configs.some(
          cfg => normalizedFile.includes(cfg.targetPath) && cfg.extRegex.test(normalizedFile)
        )
        if (isMatched) {
          fullReloadTrigger.call(server)
          return []
        }
      }
    }
  }
})
