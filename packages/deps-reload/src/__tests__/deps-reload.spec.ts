import { resolve } from 'node:path'

import type { UnpluginContextMeta, UnpluginOptions } from 'unplugin'
import type { HmrContext, ViteDevServer } from 'vite-plus'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Compilation, Compiler } from 'webpack'

import { depsReloadFactory, type Dep } from '../factory'
import depsReload from '../vite'

// 这个插件的可观察行为只有三件：命中的依赖产物触发整页 reload 并让 Vite 跳过常规 HMR，
// 没命中的文件原样交给 Vite，以及 Webpack 侧把产物目录登记为监听依赖。
// 断言落在「reload 有没有发、发的是不是 full-reload、模块图有没有失效、Vite 收到什么返回值」，
// 不断言内部的路径比较函数。

interface VitePluginShape {
  name?: string
  apply?: string
  configureServer?: (server: ViteDevServer) => void
  hotUpdate?: (context: HmrContext) => unknown
}

const WEB_UI: Dep = { name: '@greypan/web-ui', path: '/repo/packages/web-ui' }

const createVitePlugin = (deps: Dep[]): VitePluginShape => {
  const vitePlugin = depsReload(deps)
  return (Array.isArray(vitePlugin) ? vitePlugin[0] : vitePlugin) as unknown as VitePluginShape
}

const createServer = () => {
  const send = vi.fn<(payload: { type: string; path: string }) => void>()
  const info = vi.fn<(message: string, options: { timestamp: boolean }) => void>()
  const onFileChange = vi.fn<(file: string) => void>()

  return {
    server: {
      ws: { send },
      config: { logger: { info } },
      environments: { client: { moduleGraph: { onFileChange } } }
    } as unknown as ViteDevServer,
    send,
    info,
    onFileChange
  }
}

const createHotUpdateContext = (file: string, server: ViteDevServer): HmrContext =>
  ({
    file,
    server
  }) as unknown as HmrContext

/** 推进过防抖窗口，让 reload 真正发出。 */
const settleDebounce = () => vi.advanceTimersByTimeAsync(300)

afterEach(() => {
  vi.useRealTimers()
})

describe('依赖产物变更触发整页 reload', () => {
  it.each([
    { name: 'JS 产物', file: '/repo/packages/web-ui/dist/button/index.js' },
    { name: 'CSS 产物', file: '/repo/packages/web-ui/dist/button/style.css' },
    { name: '产物目录下的嵌套文件', file: '/repo/packages/web-ui/dist/a/b/c.js' }
  ])('$name 发出 full-reload 并让 Vite 跳过常规 HMR', async ({ file }) => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send } = createServer()

    // 返回空数组 = 接管这次变更；Vite 不会再为它跑常规 HMR
    expect(plugin.hotUpdate!(createHotUpdateContext(file, server))).toEqual([])
    await settleDebounce()

    expect(send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' })
  })

  it('reload 前先失效模块图，避免 reload 后仍读到旧产物', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send, onFileChange } = createServer()
    const file = '/repo/packages/web-ui/dist/button/index.js'

    plugin.hotUpdate!(createHotUpdateContext(file, server))
    await settleDebounce()

    expect(onFileChange).toHaveBeenCalledWith(file)
    // 模块图失效必须早于 reload，否则 reload 会先于失效完成而拿到缓存产物
    expect(onFileChange.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0])
  })

  it('防抖窗口内的连续变更合并成一次 reload', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send } = createServer()

    for (const file of [
      '/repo/packages/web-ui/dist/button/index.js',
      '/repo/packages/web-ui/dist/card/index.js',
      '/repo/packages/web-ui/dist/dialog/index.js'
    ]) {
      plugin.hotUpdate!(createHotUpdateContext(file, server))
    }
    await settleDebounce()

    expect(send).toHaveBeenCalledTimes(1)
  })

  it('间隔超过防抖窗口的变更各自触发 reload', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send } = createServer()

    // 一次构建会连续重写多个产物文件：不防抖的话每次构建都会刷新多次，
    // 浏览器反复重载，人根本没法用
    for (const file of [
      '/repo/packages/web-ui/dist/button/index.js',
      '/repo/packages/web-ui/dist/card/index.js',
      '/repo/packages/web-ui/dist/dialog/index.js'
    ]) {
      plugin.hotUpdate!(createHotUpdateContext(file, server))
      await vi.advanceTimersByTimeAsync(400)
    }
    await settleDebounce()

    expect(send).toHaveBeenCalledTimes(3)
  })

  it('防抖窗口内不发 reload', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send } = createServer()

    plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/button/index.js', server))
    await vi.advanceTimersByTimeAsync(100)

    // 构建过程中的中间产物不该让页面反复闪；静默期内不发 reload
    expect(send).not.toHaveBeenCalled()

    await settleDebounce()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it.each([
    { name: '应用自己的源码', file: '/repo/apps/shell/src/main.ts' },
    { name: '源码映射文件', file: '/repo/packages/web-ui/dist/index.js.map' },
    { name: 'CSS 产物里的 sourcemap', file: '/repo/packages/web-ui/dist/style.css.map' },
    { name: '类型声明', file: '/repo/packages/web-ui/dist/index.d.ts' },
    { name: '依赖包根目录但不在产物目录内', file: '/repo/packages/web-ui/src/index.js' },
    { name: '与产物目录同前缀的兄弟目录', file: '/repo/packages/web-ui-copy/dist/index.js' },
    { name: '以产物目录名开头的兄弟目录', file: '/repo/packages/web-ui/dist-backup/index.js' },
    { name: '产物目录的父目录', file: '/repo/packages/web-ui/index.js' },
    { name: '其他依赖的产物', file: '/repo/node_modules/remeda/dist/index.js' }
  ])('$name 不触发 reload，交给 Vite 常规 HMR', async ({ file }) => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send, onFileChange } = createServer()

    // 返回 undefined = 本插件不接管，Vite 按自己的流程处理
    expect(plugin.hotUpdate!(createHotUpdateContext(file, server))).toBeUndefined()
    await settleDebounce()

    expect(send).not.toHaveBeenCalled()
    expect(onFileChange).not.toHaveBeenCalled()
  })

  it('只监听已配置的依赖', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send } = createServer()

    expect(
      plugin.hotUpdate!(createHotUpdateContext('/repo/packages/browser-kit/dist/index.js', server))
    ).toBeUndefined()
    await settleDebounce()

    expect(send).not.toHaveBeenCalled()
  })
})

