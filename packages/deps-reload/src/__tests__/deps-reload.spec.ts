import { resolve } from 'node:path'

import type { UnpluginContextMeta, UnpluginOptions } from 'unplugin'
import type { HmrContext, ViteDevServer } from 'vite-plus'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Compilation, Compiler } from 'webpack'

import { depsReloadFactory, type Dep } from '../factory'
import depsReload from '../vite'

interface VitePluginShape {
  name?: string
  apply?: string
  configureServer?: (server: ViteDevServer) => void
  hotUpdate?: (context: HmrContext) => unknown
}

const createVitePlugin = (deps: Dep[]): VitePluginShape => {
  const vitePlugin = depsReload(deps)
  return (Array.isArray(vitePlugin) ? vitePlugin[0] : vitePlugin) as unknown as VitePluginShape
}

const createServer = () => {
  const send = vi.fn<(payload: { type: string; path: string }) => void>()
  const info = vi.fn<(message: string, options: { timestamp: boolean }) => void>()

  return {
    server: {
      ws: { send },
      config: { logger: { info } }
    } as unknown as ViteDevServer,
    send,
    info
  }
}

const createHotUpdateContext = (file: string, server: ViteDevServer): HmrContext =>
  ({
    file,
    server
  }) as unknown as HmrContext

afterEach(() => {
  vi.useRealTimers()
})

describe('depsReload', () => {
  it('initializes as a Vite serve plugin', () => {
    const plugin = createVitePlugin([{ name: 'remeda' }])

    expect(plugin.name).toBe('deps-reload')
    expect(plugin.apply).toBe('serve')
    expect(typeof plugin.hotUpdate).toBe('function')
  })

  it('reloads when a supported file in the dependency output changes', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui' }])
    const { server, send } = createServer()

    const result = plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/button/index.js', server))
    await vi.advanceTimersByTimeAsync(300)

    expect(result).toEqual([])
    expect(send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' })
  })

  it('ignores source maps and unsupported extensions', () => {
    const plugin = createVitePlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui' }])
    const { server } = createServer()

    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js.map', server))).toBeUndefined()
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.d.ts', server))).toBeUndefined()
  })

  it('uses outputDir beneath a local package root', () => {
    const plugin = createVitePlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui', outputDir: 'build' }])
    const { server } = createServer()

    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/build/index.js', server))).toEqual([])
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/tools/index.js', server))).toBeUndefined()
  })

  it('does not match sibling directories with the same prefix', () => {
    const plugin = createVitePlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui' }])
    const { server } = createServer()

    expect(
      plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui-copy/dist/index.js', server))
    ).toBeUndefined()
  })

  it('normalizes custom extensions', () => {
    const plugin = createVitePlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui', extensions: ['mjs'] }])
    const { server } = createServer()

    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.mjs', server))).toEqual([])
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js', server))).toBeUndefined()
  })

  it('adds dependency output directories to Webpack context dependencies', () => {
    const plugin = depsReloadFactory(
      [{ name: '@greypan/web-ui', path: '/repo/packages/web-ui', outputDir: 'build' }],
      {} as UnpluginContextMeta
    ) as UnpluginOptions
    let compilationHandler: ((compilation: Compilation) => void) | undefined
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (_name: string, handler: (compilation: Compilation) => void) => {
            compilationHandler = handler
          }
        }
      }
    } as unknown as Compiler
    const contextDependencies = new Set<string>()

    plugin.webpack!(compiler)
    compilationHandler!({ contextDependencies } as unknown as Compilation)

    expect(contextDependencies).toContain(resolve('/repo/packages/web-ui', 'build'))
  })
})
