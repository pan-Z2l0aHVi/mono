import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'

import { debounce } from '@mono/utils-core'
import { createUnplugin } from 'unplugin'
import type { ViteDevServer } from 'vite'

interface Dep {
  name: string
  distName?: string
  extensions?: string[]
}
type ActualDep = Required<Dep>

export const depsFullReload = createUnplugin<Dep[] | undefined>((deps = []) => {
  const actualDeps: ActualDep[] = deps.map(({ name, distName = 'dist', extensions = ['.js', '.css'] }) => ({
    name,
    distName,
    extensions: extensions.map(ext => (ext.startsWith('.') ? ext : `.${ext}`))
  }))

  const triggerReload = debounce(
    (server: ViteDevServer) => {
      server.ws.send({ type: 'full-reload', path: '*' })
      server.config.logger.info(`\x1b[36m[deps-reload] Assets updated -> Browser reloaded\x1b[0m`, {
        timestamp: true
      })
    },
    { waitMs: 200, maxWaitMs: 1000 }
  )

  return {
    name: 'deps-full-reload',
    vite: {
      apply: 'serve',
      configureServer(server) {
        const { watcher, config } = server
        const resolvedDeps = actualDeps
          .map(cfg => {
            // 注意：有些依赖可能还没安装，增加 try-catch 防止插件崩溃
            try {
              // 解析出 node_modules/pkg/dist 的绝对物理路径
              const pkgRoot = realpathSync(resolve(config.root, 'node_modules', cfg.name))
              const targetPath = resolve(pkgRoot, cfg.distName)
              const extensionRegex = new RegExp(`(${cfg.extensions.map(e => e.replace(/\./g, '\\.')).join('|')})$`)

              watcher.add(targetPath)

              return { targetPath, extensionRegex }
            } catch {
              return null
            }
          })
          .filter(c => !!c)

        watcher.on('change', file => {
          try {
            // 转为物理路径再对比，否则在 Windows 或某些软链环境下 startsWith 可能会失效
            const realFile = realpathSync(file)
            const isMatched = resolvedDeps.some(
              cfg => realFile.startsWith(cfg.targetPath) && cfg.extensionRegex.test(realFile)
            )
            if (isMatched) {
              triggerReload.call(server)
            }
          } catch {
            // 忽略文件删除等导致的 realpathSync 报错
          }
        })
      }
    }
  }
})