describe('监听范围配置', () => {
  it('outputDir 指定产物目录', () => {
    const plugin = createVitePlugin([{ ...WEB_UI, outputDir: 'build' }])
    const { server } = createServer()

    // 监听的目录随 outputDir 移动：旧的 dist 不再命中，新的 build 命中
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/build/index.js', server))).toEqual([])
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js', server))).toBeUndefined()
  })

  it('extensions 替换默认扩展名列表', () => {
    const plugin = createVitePlugin([{ ...WEB_UI, extensions: ['.mjs'] }])
    const { server } = createServer()

    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.mjs', server))).toEqual([])
    // 默认的 .js 不再监听
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js', server))).toBeUndefined()
  })

  it.each([
    { name: '省略前导点', extensions: ['css'] },
    { name: '带前导点', extensions: ['.css'] },
    { name: '带空白', extensions: ['  .css  '] },
    { name: '大写', extensions: ['CSS'] }
  ])('extensions $name 被归一后仍匹配', ({ extensions }) => {
    const plugin = createVitePlugin([{ ...WEB_UI, extensions }])
    const { server } = createServer()

    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.css', server))).toEqual([])
    // 只有列出的扩展名被监听：.js 不在列表里就不该命中
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js', server))).toBeUndefined()
  })

  it('显式监听 .map 时仍然不因 sourcemap 触发 reload', () => {
    // 只有把 .map 列进 extensions 时这条守卫才起作用：sourcemap 每次构建都重写，
    // 跟着它 reload 等于每次构建刷新两次，源码映射文件本身没有用户可见变化
    const plugin = createVitePlugin([{ ...WEB_UI, extensions: ['.js', '.map'] }])
    const { server } = createServer()

    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js', server))).toEqual([])
    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js.map', server))).toBeUndefined()
  })

  it('文件事件与配置路径大小写不一致时仍然命中', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([{ name: '@greypan/web-ui', path: '/repo/Packages/Foo' }])
    const { server, send } = createServer()

    expect(plugin.hotUpdate!(createHotUpdateContext('/repo/packages/foo/dist/index.js', server))).toEqual([])
    await settleDebounce()

    expect(send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' })
  })

  it('未配置 path 时按 node_modules 下的包名解析', () => {
    const plugin = createVitePlugin([{ name: 'remeda' }])
    const { server } = createServer()
    const dist = resolve('node_modules', 'remeda', 'dist')

    expect(plugin.hotUpdate!(createHotUpdateContext(`${dist}/index.js`, server))).toEqual([])
  })
})

describe('开发服务器生命周期', () => {
  it('只在 serve 阶段生效', () => {
    expect(createVitePlugin([WEB_UI]).apply).toBe('serve')
  })

  it('服务器关闭时取消待发的 reload', async () => {
    vi.useFakeTimers()
    const plugin = createVitePlugin([WEB_UI])
    const { server, send } = createServer()
    const closeHandlers: (() => void)[] = []
    const closableServer = {
      ...server,
      httpServer: { once: (_event: string, handler: () => void) => closeHandlers.push(handler) }
    } as unknown as ViteDevServer

    plugin.configureServer!(closableServer)
    plugin.hotUpdate!(createHotUpdateContext('/repo/packages/web-ui/dist/index.js', closableServer))

    closeHandlers.forEach(handler => handler())
    await settleDebounce()

    // 关闭后仍发 reload 会打到已销毁的 ws 连接上
    expect(send).not.toHaveBeenCalled()
  })
})

describe('Webpack 监听依赖登记', () => {
  const collectContextDependencies = (deps: Dep[]) => {
    const plugin = depsReloadFactory(deps, {} as UnpluginContextMeta) as UnpluginOptions
    let handler: ((compilation: Compilation) => void) | undefined
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (_name: string, fn: (compilation: Compilation) => void) => {
            handler = fn
          }
        }
      }
    } as unknown as Compiler
    const contextDependencies = new Set<string>()

    plugin.webpack!(compiler)
    handler!({ contextDependencies } as unknown as Compilation)

    return contextDependencies
  }

  it('把每个依赖的产物目录登记为监听依赖', () => {
    const contextDependencies = collectContextDependencies([{ ...WEB_UI, outputDir: 'build' }, { name: 'remeda' }])

    expect(contextDependencies).toContain(resolve('/repo/packages/web-ui', 'build'))
    expect(contextDependencies).toContain(resolve('node_modules', 'remeda', 'dist'))
    expect(contextDependencies).toHaveLength(2)
  })
})
