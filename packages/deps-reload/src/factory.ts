import { resolve, sep } from 'node:path'

import { debounce } from '@greypan/js-kit'
import { UnpluginFactory } from 'unplugin'
import type { ViteDevServer } from 'vite-plus'

export interface Dep {
  name: string // 用于 npm 包名
  path?: string // 物理路径，如 '../../packages/web-ui'，用于 npm link 或 monorepo 子包
  outputDir?: string
  extensions?: string[]
}

// 如果引入的子包是构建产物而非源码，用 full-reload 代替 hmr 更加合适
export const depsReloadFactory: UnpluginFactory<Dep[]> = deps => {
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

  const fullReloadTrigger = debounce(
    (server: ViteDevServer) => {
      server.ws.send({ type: 'full-reload', path: '*' })
      server.config.logger.info(`\x1b[36m[deps-reload] 资源已更新 -> 浏览器已刷新\x1b[0m`, {
        timestamp: true
      })
    },
    { waitMs: 300, maxWaitMs: 1500 }
  )

  return {
    name: 'deps-reload',
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
    },
    webpack(compiler: import('webpack').Compiler) {
      compiler.hooks.afterPlugins.tap('deps-reload', () => {
        const alias = compiler.options.resolve?.alias ?? ({} as Record<string, string>)
        for (const dep of deps) {
          if (dep.path) {
            ;(alias as Record<string, string>)[dep.name] = resolve(dep.path, 'src')
          }
        }
      })
    }
  }
}
