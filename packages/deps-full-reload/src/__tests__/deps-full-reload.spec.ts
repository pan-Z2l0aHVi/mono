import { describe, expect, it } from 'vitest'

import { depsFullReload } from '..'

describe('depsFullReload 测试用例', () => {
  it('应当作为一个有效的 Vite 插件初始化', () => {
    const deps = [{ name: 'remeda' }]
    const vitePlugin = depsFullReload.vite(deps)
    const plugin = Array.isArray(vitePlugin) ? vitePlugin[0] : vitePlugin

    expect(plugin.name).toBe('deps-full-reload')
    expect(plugin.apply).toBe('serve')

    expect(typeof plugin.configureServer).toBe('function')
  })

  it('应当能够处理空参数而不崩溃', () => {
    const vitePlugin = depsFullReload.vite()
    const plugin = Array.isArray(vitePlugin) ? vitePlugin[0] : vitePlugin

    expect(plugin.name).toBe('deps-full-reload')
  })

  it('验证插件是否正确导出为 unplugin 格式', () => {
    // 确保除了 .vite 还有其他构建工具的导出（目前仅实现了 vite）
    expect(depsFullReload.rollup).toBeDefined()
    expect(depsFullReload.webpack).toBeDefined()
  })
})
