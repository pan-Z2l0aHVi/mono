import { describe, expect, it } from 'vitest'

import { fullReload } from '..'

describe('fullReload 测试用例', () => {
  it('应当作为一个有效的 Vite 插件初始化', () => {
    const deps = [{ name: 'remeda' }]
    const vitePlugin = fullReload.vite(deps)
    const plugin = Array.isArray(vitePlugin) ? vitePlugin[0] : vitePlugin

    expect(plugin.name).toBe('full-reload')
    expect(plugin.apply).toBe('serve')

    expect(typeof plugin.hotUpdate).toBe('function')
  })

  it('验证插件是否正确导出为 unplugin 格式', () => {
    // 确保除了 .vite 还有其他构建工具的导出（目前仅实现了 vite）
    expect(fullReload.rollup).toBeDefined()
    expect(fullReload.webpack).toBeDefined()
  })
})
