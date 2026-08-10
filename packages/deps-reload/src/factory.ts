import { resolve, sep } from 'node:path'

import { debounce } from '@greypan/js-kit'
import type { UnpluginFactory } from 'unplugin'
import type { ViteDevServer } from 'vite-plus'

const DEFAULT_OUTPUT_DIR = 'dist'
const DEFAULT_EXTENSIONS = ['.js', '.css']

export interface Dep {
  /** npm package name, used to resolve packages without a local path */
  name: string
  /** Local package root directory, for monorepos or npm links */
  path?: string
  /** Build output directory relative to the package root */
  outputDir?: string
  /** File extensions in the build output that should trigger a reload */
  extensions?: string[]
}

interface DependencyConfig {
  outputPath: string
  normalizedOutputPath: string
  extensions: string[]
}

export const depsReloadFactory: UnpluginFactory<Dep[]> = deps => {
  const configs = deps.map(createDependencyConfig)
  const pluginDist = normalizePath(import.meta.dirname)

  const fullReloadTrigger = debounce(
    (server: ViteDevServer) => {
      server.ws.send({ type: 'full-reload', path: '*' })
      server.config.logger.info(`\x1b[36m[deps-reload] dependency output changed; reloading browser\x1b[0m`, {
        timestamp: true
      })
    },
    { waitMs: 300, maxWaitMs: 3000 }
  )

  return {
    name: 'deps-reload',
    vite: {
      apply: 'serve',

      configureServer(server) {
        server.httpServer?.once('close', () => fullReloadTrigger.cancel())
      },

      hotUpdate(ctx) {
        const normalizedFile = normalizePath(ctx.file)
        if (isPathWithin(normalizedFile, pluginDist)) return []

        if (configs.some(config => isDependencyOutputFile(normalizedFile, config))) {
          // 依赖产物由构建以「原子重命名 / 目录重建」写盘，chokidar 上报 unlink/add 而非 change，
          // Vite 只对 change 事件自动调用 moduleGraph.onFileChange 失效模块图，
          // 导致 full-reload 后仍从模块图缓存返回旧产物。这里显式失效，保证 reload 拿到最新内容。
          for (const environment of Object.values(ctx.server.environments ?? {})) {
            environment.moduleGraph?.onFileChange?.(ctx.file)
          }
          fullReloadTrigger.call(ctx.server)
          return []
        }
      }
    },
    webpack(compiler: import('webpack').Compiler) {
      compiler.hooks.thisCompilation.tap('deps-reload', compilation => {
        for (const config of configs) {
          compilation.contextDependencies.add(config.outputPath)
        }
      })
    }
  }
}

function createDependencyConfig({
  name,
  path,
  outputDir = DEFAULT_OUTPUT_DIR,
  extensions = DEFAULT_EXTENSIONS
}: Dep): DependencyConfig {
  const packageRoot = path ? resolve(path) : resolve('node_modules', name)
  const outputPath = resolve(packageRoot, outputDir)

  return {
    outputPath,
    normalizedOutputPath: normalizePath(outputPath),
    extensions: extensions.map(normalizeExtension).filter(Boolean)
  }
}

function normalizePath(path: string): string {
  const normalizedPath = path.split(sep).join('/').toLowerCase()
  return normalizedPath.length > 1 ? normalizedPath.replace(/\/+$/, '') : normalizedPath
}

function normalizeExtension(extension: string): string {
  const normalizedExtension = extension.trim().replace(/^\.+/, '').toLowerCase()
  return normalizedExtension ? `.${normalizedExtension}` : ''
}

function isPathWithin(filePath: string, parentPath: string): boolean {
  return filePath === parentPath || filePath.startsWith(`${parentPath}/`)
}

function isDependencyOutputFile(filePath: string, config: DependencyConfig): boolean {
  return (
    isPathWithin(filePath, config.normalizedOutputPath) &&
    !filePath.endsWith('.map') &&
    config.extensions.some(extension => filePath.endsWith(extension))
  )
}
