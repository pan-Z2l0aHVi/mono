import { describe, expect, it } from 'vite-plus/test'

import depsReload from '../vite'

describe('depsReload', () => {
  function createPlugin(deps: { name: string; path?: string; outputDir?: string; extensions?: string[] }[]) {
    const vitePlugin = depsReload(deps)
    return (Array.isArray(vitePlugin) ? vitePlugin[0] : vitePlugin) as any
  }

  it('应当作为一个有效的 Vite 插件初始化', () => {
    const plugin = createPlugin([{ name: 'remeda' }])

    expect(plugin.name).toBe('deps-reload')
    expect(plugin.apply).toBe('serve')
    expect(typeof plugin.hotUpdate).toBe('function')
  })

  it('应当忽略 .map 文件', () => {
    const plugin = createPlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui' }])

    const result = plugin.hotUpdate!({ file: '/repo/packages/web-ui/dist/index.js.map', server: {} as any })

    expect(result).toBeUndefined()
  })

  it('当文件命中自定义 path 时应触发全量刷新', () => {
    const plugin = createPlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui' }])

    const result = plugin.hotUpdate!({ file: '/repo/packages/web-ui/dist/button/index.js', server: {} as any })

    expect(result).toEqual([])
  })

  it('当文件不匹配任何依赖时不应触发刷新', () => {
    const plugin = createPlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui' }])

    const result = plugin.hotUpdate!({ file: '/src/App.vue', server: {} as any })

    expect(result).toBeUndefined()
  })

  it('当使用自定义 path 时，目录下的变化应当触发刷新', () => {
    const plugin = createPlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui' }])

    expect(plugin.hotUpdate!({ file: '/repo/packages/web-ui/dist/index.js', server: {} as any })).toEqual([])
  })

  it('应当匹配自定义扩展名', () => {
    const plugin = createPlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui', extensions: ['.js'] }])

    const result = plugin.hotUpdate!({ file: '/repo/packages/web-ui/dist/button/index.js', server: {} as any })

    expect(result).toEqual([])
  })

  it('当扩展名不匹配时不应触发', () => {
    const plugin = createPlugin([{ name: '@greypan/web-ui', path: '/repo/packages/web-ui', extensions: ['.css'] }])

    const result = plugin.hotUpdate!({ file: '/repo/packages/web-ui/dist/button/index.js', server: {} as any })

    expect(result).toBeUndefined()
  })
})
